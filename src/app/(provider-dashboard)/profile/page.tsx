

'use client';

import { useEffect, useState, useRef } from "react";
import { getProviderByUsername, updateProvider, deleteProvider } from "@/lib/data";
import { notFound, useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ClipboardCopy, Loader2, Upload, KeyRound, Trash2, X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { Provider } from "@/lib/types";
import { auth, storage } from "@/lib/firebase";
import { onAuthStateChanged, User, sendPasswordResetEmail, deleteUser } from "firebase/auth";
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [provider, setProvider] = useState<Provider | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const router = useRouter();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser && currentUser.email) {
        setUser(currentUser);
        // This is a simplification. In a real app, you'd map UID to provider.
        const username = currentUser.email.split('@')[0];
        try {
          const providerData = await getProviderByUsername(username);
          if (providerData) {
            setProvider(providerData);
            setPreviewUrl(providerData.logoUrl);
          } else {
            toast({ title: "Error", description: "Could not find your provider profile.", variant: "destructive" });
            notFound();
          }
        } catch (error) {
          toast({ title: "Error", description: "Failed to load your profile.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
      } else {
        router.push('/login');
      }
    });

    return () => unsubscribe();
  }, [router, toast]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (!provider) return;
    const { id, value } = e.target;
    
    if (id === 'email' || id === 'phone') {
        setProvider({
            ...provider,
            contact: {
                ...provider.contact,
                [id]: value,
            }
        })
    } else {
        setProvider({
            ...provider,
            [id]: value,
        });
    }
  };

  const compressAndResizeImage = (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 500;
          const MAX_HEIGHT = 500;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            return reject(new Error('Could not get canvas context'));
          }
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob((blob) => {
            if (!blob) {
              return reject(new Error('Canvas to blob conversion failed'));
            }
            const newFile = new File([blob], file.name.replace(/\.[^/.]+$/, ".webp"), {
              type: 'image/webp',
              lastModified: Date.now()
            });
            resolve(newFile);
          }, 'image/webp', 0.8); // 80% quality
        };
        img.onerror = reject;
      };
      reader.onerror = reject;
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) { // 10 MB limit
          toast({ title: 'File Too Large', description: 'Please upload an image smaller than 10 MB.', variant: 'destructive'});
          return;
      }
      const supportedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!supportedTypes.includes(file.type)) {
          toast({ title: 'Unsupported File Type', description: 'Please upload a JPG, PNG, GIF, or WebP image.', variant: 'destructive'});
          return;
      }
      
      try {
        const compressedFile = await compressAndResizeImage(file);
        setFileToUpload(compressedFile);
        setPreviewUrl(URL.createObjectURL(compressedFile));
      } catch (error) {
        console.error("Image compression failed:", error);
        toast({ title: 'Error', description: 'Could not process image. Please try another one.', variant: 'destructive' });
        setFileToUpload(file); // Fallback to original file
        setPreviewUrl(URL.createObjectURL(file));
      }
    }
  };
  
  const handleRemovePhoto = () => {
    if (!provider) return;
    setFileToUpload(null);
    setPreviewUrl(null);
    // The actual deletion from storage and DB happens on save
  }

  const handleSaveChanges = async () => {
    if (!provider) return;
    setSaving(true);
    setUploadProgress(null);

    let updatedProviderData = { ...provider };

    try {
      // If a new file is staged for upload
      if (fileToUpload) {
        const storageRef = ref(storage, `provider-logos/${provider.username}/${fileToUpload.name}`);
        const uploadTask = uploadBytesResumable(storageRef, fileToUpload);

        await new Promise<void>((resolve, reject) => {
            uploadTask.on('state_changed',
                (snapshot) => {
                    const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    setUploadProgress(progress);
                },
                (error) => {
                    console.error("Upload failed:", error);
                    toast({ title: "Upload Failed", description: "Could not upload new logo.", variant: "destructive" });
                    reject(error);
                },
                async () => {
                    const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                    updatedProviderData.logoUrl = downloadURL;
                    resolve();
                }
            );
        });
      } else if (previewUrl === null && provider.logoUrl) {
        // If the photo was removed (preview is null but original provider had a logo)
        const oldStorageRef = ref(storage, provider.logoUrl);
        try {
            await deleteObject(oldStorageRef);
        } catch (error: any) {
             if (error.code !== 'storage/object-not-found') {
                console.warn("Could not delete old logo, it might not exist:", error);
             }
        }
        updatedProviderData.logoUrl = '';
      }

      await updateProvider(provider.username, updatedProviderData);
      setProvider(updatedProviderData);
      setFileToUpload(null);
      setUploadProgress(null);

      toast({
        title: "Profile Updated",
        description: "Your public profile has been saved.",
      });

    } catch (error) {
      console.error("Error saving profile:", error);
      toast({
        title: "Error",
        description: "Could not save profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
      setUploadProgress(null);
    }
  };

  const handlePasswordReset = async () => {
    if (!user || !user.email) {
      toast({
        title: "Error",
        description: "Could not send password reset email. User email not found.",
        variant: "destructive",
      });
      return;
    }
    setResettingPassword(true);
    try {
      await sendPasswordResetEmail(auth, user.email);
      toast({
        title: "Password Reset Email Sent",
        description: "Please check your inbox to reset your password.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send password reset email.",
        variant: "destructive",
      });
    } finally {
      setResettingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user || !provider) {
        toast({ title: 'Error', description: 'Cannot delete account. User or provider not found.', variant: 'destructive' });
        return;
    }
    setDeleting(true);
    try {
        // First, delete Firestore data
        await deleteProvider(provider.username);

        // Then, delete Firebase Auth user
        await deleteUser(user);
        
        toast({ title: 'Account Deleted', description: 'Your account has been permanently deleted.' });
        router.push('/login');

    } catch (error: any) {
        console.error("Account deletion error: ", error);
        let description = 'Could not delete your account. Please try again.';
        if (error.code === 'auth/requires-recent-login') {
            description = 'This is a security-sensitive action. Please log out and log back in before trying to delete your account again.';
        }
        toast({ title: 'Deletion Failed', description: description, variant: 'destructive' });
        setDeleting(false);
        setIsDeleteAlertOpen(false);
    }
  }


  if (loading) {
    return (
      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-6">
            <Card>
                <CardHeader>
                  <Skeleton className="h-8 w-1/3" />
                  <Skeleton className="h-4 w-2/3" />
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-10 w-full" />
                  </div>
                   <div className="space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-20 w-full" />
                  </div>
                  <Skeleton className="h-10 w-32" />
                </CardContent>
            </Card>
             <Card>
                <CardHeader>
                  <Skeleton className="h-8 w-1/3" />
                  <Skeleton className="h-4 w-2/3" />
                </CardHeader>
                <CardContent>
                   <Skeleton className="h-10 w-full" />
                </CardContent>
            </Card>
        </div>
         <div className="space-y-6">
            <Card>
                <CardHeader>
                    <Skeleton className="h-8 w-1/2" />
                    <Skeleton className="h-4 w-full" />
                </CardHeader>
                <CardContent>
                   <Skeleton className="h-10 w-full" />
                </CardContent>
            </Card>
             <Card>
                <CardHeader>
                     <Skeleton className="h-8 w-1/3" />
                </CardHeader>
                <CardContent className="flex flex-col items-center gap-4">
                    <Skeleton className="h-24 w-24 rounded-full" />
                    <Skeleton className="h-10 w-32" />
                </CardContent>
            </Card>
        </div>
    </div>
    )
  }

  if (!provider || !user) {
    return null;
  }
  
  const bookingLink = typeof window !== 'undefined' ? `${window.location.origin}/${provider.username}` : '';

  return (
    <>
      <div className="grid gap-6 md:grid-cols-3">
          <div className="md:col-span-2 space-y-6">
              <Card>
                  <CardHeader>
                  <CardTitle>Public Profile</CardTitle>
                  <CardDescription>This information will be displayed on your public booking page.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                      <div className="space-y-2">
                          <Label htmlFor="name">Business Name</Label>
                          <Input id="name" value={provider.name} onChange={handleInputChange} />
                      </div>
                      <div className="space-y-2">
                          <Label htmlFor="description">Business Description</Label>
                          <Textarea id="description" value={provider.description} onChange={handleInputChange} rows={5} />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                              <Label htmlFor="email">Contact Email</Label>
                              <Input id="email" type="email" value={provider.contact.email} onChange={handleInputChange} />
                          </div>
                          <div className="space-y-2">
                              <Label htmlFor="phone">Contact Phone</Label>
                              <Input id="phone" type="tel" value={provider.contact.phone} onChange={handleInputChange} />
                          </div>
                      </div>
                      <Button onClick={handleSaveChanges} disabled={saving}>
                          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          Save Changes
                      </Button>
                  </CardContent>
              </Card>

              <Card>
                  <CardHeader>
                      <CardTitle>Security</CardTitle>
                      <CardDescription>Manage your account security settings.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                      <div className="flex items-center justify-between rounded-lg border p-4">
                          <div>
                              <p className="font-medium">Change Password</p>
                              <p className="text-sm text-muted-foreground">A password reset link will be sent to your email.</p>
                          </div>
                          <Button variant="outline" onClick={handlePasswordReset} disabled={resettingPassword}>
                              {resettingPassword ? (
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              ) : (
                                  <KeyRound className="mr-2 h-4 w-4" />
                              )}
                              Send Reset Email
                          </Button>
                      </div>
                      <div className="flex items-center justify-between rounded-lg border border-destructive/50 p-4">
                          <div>
                              <p className="font-medium text-destructive">Delete Account</p>
                              <p className="text-sm text-muted-foreground">Permanently delete your account and all associated data.</p>
                          </div>
                          <Button variant="destructive" onClick={() => setIsDeleteAlertOpen(true)} disabled={deleting}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </Button>
                      </div>
                  </CardContent>
              </Card>

          </div>
          <div className="space-y-6">
              <Card>
                  <CardHeader>
                      <CardTitle>Your Booking Link</CardTitle>
                      <CardDescription>Share this link with your customers to start receiving bookings.</CardDescription>
                  </CardHeader>
                  <CardContent>
                      <div className="flex items-center space-x-2">
                          <Input value={bookingLink} readOnly />
                          <Button variant="outline" size="icon" onClick={() => {
                              navigator.clipboard.writeText(bookingLink);
                              toast({ title: "Copied to clipboard!" });
                          }}>
                              <ClipboardCopy className="h-4 w-4" />
                          </Button>
                      </div>
                  </CardContent>
              </Card>
              <Card>
                  <CardHeader>
                      <CardTitle>Profile Logo</CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col items-center gap-4">
                      <Avatar className="h-24 w-24">
                          <AvatarImage src={previewUrl || undefined} data-ai-hint="company logo" />
                          <AvatarFallback>{provider.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        className="hidden"
                        accept="image/png, image/jpeg, image/gif, image/webp"
                      />
                      {uploadProgress !== null && <Progress value={uploadProgress} className="w-full" />}
                      <div className="flex gap-2">
                        <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={saving}>
                            <Upload className="mr-2 h-4 w-4" />
                            {previewUrl ? 'Change' : 'Upload'}
                        </Button>
                        {previewUrl && (
                            <Button variant="ghost" onClick={handleRemovePhoto} disabled={saving}>
                                <X className="mr-2 h-4 w-4" />
                                Remove
                            </Button>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground text-center space-y-1">
                          <p>Max file size: 10 MB. Ratio: 1:1 (Square)</p>
                          <p>Supported formats: JPG, PNG, GIF, WebP</p>
                      </div>
                  </CardContent>
              </Card>
          </div>
      </div>
      
      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your account, including all your bookings and settings.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAccount} disabled={deleting} className="bg-destructive hover:bg-destructive/90">
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Yes, delete my account
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

    
