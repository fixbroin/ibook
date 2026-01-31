
'use client';

import { useEffect, useState, useRef, useTransition } from 'react';
import { auth, storage } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { getProviderByUsername, updateProvider } from '@/lib/data';
import type { Provider, ProviderTestimonial } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { v4 as uuidv4 } from 'uuid';
import { Loader2, PlusCircle, MoreVertical, Upload, Trash2, X, Star, User as UserIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Image from 'next/image';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { getDownloadURL, ref, uploadBytesResumable, deleteObject } from 'firebase/storage';
import { Progress } from '@/components/ui/progress';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const emptyItem: Partial<ProviderTestimonial> = {
  name: '',
  role: '',
  description: '',
  rating: 5,
  imageUrl: '',
  displayOrder: 0,
  enabled: true,
};

export default function TestimonialsPage() {
  const [provider, setProvider] = useState<Provider | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState<Partial<ProviderTestimonial> | null>(null);
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

  const handleOpenForm = (item: ProviderTestimonial | null = null) => {
    if (item) {
      setCurrentItem({ ...item });
      setImagePreview(item.imageUrl || null);
    } else {
      const newOrder = provider?.settings.testimonials?.items ? Math.max(0, ...provider.settings.testimonials.items.map(s => s.displayOrder)) + 1 : 1;
      setCurrentItem({ ...emptyItem, displayOrder: newOrder });
      setImagePreview(null);
    }
    setIsFormOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { // 2MB limit
        toast({ title: 'File too large', description: 'Please upload an image smaller than 2MB.', variant: 'destructive' });
        return;
      }
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!currentItem || !provider) return;

    startTransition(async () => {
      let imageUrl = currentItem.imageUrl || '';
      
      if (imageFile) {
        setUploadProgress(0);
        const storageRef = ref(storage, `testimonials/${provider.username}/${uuidv4()}-${imageFile.name}`);
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

      const finalItem: ProviderTestimonial = {
        ...emptyItem,
        ...currentItem,
        id: currentItem.id || uuidv4(),
        imageUrl,
      } as ProviderTestimonial;

      const existingItems = provider.settings.testimonials?.items || [];
      const itemIndex = existingItems.findIndex(s => s.id === finalItem.id);
      
      let updatedItems: ProviderTestimonial[];
      if (itemIndex > -1) {
        updatedItems = existingItems.map(s => s.id === finalItem.id ? finalItem : s);
      } else {
        updatedItems = [...existingItems, finalItem];
      }
      
      try {
        const testimonialsSettings = { ...provider.settings.testimonials, items: updatedItems };
        await updateProvider(provider.username, { settings: { ...provider.settings, testimonials: testimonialsSettings } });
        toast({ title: 'Success', description: 'Testimonial saved.' });
        setProvider(p => p ? { ...p, settings: { ...p.settings, testimonials: testimonialsSettings } } : null);
        resetFormState();
      } catch (error: any) {
        toast({ title: 'Error', description: 'Failed to save testimonial.', variant: 'destructive' });
      }
    });
  };

  const handleDelete = async () => {
    if (!currentItem?.id || !provider) return;

    startTransition(async () => {
        const itemToDelete = provider.settings.testimonials?.items.find(i => i.id === currentItem.id);
        const updatedItems = (provider.settings.testimonials?.items || []).filter(i => i.id !== currentItem.id);
        const testimonialsSettings = { ...provider.settings.testimonials, items: updatedItems };
        try {
            await updateProvider(provider.username, { settings: { ...provider.settings, testimonials: testimonialsSettings } });
            if (itemToDelete?.imageUrl && itemToDelete.imageUrl.includes('firebasestorage')) {
                const imageRef = ref(storage, itemToDelete.imageUrl);
                await deleteObject(imageRef).catch(err => console.warn("Could not delete old image:", err));
            }
            toast({ title: 'Success', description: 'Testimonial deleted.' });
            setProvider(p => p ? { ...p, settings: { ...p.settings, testimonials: testimonialsSettings } } : null);
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
  
  const testimonials = provider.settings.testimonials?.items?.sort((a,b) => a.displayOrder - b.displayOrder) || [];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Manage Testimonials</CardTitle>
            <CardDescription>Add, edit, and organize customer testimonials.</CardDescription>
          </div>
          <Button onClick={() => handleOpenForm()}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add Testimonial
          </Button>
        </CardHeader>
        <CardContent>
          {testimonials.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {testimonials.map(item => (
                <Card key={item.id} className="flex flex-col">
                  <CardHeader className="flex-row items-start justify-between gap-4">
                     <div className="flex items-center gap-4">
                        <Avatar className="w-12 h-12">
                            <AvatarImage src={item.imageUrl} />
                            <AvatarFallback>{item.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                            <p className="font-semibold">{item.name}</p>
                            <p className="text-sm text-muted-foreground">{item.role}</p>
                        </div>
                     </div>
                     <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7">
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
                  </CardHeader>
                  <CardContent className="flex-1">
                    <div className="flex items-center gap-0.5 mb-2">
                        {[...Array(5)].map((_, i) => (
                            <Star key={i} className={`h-4 w-4 ${i < item.rating ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground/30'}`} />
                        ))}
                    </div>
                    <p className="text-sm text-muted-foreground">"{item.description}"</p>
                  </CardContent>
                  <CardFooter>
                     <Badge variant={item.enabled ? 'default' : 'secondary'}>{item.enabled ? 'Enabled' : 'Disabled'}</Badge>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
             <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 text-center h-[40vh]">
                <UserIcon className="h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">No testimonials yet.</h3>
                <p className="mb-4 mt-2 text-sm text-muted-foreground">Add customer reviews to build trust.</p>
                <Button onClick={() => handleOpenForm()}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Testimonial
                </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isFormOpen} onOpenChange={(open) => !open && resetFormState()}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{currentItem?.id ? 'Edit' : 'Add'} Testimonial</DialogTitle>
          </DialogHeader>
          {currentItem && (
            <form onSubmit={handleSave}>
              <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto px-2">
                 <div className="space-y-2">
                    <Label>Customer Photo</Label>
                    <div className="flex items-center gap-4">
                        <Avatar className="h-20 w-20">
                            <AvatarImage src={imagePreview || undefined} />
                            <AvatarFallback><UserIcon className="h-8 w-8" /></AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                            <Input id="imageUrl" type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" />
                            {uploadProgress !== null && <Progress value={uploadProgress} className="mt-2" />}
                        </div>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Name</Label>
                        <Input id="name" value={currentItem.name || ''} onChange={e => setCurrentItem(s => s ? {...s, name: e.target.value} : null)} required />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="role">Role (e.g. "Customer")</Label>
                        <Input id="role" value={currentItem.role || ''} onChange={e => setCurrentItem(s => s ? {...s, role: e.target.value} : null)} />
                    </div>
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="description">Review</Label>
                    <Textarea id="description" value={currentItem.description || ''} onChange={e => setCurrentItem(s => s ? {...s, description: e.target.value} : null)} required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="rating">Rating</Label>
                        <Select value={String(currentItem.rating || 5)} onValueChange={val => setCurrentItem(s => s ? {...s, rating: Number(val)} : null)}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select rating" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="5">5 Stars</SelectItem>
                                <SelectItem value="4">4 Stars</SelectItem>
                                <SelectItem value="3">3 Stars</SelectItem>
                                <SelectItem value="2">2 Stars</SelectItem>
                                <SelectItem value="1">1 Star</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="displayOrder">Display Order</Label>
                        <Input id="displayOrder" type="number" value={currentItem.displayOrder ?? ''} onChange={e => setCurrentItem(s => s ? {...s, displayOrder: Number(e.target.value)} : null)} required />
                    </div>
                </div>
                <div className="flex items-center space-x-2 pt-2">
                    <Switch id="enabled" checked={currentItem.enabled} onCheckedChange={checked => setCurrentItem(s => s ? {...s, enabled: checked} : null)} />
                    <Label htmlFor="enabled">Enable this testimonial</Label>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={resetFormState}>Cancel</Button>
                <Button type="submit" disabled={isPending}>
                  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save Testimonial
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
              This action will permanently delete this testimonial.
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
