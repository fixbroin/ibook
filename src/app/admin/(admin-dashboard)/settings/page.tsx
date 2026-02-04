
'use client';

import { useEffect, useState, useTransition } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { getAdminSettings } from '@/lib/data';
import { updatePaymentSettings, updateEmailSettings, updateApiSettings } from '@/lib/admin.actions';
import type { RazorpaySettings, SmtpSettings, GoogleApiSettings, OutlookApiSettings } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function AdminSettingsPage() {
    const [razorpaySettings, setRazorpaySettings] = useState<RazorpaySettings>({ keyId: '', keySecret: '', webhookSecret: '' });
    const [smtpSettings, setSmtpSettings] = useState<SmtpSettings>({ host: '', port: 587, senderEmail: '', username: '', password: '' });
    const [googleApiSettings, setGoogleApiSettings] = useState<GoogleApiSettings>({ clientId: '', clientSecret: '', redirectUri: '' });
    const [outlookApiSettings, setOutlookApiSettings] = useState<OutlookApiSettings>({ clientId: '', clientSecret: '', redirectUri: '' });

    const [loading, setLoading] = useState(true);
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();

    useEffect(() => {
        getAdminSettings().then(settings => {
            if (settings) {
                if (settings.razorpay) {
                    setRazorpaySettings(s => ({...s, keyId: settings.razorpay?.keyId || ''}));
                }
                if (settings.smtp) {
                    setSmtpSettings(s => ({
                        ...s,
                        host: settings.smtp?.host || '',
                        port: settings.smtp?.port || 587,
                        senderEmail: settings.smtp?.senderEmail || '',
                        username: settings.smtp?.username || ''
                    }));
                }
                if (settings.googleApi) {
                    setGoogleApiSettings(settings.googleApi);
                }
                 if (settings.outlookApi) {
                    setOutlookApiSettings(settings.outlookApi);
                }
            }
            setLoading(false);
        });
    }, []);

    const handleSaveSettings = (type: 'payment' | 'email' | 'googleApi' | 'outlookApi') => {
        startTransition(async () => {
            let result;
            if (type === 'payment') {
                result = await updatePaymentSettings(razorpaySettings);
                if (result.success) {
                    setRazorpaySettings(s => ({...s, keySecret: '', webhookSecret: ''}));
                }
            } else if (type === 'email') {
                result = await updateEmailSettings(smtpSettings);
                if (result.success) {
                    setSmtpSettings(s => ({...s, password: ''}));
                }
            } else if (type === 'googleApi') {
                 result = await updateApiSettings('googleApi', googleApiSettings);
                 if (result.success) {
                    setGoogleApiSettings(s => ({...s, clientSecret: ''}));
                 }
            } else if (type === 'outlookApi') {
                 result = await updateApiSettings('outlookApi', outlookApiSettings);
                 if (result.success) {
                    setOutlookApiSettings(s => ({...s, clientSecret: ''}));
                 }
            }


            if (result?.success) {
                toast({ title: "Success", description: `Settings have been saved.` });
            } else if (result?.error) {
                toast({ title: "Error", description: result.error, variant: 'destructive' });
            }
        });
    };
    
    if (loading) {
      return <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

  return (
      <Card>
        <CardHeader>
            <CardTitle>General Settings</CardTitle>
            <CardDescription>Manage platform-wide integrations and settings.</CardDescription>
        </CardHeader>
        <CardContent>
            <Tabs defaultValue="payment">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="payment">Payment Gateway</TabsTrigger>
                    <TabsTrigger value="email">Email (SMTP)</TabsTrigger>
                    <TabsTrigger value="api">API Credentials</TabsTrigger>
                </TabsList>
                <TabsContent value="payment" className="pt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Razorpay</CardTitle>
                            <CardDescription>Configure Razorpay integration settings. Stored securely on the server.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <Alert>
                                <AlertTitle>Important Note</AlertTitle>
                                <AlertDescription>
                                    Your secrets are sensitive and write-only. If you need to change them, enter a new value. Leaving a secret field blank will not change the existing secret.
                                </AlertDescription>
                            </Alert>
                            <div className="space-y-2">
                                <Label htmlFor="razorpayKeyId">Razorpay Key ID</Label>
                                <Input id="razorpayKeyId" placeholder="rzp_live_..." value={razorpaySettings.keyId} onChange={e => setRazorpaySettings({...razorpaySettings, keyId: e.target.value})} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="razorpayKeySecret">Razorpay Key Secret</Label>
                                <Input id="razorpayKeySecret" type="password" placeholder="Enter new secret to update" value={razorpaySettings.keySecret} onChange={e => setRazorpaySettings({...razorpaySettings, keySecret: e.target.value})} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="razorpayWebhookSecret">Razorpay Webhook Secret</Label>
                                <Input id="razorpayWebhookSecret" type="password" placeholder="Enter new webhook secret to update" value={razorpaySettings.webhookSecret} onChange={e => setRazorpaySettings({...razorpaySettings, webhookSecret: e.target.value})} />
                            </div>
                            <Button onClick={() => handleSaveSettings('payment')} disabled={isPending}>
                            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save Payment Settings
                            </Button>
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="email" className="pt-6">
                    <Card>
                         <CardHeader>
                            <CardTitle>SMTP Configuration</CardTitle>
                            <CardDescription>Set up your transactional email provider.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <Alert>
                                <AlertTitle>Important Note</AlertTitle>
                                <AlertDescription>
                                    Your SMTP password is sensitive and write-only. If you need to change it, enter a new value. Leaving it blank will not change the existing password.
                                </AlertDescription>
                            </Alert>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="smtpHost">SMTP Host</Label>
                                    <Input id="smtpHost" placeholder="smtp.example.com" value={smtpSettings.host} onChange={e => setSmtpSettings({...smtpSettings, host: e.target.value})} />
                                </div>
                                 <div className="space-y-2">
                                    <Label htmlFor="smtpPort">Port</Label>
                                    <Input id="smtpPort" type="number" placeholder="587" value={smtpSettings.port} onChange={e => setSmtpSettings({...smtpSettings, port: Number(e.target.value)})} />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="senderEmail">Sender Email</Label>
                                <Input id="senderEmail" placeholder="no-reply@slots.fixbro.in" value={smtpSettings.senderEmail} onChange={e => setSmtpSettings({...smtpSettings, senderEmail: e.target.value})} />
                            </div>
                             <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="smtpUsername">SMTP Username</Label>
                                    <Input id="smtpUsername" placeholder="Your username" value={smtpSettings.username} onChange={e => setSmtpSettings({...smtpSettings, username: e.target.value})} />
                                </div>
                                 <div className="space-y-2">
                                    <Label htmlFor="smtpPassword">SMTP Password</Label>
                                    <Input id="smtpPassword" type="password" placeholder="Enter new password to update" value={smtpSettings.password} onChange={e => setSmtpSettings({...smtpSettings, password: e.target.value})} />
                                </div>
                            </div>
                            <Button onClick={() => handleSaveSettings('email')} disabled={isPending}>
                            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save Email Settings
                            </Button>
                        </CardContent>
                    </Card>
                </TabsContent>
                 <TabsContent value="api" className="pt-6 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Google API</CardTitle>
                            <CardDescription>Credentials for Google Calendar integration.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="googleClientId">Client ID</Label>
                                <Input id="googleClientId" value={googleApiSettings.clientId} onChange={e => setGoogleApiSettings({...googleApiSettings, clientId: e.target.value})} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="googleClientSecret">Client Secret</Label>
                                <Input id="googleClientSecret" type="password" placeholder="Enter new secret to update" value={googleApiSettings.clientSecret} onChange={e => setGoogleApiSettings({...googleApiSettings, clientSecret: e.target.value})} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="googleRedirectUri">Redirect URI</Label>
                                <Input id="googleRedirectUri" value={googleApiSettings.redirectUri} onChange={e => setGoogleApiSettings({...googleApiSettings, redirectUri: e.target.value})} />
                            </div>
                             <Button onClick={() => handleSaveSettings('googleApi')} disabled={isPending}>
                                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Save Google API Settings
                            </Button>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>Outlook API</CardTitle>
                            <CardDescription>Credentials for Outlook Calendar integration.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                           <div className="space-y-2">
                                <Label htmlFor="outlookClientId">Client ID</Label>
                                <Input id="outlookClientId" value={outlookApiSettings.clientId} onChange={e => setOutlookApiSettings({...outlookApiSettings, clientId: e.target.value})} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="outlookClientSecret">Client Secret</Label>
                                <Input id="outlookClientSecret" type="password" placeholder="Enter new secret to update" value={outlookApiSettings.clientSecret} onChange={e => setOutlookApiSettings({...outlookApiSettings, clientSecret: e.target.value})} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="outlookRedirectUri">Redirect URI</Label>
                                <Input id="outlookRedirectUri" value={outlookApiSettings.redirectUri} onChange={e => setOutlookApiSettings({...outlookApiSettings, redirectUri: e.target.value})} />
                            </div>
                             <Button onClick={() => handleSaveSettings('outlookApi')} disabled={isPending}>
                                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Save Outlook API Settings
                            </Button>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </CardContent>
    </Card>
  );
}
