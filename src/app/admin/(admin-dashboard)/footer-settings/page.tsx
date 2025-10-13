

'use client';

import { useEffect, useState, useTransition } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { getAdminSettings } from '@/lib/data';
import { updateFooterSettings } from '@/lib/admin.actions';
import type { SiteSettings, FooterSettings, SocialLink, SiteLink } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Loader2, PlusCircle, Trash2, Facebook, Twitter, Linkedin, Instagram, Youtube } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { v4 as uuidv4 } from 'uuid';
import Image from 'next/image';

const defaultSettings: SiteSettings = {
    branding: { siteName: 'BroBookMe', logoUrl: '/placeholder.svg' },
    hero: { title: '', paragraph: '', imageUrl: '', buttons: [] },
    footer: {
      description: 'The smart booking platform for modern professionals.',
      contact: { email: 'support@BroBookMe.app', phone: '', address: '' },
      socialLinks: [
        { id: uuidv4(), name: 'Facebook', url: '#', icon: 'Facebook' },
        { id: uuidv4(), name: 'Twitter', url: '#', icon: 'Twitter' },
        { id: uuidv4(), name: 'LinkedIn', url: '#', icon: 'Linkedin' },
      ],
      siteLinks: [
        { id: uuidv4(), name: 'Features', url: '#features' },
        { id: uuidv4(), name: 'Pricing', url: '#pricing' },
        { id: uuidv4(), name: 'FAQ', url: '#faq' },
      ],
      copyright: `© ${new Date().getFullYear()} BroBookMe. All rights reserved.`,
    }
};


