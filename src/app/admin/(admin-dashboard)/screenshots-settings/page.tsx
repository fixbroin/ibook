
'use client';

import { useEffect, useState, useTransition, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { getAdminSettings } from '@/lib/data';
import { updateScreenshotsSettings } from '@/lib/admin.actions';
import type { SiteSettings, ScreenshotItem } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Loader2, PlusCircle, Trash2, Upload } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import Image from 'next/image';
import { storage } from '@/lib/firebase';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { Progress } from '@/components/ui/progress';
import { v4 as uuidv4 } from 'uuid';

const defaultScreenshots: ScreenshotItem[] = [
    { id: uuidv4(), imageUrl: 'https://picsum.photos/seed/dashboard/1200/800', url: '' },
    { id: uuidv4(), imageUrl: 'https://picsum.photos/seed/booking-page/1200/800', url: '' },
];


export default function ScreenshotsSettingsPage() {
    const [title, setTitle] = useState('See BroBookMe in Action');
    const [screenshots, setScreenshots] = useState<ScreenshotItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();
    const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

    useEffect(() => {
        getAdminSettings().then(adminSettings => {
            if (adminSettings?.site?.screenshots) {
                setTitle(adminSettings.site.screenshots.title);
                setScreenshots(adminSettings.site.screenshots.screenshots || defaultScreenshots);
            } else {
                setScreenshots(defaultScreenshots);
            }
            setLoading(false);
        });
    }, []);
    
    const handleScreenshotChange = (id: string, field: 'imageUrl' | 'url', value: string) => {
        setScreenshots(current => current.map(item => item.id === id ? { ...item, [field]: value } : item));
    };

    const handleImageFileChange = (id: string, file: File) => {
         const reader = new FileReader();
        reader.onload = (e) => {
            setScreenshots(current => current.map(item =>
                item.id === id ? { ...item, imageUrl: e.target?.result as string } : item
            ));
        };
        reader.readAsDataURL(file);
    };

    const handleAddScreenshot = () => {
        setScreenshots(current => [
            ...current,
            { id: uuidv4(), imageUrl: 'https://picsum.photos/seed/new-screenshot/1200/800', url: '' }
        ]);
    };
    
    const handleDeleteScreenshot = (id: string) => {
        setScreenshots(current => current.filter(item => item.id !== id));
    };

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        
        startTransition(async () => {
            try {
                const updatedScreenshots = await Promise.all(screenshots.map(async (item) => {
                    const input = fileInputRefs.current[item.id];
                    const file = input?.files?.[0];
                    if (file) {
                        const storageRef = ref(storage, `screenshots/${uuidv4()}-${file.name}`);
                        const uploadTask = uploadBytesResumable(storageRef, file);
                        
                        // Wait for the upload to complete
                        await uploadTask;
                        
                        // Then get the download URL
                        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                        return { ...item, imageUrl: downloadURL };
                    }
                    return item;
                }));

                const finalSettings = { title, screenshots: updatedScreenshots };
                
                const result = await updateScreenshotsSettings(finalSettings);
                if (result.success) {
                    toast({ title: "Success", description: "Screenshots section has been saved." });
                    setScreenshots(updatedScreenshots);
                } else {
                    toast({ title: "Error", description: result.error, variant: 'destructive' });
                }
            } catch (error: any) {
                console.error("Error during screenshot update:", error);
                toast({ title: "Upload Error", description: error.message || "Failed to upload and save screenshots.", variant: 'destructive'});
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
                 <div className="flex gap-2">
                    <Button type="button" variant="outline" onClick={handleAddScreenshot}>
                        <PlusCircle className="mr-2" /> Add Screenshot
                    </Button>
                    <Button type="submit" disabled={isPending}>
                        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Changes
                    </Button>
                </div>
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
                        value={title} 
                        onChange={(e) => setTitle(e.target.value)} 
                    />
                </CardContent>
            </Card>

            <div className="space-y-6">
                {screenshots.map((item, index) => (
                     <Card key={item.id}>
                         <CardHeader className="flex flex-row items-center justify-between">
                             <CardTitle>Screenshot {index + 1}</CardTitle>
                             <Button type="button" variant="destructive" size="icon" onClick={() => handleDeleteScreenshot(item.id)}>
                                <Trash2 className="h-4 w-4" />
                            </Button>
                         </CardHeader>
                        <CardContent className="grid md:grid-cols-2 gap-6">
                             <div className="space-y-4">
                                <Image
                                    src={item.imageUrl}
                                    alt={`Screenshot ${index + 1} Preview`}
                                    width={1200}
                                    height={800}
                                    className="w-full rounded-md border bg-muted aspect-video object-cover"
                                />
                                <input 
                                    type="file"
                                    className="hidden"
                                    ref={el => fileInputRefs.current[item.id] = el}
                                    onChange={(e) => e.target.files && handleImageFileChange(item.id, e.target.files[0])}
                                    accept="image/*" 
                                />
                                <Button type="button" variant="outline" className="w-full" onClick={() => fileInputRefs.current[item.id]?.click()}>
                                    <Upload className="mr-2" /> Change Image
                                </Button>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor={`url-${item.id}`}>Click URL</Label>
                                <Input 
                                    id={`url-${item.id}`}
                                    value={item.url}
                                    onChange={(e) => handleScreenshotChange(item.id, 'url', e.target.value)}
                                    placeholder="https://example.com/feature"
                                />
                                <p className="text-xs text-muted-foreground">
                                    Make this image a clickable link. Leave blank for no link.
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

        </div>
    </form>
  );
}
