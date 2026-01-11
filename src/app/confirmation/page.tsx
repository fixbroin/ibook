

'use client';

import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Calendar, Clock, MapPin, Sparkles, Loader2, Globe, User, Briefcase, Mail, Phone, BadgeCent, Video, ExternalLink } from 'lucide-react';
import { Suspense, useEffect, useState, useMemo } from 'react';
import { formatInTimeZone } from 'date-fns-tz';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import Link from 'next/link';
import { getCurrency } from '@/lib/currencies';

function ConfirmationContent() {
    const searchParams = useSearchParams();
    const [isClient, setIsClient] = useState(false);
    
    const customerName = searchParams.get('customerName');
    const customerEmail = searchParams.get('customerEmail');
    const customerPhone = searchParams.get('customerPhone');
    const serviceType = searchParams.get('serviceType');
    const serviceTitle = searchParams.get('serviceTitle');
    const quantity = searchParams.get('quantity');
    const dateTime = searchParams.get('dateTime');
    const providerName = searchParams.get('providerName');
    const providerUsername = searchParams.get('providerUsername');
    const providerEmail = searchParams.get('providerEmail');
    const address = searchParams.get('address');
    const dateFormat = searchParams.get('dateFormat') || 'PPP';
    const providerTimezone = searchParams.get('timezone') || 'UTC';
    const customerTimezone = searchParams.get('customerTimezone') || 'UTC';
    const googleMeetLink = searchParams.get('googleMeetLink');
    const googleMapLink = searchParams.get('googleMapLink');
    const currencyCode = searchParams.get('currencyCode');
    
    const orderId = searchParams.get('orderId');
    const paymentId = searchParams.get('paymentId');
    const amountPaid = searchParams.get('amountPaid');
    const totalAmount = searchParams.get('totalAmount');
    
    const currency = useMemo(() => getCurrency(currencyCode), [currencyCode]);

    useEffect(() => {
        // This component is the landing page after a successful booking.
        // It's the right place to clear session/local storage for a fresh start.
        if (typeof window !== 'undefined') {
            const localStorageKey = `bookingState_${providerUsername}`;
            localStorage.removeItem(localStorageKey);
            sessionStorage.removeItem('country_code_detected');
        }
    }, [providerUsername]);


    const { formattedDate, formattedTimeProvider, formattedTimeCustomer, calendarLinks } = useMemo(() => {
        if (!dateTime || !providerTimezone) {
            return { formattedDate: 'Loading...', formattedTimeProvider: 'Loading...', formattedTimeCustomer: 'Loading...', calendarLinks: null };
        }
        
        const dateObj = new Date(dateTime);
        const fDate = formatInTimeZone(dateObj, providerTimezone, dateFormat);
        const fTimeProvider = formatInTimeZone(dateObj, providerTimezone, 'p');
        const fTimeCustomer = formatInTimeZone(dateObj, customerTimezone, 'p');

        const eventTitle = encodeURIComponent(`Appointment: ${serviceTitle || serviceType} with ${providerName}`);
        const eventDescription = encodeURIComponent(`Booking for ${serviceTitle || serviceType} with ${providerName}.`);
        const eventLocation = encodeURIComponent(googleMeetLink || address || 'Online');
        
        const toGoogleISO = (date: Date) => date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
        
        const startTime = new Date(dateObj);
        const endTime = new Date(startTime.getTime() + 60 * 60 * 1000); 

        const googleLink = `https://www.google.com/calendar/render?action=TEMPLATE&text=${eventTitle}&dates=${toGoogleISO(startTime)}/${toGoogleISO(endTime)}&details=${eventDescription}&location=${eventLocation}`;

        const outlookLink = `https://outlook.live.com/calendar/0/deeplink/compose?path=/calendar/action/compose&rru=addevent&subject=${eventTitle}&startdt=${startTime.toISOString()}&enddt=${endTime.toISOString()}&body=${eventDescription}&location=${eventLocation}`;

        const icsContent = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'BEGIN:VEVENT',
            `DTSTART;TZID=${providerTimezone}:${toGoogleISO(startTime).slice(0, -1)}`,
            `DTEND;TZID=${providerTimezone}:${toGoogleISO(endTime).slice(0, -1)}`,
            `SUMMARY:${eventTitle}`,
            `DESCRIPTION:${eventDescription}`,
            `LOCATION:${eventLocation}`,
            'END:VEVENT',
            'END:VCALENDAR'
        ].join('\r\n');

        const icsLink = `data:text/calendar;charset=utf-8,${encodeURIComponent(icsContent)}`;


        return {
            formattedDate: fDate,
            formattedTimeProvider: fTimeProvider,
            formattedTimeCustomer: fTimeCustomer,
            calendarLinks: { google: googleLink, outlook: outlookLink, ics: icsLink }
        };

    }, [dateTime, dateFormat, providerTimezone, customerTimezone, providerName, serviceType, serviceTitle, address, googleMeetLink]);

    useEffect(() => {
        setIsClient(true);
    }, []);

    
    if (!isClient) {
        return (
             <div className="min-h-screen bg-background flex items-center justify-center p-4">
                 <Loader2 className="h-16 w-16 animate-spin" />
            </div>
        );
    }

    const isPayLater = amountPaid === '0' && totalAmount && Number(totalAmount) > 0;
    const isShopVisit = serviceType === 'Shop Visit';
    const quantityNum = quantity ? parseInt(quantity, 10) : 0;

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <div className="max-w-2xl w-full space-y-8">
                 <div className="mx-auto w-full max-w-lg">
                    <Breadcrumb>
                        <BreadcrumbList>
                    
                        <BreadcrumbItem>
                             <BreadcrumbLink asChild>
                                <Link href={`/${providerUsername}`}>{providerName}</Link>
                            </BreadcrumbLink>
                        </BreadcrumbItem>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem>
                            <BreadcrumbPage>Confirmation</BreadcrumbPage>
                        </BreadcrumbItem>
                        </BreadcrumbList>
                    </Breadcrumb>
                </div>

                <div className="text-center">
                    <CheckCircle className="mx-auto h-16 w-16 text-green-500" />
                    <h1 className="mt-4 text-3xl font-bold tracking-tight text-foreground">Booking Confirmed!</h1>
                    <p className="mt-2 text-lg text-muted-foreground">
                        Thank you, {customerName}! Your appointment with {providerName} is set.
                    </p>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Booking Summary</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6 text-sm">
                        
                        <div>
                             <h3 className="font-semibold text-base mb-3">Appointment Information</h3>
                             <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <Briefcase className="h-5 w-5 text-muted-foreground" />
                                    <div>
                                        <p className="text-muted-foreground">Service</p>
                                        <p className="font-medium">{serviceTitle || serviceType} {quantityNum > 1 ? `(x${quantityNum})` : ''}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Calendar className="h-5 w-5 text-muted-foreground" />
                                    <div>
                                        <p className="text-muted-foreground">Date</p>
                                        <p className="font-medium">{formattedDate}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Clock className="h-5 w-5 text-muted-foreground" />
                                    <div>
                                        <p className="text-muted-foreground">Provider's Time</p>
                                        <p className="font-medium">{formattedTimeProvider} ({providerTimezone.replace(/_/g, ' ')})</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Globe className="h-5 w-5 text-muted-foreground" />
                                    <div>
                                        <p className="text-muted-foreground">Your Time</p>
                                        <p className="font-medium">{formattedTimeCustomer} ({customerTimezone.replace(/_/g, ' ')})</p>
                                    </div>
                                </div>
                                {address && !googleMeetLink && (
                                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                                        <div className="flex items-start gap-3">
                                            <MapPin className="h-5 w-5 text-muted-foreground mt-1 flex-shrink-0" />
                                            <div>
                                                <p className="text-muted-foreground">Location ({serviceType})</p>
                                                <p className="font-medium">{address}</p>
                                            </div>
                                        </div>
                                        {googleMapLink && isShopVisit && (
                                            <Button asChild variant="outline" size="sm" className="w-full sm:w-auto">
                                                <Link href={googleMapLink} target="_blank" rel="noopener noreferrer">
                                                    <ExternalLink className="mr-2 h-4 w-4" /> View Map
                                                </Link>
                                            </Button>
                                        )}
                                    </div>
                                )}
                                {googleMeetLink && (
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <Video className="h-5 w-5 text-muted-foreground" />
                                            <div>
                                                <p className="text-muted-foreground">Meeting Link</p>
                                                <p className="font-medium">Online Appointment</p>
                                            </div>
                                        </div>
                                        <Button asChild>
                                            <a href={googleMeetLink} target="_blank" rel="noopener noreferrer">Join Now</a>
                                        </Button>
                                    </div>
                                )}
                             </div>
                        </div>

                        <Separator />
                        
                        <div>
                            <h3 className="font-semibold text-base mb-3">Your Information</h3>
                            <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <User className="h-5 w-5 text-muted-foreground" />
                                    <div>
                                        <p className="text-muted-foreground">Name</p>
                                        <p className="font-medium">{customerName}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Mail className="h-5 w-5 text-muted-foreground" />
                                    <div>
                                        <p className="text-muted-foreground">Email</p>
                                        <p className="font-medium">{customerEmail}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Phone className="h-5 w-5 text-muted-foreground" />
                                    <div>
                                        <p className="text-muted-foreground">Phone</p>
                                        <p className="font-medium">{customerPhone}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <Separator />

                        <div>
                            <h3 className="font-semibold text-base mb-3">Provider Details</h3>
                             <div className="space-y-4">
                                 <div className="flex items-center gap-3">
                                    <User className="h-5 w-5 text-muted-foreground" />
                                    <div>
                                        <p className="text-muted-foreground">Name</p>
                                        <p className="font-medium">{providerName}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Mail className="h-5 w-5 text-muted-foreground" />
                                    <div>
                                        <p className="text-muted-foreground">Email</p>
                                        <p className="font-medium">{providerEmail}</p>
                                    </div>
                                </div>
                             </div>
                        </div>

                        {(amountPaid !== null || isPayLater) && (
                            <>
                                <Separator />
                                <div>
                                    <h3 className="font-semibold text-base mb-3">Payment Details</h3>
                                    {isPayLater ? (
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-3">
                                                <BadgeCent className="h-5 w-5 text-muted-foreground" />
                                                <div>
                                                    <p className="text-muted-foreground">Amount Paid</p>
                                                    <p className="font-medium">{currency?.symbol}0</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <BadgeCent className="h-5 w-5 text-destructive" />
                                                <div>
                                                    <p className="text-muted-foreground">Due Amount</p>
                                                    <p className="font-medium">{currency?.symbol}{totalAmount} (to be paid after service)</p>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-3">
                                                <BadgeCent className="h-5 w-5 text-muted-foreground" />
                                                <div>
                                                    <p className="text-muted-foreground">Amount Paid</p>
                                                    <p className="font-medium">{currency?.symbol}{amountPaid}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <div className="h-5 w-5 text-muted-foreground text-xs font-mono ml-0.5">ID</div>
                                                <div>
                                                    <p className="text-muted-foreground">Payment ID</p>
                                                    {paymentId ? (
                                                        <p className="font-mono text-xs">{paymentId}</p>
                                                    ) : (
                                                        <p className="font-medium">To be paid after service</p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </>
                        )}


                        {calendarLinks && (
                            <>
                                <Separator />
                                <div className="flex flex-col items-center justify-center gap-4 pt-4">
                                    <p className="font-medium">Add to calendar:</p>
                                    <div className="flex items-start gap-6">
                                        <div className="flex flex-col items-center gap-1.5">
                                            <Button asChild variant="outline" size="icon" className="h-9 w-9">
                                                <a href={calendarLinks.google} target="_blank" rel="noopener noreferrer" aria-label="Add to Google Calendar">
                                                    <Image src="/google-calendar.png" alt="Google Calendar" width={20} height={20} />
                                                </a>
                                            </Button>
                                            <p className="text-xs text-muted-foreground">Google</p>
                                        </div>
                                        <div className="flex flex-col items-center gap-1.5">
                                            <Button asChild variant="outline" size="icon" className="h-9 w-9">
                                                <a href={calendarLinks.outlook} target="_blank" rel="noopener noreferrer" aria-label="Add to Outlook Calendar">
                                                    <Image src="/outlook-calendar.png" alt="Outlook Calendar" width={20} height={20} />
                                                </a>
                                            </Button>
                                            <p className="text-xs text-muted-foreground">Outlook</p>
                                        </div>
                                        <div className="flex flex-col items-center gap-1.5">
                                            <Button asChild variant="outline" size="icon" className="h-9 w-9">
                                                <a href={calendarLinks.ics} download="appointment.ics" aria-label="Download calendar file">
                                                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M19.5 3h-1.5V1.5h-3V3H9V1.5h-3V3H4.5A1.5 1.5 0 0 0 3 4.5v15A1.5 1.5 0 0 0 4.5 21h15a1.5 1.5 0 0 0 1.5-1.5v-15A1.5 1.5 0 0 0 19.5 3M6 6h12v3H6zm12 13.5H6V10.5h12zM9 12v1.5h6V12zm0 3v1.5h6V15z"/></svg>
                                                </a>
                                            </Button>
                                            <p className="text-xs text-muted-foreground">Other</p>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}

                        <p className="text-xs text-muted-foreground pt-4 text-center">A confirmation email has been sent to you with these details.</p>
                    </CardContent>
                </Card>

            </div>
        </div>
    );
}


export default function ConfirmationPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center p-4"><Loader2 className="h-16 w-16 animate-spin" /></div>}>
            <ConfirmationContent />
        </Suspense>
    )
}
