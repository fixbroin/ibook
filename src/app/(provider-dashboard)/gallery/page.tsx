
'use client';

import { useEffect, useState, useRef, useTransition } from 'react';
import { auth, storage } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { getProviderByUsername, updateProvider } from '@/lib/data';
import type { Provider, ProviderGalleryItem } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { v4 as uuidv4 } from 'uuid';
import { Loader2, PlusCircle, MoreVertical, Upload, Trash2, X, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import Image from 'next/image';
import { Skeleton } from '@/components/ui/skeleton';
import { getDownloadURL, ref, uploadBytesResumable, deleteObject } from 'firebase/storage';
import { Progress } from '@/components/ui/progress';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';

const emptyItem: Partial<ProviderGalleryItem> = {
  title: '',
  caption: '',
  imageUrl: 'https://picsum.photos/seed/gallery/400/250',
  displayOrder: 0,
  enabled: true,
};

export default function GalleryPage() {
  const [provider, setProvider] = useState<Provider | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState<Partial<ProviderGalleryItem> | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser?.email) {
        try {
          const providerData = await getProviderByUsername(currentUser.email.split('@')[0]);
          if (providerData) {
            setProvider(providerData);
          } else {
            router.push('/dashboard');
          }
        } catch (error) {
          toast({ title: 'Error', description: 'Could not load your data.', variant: 'destructive' });
        } finally {
          setLoading(false);
        }
      } else {
        router.push('/login');
      }
    });
  }, [router, toast]);

  const resetFormState = () => {
    setIsFormOpen(false);
    setCurrentItem(null);
    setImageFile(null);
    setImagePreview(null);
    setUploadProgress(null);
  };

  const handleOpenForm = (item: ProviderGalleryItem | null = null) => {
    if (item) {
      setCurrentItem({ ...item });
      setImagePreview(item.imageUrl);
    } else {
      const newOrder = provider?.settings.gallery?.items ? Math.max(0, ...provider.settings.gallery.items.map(s => s.displayOrder)) + 1 : 1;
      setCurrentItem({ ...emptyItem, displayOrder: newOrder });
      setImagePreview(null);
    }
    setIsFormOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({ title: 'File too large', description: 'Please upload an image smaller than 5MB.', variant: 'destructive' });
        return;
      }
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!currentItem || !provider) return;
    if (!imageFile && !currentItem.imageUrl) {
        toast({ title: 'Image Required', description: 'Please upload an image for the gallery item.', variant: 'destructive'});
        return;
    }

    startTransition(async () => {
      let imageUrl = currentItem.imageUrl || '';
      
      if (imageFile) {
        setUploadProgress(0);
        const storageRef = ref(storage, `gallery/${provider.username}/${uuidv4()}-${imageFile.name}`);
        try {
            const uploadTask = uploadBytesResumable(storageRef, imageFile);
            imageUrl = await new Promise<string>((resolve, reject) => {
                uploadTask.on('state_changed',
                    (snapshot) => setUploadProgress((snapshot.bytesTransferred / snapshot.totalBytes) * 100),
                    reject,
                    async () => resolve(await getDownloadURL(uploadTask.snapshot.ref))
                );
            });
        } catch (error) {
            toast({ title: 'Upload Failed', description: 'Could not upload image.', variant: 'destructive' });
            return;
        }
      }

      const finalItem: ProviderGalleryItem = {
        ...emptyItem,
        ...currentItem,
        id: currentItem.id || uuidv4(),
        imageUrl,
      } as ProviderGalleryItem;

      const existingItems = provider.settings.gallery?.items || [];
      const itemIndex = existingItems.findIndex(s => s.id === finalItem.id);
      
      let updatedItems: ProviderGalleryItem[];
      if (itemIndex > -1) {
        updatedItems = existingItems.map(s => s.id === finalItem.id ? finalItem : s);
      } else {
        updatedItems = [...existingItems, finalItem];
      }
      
      try {
        const gallerySettings = { ...provider.settings.gallery, items: updatedItems };
        await updateProvider(provider.username, { settings: { ...provider.settings, gallery: gallerySettings } });
        toast({ title: 'Success', description: 'Gallery item saved.' });
        setProvider(p => p ? { ...p, settings: { ...p.settings, gallery: gallerySettings } } : null);
        resetFormState();
      } catch (error: any) {
        toast({ title: 'Error', description: 'Failed to save gallery item.', variant: 'destructive' });
      }
    });
  };

  const handleDelete = async () => {
    if (!currentItem?.id || !provider) return;

    startTransition(async () => {
        const itemToDelete = provider.settings.gallery?.items.find(i => i.id === currentItem.id);
        const updatedItems = (provider.settings.gallery?.items || []).filter(i => i.id !== currentItem.id);
        const gallerySettings = { ...provider.settings.gallery, items: updatedItems };
        try {
            await updateProvider(provider.username, { settings: { ...provider.settings, gallery: gallerySettings } });
            if (itemToDelete?.imageUrl && itemToDelete.imageUrl.includes('firebasestorage')) {
                const imageRef = ref(storage, itemToDelete.imageUrl);
                await deleteObject(imageRef).catch(err => console.warn("Could not delete old image:", err));
            }
            toast({ title: 'Success', description: 'Gallery item deleted.' });
            setProvider(p => p ? { ...p, settings: { ...p.settings, gallery: gallerySettings } } : null);
            setIsDeleteAlertOpen(false);
            setCurrentItem(null);
        } catch (error: any) {
            toast({ title: 'Error', description: 'Failed to delete item.', variant: 'destructive' });
        }
    });
  };
  
  if (loading || !provider) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }
  
  const galleryItems = provider.settings.gallery?.items?.sort((a,b) => a.displayOrder - b.displayOrder) || [];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Manage Gallery</CardTitle>
            <CardDescription>Add, edit, and organize your gallery images.</CardDescription>
          </div>
          <Button onClick={() => handleOpenForm()}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add New Image
          </Button>
        </CardHeader>
        <CardContent>
          {galleryItems.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {galleryItems.map(item => (
                <Card key={item.id} className="flex flex-col">
                  <div className="relative">
                    <Image src={item.imageUrl} alt={item.title || 'Gallery image'} width={400} height={250} className="rounded-t-lg aspect-video object-cover" />
                    <div className="absolute top-2 right-2 flex items-center gap-2">
                        <Badge variant={item.enabled ? 'default' : 'secondary'}>{item.enabled ? 'Enabled' : 'Disabled'}</Badge>
                         <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="secondary" size="icon" className="h-7 w-7">
                                <MoreVertical className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleOpenForm(item)}>Edit</DropdownMenuItem>
                                <DropdownMenuItem className="text-red-500" onClick={() => {
                                    setCurrentItem(item);
                                    setIsDeleteAlertOpen(true);
                                }}>Delete</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                  </div>
                  <CardContent className="p-4 flex-1">
                    {item.title && <p className="font-semibold">{item.title}</p>}
                    {item.caption && <p className="text-sm text-muted-foreground">{item.caption}</p>}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
             <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 text-center h-[40vh]">
                <ImageIcon className="h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">Your gallery is empty.</h3>
                <p className="mb-4 mt-2 text-sm text-muted-foreground">Add images to showcase your work.</p>
                <Button onClick={() => handleOpenForm()}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Image
                </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isFormOpen} onOpenChange={(open) => !open && resetFormState()}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{currentItem?.id ? 'Edit' : 'Add'} Gallery Item</DialogTitle>
          </DialogHeader>
          {currentItem && (
            <form onSubmit={handleSave}>
              <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto px-2">
                <div className="space-y-2">
                    <Label>Image</Label>
                    {imagePreview && <Image src={imagePreview} alt="preview" width={200} height={125} className="rounded-md border aspect-video object-cover w-full" />}
                    <Input id="imageUrl" type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" />
                    {uploadProgress !== null && <Progress value={uploadProgress} />}
                </div>
                <div className="space-y-2">
                    <Label htmlFor="title">Title (Optional)</Label>
                    <Input id="title" value={currentItem.title || ''} onChange={e => setCurrentItem(s => s ? {...s, title: e.target.value} : null)} />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="caption">Caption (Optional)</Label>
                    <Input id="caption" value={currentItem.caption || ''} onChange={e => setCurrentItem(s => s ? {...s, caption: e.target.value} : null)} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="displayOrder">Display Order</Label>
                    <Input id="displayOrder" type="number" value={currentItem.displayOrder ?? ''} onChange={e => setCurrentItem(s => s ? {...s, displayOrder: Number(e.target.value)} : null)} required />
                </div>
                <div className="flex items-center space-x-2 pt-2">
                    <Switch id="enabled" checked={currentItem.enabled} onCheckedChange={checked => setCurrentItem(s => s ? {...s, enabled: checked} : null)} />
                    <Label htmlFor="enabled">Enable this image</Label>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={resetFormState}>Cancel</Button>
                <Button type="submit" disabled={isPending}>
                  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save Item
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this gallery item. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isPending} className="bg-destructive hover:bg-destructive/90">
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
