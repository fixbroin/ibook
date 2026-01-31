

'use server';

import { redirect } from 'next/navigation';
import { addBooking, getProviderByUsername, updateProvider, getPlan, getAdminSettings, createPaymentRecord, updateBookingStatus, getBookingById, updateBooking, addNotification, getServiceById } from './data';
import type { Service, ServiceType, Booking, Plan, Provider, EnrichedProvider, PaymentGatewaySettings } from './types';
import { BookingSchema } from './schema';
import { format } from 'date-fns';
import { formatInTimeZone, utcToZonedTime } from 'date-fns-tz';
import { addDays, addMonths, addYears } from 'date-fns';
import { revalidatePath } from 'next/cache';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import { sendSubscriptionEmail, sendBookingConfirmationEmail, sendProviderBookingNotificationEmail, sendBookingCancelledEmail, sendRescheduleEmail, sendProviderRescheduleEmail } from './email-templates';
import { createGoogleCalendarEvent } from './calendar.actions';


export async function createBooking(
  formData: FormData
): Promise<{ errors?: any, order?: any, bookingId?: string, confirmationParams?: any, customPaymentLink?: string } | void> {
  const rawData = Object.fromEntries(formData.entries());
  
  const parsed = BookingSchema.safeParse(rawData);

  if (!parsed.success) {
    return {
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  const { data } = parsed;
  const provider = await getProviderByUsername(data.providerUsername);
  if (!provider) {
    throw new Error('Provider not found.');
  }

  const service = await getServiceById(provider.username, data.serviceId);

  const customerTimezone = (formData.get('customerTimezone') as string) || 'UTC';

  const bookingDateTime = new Date(data.dateTime);
  
  const serviceTypeSetting = provider.settings.serviceTypes.find(st => st.name === data.serviceType);
  const fullAddress = serviceTypeSetting?.id === 'doorstep' 
    ? `${data.flatHouseNo}, ${data.landmark ? data.landmark + ', ' : ''}${data.city}, ${data.state} - ${data.pincode}, ${data.country}`
    : serviceTypeSetting?.id === 'shop' ? provider.settings.shopAddress : 'Online';

  
  const booking: Omit<Booking, 'id' | 'status' | 'payment'> = {
    customerName: data.customerName,
    customerEmail: data.customerEmail,
    customerPhone: `${data.countryCode}${data.customerPhone}`,
    serviceType: data.serviceType,
    dateTime: bookingDateTime,
    providerUsername: data.providerUsername,
    address: fullAddress || undefined,
    serviceId: service?.id || null,
    quantity: data.quantity,
  };

  if (serviceTypeSetting?.id === 'doorstep') {
    booking.flatHouseNo = data.flatHouseNo;
    booking.landmark = data.landmark;
    booking.pincode = data.pincode;
    booking.city = data.city;
    booking.state = data.state;
    booking.country = data.country;
  }
  
  const bookingId = await addBooking(booking, 'Pending');
  
  let price = provider.settings.enableServicesPage && service ? service.offerPrice ?? service.price : serviceTypeSetting?.price;

  if (service?.quantityEnabled && data.quantity) {
    price = (price || 0) * data.quantity;
  }

  const isPaidService = !!(price && price > 0);
  
  const confirmationParams = new URLSearchParams();
  confirmationParams.set('customerName', data.customerName);
  confirmationParams.set('customerEmail', data.customerEmail);
  confirmationParams.set('customerPhone', `${data.countryCode}${data.customerPhone}`);
  confirmationParams.set('serviceType', data.serviceType);
  if (service) {
    confirmationParams.set('serviceTitle', service.title);
  }
  if (data.quantity) {
    confirmationParams.set('quantity', String(data.quantity));
  }
  confirmationParams.set('dateTime', bookingDateTime.toISOString());
  confirmationParams.set('providerName', provider.name);
  confirmationParams.set('providerEmail', provider.contact.email);
  confirmationParams.set('providerUsername', provider.username);
  if (fullAddress) {
    confirmationParams.set('address', fullAddress);
  }
  if (provider.settings.googleMapLink) {
    confirmationParams.set('googleMapLink', provider.settings.googleMapLink);
  }
  confirmationParams.set('dateFormat', provider.settings.dateFormat || 'PPP');
  confirmationParams.set('timezone', provider.settings.timezone);
  confirmationParams.set('customerTimezone', customerTimezone);
  confirmationParams.set('currencyCode', provider.settings.currency);

  const providerGateways = provider.settings.paymentGateways;
  const activeProviderGateway = providerGateways 
    ? Object.keys(providerGateways).find(key => providerGateways[key as keyof typeof providerGateways]?.enabled)
    : null;

  if (isPaidService && data.paymentMethod === 'online') {
      if (activeProviderGateway === 'custom' && providerGateways?.custom.paymentLink) {
          await updateBooking(provider.username, bookingId, { status: 'Pending' });
          return { customPaymentLink: providerGateways.custom.paymentLink };
      }
      
      if (activeProviderGateway && providerGateways && activeProviderGateway in providerGateways) {
        const gateway = providerGateways[activeProviderGateway as keyof PaymentGatewaySettings];
        if (gateway && 'keyId' in gateway && gateway.keyId && 'keySecret' in gateway && gateway.keySecret) {
            const order = await createRazorpayOrder(price!, provider.settings.currency, bookingId, { keyId: gateway.keyId, keySecret: gateway.keySecret });
            await updateBooking(provider.username, bookingId, { payment: { orderId: order.id } });
            return { order, bookingId, confirmationParams: confirmationParams.toString() };
        }
      }
      
      // Fallback to admin gateway if provider's is not set up correctly
      const adminSettings = await getAdminSettings();
      if (adminSettings?.razorpay?.keyId && adminSettings.razorpay.keySecret) {
         const order = await createRazorpayOrder(price!, provider.settings.currency, bookingId, { keyId: adminSettings.razorpay.keyId, keySecret: adminSettings.razorpay.keySecret });
         await updateBooking(provider.username, bookingId, { payment: { orderId: order.id } });
         return { order, bookingId, confirmationParams: confirmationParams.toString() };
      } else {
        return { errors: { payment: ["Online payment is currently unavailable."] } };
      }

  } else {
    // This handles free bookings or "Pay Later"
    let paymentDetails = 'This is a free booking.';
    if (isPaidService && data.paymentMethod === 'later') {
      paymentDetails = 'To be paid after service.';
    }

    let bookingUpdate: Partial<Booking> = { 
        status: 'Upcoming',
        payment: {
            status: 'Pending',
            amount: price || 0
        }
    };
    let googleMeetLink: string | null = null;

    if (provider.googleCalendar) {
        try {
            const { eventId, meetLink } = await createGoogleCalendarEvent(provider, { ...booking, id: bookingId, service: service } as Booking);
            if (eventId) {
                bookingUpdate.googleCalendarEventId = eventId;
            }
            if (meetLink) {
                bookingUpdate.googleMeetLink = meetLink;
                googleMeetLink = meetLink;
            }
        } catch (error) {
            console.error("Failed to create Google Calendar event for non-online payment:", error);
        }
    }
    
    await updateBooking(provider.username, bookingId, bookingUpdate);

    await addNotification(provider.username, {
      message: `New booking from ${data.customerName} for ${service?.title || data.serviceType}.`,
      type: 'new_booking',
      link: `/bookings`,
    });

    const providerTimeZone = provider.settings.timezone;
    const dateFormat = provider.settings.dateFormat || 'PPP';

    const customerBookingDate = formatInTimeZone(bookingDateTime, customerTimezone, dateFormat);
    const customerDisplayTime = `${formatInTimeZone(bookingDateTime, customerTimezone, 'p')} (${customerTimezone.replace(/_/g, ' ')})`;
    const providerDisplayTime = `${formatInTimeZone(bookingDateTime, providerTimeZone, 'p')} (${providerTimeZone.replace(/_/g, ' ')})`;
    
    const eventTitle = encodeURIComponent(`Appointment: ${service?.title || data.serviceType} with ${provider.name}`);
    const eventDescription = encodeURIComponent(`Booking for ${service?.title || data.serviceType} with ${provider.name}.`);
    const eventLocation = encodeURIComponent(fullAddress || 'Online');
    const toGoogleISO = (date: Date) => date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const startTime = new Date(bookingDateTime);
    const endTime = new Date(startTime.getTime() + (provider.settings.slotDuration || 60) * 60 * 1000);

    const googleLink = `https://www.google.com/calendar/render?action=TEMPLATE&text=${eventTitle}&dates=${toGoogleISO(startTime)}/${toGoogleISO(endTime)}&details=${eventDescription}&location=${eventLocation}`;
    const outlookLink = `https://outlook.live.com/calendar/0/deeplink/compose?path=/calendar/action/compose&rru=addevent&subject=${eventTitle}&startdt=${startTime.toISOString()}&enddt=${endTime.toISOString()}&body=${eventDescription}&location=${eventLocation}`;
    const icsContent = [ 'BEGIN:VCALENDAR', 'VERSION:2.0', 'BEGIN:VEVENT', `DTSTART;TZID=${providerTimeZone}:${toGoogleISO(startTime).slice(0, -1)}`, `DTEND;TZID=${providerTimeZone}:${toGoogleISO(endTime).slice(0, -1)}`, `SUMMARY:${eventTitle}`, `DESCRIPTION:${eventDescription}`, `LOCATION:${eventLocation}`, 'END:VEVENT', 'END:VCALENDAR' ].join('\r\n');
    const icsLink = `data:text/calendar;charset=utf-8,${encodeURIComponent(icsContent)}`;

    await sendBookingConfirmationEmail(data.customerEmail, {
        customerName: data.customerName,
        providerName: provider.name,
        serviceTitle: service?.title,
        serviceType: data.serviceType,
        quantity: data.quantity,
        bookingDate: customerBookingDate,
        bookingTime: customerDisplayTime,
        bookingTimeProvider: providerDisplayTime,
        bookingAddress: fullAddress || 'N/A',
        googleLink, outlookLink, icsLink,
        paymentDetails: paymentDetails,
        googleMeetLink: googleMeetLink,
        googleMapLink: provider.settings.googleMapLink
    });

    await sendProviderBookingNotificationEmail(provider.contact.email, {
        providerName: provider.name,
        customerName: data.customerName,
        customerEmail: data.customerEmail,
        customerPhone: `${data.countryCode}${data.customerPhone}`,
        serviceTitle: service?.title,
        serviceType: data.serviceType,
        quantity: data.quantity,
        bookingDate: formatInTimeZone(bookingDateTime, providerTimeZone, dateFormat),
        bookingTime: formatInTimeZone(bookingDateTime, providerTimeZone, 'p'),
        bookingAddress: fullAddress || 'N/A',
        paymentDetails: paymentDetails,
        googleMeetLink: googleMeetLink,
        googleMapLink: provider.settings.googleMapLink,
    });

    if (googleMeetLink) {
        confirmationParams.set('googleMeetLink', googleMeetLink);
    }
    if (isPaidService && data.paymentMethod === 'later') {
        confirmationParams.set('amountPaid', '0');
        confirmationParams.set('totalAmount', String(price || 0));
    }
    redirect(`/confirmation?${confirmationParams.toString()}`);
  }
}

export async function verifyBookingPayment(
  providerUsername: string,
  bookingId: string,
  paymentResponse: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  },
  amount: number
) {
  const provider = await getProviderByUsername(providerUsername);
  if (!provider) {
    throw new Error('Provider not found during verification.');
  }

  const activeProviderGateway = provider.settings.paymentGateways 
    ? Object.keys(provider.settings.paymentGateways).find(key => provider.settings.paymentGateways![key as keyof PaymentGatewaySettings]?.enabled)
    : null;

  let keySecret: string | undefined;

  if (activeProviderGateway && provider.settings.paymentGateways && activeProviderGateway in provider.settings.paymentGateways) {
    const gateway = provider.settings.paymentGateways[activeProviderGateway as keyof PaymentGatewaySettings];
    if (gateway && 'keySecret' in gateway) {
      keySecret = gateway.keySecret;
    }
  }

  if (!keySecret) {
    const adminSettings = await getAdminSettings();
    keySecret = adminSettings?.razorpay?.keySecret;
  }

  if (!keySecret) {
    throw new Error('Razorpay key secret is not configured.');
  }


  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = paymentResponse;
  const body = razorpay_order_id + '|' + razorpay_payment_id;

  const expectedSignature = crypto
    .createHmac('sha256', keySecret)
    .update(body.toString())
    .digest('hex');

  if (expectedSignature !== razorpay_signature) {
    return { success: false, error: 'Invalid payment signature.' };
  }

  try {
    const booking = await getBookingById(providerUsername, bookingId);
    if (!booking) {
      throw new Error('Booking not found during verification.');
    }
    const service = await getServiceById(providerUsername, booking.serviceId);
    
    // We need the customer's timezone which we don't have here. This is a limitation.
    // We'll proceed with sending emails, but they won't have the customer's local time.
    const customerTimezone = 'UTC'; // Fallback

    const paymentData = {
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      amount: amount,
      status: 'Paid' as 'Paid' | 'Pending',
    };
    
    let bookingUpdate: Partial<Booking> = {
      status: 'Upcoming',
      payment: paymentData,
    };

    let googleMeetLink: string | null = null;
    if (provider.googleCalendar) {
        try {
            const { eventId, meetLink } = await createGoogleCalendarEvent(provider, { ...booking, ...bookingUpdate, service: service } as Booking);
            if (eventId) {
                bookingUpdate.googleCalendarEventId = eventId;
            }
            if (meetLink) {
                bookingUpdate.googleMeetLink = meetLink;
                googleMeetLink = meetLink;
            }
        } catch (error) {
            console.error("Failed to create Google Calendar event for paid booking:", error);
        }
    }

    await updateBooking(providerUsername, bookingId, bookingUpdate);
    
    await createPaymentRecord({
      providerUsername: providerUsername,
      bookingId: bookingId,
      planId: 'booking',
      amount: amount,
      currency: provider.settings.currency || 'INR',
      razorpay_payment_id: razorpay_payment_id,
      razorpay_order_id: razorpay_order_id,
    });
    
    await addNotification(provider.username, {
      message: `New booking from ${booking.customerName} for ${service?.title || booking.serviceType}.`,
      type: 'new_booking',
      link: `/bookings`,
    });

    const providerTimeZone = provider.settings.timezone;
    const dateFormat = provider.settings.dateFormat || 'PPP';

    // Time for provider
    const providerBookingDate = formatInTimeZone(booking.dateTime, providerTimeZone, dateFormat);
    const providerBookingTime = formatInTimeZone(booking.dateTime, providerTimeZone, 'p');

    // Time for customer
    const customerBookingDate = formatInTimeZone(booking.dateTime, customerTimezone, dateFormat);
    const customerBookingTime = formatInTimeZone(booking.dateTime, customerTimezone, 'p');
    
    const customerDisplayTime = `${customerBookingTime} (${customerTimezone.replace(/_/g, ' ')})`;
    const providerDisplayTime = `${providerBookingTime} (${providerTimeZone.replace(/_/g, ' ')})`;


    const eventTitle = encodeURIComponent(`Appointment: ${service?.title || booking.serviceType} with ${provider.name}`);
    const eventDescription = encodeURIComponent(`Booking for ${service?.title || booking.serviceType} with ${provider.name}.`);
    const eventLocation = encodeURIComponent(booking.address || 'Online');
    const toGoogleISO = (date: Date) => date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const startTime = new Date(booking.dateTime);
    const endTime = new Date(startTime.getTime() + (provider.settings.slotDuration || 60) * 60 * 1000);

    const googleLink = `https://www.google.com/calendar/render?action=TEMPLATE&text=${eventTitle}&dates=${toGoogleISO(startTime)}/${toGoogleISO(endTime)}&details=${eventDescription}&location=${eventLocation}`;
    const outlookLink = `https://outlook.live.com/calendar/0/deeplink/compose?path=/calendar/action/compose&rru=addevent&subject=${eventTitle}&startdt=${startTime.toISOString()}&enddt=${endTime.toISOString()}&body=${eventDescription}&location=${eventLocation}`;
    const icsContent = [ 'BEGIN:VCALENDAR', 'VERSION:2.0', 'BEGIN:VEVENT', `DTSTART;TZID=${providerTimeZone}:${toGoogleISO(startTime).slice(0, -1)}`, `DTEND;TZID=${providerTimeZone}:${toGoogleISO(endTime).slice(0, -1)}`, `SUMMARY:${eventTitle}`, `DESCRIPTION:${eventDescription}`, `LOCATION:${eventLocation}`, 'END:VEVENT', 'END:VCALENDAR' ].join('\r\n');
    const icsLink = `data:text/calendar;charset=utf-8,${encodeURIComponent(icsContent)}`;
    
    const paymentDetails = `Paid ₹${amount} Online`;

    await sendBookingConfirmationEmail(booking.customerEmail, {
        customerName: booking.customerName,
        providerName: provider.name,
        serviceTitle: service?.title,
        serviceType: booking.serviceType,
        quantity: booking.quantity,
        bookingDate: customerBookingDate,
        bookingTime: customerDisplayTime,
        bookingTimeProvider: providerDisplayTime,
        bookingAddress: booking.address || 'N/A',
        googleLink, outlookLink, icsLink,
        paymentDetails: paymentDetails,
        googleMeetLink: googleMeetLink,
        googleMapLink: provider.settings.googleMapLink,
    });

    await sendProviderBookingNotificationEmail(provider.contact.email, {
        providerName: provider.name,
        customerName: booking.customerName,
        customerEmail: booking.customerEmail,
        customerPhone: booking.customerPhone,
        serviceTitle: service?.title,
        serviceType: booking.serviceType,
        quantity: booking.quantity,
        bookingDate: providerBookingDate,
        bookingTime: providerBookingTime,
        bookingAddress: booking.address || 'N/A',
        paymentDetails: paymentDetails,
        googleMeetLink: googleMeetLink,
        googleMapLink: provider.settings.googleMapLink,
    });

    const result = { success: true, confirmationParams: new URLSearchParams() };
    if (googleMeetLink) {
        result.confirmationParams.set('googleMeetLink', googleMeetLink);
    }
    return result;

  } catch (error: any) {
    console.error("Error during payment verification and booking update:", error);
    return { success: false, error: "Failed to update booking after payment." };
  }
}

export async function verifySubscriptionPaymentSignature(
    paymentResponse: {
        razorpay_order_id: string;
        razorpay_payment_id: string;
        razorpay_signature: string;
    }
): Promise<{ success: boolean; error?: string; }> {
     const adminSettings = await getAdminSettings();
    if (!adminSettings?.razorpay?.keySecret) {
        throw new Error('Razorpay key secret is not configured.');
    }

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = paymentResponse;
    const body = razorpay_order_id + '|' + razorpay_payment_id;

    const expectedSignature = crypto
        .createHmac('sha256', adminSettings.razorpay.keySecret)
        .update(body.toString())
        .digest('hex');

    if (expectedSignature !== razorpay_signature) {
        return { success: false, error: 'Invalid payment signature.' };
    }

    return { success: true };
}

export async function updateProviderSubscription(
    username: string, 
    planId: string, 
    paymentDetails: {razorpay_payment_id: string; razorpay_order_id: string; amount?: number; }
): Promise<{ success: boolean; error?: string; provider?: EnrichedProvider }> {
  try {
    const plan = await getPlan(planId);
    if (!plan) {
      throw new Error('Plan not found');
    }

    const provider = await getProviderByUsername(username);
    if (!provider) {
        throw new Error('Provider not found');
    }

    if (plan.duration === 'trial' && provider.hasUsedTrial) {
        return { success: false, error: 'You have already used your trial plan. Please choose a paid plan.' };
    }
    
    let newExpiryDate: Date;
    const now = new Date();
    
    const isRenewal = !!(provider.planId && provider.planExpiry && provider.planExpiry > now);
    const baseDateForExpiry = isRenewal ? provider.planExpiry! : now;

    let notificationMessage = '';
    if (isRenewal) {
        const currentPlan = await getPlan(provider.planId!);
        if (currentPlan && plan.price > currentPlan.price) {
            notificationMessage = `${provider.name} has upgraded their plan to ${plan.name}.`;
        } else {
            notificationMessage = `${provider.name} has renewed their ${plan.name} plan.`;
        }
    } else {
        notificationMessage = `${provider.name} has subscribed to the ${plan.name} plan.`;
    }

    const providerUpdateData: Partial<Provider> = {
        planId: plan.id,
        hasUsedTrial: provider.hasUsedTrial || plan.duration === 'trial',
    };

    switch (plan.duration) {
      case 'monthly':
        newExpiryDate = addMonths(baseDateForExpiry, 1);
        break;
      case 'yearly':
        newExpiryDate = addYears(baseDateForExpiry, 1);
        break;
      case 'lifetime':
        newExpiryDate = new Date('9999-12-31');
        break;
       case 'trial':
         newExpiryDate = addDays(baseDateForExpiry, plan.days || 7);
        break;
      default:
        throw new Error('Invalid plan duration');
    }

    providerUpdateData.planExpiry = newExpiryDate;

    await updateProvider(username, providerUpdateData);

    const amountPaid = paymentDetails.amount;

    if (amountPaid != null && amountPaid > 0) {
       if (!paymentDetails.razorpay_payment_id || !paymentDetails.razorpay_order_id) {
        throw new Error('Payment details are required for paid plans.');
      }
      await createPaymentRecord({
        providerUsername: username,
        planId: plan.id,
        amount: amountPaid,
        currency: 'INR',
        razorpay_payment_id: paymentDetails.razorpay_payment_id,
        razorpay_order_id: paymentDetails.razorpay_order_id,
      });
    }

    if (notificationMessage) {
        await addNotification('admin', {
            message: notificationMessage,
            type: 'general',
            link: `/admin/providers`,
        });
    }

    await sendSubscriptionEmail(provider.contact.email, provider.name, plan.name, newExpiryDate, isRenewal);
    
    const updatedProvider = await getProviderByUsername(username);
    if (!updatedProvider) {
        throw new Error("Could not re-fetch provider data after update.");
    }
    const enrichedProvider: EnrichedProvider = { ...updatedProvider, plan };

    revalidatePath('/', 'layout');

    return { success: true, provider: enrichedProvider };
  } catch (error: any) {
    console.error('Subscription update failed:', error);
    return { success: false, error: error.message || 'Failed to update subscription.' };
  }
}

export async function createRazorpayOrder(amount: number, currency: string, id: string, keys?: { keyId: string; keySecret: string; }) {
    let razorpay: Razorpay;
    if (keys) {
      razorpay = new Razorpay({
        key_id: keys.keyId,
        key_secret: keys.keySecret,
      });
    } else {
      const adminSettings = await getAdminSettings();
      if (!adminSettings?.razorpay?.keyId || !adminSettings?.razorpay?.keySecret) {
          throw new Error('Razorpay settings not configured.');
      }
      razorpay = new Razorpay({
          key_id: adminSettings.razorpay.keyId,
          key_secret: adminSettings.razorpay.keySecret,
      });
    }

    const options = {
        amount: amount * 100,
        currency,
        receipt: `receipt_order_${new Date().getTime()}`,
        payment_capture: 1,
    };

    try {
        const order = await razorpay.orders.create(options);
        return order;
    } catch (error) {
        console.error('Razorpay order creation failed:', error);
        throw new Error('Could not create Razorpay order.');
    }
}

export async function cancelBooking(provider: Provider, booking: Booking) {
  try {
    await updateBookingStatus(provider.username, booking.id, 'Canceled');

    const timezone = provider.settings.timezone;
    const dateFormat = provider.settings.dateFormat || 'PPP';
    const bookingDate = formatInTimeZone(booking.dateTime, timezone, dateFormat);
    const bookingTime = formatInTimeZone(booking.dateTime, timezone, 'p');
    const service = await getServiceById(provider.username, booking.serviceId);

    await sendBookingCancelledEmail(booking.customerEmail, {
      customerName: booking.customerName,
      providerName: provider.name,
      serviceTitle: service?.title,
      serviceType: booking.serviceType,
      bookingDate: bookingDate,
      bookingTime: bookingTime,
    });
    
    revalidatePath(`/(provider-dashboard)/bookings`);
    return { success: true };
  } catch (error: any) {
    console.error('Booking cancellation failed:', error);
    return { success: false, error: error.message || 'Failed to cancel booking.' };
  }
}

export async function rescheduleBooking(username: string, bookingId: string, newDateTime: Date) {
  try {
    const provider = await getProviderByUsername(username);
    const booking = await getBookingById(username, bookingId);
    
    if (!provider || !booking) {
      throw new Error("Provider or booking not found.");
    }

    const service = await getServiceById(provider.username, booking.serviceId);

    await updateBooking(username, bookingId, { dateTime: newDateTime });

    const timezone = provider.settings.timezone;
    const dateFormat = provider.settings.dateFormat || 'PPP';
    const newBookingDate = formatInTimeZone(newDateTime, timezone, dateFormat);
    const newBookingTime = formatInTimeZone(newDateTime, timezone, 'p');

    await sendRescheduleEmail(booking.customerEmail, {
      customerName: booking.customerName,
      providerName: provider.name,
      newBookingDate,
      newBookingTime,
      serviceTitle: service?.title,
      serviceType: booking.serviceType
    });

    await sendProviderRescheduleEmail(provider.contact.email, {
      providerName: provider.name,
      customerName: booking.customerName,
      newBookingDate,
      newBookingTime,
      serviceTitle: service?.title,
      serviceType: booking.serviceType
    });

    revalidatePath(`/(provider-dashboard)/bookings`);
    return { success: true };
  } catch (error: any) {
    console.error("Reschedule failed:", error);
    return { success: false, error: error.message || "Could not reschedule booking." };
  }
}

export async function updateBlockedSlots(username: string, slotISO: string, shouldBlock: boolean) {
    try {
        const provider = await getProviderByUsername(username);
        if (!provider) throw new Error("Provider not found");

        const currentBlockedSlots = provider.settings.blockedSlots || [];
        
        let newBlockedSlots: string[];
        if (shouldBlock) {
            newBlockedSlots = [...currentBlockedSlots, slotISO];
        } else {
            newBlockedSlots = currentBlockedSlots.filter(s => s !== slotISO);
        }
        
        await updateProvider(username, { settings: { ...provider.settings, blockedSlots: newBlockedSlots } });
        revalidatePath(`/(provider-dashboard)/slot-management`);
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}


export async function updateBlockedDates(username: string, dates: string[], shouldBlock: boolean) {
    try {
        const provider = await getProviderByUsername(username);
        if (!provider) throw new Error("Provider not found");

        const currentBlockedDates = provider.settings.blockedDates || [];
        
        let newBlockedDates: string[];
        if (shouldBlock) {
            newBlockedDates = [...new Set([...currentBlockedDates, ...dates])];
        } else {
            const datesToUnblockSet = new Set(dates);
            newBlockedDates = currentBlockedDates.filter(d => !datesToUnblockSet.has(d));
        }

        await updateProvider(username, { settings: { ...provider.settings, blockedDates: newBlockedDates } });
        revalidatePath(`/(provider-dashboard)/slot-management`);
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

