
'use client';

import { useEffect, useState, useTransition } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { getAdminSettings } from '@/lib/data';
import { updateMarketingSettings } from '@/lib/admin.actions';
import type { MarketingSettings } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const defaultMarketingSettings: MarketingSettings = {
    googleTagManager: { id: '', enabled: false },
    googleAnalytics: { id: '', enabled: false },
    googleAdsConversion: { id: '', label: '', enabled: false },
    googleOptimize: { id: '', enabled: false },
    googleRemarketing: { id: '', script: '', enabled: false },
    metaPixel: { id: '', accessToken: '', enabled: false },
    metaConversionsApi: { id: '', enabled: false },
    bingUetTag: { id: '', enabled: false },
    pinterestTag: { id: '', enabled: false },
    microsoftClarity: { id: '', enabled: false },
    customHeadScript: { id: '', script: '', enabled: false },
    customBodyScript: { id: '', script: '', enabled: false },
};

const IntegrationField = ({ id, label, placeholder, value, onValueChange }: { id: string, label: string, placeholder: string, value: string, onValueChange: (value: string) => void }) => (
    <div className="space-y-2">
        <Label htmlFor={id}>{label}</Label>
        <Input id={id} placeholder={placeholder} value={value} onChange={e => onValueChange(e.target.value)} />
    </div>
);

const IntegrationSwitch = ({ id, checked, onCheckedChange }: { id: string, checked: boolean, onCheckedChange: (checked: boolean) => void }) => (
    <div className="flex items-center space-x-2">
        <Switch id={`${id}-enabled`} checked={checked} onCheckedChange={onCheckedChange} />
        <Label htmlFor={`${id}-enabled`}>Enable</Label>
    </div>
);

