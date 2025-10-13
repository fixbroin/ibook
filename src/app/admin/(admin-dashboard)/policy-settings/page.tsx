
'use client';

import { useEffect, useState, useTransition, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { getAdminSettings } from '@/lib/data';
import { updatePolicySettings } from '@/lib/admin.actions';
import type { PolicySettings } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const defaultPolicySettings: PolicySettings = {
    terms: '<h1>Terms and Conditions</h1><p>Please add your terms and conditions here.</p>',
    privacy: '<h1>Privacy Policy</h1><p>Please add your privacy policy here.</p>',
    cancellation: '<h1>Cancellation Policy</h1><p>Please add your cancellation policy here.</p>',
    refund: '<h1>Refund Policy</h1><p>Please add your refund policy here.</p>',
};

const PolicyEditor = ({ 
    title, 
    content,
    onChange
}: { 
    title: string, 
    content: string,
    onChange: (value: string) => void
}) => (
    <Card>
        <CardHeader>
            <CardTitle>{title}</CardTitle>
            <CardDescription>Edit the content for your {title}. You can use HTML for formatting.</CardDescription>
        </CardHeader>
        <CardContent>
            <Textarea
                value={content}
                onChange={(e) => onChange(e.target.value)}
                className="min-h-[400px] font-mono"
                placeholder={`Enter your ${title} content here using HTML...`}
            />
        </CardContent>
    </Card>
);

export default function PolicySettingsPage() {
    const [terms, setTerms] = useState(defaultPolicySettings.terms);
    const [privacy, setPrivacy] = useState(defaultPolicySettings.privacy);
    const [cancellation, setCancellation] = useState(defaultPolicySettings.cancellation);
    const [refund, setRefund] = useState(defaultPolicySettings.refund);
    
    const [loading, setLoading] = useState(true);
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();

    useEffect(() => {
        getAdminSettings().then(adminSettings => {
            const policies = adminSettings?.site?.policies;
            if (policies) {
                setTerms(policies.terms || defaultPolicySettings.terms);
                setPrivacy(policies.privacy || defaultPolicySettings.privacy);
                setCancellation(policies.cancellation || defaultPolicySettings.cancellation);
                setRefund(policies.refund || defaultPolicySettings.refund);
            }
            setLoading(false);
        });
    }, []);

    const handleSave = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        
        const updatedSettings: PolicySettings = {
            terms,
            privacy,
            cancellation,
            refund,
        };

        startTransition(async () => {
            const result = await updatePolicySettings(updatedSettings);
            if (result.success) {
                toast({ title: 'Success', description: 'Policy settings have been saved.' });
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
        <form onSubmit={handleSave}>
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Policy Settings</h1>
                        <p className="text-muted-foreground">Manage your platform's legal and user policies.</p>
                    </div>
                    <Button type="submit" disabled={isPending}>
                        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save All Policies
                    </Button>
                </div>
                
                <Tabs defaultValue="terms" className="w-full">
                    <TabsList>
                        <TabsTrigger value="terms">Terms & Conditions</TabsTrigger>
                        <TabsTrigger value="privacy">Privacy Policy</TabsTrigger>
                        <TabsTrigger value="cancellation">Cancellation Policy</TabsTrigger>
                        <TabsTrigger value="refund">Refund Policy</TabsTrigger>
                    </TabsList>
                    <TabsContent value="terms" className="mt-4">
                        <PolicyEditor title="Terms and Conditions" content={terms} onChange={setTerms} />
                    </TabsContent>
                    <TabsContent value="privacy" className="mt-4">
                        <PolicyEditor title="Privacy Policy" content={privacy} onChange={setPrivacy} />
                    </TabsContent>
                    <TabsContent value="cancellation" className="mt-4">
                        <PolicyEditor title="Cancellation Policy" content={cancellation} onChange={setCancellation} />
                    </TabsContent>
                    <TabsContent value="refund" className="mt-4">
                        <PolicyEditor title="Refund Policy" content={refund} onChange={setRefund} />
                    </TabsContent>
                </Tabs>
            </div>
        </form>
    );
}
