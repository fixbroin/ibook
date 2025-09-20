
'use server';

import { redirect } from 'next/navigation';
import { addBooking, getProviderByUsername, updateProvider, getPlan, getAdminSettings, createPaymentRecord, updateBookingStatus, getBookingById, updateBooking } from './data';
import type { ServiceType, Booking, Plan, Provider, EnrichedProvider } from './types';
import { BookingSchema } from './schema';
import { format, formatInTimeZone } from 'date-fns-tz';
import { addDays, addMonths, addYears } from 'date-fns';
import { revalidatePath } from 'next/cache';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import { sendSubscriptionEmail, sendBookingConfirmationEmail, sendProviderBookingNotificationEmail, sendBookingCancelledEmail, sendRescheduleEmail, sendProviderRescheduleEmail } from './email-templates';


export async function createBooking(
  formData: FormData
): Promise<{ errors?: any } | void> {
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

  const bookingDateTime = new Date(data.dateTime);
  const timezone = provider.settings.timezone;
  const dateFormat = provider.settings.dateFormat || 'PPP';

  const fullAddress = data.serviceType === 'Doorstep' 
    ? `${data.flatHouseNo}, ${data.landmark ? data.landmark + ', ' : ''}${data.city}, ${data.state} - ${data.pincode}, ${data.country}`
    : data.serviceType === 'Shop Visit' ? provider.settings.shopAddress : 'Online';

  const bookingDate = formatInTimeZone(bookingDateTime, timezone, dateFormat);
  const bookingTime = formatInTimeZone(bookingDateTime, timezone, 'p');
  
  // --- Generate Calendar Links ---
  const eventTitle = encodeURIComponent(`Appointment with ${provider.name}`);
  const eventDescription = encodeURIComponent(`Booking for ${data.serviceType} with ${provider.name}.`);
  const eventLocation = encodeURIComponent(fullAddress || 'Online');
  const toGoogleISO = (date: Date) => date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const startTime = new Date(bookingDateTime);
  const endTime = new Date(startTime.getTime() + (provider.settings.slotDuration || 60) * 60 * 1000); // Duration from provider settings or default 1hr

  const googleLink = `https://www.google.com/calendar/render?action=TEMPLATE&text=${eventTitle}&dates=${toGoogleISO(startTime)}/${toGoogleISO(endTime)}&details=${eventDescription}&location=${eventLocation}&ctz=${timezone}`;
  const outlookLink = `https://outlook.live.com/calendar/0/deeplink/compose?path=/calendar/action/compose&rru=addevent&subject=${eventTitle}&startdt=${startTime.toISOString()}&enddt=${endTime.toISOString()}&body=${eventDescription}&location=${eventLocation}`;
  const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'BEGIN:VEVENT',
      `DTSTART;TZID=${timezone}:${toGoogleISO(startTime).slice(0, -1)}`,
      `DTEND;TZID=${timezone}:${toGoogleISO(endTime).slice(0, -1)}`,
      `SUMMARY:${eventTitle}`,
      `DESCRIPTION:${eventDescription}`,
      `LOCATION:${eventLocation}`,
      'END:VEVENT',
      'END:VCALENDAR'
  ].join('\r\n');
  const icsLink = `data:text/calendar;charset=utf-8,${encodeURIComponent(icsContent)}`;

  // Send the templated booking confirmation email to the CUSTOMER
  await sendBookingConfirmationEmail(data.customerEmail, {
      customerName: data.customerName,
      providerName: provider.name,
      serviceType: data.serviceType,
      bookingDate: bookingDate,
      bookingTime: bookingTime,
      bookingAddress: fullAddress || 'N/A',
      googleLink,
      outlookLink,
      icsLink,
  });

  // Send the templated booking notification email to the PROVIDER
  await sendProviderBookingNotificationEmail(provider.contact.email, {
      providerName: provider.name,
      customerName: data.customerName,
      customerEmail: data.customerEmail,
      customerPhone: data.customerPhone,
      serviceType: data.serviceType,
      bookingDate: bookingDate,
      bookingTime: bookingTime,
      bookingAddress: fullAddress || 'N/A'
  });
  
  const booking: Omit<Booking, 'id' | 'status'> = {
    customerName: data.customerName,
    customerEmail: data.customerEmail,
    customerPhone: data.customerPhone,
    serviceType: data.serviceType as ServiceType,
    dateTime: bookingDateTime,
    providerUsername: data.providerUsername,
    address: fullAddress || undefined,
  };

  if (data.serviceType === 'Doorstep') {
    booking.flatHouseNo = data.flatHouseNo;
    booking.landmark = data.landmark;
    booking.pincode = data.pincode;
    booking.city = data.city;
    booking.state = data.state;
    booking.country = data.country;
  }
  
  await addBooking(booking);

  // For the confirmation page, we can pass a simpler set of params
  const params = new URLSearchParams();
  params.set('customerName', data.customerName);
  params.set('customerEmail', data.customerEmail);
  params.set('customerPhone', data.customerPhone);
  params.set('serviceType', data.serviceType);
  params.set('dateTime', bookingDateTime.toISOString());
  params.set('providerName', provider.name);
  params.set('providerEmail', provider.contact.email);
  if (fullAddress) {
    params.set('address', fullAddress);
  }
  params.set('dateFormat', dateFormat);
  params.set('timezone', timezone);

  redirect(`/confirmation?${params.toString()}`);
}