export default function MarketingSetupPage() {
    const [settings, setSettings] = useState<MarketingSettings>(defaultMarketingSettings);
    const [loading, setLoading] = useState(true);
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();

    useEffect(() => {
        getAdminSettings().then(adminSettings => {
            if (adminSettings?.marketing) {
                setSettings({ ...defaultMarketingSettings, ...adminSettings.marketing });
            }
            setLoading(false);
        });
    }, []);

    const handleInputChange = (key: keyof MarketingSettings, field: string, value: string | boolean) => {
        setSettings(prev => ({
            ...prev,
            [key]: {
                ...prev[key],
                [field]: value
            }
        }));
    };

    const handleSave = () => {
        startTransition(async () => {
            const result = await updateMarketingSettings(settings);
            if (result.success) {
                toast({ title: 'Success', description: 'Marketing settings have been saved.' });
            } else {
                toast({ title: 'Error', description: result.error, variant: 'destructive' });
            }
        });
    };

    if (loading) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-10 w-1/3" />
                <Skeleton className="h-96 w-full" />
                <div className="flex justify-end">
                    <Skeleton className="h-10 w-32" />
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Marketing Setup</h1>
                    <p className="text-muted-foreground">Manage marketing and tracking integrations for your website.</p>
                </div>
                <Button onClick={handleSave} disabled={isPending}>
                    {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Changes
                </Button>
            </div>
            
            <p className="text-sm text-muted-foreground">
                How it works: Enable the services you need, paste the corresponding IDs or scripts, and save your changes. The settings will be automatically applied to your live website.
            </p>

            <Tabs defaultValue="google">
                <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="google">Google</TabsTrigger>
                    <TabsTrigger value="meta">Facebook/Meta</TabsTrigger>
                    <TabsTrigger value="other">Other Platforms</TabsTrigger>
                    <TabsTrigger value="custom">Custom Scripts</TabsTrigger>
                </TabsList>
                
                <TabsContent value="google" className="space-y-6 pt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Google Integrations</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 border rounded-lg">
                               <IntegrationField id="gtm" label="Google Tag Manager ID" placeholder="GTM-XXXXXXX" value={settings.googleTagManager.id} onValueChange={val => handleInputChange('googleTagManager', 'id', val)} />
                               <IntegrationSwitch id="gtm" checked={settings.googleTagManager.enabled} onCheckedChange={val => handleInputChange('googleTagManager', 'enabled', val)} />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 border rounded-lg">
                               <IntegrationField id="ga4" label="Google Analytics 4 Measurement ID" placeholder="G-XXXXXXXXXX" value={settings.googleAnalytics.id} onValueChange={val => handleInputChange('googleAnalytics', 'id', val)} />
                               <IntegrationSwitch id="ga4" checked={settings.googleAnalytics.enabled} onCheckedChange={val => handleInputChange('googleAnalytics', 'enabled', val)} />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-4 border rounded-lg">
                               <div className="md:col-span-1">
                                    <IntegrationField id="gads-id" label="Google Ads Conversion ID" placeholder="AW-XXXXXXXXX" value={settings.googleAdsConversion.id} onValueChange={val => handleInputChange('googleAdsConversion', 'id', val)} />
                               </div>
                               <div className="md:col-span-1">
                                    <IntegrationField id="gads-label" label="Google Ads Conversion Label" placeholder="XXXXXXXXXXXXXXXXXXX" value={settings.googleAdsConversion.label || ''} onValueChange={val => handleInputChange('googleAdsConversion', 'label', val)} />
                               </div>
                               <div className="md:col-span-1 flex items-end">
                                   <IntegrationSwitch id="gads" checked={settings.googleAdsConversion.enabled} onCheckedChange={val => handleInputChange('googleAdsConversion', 'enabled', val)} />
                               </div>
                            </div>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 border rounded-lg">
                               <IntegrationField id="goptimize" label="Google Optimize Container ID" placeholder="OPT-XXXXXXX" value={settings.googleOptimize.id} onValueChange={val => handleInputChange('googleOptimize', 'id', val)} />
                               <IntegrationSwitch id="goptimize" checked={settings.googleOptimize.enabled} onCheckedChange={val => handleInputChange('googleOptimize', 'enabled', val)} />
                            </div>
                             <div className="p-4 border rounded-lg space-y-4">
                               <div className="space-y-2">
                                  <Label>Google Remarketing Tag</Label>
                                  <Textarea placeholder="Paste your remarketing tag script here..." value={settings.googleRemarketing.script} onChange={e => handleInputChange('googleRemarketing', 'script', e.target.value)} />
                               </div>
                               <IntegrationSwitch id="gremarketing" checked={settings.googleRemarketing.enabled} onCheckedChange={val => handleInputChange('googleRemarketing', 'enabled', val)} />
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                 <TabsContent value="meta" className="space-y-6 pt-6">
                     <Card>
                        <CardHeader>
                            <CardTitle>Facebook / Meta Integrations</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 border rounded-lg">
                               <IntegrationField id="meta-pixel" label="Meta Pixel ID" placeholder="XXXXXXXXXXXXXXXX" value={settings.metaPixel.id} onValueChange={val => handleInputChange('metaPixel', 'id', val)} />
                               <IntegrationSwitch id="meta-pixel" checked={settings.metaPixel.enabled} onCheckedChange={val => handleInputChange('metaPixel', 'enabled', val)} />
                            </div>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 border rounded-lg">
                               <IntegrationField id="meta-token" label="Meta Pixel Access Token" placeholder="Paste your token here..." value={settings.metaPixel.accessToken || ''} onValueChange={val => handleInputChange('metaPixel', 'accessToken', val)} />
                               <div className="flex items-end text-sm text-muted-foreground"><p>(Required for server-side events)</p></div>
                            </div>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 border rounded-lg">
                               <IntegrationField id="meta-conv" label="Meta Conversions API Key (Optional)" placeholder="Paste your key here..." value={settings.metaConversionsApi.id} onValueChange={val => handleInputChange('metaConversionsApi', 'id', val)} />
                               <IntegrationSwitch id="meta-conv" checked={settings.metaConversionsApi.enabled} onCheckedChange={val => handleInputChange('metaConversionsApi', 'enabled', val)} />
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                 <TabsContent value="other" className="space-y-6 pt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Other Platform Integrations</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 border rounded-lg">
                               <IntegrationField id="bing-uet" label="Microsoft Bing Ads UET Tag ID" placeholder="XXXXXXXX" value={settings.bingUetTag.id} onValueChange={val => handleInputChange('bingUetTag', 'id', val)} />
                               <IntegrationSwitch id="bing-uet" checked={settings.bingUetTag.enabled} onCheckedChange={val => handleInputChange('bingUetTag', 'enabled', val)} />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 border rounded-lg">
                               <IntegrationField id="pinterest" label="Pinterest Tag ID" placeholder="XXXXXXXXXXXXX" value={settings.pinterestTag.id} onValueChange={val => handleInputChange('pinterestTag', 'id', val)} />
                               <IntegrationSwitch id="pinterest" checked={settings.pinterestTag.enabled} onCheckedChange={val => handleInputChange('pinterestTag', 'enabled', val)} />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 border rounded-lg">
                               <IntegrationField id="ms-clarity" label="Microsoft Clarity Project ID" placeholder="XXXXXXXXXX" value={settings.microsoftClarity.id} onValueChange={val => handleInputChange('microsoftClarity', 'id', val)} />
                               <IntegrationSwitch id="ms-clarity" checked={settings.microsoftClarity.enabled} onCheckedChange={val => handleInputChange('microsoftClarity', 'enabled', val)} />
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                 <TabsContent value="custom" className="space-y-6 pt-6">
                     <Card>
                        <CardHeader>
                            <CardTitle>Custom Scripts</CardTitle>
                            <CardDescription className="text-destructive">Use for any other scripts not listed above. Be careful, incorrect scripts can break your site.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                           <div className="p-4 border rounded-lg space-y-4">
                               <div className="space-y-2">
                                  <Label>Custom Head Script</Label>
                                  <Textarea placeholder="Paste your script here to inject into the <head> tag..." value={settings.customHeadScript.script} onChange={e => handleInputChange('customHeadScript', 'script', e.target.value)} />
                               </div>
                               <IntegrationSwitch id="custom-head" checked={settings.customHeadScript.enabled} onCheckedChange={val => handleInputChange('customHeadScript', 'enabled', val)} />
                            </div>
                             <div className="p-4 border rounded-lg space-y-4">
                               <div className="space-y-2">
                                  <Label>Custom Body Script</Label>
                                  <Textarea placeholder="Paste your script here to inject at the end of the <body> tag..." value={settings.customBodyScript.script} onChange={e => handleInputChange('customBodyScript', 'script', e.target.value)} />
                               </div>
                               <IntegrationSwitch id="custom-body" checked={settings.customBodyScript.enabled} onCheckedChange={val => handleInputChange('customBodyScript', 'enabled', val)} />
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

            </Tabs>
        </div>
    );
}

    