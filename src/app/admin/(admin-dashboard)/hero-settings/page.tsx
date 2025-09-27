
'use client';

import { useEffect, useState, useTransition, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { getAdminSettings } from '@/lib/data';
import { updateSiteSettings } from '@/lib/admin.actions';
import type { SiteSettings } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Upload, X } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import Image from 'next/image';
import { storage } from '@/lib/firebase';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { Progress } from '@/components/ui/progress';
import { v4 as uuidv4 } from 'uuid';

const defaultSettings: SiteSettings = {
    branding: {
        siteName: 'BroBookMe',
        logoUrl: '/placeholder.svg',
    },
    hero: {
        title: 'Focus on Your Work, We\'ll Handle the Bookings',
        paragraph: 'BroBookMe provides a simple, elegant booking page for your clients. Share your link and let the appointments roll in.',
        imageUrl: 'https://picsum.photos/seed/dashboard-mockup/1200/800',
        buttons: [
            { text: 'Get Started for Free', link: '/login', variant: 'default' },
            { text: 'View Demo Page', link: '/srikanth', variant: 'outline' },
        ],
    },
};

type UploadState = {
    file: File | null;
    preview: string | null;
    progress: number | null;
};


export default function HeroSettingsPage() {
    const [settings, setSettings] = useState<SiteSettings>(defaultSettings);
    const [loading, setLoading] = useState(true);
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();

    const [logo, setLogo] = useState<UploadState>({ file: null, preview: null, progress: null });
    const [heroImage, setHeroImage] = useState<UploadState>({ file: null, preview: null, progress: null });
    
    const logoInputRef = useRef<HTMLInputElement>(null);
    const heroImageInputRef = useRef<HTMLInputElement>(null);
    const formRef = useRef<HTMLFormElement>(null);


    useEffect(() => {
        getAdminSettings().then(adminSettings => {
            if (adminSettings?.site) {
                setSettings(adminSettings.site);
                 setLogo(s => ({ ...s, preview: adminSettings.site.branding.logoUrl }));
                 setHeroImage(s => ({ ...s, preview: adminSettings.site.hero.imageUrl }));
            }
            setLoading(false);
        });
    }, []);
    
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, setter: React.Dispatch<React.SetStateAction<UploadState>>) => {
        const file = e.target.files?.[0];
        if (file) {
            setter({ file, preview: URL.createObjectURL(file), progress: 0 });
        }
    };
    
    const uploadImage = (uploadState: UploadState, path: string): Promise<string | null> => {
        return new Promise((resolve, reject) => {
            if (!uploadState.file) {
                resolve(null);
                return;
            }

            const storageRef = ref(storage, `${path}/${uuidv4()}-${uploadState.file.name}`);
            const uploadTask = uploadBytesResumable(storageRef, uploadState.file);

            uploadTask.on('state_changed',
                (snapshot) => {
                    const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    if (path === 'logos') setLogo(s => ({...s, progress}));
                    else setHeroImage(s => ({...s, progress}));
                },
                (error) => {
                    console.error("Upload failed:", error);
                    toast({ title: "Upload Failed", description: error.message, variant: "destructive" });
                    reject(error);
                },
                async () => {
                    const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                    resolve(downloadURL);
                }
            );
        });
    };

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        
        startTransition(async () => {
            try {
                const newLogoUrl = await uploadImage(logo, 'logos');
                const newHeroImageUrl = await uploadImage(heroImage, 'hero-images');
                
                const formData = new FormData(formRef.current!);
                if (newLogoUrl) formData.set('logoUrl', newLogoUrl);
                if (newHeroImageUrl) formData.set('heroImageUrl', newHeroImageUrl);
                
                const result = await updateSiteSettings(formData);
                
                if (result.success) {
                    toast({ title: "Success", description: "Site settings have been saved." });
                    if (result.updatedSettings) {
                        setSettings(result.updatedSettings);
                        setLogo({ file: null, preview: result.updatedSettings.branding.logoUrl, progress: null });
                        setHeroImage({ file: null, preview: result.updatedSettings.hero.imageUrl, progress: null });
                    }
                } else {
                    toast({ title: "Error", description: result.error, variant: 'destructive' });
                }
            } catch (e) {
                // Errors are toasted inside uploadImage
            }
        });
    };
    
    if (loading) {
        return (
             <div className="space-y-6">
                <Skeleton className="h-10 w-1/3" />
                <div className="grid gap-6 lg:grid-cols-3">
                    <div className="lg:col-span-2 space-y-6">
                        <Skeleton className="h-80 w-full" />
                        <Skeleton className="h-64 w-full" />
                    </div>
                    <div className="space-y-6">
                        <Skeleton className="h-48 w-full" />
                        <Skeleton className="h-48 w-full" />
                    </div>
                </div>
            </div>
        )
    }

  return (
      <form onSubmit={handleSubmit} ref={formRef}>
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Hero &amp; Site Branding</h1>
                    <p className="text-muted-foreground">Manage the content of your homepage hero and site-wide branding.</p>
                </div>
                <Button type="submit" disabled={isPending}>
                    {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save All Settings
                </Button>
            </div>

            <div className="grid gap-8 lg:grid-cols-3">
                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Hero Section</CardTitle>
                            <CardDescription>Control the main section of your homepage.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <input type="hidden" name="currentLogoUrl" defaultValue={settings.branding.logoUrl} />
                            <input type="hidden" name="currentHeroImageUrl" defaultValue={settings.hero.imageUrl} />
                            <div className="space-y-2">
                                <Label htmlFor="heroTitle">Title</Label>
                                <Textarea id="heroTitle" name="heroTitle" defaultValue={settings.hero.title} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="heroParagraph">Paragraph</Label>
                                <Textarea id="heroParagraph" name="heroParagraph" defaultValue={settings.hero.paragraph} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                               <div className="space-y-2">
                                    <Label htmlFor="heroButton1Text">Button 1 Text</Label>
                                    <Input id="heroButton1Text" name="heroButton1Text" defaultValue={settings.hero.buttons[0]?.text} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="heroButton1Link">Button 1 Link</Label>
                                    <Input id="heroButton1Link" name="heroButton1Link" defaultValue={settings.hero.buttons[0]?.link} />
                                </div>
                            </div>
                             <div className="grid grid-cols-2 gap-4">
                               <div className="space-y-2">
                                    <Label htmlFor="heroButton2Text">Button 2 Text</Label>
                                    <Input id="heroButton2Text" name="heroButton2Text" defaultValue={settings.hero.buttons[1]?.text} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="heroButton2Link">Button 2 Link</Label>
                                    <Input id="heroButton2Link" name="heroButton2Link" defaultValue={settings.hero.buttons[1]?.link} />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Branding</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="siteName">Site Name</Label>
                                <Input id="siteName" name="siteName" defaultValue={settings.branding.siteName} />
                            </div>
                            <div className="space-y-2">
                                <Label>Site Logo</Label>
                                <div className="flex items-center gap-4">
                                    <Image
                                        src={logo.preview || settings.branding.logoUrl}
                                        alt="Logo Preview"
                                        width={64}
                                        height={64}
                                        className="rounded-md border bg-muted"
                                    />
                                    <Input 
                                        name="logo" 
                                        type="file" 
                                        className="hidden" 
                                        ref={logoInputRef}
                                        onChange={(e) => handleFileChange(e, setLogo)} 
                                        accept="image/*"
                                    />
                                    <Button type="button" variant="outline" onClick={() => logoInputRef.current?.click()}>
                                        <Upload className="mr-2" /> Upload
                                    </Button>
                                </div>
                                {logo.progress !== null && <Progress value={logo.progress} className="mt-2"/>}
                            </div>
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader>
                            <CardTitle>Hero Image</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                             <Image
                                src={heroImage.preview || settings.hero.imageUrl}
                                alt="Hero Image Preview"
                                width={1200}
                                height={800}
                                className="w-full rounded-md border bg-muted aspect-video object-cover"
                            />
                            <Input 
                                name="heroImage"
                                type="file" 
                                className="hidden" 
                                ref={heroImageInputRef}
                                onChange={(e) => handleFileChange(e, setHeroImage)}
                                accept="image/*" 
                            />
                            <Button type="button" variant="outline" className="w-full" onClick={() => heroImageInputRef.current?.click()}>
                                <Upload className="mr-2" /> Change Hero Image
                            </Button>
                             {heroImage.progress !== null && <Progress value={heroImage.progress} />}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    </form>
  );
}