export async function verifyRazorpayPayment(details: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string; }) {
  const adminSettings = await getAdminSettings();
  if (!adminSettings?.razorpay?.keySecret) {
    throw new Error('Razorpay key secret is not configured.');
  }

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = details;
  const body = razorpay_order_id + '|' + razorpay_payment_id;

  const expectedSignature = crypto
    .createHmac('sha256', adminSettings.razorpay.keySecret)
    .update(body.toString())
    .digest('hex');

  const isAuthentic = expectedSignature === razorpay_signature;

  return { isAuthentic };
}

export async function updateProviderSubscription(
    username: string, 
    planId: string, 
    paymentDetails: {razorpay_payment_id: string, razorpay_order_id: string, razorpay_signature: string}
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
    
    // Use current expiry if it exists and is in the future, otherwise use today
    const now = new Date();
    const isRenewalOfActivePlan = provider.planId && provider.planExpiry && provider.planExpiry > now;
    const isNewSubscriptionOrRenewalOfExpired = !isRenewalOfActivePlan;
    const baseDateForExpiry = isNewSubscriptionOrRenewalOfExpired ? now : provider.planExpiry!;

    let newExpiryDate: Date;
    
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
        // Set a very distant future date for lifetime plans
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

    // If it's a paid plan, create a payment record
    if (plan.price > 0) {
       if (!paymentDetails) {
        throw new Error('Payment details are required for paid plans.');
      }
      await createPaymentRecord({
        providerUsername: username,
        planId: plan.id,
        amount: plan.price,
        currency: 'INR', // Assuming INR for now
        razorpay_payment_id: paymentDetails.razorpay_payment_id,
        razorpay_order_id: paymentDetails.razorpay_order_id,
      });
    }

    // Send subscription email
    await sendSubscriptionEmail(provider.contact.email, provider.name, plan.name, newExpiryDate, !!isRenewalOfActivePlan);
    
    // Re-fetch the updated provider data to return to the client
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

export async function createRazorpayOrder(amount: number, currency: string, id: string) {
    const adminSettings = await getAdminSettings();
    if (!adminSettings?.razorpay?.keyId || !adminSettings?.razorpay?.keySecret) {
        throw new Error('Razorpay settings not configured.');
    }

    const razorpay = new Razorpay({
        key_id: adminSettings.razorpay.keyId,
        key_secret: adminSettings.razorpay.keySecret,
    });

    const options = {
        amount: amount * 100, // amount in the smallest currency unit
        currency,
        receipt: `receipt_order_${new Date().getTime()}`,
        payment_capture: 1, // Auto capture payment
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

    await sendBookingCancelledEmail(booking.customerEmail, {
      customerName: booking.customerName,
      providerName: provider.name,
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

    await updateBooking(username, bookingId, { dateTime: newDateTime });

    const timezone = provider.settings.timezone;
    const dateFormat = provider.settings.dateFormat || 'PPP';
    const newBookingDate = formatInTimeZone(newDateTime, timezone, dateFormat);
    const newBookingTime = formatInTimeZone(newDateTime, timezone, 'p');

    // Send notification to customer
    await sendRescheduleEmail(booking.customerEmail, {
      customerName: booking.customerName,
      providerName: provider.name,
      newBookingDate,
      newBookingTime,
      serviceType: booking.serviceType
    });

    // Send notification to provider
    await sendProviderRescheduleEmail(provider.contact.email, {
      providerName: provider.name,
      customerName: booking.customerName,
      newBookingDate,
      newBookingTime,
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
