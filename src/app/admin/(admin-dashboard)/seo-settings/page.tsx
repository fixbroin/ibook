
'use client';

import { useEffect, useState, useTransition, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { getAdminSettings } from '@/lib/data';
import { updateSeoSettings } from '@/lib/admin.actions';
import type { SeoSettings } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Upload } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import Image from 'next/image';

const defaultSeoSettings: SeoSettings = {
    titleTemplate: '%s | BroBookMe',
    defaultTitle: 'BroBookMe – Online Booking System for Service Providers',
    defaultDescription: 'BroBookMe is a smart online booking platform for professionals. Manage appointments, reduce no-shows, accept payments securely, and streamline your business effortlessly.',
    defaultKeywords: 'online booking system, appointment scheduling software, service booking app, professional booking software, appointment management, BroBookMe',
    openGraphImageUrl: '/og-image.png',
    twitterHandle: '@brobookme',
};

export default function SeoSettingsPage() {
    const [settings, setSettings] = useState<SeoSettings>(defaultSeoSettings);
    const [loading, setLoading] = useState(true);
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();
    const formRef = useRef<HTMLFormElement>(null);

    useEffect(() => {
        getAdminSettings().then(adminSettings => {
            if (adminSettings?.site?.seo) {
                setSettings(adminSettings.site.seo);
            }
            setLoading(false);
        });
    }, []);

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        
        if (!formRef.current) return;

        const formData = new FormData(formRef.current);
        
        startTransition(async () => {
            const result = await updateSeoSettings(formData);
            if (result.success) {
                toast({ title: "Success", description: "SEO settings have been saved." });
                if (result.updatedSettings) {
                    setSettings(result.updatedSettings);
                }
            } else {
                toast({ title: "Error", description: result.error, variant: 'destructive' });
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
        )
    }

  return (
      <form onSubmit={handleSubmit} ref={formRef}>
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">SEO Settings</h1>
                    <p className="text-muted-foreground">Manage the global Search Engine Optimization settings for your site.</p>
                </div>
                <Button type="submit" disabled={isPending}>
                    {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save All Settings
                </Button>
            </div>
            
            <Card>
                <CardHeader>
                    <CardTitle>Global Meta Tags</CardTitle>
                    <CardDescription>These settings apply to all pages unless overridden.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="titleTemplate">Title Template</Label>
                        <Input id="titleTemplate" name="titleTemplate" defaultValue={settings.titleTemplate} />
                        <p className="text-sm text-muted-foreground">Use '%s' as a placeholder for the page-specific title. E.g., "%s | My Site".</p>
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="defaultTitle">Default Title</Label>
                        <Input id="defaultTitle" name="defaultTitle" defaultValue={settings.defaultTitle} />
                        <p className="text-sm text-muted-foreground">The title used for the homepage or as a fallback.</p>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="defaultDescription">Default Meta Description</Label>
                        <Textarea id="defaultDescription" name="defaultDescription" defaultValue={settings.defaultDescription} />
                         <p className="text-sm text-muted-foreground">A concise summary of your site for search engines. Aim for 150-160 characters.</p>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="defaultKeywords">Default Keywords</Label>
                        <Input id="defaultKeywords" name="defaultKeywords" defaultValue={settings.defaultKeywords} />
                        <p className="text-sm text-muted-foreground">Comma-separated keywords related to your business.</p>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Social Media & Sharing (Open Graph)</CardTitle>
                    <CardDescription>Control how your site appears when shared on social media platforms.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                     <div className="space-y-2">
                        <Label htmlFor="twitterHandle">Twitter Handle</Label>
                        <Input id="twitterHandle" name="twitterHandle" defaultValue={settings.twitterHandle} placeholder="@yourhandle" />
                    </div>
                    <div className="space-y-2">
                        <Label>Default Open Graph Image</Label>
                        <Input name="currentOpenGraphImageUrl" type="hidden" defaultValue={settings.openGraphImageUrl} />
                        <Image src={settings.openGraphImageUrl} alt="Open Graph Preview" width={300} height={157} className="rounded-md border aspect-[1.91/1] object-cover bg-muted" />
                        <Input name="openGraphImage" type="file" accept="image/*" className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90" />
                        <p className="text-sm text-muted-foreground">Recommended size: 1200x630 pixels.</p>
                    </div>
                </CardContent>
            </Card>

        </div>
    </form>
  );
}
