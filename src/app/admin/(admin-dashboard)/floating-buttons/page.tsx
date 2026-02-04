
'use client';

import { useEffect, useState, useTransition } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { getAdminSettings } from '@/lib/data';
import { updateFloatingButtonsSettings } from '@/lib/admin.actions';
import type { FloatingButtonsSettings } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Phone, MessageCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const defaultSettings: FloatingButtonsSettings = {
    enabled: false,
    callNumber: '',
    whatsappNumber: '',
    whatsappMessage: 'Hello! I would like to know more about your services.',
    position: 'bottom-right',
    animationEnabled: true,
    animationStyle: 'spin',
};

export default function FloatingButtonsPage() {
    const [settings, setSettings] = useState<FloatingButtonsSettings>(defaultSettings);
    const [loading, setLoading] = useState(true);
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();

    useEffect(() => {
        getAdminSettings().then(adminSettings => {
            if (adminSettings?.site?.floatingButtons) {
                setSettings(adminSettings.site.floatingButtons);
            }
            setLoading(false);
        });
    }, []);

    const handleFieldChange = (field: keyof FloatingButtonsSettings, value: string | boolean) => {
        setSettings(current => ({ ...current, [field]: value }));
    };

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        startTransition(async () => {
            const result = await updateFloatingButtonsSettings(settings);
            if (result.success) {
                toast({ title: "Success", description: "Floating button settings have been saved." });
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
        <form onSubmit={handleSubmit}>
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Floating Buttons Setup</h1>
                        <p className="text-muted-foreground">Manage the floating Call and WhatsApp buttons for your site.</p>
                    </div>
                    <Button type="submit" disabled={isPending}>
                        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Settings
                    </Button>
                </div>
                
                <Card>
                    <CardHeader>
                        <CardTitle>Global Settings</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                                <Label htmlFor="enable-buttons">Enable Floating Buttons</Label>
                                <p className="text-sm text-muted-foreground">
                                    Show the floating buttons on the homepage.
                                </p>
                            </div>
                            <Switch
                                id="enable-buttons"
                                checked={settings.enabled}
                                onCheckedChange={(value) => handleFieldChange('enabled', value)}
                            />
                        </div>
                         <div className="flex items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                                <Label htmlFor="enable-animation">Enable Animation</Label>
                                <p className="text-sm text-muted-foreground">
                                    Apply an animation to the buttons to attract attention.
                                </p>
                            </div>
                            <Switch
                                id="enable-animation"
                                checked={settings.animationEnabled}
                                onCheckedChange={(value) => handleFieldChange('animationEnabled', value)}
                            />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Button Configuration</CardTitle>
                        <CardDescription>Set up the numbers, messages, and appearance for the buttons.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="call-number">Call Number</Label>
                            <Input id="call-number" value={settings.callNumber} onChange={e => handleFieldChange('callNumber', e.target.value)} placeholder="+917353113455" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="whatsapp-number">WhatsApp Number</Label>
                            <Input id="whatsapp-number" value={settings.whatsappNumber} onChange={e => handleFieldChange('whatsappNumber', e.target.value)} placeholder="+917353113455" />
                             <p className="text-xs text-muted-foreground">Include country code, without spaces or symbols.</p>
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="whatsapp-message">Default WhatsApp Message (Optional)</Label>
                            <Input id="whatsapp-message" value={settings.whatsappMessage} onChange={e => handleFieldChange('whatsappMessage', e.target.value)} />
                        </div>
                         <div className="grid grid-cols-2 gap-4">
                             <div className="space-y-2">
                                <Label htmlFor="button-position">Button Position</Label>
                                <Select
                                    value={settings.position}
                                    onValueChange={(value) => handleFieldChange('position', value)}
                                >
                                    <SelectTrigger id="button-position">
                                        <SelectValue placeholder="Select position" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="bottom-right">Bottom Right</SelectItem>
                                        <SelectItem value="bottom-left">Bottom Left</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                             <div className="space-y-2">
                                <Label htmlFor="animation-style">Animation Style</Label>
                                <Select
                                    value={settings.animationStyle || 'spin'}
                                    onValueChange={(value) => handleFieldChange('animationStyle', value)}
                                >
                                    <SelectTrigger id="animation-style">
                                        <SelectValue placeholder="Select animation" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="spin">Spin</SelectItem>
                                        <SelectItem value="bounce">Bounce</SelectItem>
                                        <SelectItem value="pulse">Pulse</SelectItem>
                                        <SelectItem value="tada">Tada</SelectItem>
                                        <SelectItem value="wiggle">Wiggle</SelectItem>
                                        <SelectItem value="shake-x">Shake X</SelectItem>
                                        <SelectItem value="shake-y">Shake Y</SelectItem>
                                        <SelectItem value="heart-beat">Heart Beat</SelectItem>
                                        <SelectItem value="swing">Swing</SelectItem>
                                        <SelectItem value="rubber-band">Rubber Band</SelectItem>
                                        <SelectItem value="flash">Flash</SelectItem>
                                        <SelectItem value="jello">Jello</SelectItem>
                                        <SelectItem value="wobble">Wobble</SelectItem>
                                        <SelectItem value="head-shake">Head Shake</SelectItem>
                                        <SelectItem value="flip">Flip</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                         </div>
                    </CardContent>
                </Card>
            </div>
        </form>
    );
}
