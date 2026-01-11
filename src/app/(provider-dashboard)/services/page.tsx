

'use client';

import { useEffect, useState, useRef, useTransition, useCallback } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, storage } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { getProviderByUsername, updateProvider } from '@/lib/data';
import type { Provider, Service } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { v4 as uuidv4 } from 'uuid';
import { Loader2, PlusCircle, MoreVertical, Upload, Trash2, Image as ImageIcon, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import Image from 'next/image';
import { Skeleton } from '@/components/ui/skeleton';
import { getDownloadURL, ref, uploadBytesResumable } from 'firebase/storage';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';


const emptyService: Omit<Service, 'id'> = {
  title: '',
  description: '',
  imageUrl: 'https://picsum.photos/seed/service/400/250',
  price: 0,
  duration: 30,
  displayOrder: 0,
  enabled: true,
  assignedServiceTypes: [],
  quantityEnabled: false,
  maxQuantity: 10,
};

export default function ServicesPage() {
  const [provider, setProvider] = useState<Provider | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [currentService, setCurrentService] = useState<Partial<Service> | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser && currentUser.email) {
        const username = currentUser.email.split('@')[0];
        try {
          const providerData = await getProviderByUsername(username);
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
    return () => unsubscribe();
  }, [router, toast]);

  const resetFormState = () => {
    setIsFormOpen(false);
    setCurrentService(null);
    setImageFile(null);
    setImagePreview(null);
    setUploadProgress(null);
  };

  const handleOpenForm = useCallback((service: Service | null = null) => {
    if (service) {
      setCurrentService({ ...service });
      setImagePreview(service.imageUrl);
    } else {
      const newOrder = provider?.settings.services ? Math.max(0, ...provider.settings.services.map(s => s.displayOrder)) + 1 : 1;
      setCurrentService({ ...emptyService, price: undefined, displayOrder: newOrder });
      setImagePreview(emptyService.imageUrl);
    }
    setIsFormOpen(true);
  }, [provider]);

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
    if (!currentService || !provider) return;

    if (!currentService.assignedServiceTypes || currentService.assignedServiceTypes.length === 0) {
      toast({
        title: 'Validation Error',
        description: 'You must assign the service to at least one service type.',
        variant: 'destructive',
      });
      return;
    }

    startTransition(async () => {
      let imageUrl = currentService.imageUrl || '';
      
      if (imageFile) {
        setUploadProgress(0);
        const storageRef = ref(storage, `services/${provider.username}/${uuidv4()}-${imageFile.name}`);
        const uploadTask = uploadBytesResumable(storageRef, imageFile);
        
        try {
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

      const finalService: Service = {
        ...emptyService,
        ...currentService,
        id: currentService.id || uuidv4(),
        price: currentService.price ?? 0,
        imageUrl: imageUrl,
      };

      const existingServices = provider.settings.services || [];
      const serviceIndex = existingServices.findIndex(s => s.id === finalService.id);
      
      let updatedServices: Service[];
      if (serviceIndex > -1) {
        updatedServices = existingServices.map(s => s.id === finalService.id ? finalService : s);
      } else {
        updatedServices = [...existingServices, finalService];
      }
      
      try {
        await updateProvider(provider.username, { settings: { ...provider.settings, services: updatedServices } });
        toast({ title: 'Success', description: `Service '${finalService.title}' has been saved.` });
        window.location.reload();
      } catch (error: any) {
        toast({ title: 'Error', description: 'Failed to save service.', variant: 'destructive' });
      }
    });
  };

  const handleDelete = async () => {
    if (!currentService?.id || !provider) return;

    startTransition(async () => {
      const updatedServices = (provider.settings.services || []).filter(s => s.id !== currentService!.id);
      try {
        await updateProvider(provider.username, { settings: { ...provider.settings, services: updatedServices } });
        toast({ title: 'Success', description: 'Service has been deleted.' });
        window.location.reload();
      } catch (error: any) {
        toast({ title: 'Error', description: 'Failed to delete service.', variant: 'destructive' });
      }
    });
  };
  
  const handleOfferPriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newOfferPrice = Number(e.target.value);
    const currentPrice = currentService?.price ?? 0;
    
    if (newOfferPrice > currentPrice) {
      setCurrentService(s => s ? { ...s, offerPrice: currentPrice } : null);
      toast({
        title: 'Invalid Offer Price',
        description: 'Offer price cannot be greater than the original price.',
        variant: 'destructive',
      });
    } else {
      setCurrentService(s => s ? { ...s, offerPrice: newOfferPrice } : null);
    }
  };


  if (loading || !provider) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }
  
  const services = provider.settings.services?.sort((a,b) => a.displayOrder - b.displayOrder) || [];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Manage Services</CardTitle>
            <CardDescription>Add, edit, and organize your service offerings.</CardDescription>
          </div>
          <Button onClick={() => handleOpenForm()}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add New Service
          </Button>
        </CardHeader>
        <CardContent>
          {services.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {services.map(service => (
                <Card key={service.id} className="flex flex-col">
                  <div className="relative">
                    <Image src={service.imageUrl} alt={service.title} width={400} height={250} className="rounded-t-lg aspect-[16/10] object-cover" />
                    <div className="absolute top-2 right-2 flex items-center gap-2">
                        <Badge variant={service.enabled ? 'default' : 'secondary'}>{service.enabled ? 'Enabled' : 'Disabled'}</Badge>
                         <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="secondary" size="icon" className="h-7 w-7">
                                <MoreVertical className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleOpenForm(service)}>Edit</DropdownMenuItem>
                                <DropdownMenuItem className="text-red-500" onClick={() => {
                                    setCurrentService(service);
                                    setIsDeleteAlertOpen(true);
                                }}>Delete</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                  </div>
                  <CardHeader>
                    <CardTitle>{service.title}</CardTitle>
                     <div className="text-lg font-bold">
                        {service.offerPrice ? (
                            <span><span className="line-through text-muted-foreground">₹{service.price}</span> ₹{service.offerPrice}</span>
                        ) : `₹${service.price}`
                        }
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1">
                    <p className="text-sm text-muted-foreground">{service.description}</p>
                  </CardContent>
                  <CardFooter className="flex flex-wrap gap-2">
                     {service.assignedServiceTypes.map(st => <Badge key={st} variant="outline">{st}</Badge>)}
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
             <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 text-center h-[40vh]">
                <ImageIcon className="h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">No services found.</h3>
                <p className="mb-4 mt-2 text-sm text-muted-foreground">Add your first service to get started.</p>
                <Button onClick={() => handleOpenForm()}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Service
                </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isFormOpen} onOpenChange={(open) => !open && resetFormState()}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{currentService?.id ? 'Edit Service' : 'Add New Service'}</DialogTitle>
          </DialogHeader>
          {currentService && (
            <form onSubmit={handleSave}>
              <div className="grid gap-6 py-4 max-h-[70vh] overflow-y-auto px-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="title">Service Title</Label>
                            <Input id="title" value={currentService.title || ''} onChange={e => setCurrentService(s => s ? {...s, title: e.target.value} : null)} required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="description">Short Description</Label>
                            <Textarea id="description" value={currentService.description || ''} onChange={e => setCurrentService(s => s ? {...s, description: e.target.value} : null)} />
                        </div>
                         <div className="space-y-2">
                            <Label>Service Image</Label>
                            {imagePreview && <Image src={imagePreview} alt="preview" width={200} height={125} className="rounded-md border aspect-[16/10] object-cover" />}
                            <Input id="imageUrl" type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" />
                            {uploadProgress !== null && <Progress value={uploadProgress} />}
                        </div>
                    </div>
                     <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="price">Price</Label>
                                <Input id="price" type="number" value={currentService.price ?? ''} onChange={e => setCurrentService(s => s ? {...s, price: Number(e.target.value)} : null)} required />
                            </div>
                             <div className="space-y-2">
                                <Label htmlFor="offerPrice">Offer Price (Optional)</Label>
                                <Input id="offerPrice" type="number" value={currentService.offerPrice ?? ''} onChange={handleOfferPriceChange} />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="duration">Service Time (minutes)</Label>
                            <Input id="duration" type="number" value={currentService.duration ?? ''} onChange={e => setCurrentService(s => s ? {...s, duration: Number(e.target.value)} : null)} required />
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="displayOrder">Display Order</Label>
                            <Input id="displayOrder" type="number" value={currentService.displayOrder ?? ''} onChange={e => setCurrentService(s => s ? {...s, displayOrder: Number(e.target.value)} : null)} required />
                        </div>
                        <div className="flex items-center space-x-2 pt-2">
                            <Switch id="enabled" checked={currentService.enabled} onCheckedChange={checked => setCurrentService(s => s ? {...s, enabled: checked} : null)} />
                            <Label htmlFor="enabled">Enable this service</Label>
                        </div>
                        <div className="flex items-center space-x-2 pt-2">
                            <Switch id="quantityEnabled" checked={currentService.quantityEnabled} onCheckedChange={checked => setCurrentService(s => s ? {...s, quantityEnabled: checked} : null)} />
                            <Label htmlFor="quantityEnabled">Enable Quantity Selection</Label>
                        </div>
                        {currentService.quantityEnabled && (
                            <div className="space-y-2 pl-8">
                                <Label htmlFor="maxQuantity">Maximum Quantity</Label>
                                <Input id="maxQuantity" type="number" min="1" value={currentService.maxQuantity ?? 10} onChange={e => setCurrentService(s => s ? {...s, maxQuantity: Number(e.target.value)} : null)} />
                            </div>
                        )}
                         <div className="space-y-2 pt-4">
                             <Label>Assign to Service Types</Label>
                             <div className="space-y-2 rounded-md border p-4">
                                {provider.settings.serviceTypes.filter(st => st.enabled).map(st => (
                                    <div key={st.id} className="flex items-center space-x-2">
                                        <Checkbox 
                                            id={`st-${st.id}`}
                                            checked={currentService.assignedServiceTypes?.includes(st.id)}
                                            onCheckedChange={checked => {
                                                setCurrentService(s => {
                                                    if (!s) return null;
                                                    const existing = s.assignedServiceTypes || [];
                                                    const newTypes = checked ? [...existing, st.id] : existing.filter(id => id !== st.id);
                                                    return {...s, assignedServiceTypes: newTypes};
                                                })
                                            }}
                                        />
                                        <Label htmlFor={`st-${st.id}`}>{st.name}</Label>
                                    </div>
                                ))}
                             </div>
                        </div>
                    </div>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={resetFormState}>Cancel</Button>
                <Button type="submit" disabled={isPending}>
                  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save Service
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
              This will permanently delete the "{currentService?.title}" service. This action cannot be undone.
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

    
