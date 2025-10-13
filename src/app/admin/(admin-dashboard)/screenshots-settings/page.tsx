

'use client';

import { useEffect, useState, useTransition, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { getAdminSettings } from '@/lib/data';
import { updateScreenshotsSettings } from '@/lib/admin.actions';
import type { SiteSettings, ScreenshotsSettings } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Upload } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import Image from 'next/image';
import { storage } from '@/lib/firebase';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { Progress } from '@/components/ui/progress';

const defaultSettings: ScreenshotsSettings = {
    title: 'See BroBookMe in Action',
    image1Url: 'https://picsum.photos/seed/dashboard/1200/800',
    image2Url: 'https://picsum.photos/seed/booking-page/1200/800',
};

type UploadState = {
    file: File | null;
    preview: string | null;
    progress: number | null;
}

export default function ScreenshotsSettingsPage() {
    const [settings, setSettings] = useState<ScreenshotsSettings>(defaultSettings);
    const [loading, setLoading] = useState(true);
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();

    const [image1, setImage1] = useState<UploadState>({ file: null, preview: null, progress: null });
    const [image2, setImage2] = useState<UploadState>({ file: null, preview: null, progress: null });

    const image1InputRef = useRef<HTMLInputElement>(null);
    const image2InputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        getAdminSettings().then(adminSettings => {
            if (adminSettings?.site?.screenshots) {
                setSettings(adminSettings.site.screenshots);
            }
            setLoading(false);
        });
    }, []);
    
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, imageSetter: React.Dispatch<React.SetStateAction<UploadState>>) => {
        const file = e.target.files?.[0];
        if (file) {
            imageSetter({ file, preview: URL.createObjectURL(file), progress: null });
        }
    }

    const uploadImage = async (uploadState: UploadState): Promise<string | null> => {
        if (!uploadState.file) return null;
        
        const storageRef = ref(storage, `screenshots/${Date.now()}-${uploadState.file.name}`);
        const uploadTask = uploadBytesResumable(storageRef, uploadState.file);

        return new Promise((resolve, reject) => {
            uploadTask.on('state_changed',
                (snapshot) => {
                    const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                     if (uploadState === image1) setImage1(s => ({ ...s, progress }));
                     else setImage2(s => ({ ...s, progress }));
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
                const newImage1Url = await uploadImage(image1);
                const newImage2Url = await uploadImage(image2);

                const finalSettings: ScreenshotsSettings = {
                    title: settings.title,
                    image1Url: newImage1Url || settings.image1Url,
                    image2Url: newImage2Url || settings.image2Url,
                };
                
                const result = await updateScreenshotsSettings(finalSettings);
                if (result.success) {
                    toast({ title: "Success", description: "Screenshots section has been saved." });
                    setSettings(finalSettings); // Update local state with new URLs
                    setImage1({ file: null, preview: null, progress: null });
                    setImage2({ file: null, preview: null, progress: null });
                } else {
                    toast({ title: "Error", description: result.error, variant: 'destructive' });
                }
            } catch(e) {
                // Error is already toasted in uploadImage
            }
        });
    };
    
    if (loading) {
        return (
             <div className="space-y-6">
                <Skeleton className="h-10 w-1/3" />
                <Skeleton className="h-96 w-full" />
            </div>
        )
    }

  return (
      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Screenshots Section</h1>
                    <p className="text-muted-foreground">Manage the "See BroBookMe in Action" section on your homepage.</p>
                </div>
                <Button type="submit" disabled={isPending}>
                    {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Changes
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Section Title</CardTitle>
                </CardHeader>
                <CardContent>
                    <Label htmlFor="sectionTitle" className="sr-only">Section Title</Label>
                    <Input 
                        id="sectionTitle" 
                        name="sectionTitle" 
                        value={settings.title} 
                        onChange={(e) => setSettings({...settings, title: e.target.value})} 
                    />
                </CardContent>
            </Card>

            <div className="grid gap-8 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Left Image</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Image
                            src={image1.preview || settings.image1Url}
                            alt="Screenshot 1 Preview"
                            width={1200}
                            height={800}
                            className="w-full rounded-md border bg-muted aspect-video object-cover"
                        />
                        <input 
                            type="file"
                            className="hidden"
                            ref={image1InputRef}
                            onChange={(e) => handleFileChange(e, setImage1)}
                            accept="image/*" 
                        />
                        <Button type="button" variant="outline" className="w-full" onClick={() => image1InputRef.current?.click()}>
                            <Upload className="mr-2" /> Change Image 1
                        </Button>
                        {image1.progress !== null && <Progress value={image1.progress} />}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Right Image</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Image
                            src={image2.preview || settings.image2Url}
                            alt="Screenshot 2 Preview"
                            width={1200}
                            height={800}
                            className="w-full rounded-md border bg-muted aspect-video object-cover"
                        />
                        <input 
                            type="file"
                            className="hidden"
                            ref={image2InputRef}
                            onChange={(e) => handleFileChange(e, setImage2)}
                            accept="image/*"
                        />
                        <Button type="button" variant="outline" className="w-full" onClick={() => image2InputRef.current?.click()}>
                            <Upload className="mr-2" /> Change Image 2
                        </Button>
                        {image2.progress !== null && <Progress value={image2.progress} />}
                    </CardContent>
                </Card>
            </div>
        </div>
    </form>
  );
}
