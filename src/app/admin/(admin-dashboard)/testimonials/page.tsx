

'use client';

import { useState, useEffect, useTransition, useRef } from 'react';
import { getTestimonials, createTestimonial } from '@/lib/data';
import { updateTestimonial, deleteTestimonial } from '@/lib/admin.actions';
import type { Testimonial } from '@/lib/types';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, PlusCircle, MoreVertical, Star, Upload, Trash2, X, Image as ImageIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { storage } from '@/lib/firebase';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';

const emptyTestimonial: Partial<Testimonial> = {
  name: '',
  rating: 5,
  description: '',
  imageUrl: '',
};

export default function AdminTestimonialsPage() {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  
  const [currentTestimonial, setCurrentTestimonial] = useState<Partial<Testimonial> | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const { toast } = useToast();

  const fetchTestimonials = async () => {
    setLoading(true);
    try {
      const data = await getTestimonials();
      setTestimonials(data);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to fetch testimonials.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTestimonials();
  }, []);

  const resetFormState = () => {
    setIsFormOpen(false);
    setCurrentTestimonial(null);
    setImagePreview(null);
    setImageFile(null);
    setUploadProgress(null);
  };

  const handleOpenForm = (testimonial: Partial<Testimonial> | null = null) => {
    if (testimonial) {
        setCurrentTestimonial(testimonial);
        setImagePreview(testimonial.imageUrl || null);
    } else {
        setCurrentTestimonial(emptyTestimonial);
    }
    setIsFormOpen(true);
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5 MB limit
          toast({ title: 'File Too Large', description: 'Please upload an image smaller than 5 MB.', variant: 'destructive'});
          return;
      }
      const supportedTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!supportedTypes.includes(file.type)) {
          toast({ title: 'Unsupported File Type', description: 'Please upload a JPG, PNG, or WebP image.', variant: 'destructive'});
          return;
      }
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
      if (currentTestimonial) {
        setCurrentTestimonial(p => p ? {...p, imageUrl: ''} : null);
      }
    }
  };

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!currentTestimonial || !formRef.current) return;

    startTransition(async () => {
      const formData = new FormData(formRef.current!);
      const name = formData.get('name') as string;
      const rating = Number(formData.get('rating') as string);
      const description = formData.get('description') as string;
      
      let finalImageUrl = imagePreview;

      if (imageFile) {
        try {
          const storageRef = ref(storage, `testimonials/${uuidv4()}`);
          const uploadTask = uploadBytesResumable(storageRef, imageFile);

          finalImageUrl = await new Promise<string>((resolve, reject) => {
            uploadTask.on('state_changed',
              (snapshot) => setUploadProgress((snapshot.bytesTransferred / snapshot.totalBytes) * 100),
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
        } catch (error) {
          return; // Stop if upload fails
        }
      } else if (!imagePreview && currentTestimonial?.id && currentTestimonial.imageUrl) {
        // If image was removed
        const oldStorageRef = ref(storage, currentTestimonial.imageUrl);
        try {
          await deleteObject(oldStorageRef);
        } catch (error: any) {
           if (error.code !== 'storage/object-not-found') {
               console.warn("Could not delete old image, it might not exist:", error);
           }
        }
        finalImageUrl = '';
      }
      
      const testimonialData: Omit<Testimonial, 'id' | 'createdAt'> = {
          name, rating, description, imageUrl: finalImageUrl || ''
      };

      try {
        if (currentTestimonial.id) {
            await updateTestimonial(currentTestimonial.id, testimonialData);
            toast({ title: 'Success', description: 'Testimonial updated successfully.' });
        } else {
            await createTestimonial(testimonialData);
            toast({ title: 'Success', description: 'Testimonial created successfully.' });
        }
        resetFormState();
        fetchTestimonials();
      } catch (error: any) {
        toast({ title: 'Error', description: error.message || 'Failed to save testimonial.', variant: 'destructive' });
      }
    });
  }
  
  const handleDelete = () => {
    if (!currentTestimonial?.id) return;
    
    startTransition(async () => {
      try {
        await deleteTestimonial(currentTestimonial.id!);
         toast({ title: 'Success', description: 'Testimonial deleted successfully.' });
        if (currentTestimonial.imageUrl && currentTestimonial.imageUrl.includes('firebasestorage.googleapis.com')) {
          const imageRef = ref(storage, currentTestimonial.imageUrl);
          await deleteObject(imageRef);
        }
      } catch (error: any) {
         if (error.code !== 'storage/object-not-found') {
            console.error("Failed to delete testimonial or its image:", error);
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
        } else {
             toast({ title: 'Success', description: 'Testimonial deleted successfully.' });
        }
      } finally {
        setIsDeleteAlertOpen(false);
        setCurrentTestimonial(null);
        fetchTestimonials();
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Manage Testimonials</h1>
          <p className="text-muted-foreground">Add, edit, or remove testimonials shown on your homepage.</p>
        </div>
        <Button onClick={() => handleOpenForm()}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add New Testimonial
        </Button>
      </div>
      
      {loading ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-64 w-full" />)}
        </div>
      ) : testimonials.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {testimonials.map(testimonial => (
            <Card key={testimonial.id} className="flex flex-col">
              <CardHeader className="flex flex-row items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  <Avatar>
                    <AvatarImage src={testimonial.imageUrl} />
                    <AvatarFallback>{testimonial.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-base">{testimonial.name}</CardTitle>
                    <div className="flex items-center gap-0.5">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className={`h-4 w-4 ${i < testimonial.rating ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground/50'}`} />
                      ))}
                    </div>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleOpenForm(testimonial)}>Edit</DropdownMenuItem>
                    <DropdownMenuItem className="text-red-500" onClick={() => {
                        setCurrentTestimonial(testimonial);
                        setIsDeleteAlertOpen(true);
                    }}>
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>
              <CardContent className="flex-1">
                <p className="text-muted-foreground text-sm">"{testimonial.description}"</p>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 text-center">
            <ImageIcon className="h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">No testimonials yet</h3>
            <p className="mb-4 mt-2 text-sm text-muted-foreground">Add your first testimonial to display on your homepage.</p>
            <Button onClick={() => handleOpenForm()}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add Testimonial
            </Button>
        </div>
      )}

      {/* Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={(open) => !open && resetFormState()}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{currentTestimonial?.id ? 'Edit' : 'Add New'} Testimonial</DialogTitle>
            <DialogDescription>
              Fill in the details below. Changes will be reflected on your homepage.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave} ref={formRef}>
             <ScrollArea className="max-h-[70vh] p-1">
              <div className="space-y-4 p-4">
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                        <Label htmlFor="name">Reviewer's Name</Label>
                        <Input id="name" name="name" defaultValue={currentTestimonial?.name || ''} required />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="rating">Star Rating</Label>
                        <Select name="rating" defaultValue={String(currentTestimonial?.rating || 5)}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a rating" />
                            </SelectTrigger>
                            <SelectContent>
                                {[5, 4, 3, 2, 1].map(r => (
                                    <SelectItem key={r} value={String(r)}>{r} Star{r > 1 && 's'}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                      <Label htmlFor="description">Review Description</Label>
                      <Textarea id="description" name="description" defaultValue={currentTestimonial?.description || ''} required />
                  </div>
                  <div className="space-y-2">
                      <Label>Reviewer Image</Label>
                      <div className="flex items-center gap-4">
                        <div className="relative">
                            <Avatar className="h-24 w-24">
                              <AvatarImage src={imagePreview || undefined} />
                              <AvatarFallback><ImageIcon /></AvatarFallback>
                            </Avatar>
                            {imagePreview && (
                                <Button
                                    type="button"
                                    variant="destructive"
                                    size="icon"
                                    className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                                    onClick={() => {
                                        setImagePreview(null);
                                        setImageFile(null);
                                        if (currentTestimonial) {
                                            setCurrentTestimonial(p => p ? {...p, imageUrl: ''} : null);
                                        }
                                    }}
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            )}
                        </div>
                        <div className="flex-1 space-y-2">
                           <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} className="w-full">
                             <Upload className="mr-2 h-4 w-4" /> Upload File
                           </Button>
                           <p className="text-xs text-muted-foreground text-center">OR</p>
                           <Input name="imageUrlInput" placeholder="Paste image URL" defaultValue={currentTestimonial?.imageUrl || ''} onChange={(e) => {
                               setImagePreview(e.target.value);
                               setImageFile(null);
                           }} />
                           <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
                        </div>
                      </div>
                      {uploadProgress !== null && <Progress value={uploadProgress} className="w-full mt-2" />}
                  </div>
              </div>
            </ScrollArea>
            <DialogFooter className="pt-4 flex-col-reverse sm:flex-row sm:justify-between sm:space-x-2">
              <Button type="button" variant="outline" onClick={resetFormState}>Cancel</Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Testimonial
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
       {/* Delete Confirmation Dialog */}
       <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the testimonial from "{currentTestimonial?.name}".
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



