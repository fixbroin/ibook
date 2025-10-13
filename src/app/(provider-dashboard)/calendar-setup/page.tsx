
'use client';

import { useEffect, useState, useTransition } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, XCircle, ExternalLink } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { auth } from '@/lib/firebase';
import { getProviderByUsername } from '@/lib/data';
import type { Provider } from '@/lib/types';
import { getGoogleAuthUrl, getOutlookAuthUrl, disconnectCalendar } from '@/lib/calendar.actions';

type ActionType = 'connect-google' | 'disconnect-google' | 'connect-outlook' | 'disconnect-outlook';

function CalendarConnectionCard({
    title,
    description,
    logo,
    isConnected,
    onConnect,
    onDisconnect,
    isPending,
    providerType
}: {
    title: string;
    description: string;
    logo: React.ReactNode;
    isConnected: boolean;
    onConnect: () => void;
    onDisconnect: (type: 'google' | 'outlook') => void;
    isPending: boolean;
    providerType: 'google' | 'outlook';
}) {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center gap-4 space-y-0">
                {logo}
                <div className="flex-1">
                    <CardTitle>{title}</CardTitle>
                    <CardDescription>{description}</CardDescription>
                </div>
            </CardHeader>
            <CardContent>
                {isConnected ? (
                    <div className="flex items-center justify-between p-4 bg-secondary rounded-lg">
                        <div className="flex items-center gap-2 text-green-600">
                            <CheckCircle className="h-5 w-5" />
                            <span className="font-semibold">Connected</span>
                        </div>
                        <Button variant="destructive" size="sm" onClick={() => onDisconnect(providerType)} disabled={isPending}>
                            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Disconnect
                        </Button>
                    </div>
                ) : (
                    <Button className="w-full" onClick={onConnect} disabled={isPending}>
                         {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Connect to {title}
                    </Button>
                )}
            </CardContent>
        </Card>
    );
}


export default function CalendarSetupPage() {
    const [user, setUser] = useState<User | null>(null);
    const [provider, setProvider] = useState<Provider | null>(null);
    const [loading, setLoading] = useState(true);
    const [processingAction, setProcessingAction] = useState<ActionType | null>(null);
    const [isPending, startTransition] = useTransition();

    const router = useRouter();
    const searchParams = useSearchParams();
    const { toast } = useToast();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            if (currentUser && currentUser.email) {
                setUser(currentUser);
                const username = currentUser.email.split('@')[0];
                getProviderByUsername(username).then(providerData => {
                    if (providerData) {
                        setProvider(providerData);
                    } else {
                        toast({ title: "Error", description: "Provider not found.", variant: 'destructive' });
                        router.push('/dashboard');
                    }
                }).finally(() => setLoading(false));
            } else {
                router.push('/login');
            }
        });
        return () => unsubscribe();
    }, [router, toast]);
    
    useEffect(() => {
        const error = searchParams.get('error');
        if(error) {
            toast({
                title: 'Connection Failed',
                description: error,
                variant: 'destructive'
            });
            // Clean up the URL
            router.replace('/calendar-setup');
        }
    }, [searchParams, router, toast]);

    const handleConnect = (type: 'google' | 'outlook') => {
        if (!provider) return;

        const action: ActionType = `connect-${type}`;
        setProcessingAction(action);
        
        startTransition(async () => {
            let result;
            if (type === 'google') {
                result = await getGoogleAuthUrl(provider.username);
            } else {
                result = await getOutlookAuthUrl();
            }

            if (result.success && result.url) {
                window.location.href = result.url;
            } else {
                toast({
                    title: 'Error',
                    description: result.error || 'Could not get authentication URL.',
                    variant: 'destructive',
                });
                setProcessingAction(null);
            }
        });
    };
    
    const handleDisconnect = (type: 'google' | 'outlook') => {
        if (!user || !user.email) return;

        const action: ActionType = `disconnect-${type}`;
        setProcessingAction(action);

        startTransition(async () => {
            const username = user.email!.split('@')[0];
            const result = await disconnectCalendar(username, type);
            if(result.success) {
                toast({ title: 'Success', description: `Disconnected from ${type === 'google' ? 'Google' : 'Outlook'} Calendar.` });
                 // Re-fetch provider data
                 getProviderByUsername(username).then(setProvider);
            } else {
                 toast({ title: 'Error', description: result.error, variant: 'destructive' });
            }
            setProcessingAction(null);
        });
    }

    if (loading || !provider) {
        return <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    return (
        <div className="space-y-6">
             <div>
                <h1 className="text-3xl font-bold tracking-tight">Calendar Setup</h1>
                <p className="text-muted-foreground">Connect your calendars to automatically sync bookings and avoid conflicts.</p>
            </div>
            
            <Alert>
                <ExternalLink className="h-4 w-4" />
                <AlertTitle>Two-Way Sync Coming Soon!</AlertTitle>
                <AlertDescription>
                    Currently, connecting your calendar will only push new bookings from this platform to your external calendar. The ability to block off time from events in your external calendar is under development.
                </AlertDescription>
            </Alert>
            
            <div className="grid gap-6 md:grid-cols-2">
                <CalendarConnectionCard
                    title="Google Calendar"
                    description="Connect your Google Calendar to sync bookings automatically."
                    logo={<img src="/google-calendar.png" alt="Google Calendar Logo" className="h-10 w-10" />}
                    isConnected={!!provider.googleCalendar}
                    onConnect={() => handleConnect('google')}
                    onDisconnect={handleDisconnect}
                    isPending={processingAction === 'connect-google' || processingAction === 'disconnect-google'}
                    providerType="google"
                />
                <CalendarConnectionCard
                    title="Outlook Calendar"
                    description="Connect your Outlook Calendar for seamless event synchronization."
                    logo={<img src="/outlook-calendar.png" alt="Outlook Calendar Logo" className="h-10 w-10" />}
                    isConnected={!!provider.outlookCalendar}
                    onConnect={() => handleConnect('outlook')}
                    onDisconnect={handleDisconnect}
                    isPending={processingAction === 'connect-outlook' || processingAction === 'disconnect-outlook'}
                    providerType="outlook"
                />
            </div>
        </div>
    );
}
