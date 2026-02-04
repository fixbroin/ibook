

'use client';

import { useEffect, useState, useTransition, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { getHeroSettings, getAdminSettings } from '@/lib/data';
import { updateHeroSettingsAction, updateBrandingSettings } from '@/lib/admin.actions';
import type { HeroSettings, SiteSettings, BrandingSettings } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Upload } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import Image from 'next/image';
import { storage } from '@/lib/firebase';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { Progress } from '@/components/ui/progress';
import { v4 as uuidv4 } from 'uuid';

const defaultHeroSettings: HeroSettings = {
    title: 'Focus on Your Work, We\'ll Handle the Bookings',
    paragraph: 'BroBookMe provides a simple, elegant booking page for your clients. Share your link and let the appointments roll in.',
    imageUrl: 'https://picsum.photos/seed/dashboard-mockup/1200/800',
    clickUrl: '',
    buttons: [
        { text: 'Get Started for Free', link: '/login', variant: 'default' },
        { text: 'View Demo Page', link: '/brobookme', variant: 'outline' },
    ],
};

const defaultBrandingSettings: BrandingSettings = {
    siteName: 'BroBookMe',
    logoUrl: '/placeholder.svg',
};

type UploadState = {
    file: File | null;
    preview: string | null;
    progress: number | null;
};


export default function HeroSettingsPage() {
    const [heroSettings, setHeroSettings] = useState<HeroSettings>(defaultHeroSettings);
    const [brandingSettings, setBrandingSettings] = useState<BrandingSettings>(defaultBrandingSettings);
    const [loading, setLoading] = useState(true);
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();

    const [logo, setLogo] = useState<UploadState>({ file: null, preview: null, progress: null });
    const [heroImage, setHeroImage] = useState<UploadState>({ file: null, preview: null, progress: null });
    
    const logoInputRef = useRef<HTMLInputElement>(null);
    const heroImageInputRef = useRef<HTMLInputElement>(null);
    const formRef = useRef<HTMLFormElement>(null);


    useEffect(() => {
        Promise.all([getHeroSettings(), getAdminSettings()]).then(([heroData, adminSettings]) => {
            if (heroData) {
                setHeroSettings(heroData);
                setHeroImage(s => ({ ...s, preview: heroData.imageUrl }));
            }
             if (adminSettings?.site?.branding) {
                setBrandingSettings(adminSettings.site.branding);
                setLogo(s => ({ ...s, preview: adminSettings.site.branding.logoUrl }));
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
            let heroPromise;
            let brandingPromise;
            
            try {
                // Handle Hero Settings
                const heroFormData = new FormData(formRef.current!);
                const newHeroImageUrl = await uploadImage(heroImage, 'hero-images');
                if (newHeroImageUrl) {
                    heroFormData.set('imageUrl', newHeroImageUrl);
                } else {
                    heroFormData.set('imageUrl', heroSettings.imageUrl);
                }
                heroPromise = updateHeroSettingsAction(heroFormData);

                // Handle Branding Settings
                const brandingFormData = new FormData(formRef.current!);
                const newLogoUrl = await uploadImage(logo, 'logos');
                if (newLogoUrl) {
                    brandingFormData.set('logoUrl', newLogoUrl);
                } else {
                    brandingFormData.set('logoUrl', brandingSettings.logoUrl);
                }
                brandingPromise = updateBrandingSettings(brandingFormData);
                
                const [heroResult, brandingResult] = await Promise.all([heroPromise, brandingPromise]);

                let success = true;
                if (heroResult.success && heroResult.updatedSettings) {
                    setHeroSettings(heroResult.updatedSettings);
                    setHeroImage({ file: null, preview: heroResult.updatedSettings.imageUrl, progress: null });
                } else {
                    success = false;
                    toast({ title: "Hero Error", description: heroResult.error, variant: 'destructive' });
                }
                
                if (brandingResult.success && brandingResult.updatedSettings) {
                    setBrandingSettings(brandingResult.updatedSettings);
                    setLogo({ file: null, preview: brandingResult.updatedSettings.logoUrl, progress: null });
                } else {
                    success = false;
                    toast({ title: "Branding Error", description: brandingResult.error, variant: 'destructive' });
                }

                if(success) {
                     toast({ title: "Success", description: "Settings have been saved." });
                }

            } catch (e: any) {
                toast({ title: "Error", description: e.message || "An unexpected error occurred", variant: 'destructive' });
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
                    </div>
                    <div className="space-y-6">
                         <Skeleton className="h-48 w-full" />
                        <Skeleton className="h-64 w-full" />
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
                    <h1 className="text-3xl font-bold tracking-tight">Hero & Branding Settings</h1>
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
                            <input type="hidden" name="currentHeroImageUrl" defaultValue={heroSettings.imageUrl} />
                            <div className="space-y-2">
                                <Label htmlFor="title">Title</Label>
                                <Textarea id="title" name="title" defaultValue={heroSettings.title} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="paragraph">Paragraph</Label>
                                <Textarea id="paragraph" name="paragraph" defaultValue={heroSettings.paragraph} />
                            </div>
                             <div className="space-y-2">
                                <Label htmlFor="clickUrl">Hero Image Click URL</Label>
                                <Input id="clickUrl" name="clickUrl" defaultValue={heroSettings.clickUrl} placeholder="e.g., https://example.com/offers" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                               <div className="space-y-2">
                                    <Label htmlFor="button1Text">Button 1 Text</Label>
                                    <Input id="button1Text" name="button1Text" defaultValue={heroSettings.buttons[0]?.text} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="button1Link">Button 1 Link</Label>
                                    <Input id="button1Link" name="button1Link" defaultValue={heroSettings.buttons[0]?.link} />
                                </div>
                            </div>
                             <div className="grid grid-cols-2 gap-4">
                               <div className="space-y-2">
                                    <Label htmlFor="button2Text">Button 2 Text</Label>
                                    <Input id="button2Text" name="button2Text" defaultValue={heroSettings.buttons[1]?.text} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="button2Link">Button 2 Link</Label>
                                    <Input id="button2Link" name="button2Link" defaultValue={heroSettings.buttons[1]?.link} />
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
                             <input type="hidden" name="currentLogoUrl" defaultValue={brandingSettings.logoUrl} />
                            <div className="space-y-2">
                                <Label htmlFor="siteName">Site Name</Label>
                                <Input id="siteName" name="siteName" defaultValue={brandingSettings.siteName} />
                            </div>
                            <div className="space-y-2">
                                <Label>Site Logo</Label>
                                <div className="flex items-center gap-4">
                                    <Image
                                        src={logo.preview || brandingSettings.logoUrl}
                                        alt="Logo Preview"
                                        width={64}
                                        height={64}
                                        className="rounded-md border bg-muted"
                                    />
                                    <Input 
                                        name="logoFile" 
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
                                src={heroImage.preview || heroSettings.imageUrl}
                                alt="Hero Image Preview"
                                width={1200}
                                height={800}
                                className="w-full rounded-md border bg-muted aspect-video object-cover"
                            />
                            <Input 
                                name="heroImageFile"
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
