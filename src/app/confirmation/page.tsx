

'use client';

import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Calendar, Clock, MapPin, Sparkles, Loader2, Globe, User, Briefcase, Mail, Phone, BadgeCent, Video } from 'lucide-react';
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

function ConfirmationContent() {
    const searchParams = useSearchParams();
    const [isClient, setIsClient] = useState(false);
    
    const customerName = searchParams.get('customerName');
    const customerEmail = searchParams.get('customerEmail');
    const customerPhone = searchParams.get('customerPhone');
    const serviceType = searchParams.get('serviceType');
    const dateTime = searchParams.get('dateTime');
    const providerName = searchParams.get('providerName');
    const providerUsername = searchParams.get('providerUsername');
    const providerEmail = searchParams.get('providerEmail');
    const address = searchParams.get('address');
    const dateFormat = searchParams.get('dateFormat') || 'PPP';
    const timezone = searchParams.get('timezone') || 'UTC';
    const googleMeetLink = searchParams.get('googleMeetLink');
    
    const orderId = searchParams.get('orderId');
    const paymentId = searchParams.get('paymentId');
    const amountPaid = searchParams.get('amountPaid');

    const { formattedDate, formattedTime, calendarLinks } = useMemo(() => {
        if (!dateTime || !timezone) {
            return { formattedDate: 'Loading...', formattedTime: 'Loading...', calendarLinks: null };
        }
        
        const dateObj = new Date(dateTime);
        const fDate = formatInTimeZone(dateObj, timezone, dateFormat);
        const fTime = formatInTimeZone(dateObj, timezone, 'p');

        const eventTitle = encodeURIComponent(`Appointment with ${providerName}`);
        const eventDescription = encodeURIComponent(`Booking for ${serviceType} with ${providerName}.`);
        const eventLocation = encodeURIComponent(googleMeetLink || address || 'Online');
        
        // Google Calendar needs dates in YYYYMMDDTHHMMSSZ format
        const toGoogleISO = (date: Date) => date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
        
        const startTime = new Date(dateObj);
        const endTime = new Date(startTime.getTime() + 60 * 60 * 1000); // Assume 1-hour duration

        const googleLink = `https://www.google.com/calendar/render?action=TEMPLATE&text=${eventTitle}&dates=${toGoogleISO(startTime)}/${toGoogleISO(endTime)}&details=${eventDescription}&location=${eventLocation}&ctz=${timezone}`;

        const outlookLink = `https://outlook.live.com/calendar/0/deeplink/compose?path=/calendar/action/compose&rru=addevent&subject=${eventTitle}&startdt=${startTime.toISOString()}&enddt=${endTime.toISOString()}&body=${eventDescription}&location=${eventLocation}`;

        // Create ICS file content
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


        return {
            formattedDate: fDate,
            formattedTime: fTime,
            calendarLinks: { google: googleLink, outlook: outlookLink, ics: icsLink }
        };

    }, [dateTime, dateFormat, timezone, providerName, serviceType, address, googleMeetLink]);

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
                                        <p className="font-medium">{serviceType}</p>
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
                                        <p className="text-muted-foreground">Time</p>
                                        <p className="font-medium">{formattedTime} ({timezone.replace(/_/g, ' ')})</p>
                                    </div>
                                </div>
                                {address && !googleMeetLink && (
                                    <div className="flex items-start gap-3">
                                        <MapPin className="h-5 w-5 text-muted-foreground mt-1" />
                                        <div>
                                            <p className="text-muted-foreground">Location</p>
                                            <p className="font-medium">{address}</p>
                                        </div>
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

                        {amountPaid && (
                            <>
                                <Separator />
                                <div>
                                    <h3 className="font-semibold text-base mb-3">Payment Details</h3>
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-3">
                                            <BadgeCent className="h-5 w-5 text-muted-foreground" />
                                            <div>
                                                <p className="text-muted-foreground">Amount Paid</p>
                                                <p className="font-medium">₹{amountPaid}</p>
                                            </div>
                                        </div>
                                         <div className="flex items-center gap-3">
                                            <div className="h-5 w-5 text-muted-foreground text-xs font-mono ml-0.5">ID</div>
                                            <div>
                                                <p className="text-muted-foreground">Payment ID</p>
                                                <p className="font-mono text-xs">{paymentId}</p>
                                            </div>
                                        </div>
                                    </div>
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
