
'use client';

import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Calendar, Clock, MapPin, Sparkles, Loader2, Globe } from 'lucide-react';
import { Suspense, useEffect, useState } from 'react';
import { formatInTimeZone } from 'date-fns-tz';

function ConfirmationContent() {
    const searchParams = useSearchParams();
    const [isClient, setIsClient] = useState(false);
    const [formattedDate, setFormattedDate] = useState('Loading...');
    const [formattedTime, setFormattedTime] = useState('Loading...');

    const customerName = searchParams.get('customerName');
    const serviceType = searchParams.get('serviceType');
    const dateTime = searchParams.get('dateTime');
    const providerName = searchParams.get('providerName');
    const address = searchParams.get('address');
    const dateFormat = searchParams.get('dateFormat') || 'PPP';
    const timezone = searchParams.get('timezone') || 'UTC';

    useEffect(() => {
        setIsClient(true);
        if (dateTime && timezone) {
            const dateObj = new Date(dateTime);
            // Use formatInTimeZone to ensure consistency
            setFormattedDate(formatInTimeZone(dateObj, timezone, dateFormat));
            setFormattedTime(formatInTimeZone(dateObj, timezone, 'p'));
        }
    }, [dateTime, dateFormat, timezone]);

    
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
                <div className="text-center">
                    <CheckCircle className="mx-auto h-16 w-16 text-green-500" />
                    <h1 className="mt-4 text-3xl font-bold tracking-tight text-foreground">Booking Confirmed!</h1>
                    <p className="mt-2 text-lg text-muted-foreground">
                        Thank you, {customerName}! Your appointment with {providerName} is set.
                    </p>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Appointment Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 text-sm">
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
                                <p className="font-medium">{formattedTime}</p>
                            </div>
                        </div>
                        {timezone && (
                             <div className="flex items-center gap-3">
                                <Globe className="h-5 w-5 text-muted-foreground" />
                                <div>
                                    <p className="text-muted-foreground">Timezone</p>
                                    <p className="font-medium">{timezone.replace(/_/g, ' ')}</p>
                                </div>
                            </div>
                        )}
                        {address && (
                            <div className="flex items-start gap-3">
                                <MapPin className="h-5 w-5 text-muted-foreground mt-1" />
                                <div>
                                    <p className="text-muted-foreground">Location ({serviceType})</p>
                                    <p className="font-medium">{address}</p>
                                </div>
                            </div>
                        )}
                        <p className="text-xs text-muted-foreground pt-4">A confirmation email has been sent to you with these details.</p>
                    </CardContent>
                </Card>

            </div>
        </div>
    );
}


export default function ConfirmationPage() {
    return (
        <Suspense fallback={<div>Loading confirmation...</div>}>
            <ConfirmationContent />
        </Suspense>
    )
}
