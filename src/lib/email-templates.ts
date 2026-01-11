

'use server';

import { format } from 'date-fns';
import { sendEmail } from './email';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:9002';

export async function sendWelcomeEmail(to: string, name: string) {
    await sendEmail({
        to,
        subject: `Welcome to BroBookMe, ${name}!`,
        template: 'welcome_email.html',
        data: {
            name: name,
            dashboardUrl: `${siteUrl}/dashboard`
        }
    });
}

export async function sendSubscriptionEmail(to: string, name: string, planName: string, expiryDate: Date, isRenewal: boolean) {
    if (isRenewal) {
         await sendEmail({
            to,
            subject: 'Your BroBookMe Subscription has been Renewed',
            template: 'renewal_email.html',
            data: {
                name: name,
                planName: planName,
                nextBillingDate: format(expiryDate, 'PPP')
            }
        });
    } else {
        await sendEmail({
            to,
            subject: 'Your BroBookMe Subscription is Active!',
            template: 'subscribed_email.html',
            data: {
                name: name,
                planName: planName,
                expiryDate: format(expiryDate, 'PPP'),
                subscriptionUrl: `${siteUrl}/subscription`
            }
        });
    }
}


export async function sendBookingConfirmationEmail(to: string, data: {
    customerName: string;
    providerName: string;
    serviceTitle?: string | null;
    serviceType: string;
    quantity?: number | null;
    bookingDate: string;
    bookingTime: string;
    bookingTimeProvider: string;
    bookingAddress: string;
    googleLink: string;
    outlookLink: string;
    icsLink: string;
    paymentDetails: string;
    googleMeetLink?: string | null;
    googleMapLink?: string | null;
}) {
    let locationDetails = data.bookingAddress;
    if (data.googleMeetLink) {
        locationDetails = `<a href="${data.googleMeetLink}" target="_blank">Join Google Meet</a>`;
    } else if (data.googleMapLink) {
        locationDetails = `${data.bookingAddress} <br> <a href="${data.googleMapLink}" target="_blank">View on Map</a>`;
    }

    const serviceTitleWithQuantity = data.quantity && data.quantity > 1 
        ? `${data.serviceTitle || data.serviceType} (x${data.quantity})`
        : data.serviceTitle || data.serviceType;

    await sendEmail({
        to,
        subject: `Booking Confirmed with ${data.providerName}`,
        template: 'booking_email.html',
        data: {
            ...data,
            serviceTitle: serviceTitleWithQuantity,
            locationDetails: locationDetails,
        }
    });
}

export async function sendProviderBookingNotificationEmail(to: string, data: {
    providerName: string;
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    serviceTitle?: string | null;
    serviceType: string;
    quantity?: number | null;
    bookingDate: string;
    bookingTime: string;
    bookingAddress: string;
    paymentDetails: string;
    googleMeetLink?: string | null;
    googleMapLink?: string | null;
}) {
    let locationDetails = data.bookingAddress;
    if (data.googleMeetLink) {
        locationDetails = `<a href="${data.googleMeetLink}" target="_blank">Google Meet Link</a>`;
    } else if (data.googleMapLink) {
        locationDetails = `${data.bookingAddress} <br> <a href="${data.googleMapLink}" target="_blank">View on Map</a>`;
    }

    const serviceTitleWithQuantity = data.quantity && data.quantity > 1 
        ? `${data.serviceTitle || data.serviceType} (x${data.quantity})`
        : data.serviceTitle || data.serviceType;
        
    await sendEmail({
        to,
        subject: `New Booking from ${data.customerName}`,
        template: 'provider_booking_notification.html',
        data: {
            ...data,
            serviceTitle: serviceTitleWithQuantity,
            locationDetails: locationDetails,
        }
    });
}

export async function sendBookingCancelledEmail(to: string, data: {
    customerName: string;
    providerName: string;
    serviceTitle?: string | null;
    serviceType: string;
    bookingDate: string;
    bookingTime: string;
}) {
    await sendEmail({
        to,
        subject: `Booking Canceled with ${data.providerName}`,
        template: 'booking_cancelled_email.html',
        data: {
            ...data,
            serviceTitle: data.serviceTitle || data.serviceType,
        }
    });
}

export async function sendRescheduleEmail(to: string, data: { customerName: string; providerName: string; newBookingDate: string; newBookingTime: string; serviceTitle?: string | null; serviceType: string; }) {
    await sendEmail({
        to,
        subject: `Your Booking with ${data.providerName} has been Rescheduled`,
        template: 'reschedule_email.html',
        data: {
            ...data,
            serviceTitle: data.serviceTitle || data.serviceType,
        }
    });
}

export async function sendProviderRescheduleEmail(to: string, data: { providerName: string; customerName: string; newBookingDate: string; newBookingTime: string; serviceTitle?: string | null; serviceType: string; }) {
     await sendEmail({
        to,
        subject: `Booking Rescheduled for ${data.customerName}`,
        template: 'provider_reschedule_email.html',
        data: {
            ...data,
            serviceTitle: data.serviceTitle || data.serviceType,
        }
    });
}


export async function sendAccountStatusEmail(to: string, name: string, isSuspended: boolean) {
    const status_title = isSuspended ? "Your Account Has Been Suspended" : "Your Account Has Been Reinstated";
    const status_message = isSuspended 
        ? "Your BroBookMe account has been suspended. You will not be able to log in or receive new bookings. Please contact support for more information."
        : "Your BroBookMe account has been reinstated. You can now log in and continue using our services. Welcome back!";

    await sendEmail({
        to,
        subject: status_title,
        template: 'account_status_email.html',
        data: {
            name: name,
            status_title: status_title,
            status_message: status_message
        }
    });
}


// These are for future implementation with a cron job
export async function sendExpiryReminderEmail(to: string, name: string, planName: string, daysRemaining: number) {
     await sendEmail({
        to,
        subject: 'Your BroBookMe Subscription is Expiring Soon',
        template: 'reminder_email.html',
        data: {
            name,
            planName,
            daysRemaining: String(daysRemaining),
            subscriptionUrl: `${siteUrl}/subscription`
        }
    });
}

export async function sendPlanExpiredEmail(to: string, name: string, planName: string) {
      await sendEmail({
        to,
        subject: 'Your BroBookMe Subscription Has Expired',
        template: 'expiry_email.html',
        data: {
            name,
            planName,
            subscriptionUrl: `${siteUrl}/subscription`
        }
    });
}

export async function sendAdminNewProviderNotificationEmail(to: string, data: {
    providerName: string;
    providerEmail: string;
    joinDate: string;
}) {
    await sendEmail({
        to,
        subject: 'New Provider Signup on BroBookMe',
        template: 'admin_new_provider_notification.html',
        data: data
    });
}