export default function FooterSettingsPage() {
    const [settings, setSettings] = useState<SiteSettings>(defaultSettings);
    const [footerState, setFooterState] = useState<FooterSettings>(defaultSettings.footer!);
    const [loading, setLoading] = useState(true);
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();

    useEffect(() => {
        getAdminSettings().then(adminSettings => {
            if (adminSettings?.site) {
                setSettings(adminSettings.site);
                setFooterState(adminSettings.site.footer || defaultSettings.footer!);
            }
            setLoading(false);
        });
    }, []);

    const handleFooterChange = (field: keyof FooterSettings, value: any) => {
        setFooterState(current => ({ ...current, [field]: value }));
    };

    const handleContactChange = (field: keyof FooterSettings['contact'], value: string) => {
        setFooterState(current => ({
            ...current,
            contact: { ...current.contact, [field]: value }
        }));
    };

    const handleLinkChange = (type: 'socialLinks' | 'siteLinks', id: string, field: string, value: string) => {
        const links = footerState[type] || [];
        const updatedLinks = links.map(link => 
            link.id === id ? { ...link, [field]: value } : link
        );
        handleFooterChange(type, updatedLinks);
    };

    const addLink = (type: 'socialLinks' | 'siteLinks') => {
        const newLink = type === 'socialLinks' 
            ? { id: uuidv4(), name: 'Facebook', url: '', icon: 'Facebook' }
            : { id: uuidv4(), name: '', url: '' };
        
        const links = footerState[type] || [];
        handleFooterChange(type, [...links, newLink]);
    };

    const deleteLink = (type: 'socialLinks' | 'siteLinks', id: string) => {
        const links = footerState[type] || [];
        handleFooterChange(type, links.filter(link => link.id !== id));
    };


    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        startTransition(async () => {
            const result = await updateFooterSettings(footerState);
            if (result.success) {
                toast({ title: "Success", description: "Footer settings have been saved." });
            } else {
                toast({ title: "Error", description: result.error, variant: 'destructive' });
            }
        });
    };
    
    if (loading) {
        return (
             <div className="space-y-6">
                <Skeleton className="h-10 w-1/3" />
                <Skeleton className="h-64 w-full" />
                 <Skeleton className="h-64 w-full" />
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
                    <h1 className="text-3xl font-bold tracking-tight">Footer Settings</h1>
                    <p className="text-muted-foreground">Manage the content of your website's footer.</p>
                </div>
                <Button type="submit" disabled={isPending}>
                    {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save All Settings
                </Button>
            </div>
            
            <div className="grid gap-6 lg:grid-cols-3">
                 {/* Left Column */}
                <div className="lg:col-span-1 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Branding & Description</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center gap-4 p-4 border rounded-md bg-muted/50">
                                <Image src={settings.branding.logoUrl} alt="logo" width={48} height={48} />
                                <span className="font-bold text-lg">{settings.branding.siteName}</span>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="footerDescription">Footer Description</Label>
                                <Textarea id="footerDescription" value={footerState.description} onChange={(e) => handleFooterChange('description', e.target.value)} />
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>Copyright</CardTitle>
                        </CardHeader>
                         <CardContent className="space-y-2">
                            <Label htmlFor="copyright">Copyright Text</Label>
                            <Input id="copyright" value={footerState.copyright} onChange={(e) => handleFooterChange('copyright', e.target.value)} />
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column */}
                <div className="lg:col-span-2 space-y-6">
                     <Card>
                        <CardHeader>
                            <CardTitle>Contact Information</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="contactEmail">Email</Label>
                                    <Input id="contactEmail" value={footerState.contact.email} onChange={e => handleContactChange('email', e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="contactPhone">Phone</Label>
                                    <Input id="contactPhone" value={footerState.contact.phone} onChange={e => handleContactChange('phone', e.target.value)} />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="contactAddress">Address</Label>
                                <Textarea id="contactAddress" value={footerState.contact.address} onChange={e => handleContactChange('address', e.target.value)} />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div className="space-y-1.5">
                               <CardTitle>Social Media Links</CardTitle>
                               <CardDescription>Links to your social media profiles.</CardDescription>
                            </div>
                            <Button type="button" variant="outline" size="sm" onClick={() => addLink('socialLinks')}><PlusCircle className="mr-2 h-4 w-4" /> Add</Button>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {footerState.socialLinks?.map(link => (
                                <div key={link.id} className="flex items-end gap-2 p-2 border rounded-md">
                                    <div className="flex-1 grid grid-cols-3 gap-2">
                                        <div className="space-y-1">
                                            <Label htmlFor={`social-name-${link.id}`}>Link Name</Label>
                                            <Input id={`social-name-${link.id}`} value={link.name} onChange={e => handleLinkChange('socialLinks', link.id, 'name', e.target.value)} placeholder="e.g. Facebook" />
                                        </div>
                                         <div className="space-y-1">
                                            <Label htmlFor={`social-icon-${link.id}`}>Icon Name</Label>
                                            <Input id={`social-icon-${link.id}`} value={link.icon} onChange={e => handleLinkChange('socialLinks', link.id, 'icon', e.target.value)} placeholder="e.g. Facebook" />
                                            <p className="text-xs text-muted-foreground">Use any name from lucide-react.</p>
                                        </div>
                                         <div className="space-y-1">
                                            <Label htmlFor={`social-url-${link.id}`}>URL</Label>
                                            <Input id={`social-url-${link.id}`} value={link.url} onChange={e => handleLinkChange('socialLinks', link.id, 'url', e.target.value)} />
                                        </div>
                                    </div>
                                    <Button type="button" variant="ghost" size="icon" onClick={() => deleteLink('socialLinks', link.id)}>
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                             <div className="space-y-1.5">
                                <CardTitle>Site Links</CardTitle>
                                <CardDescription>Custom links for your footer navigation.</CardDescription>
                            </div>
                            <Button type="button" variant="outline" size="sm" onClick={() => addLink('siteLinks')}><PlusCircle className="mr-2 h-4 w-4" /> Add</Button>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {footerState.siteLinks?.map(link => (
                                <div key={link.id} className="flex items-end gap-2 p-2 border rounded-md">
                                    <div className="flex-1 grid grid-cols-2 gap-2">
                                        <div className="space-y-1">
                                            <Label htmlFor={`sitelink-name-${link.id}`}>Name</Label>
                                            <Input id={`sitelink-name-${link.id}`} value={link.name} onChange={e => handleLinkChange('siteLinks', link.id, 'name', e.target.value)} />
                                        </div>
                                         <div className="space-y-1">
                                            <Label htmlFor={`sitelink-url-${link.id}`}>URL</Label>
                                            <Input id={`sitelink-url-${link.id}`} value={link.url} onChange={e => handleLinkChange('siteLinks', link.id, 'url', e.target.value)} />
                                        </div>
                                    </div>
                                    <Button type="button" variant="ghost" size="icon" onClick={() => deleteLink('siteLinks', link.id)}>
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    </form>
  );
}
