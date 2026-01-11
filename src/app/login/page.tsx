
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import { auth } from '@/lib/firebase';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail
} from 'firebase/auth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Chrome, Loader2 } from 'lucide-react';
import { createProvider } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';


export default function LoginPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [resetEmail, setResetEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  const [emailAuthLoading, setEmailAuthLoading] = useState(false);
  const [googleAuthLoading, setGoogleAuthLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  
  const [authLoading, setAuthLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // User is logged in, redirect to dashboard
        router.replace('/dashboard');
      } else {
        // User is not logged in, show the login page
        setAuthLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailAuthLoading(true);
    setError(null);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(userCredential.user, { displayName: name });
      await createProvider(name, email);
      // New user, redirect to subscription
      router.push('/subscription');
    } catch (err: any) {
      setError(err.message);
      setEmailAuthLoading(false);
    }
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailAuthLoading(true);
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // Existing user, onAuthStateChanged will redirect
    } catch (err: any)      {
      setError(err.message);
      setEmailAuthLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleAuthLoading(true);
    setError(null);
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const { user } = result;

      if (!user.email) {
          throw new Error("Google sign-in failed: no email found.");
      }

      // Check if the user is new before creating a provider record
      const username = user.email.split('@')[0];
      const providerDocRef = doc(db, 'providers', username);
      const docSnap = await getDoc(providerDocRef);

      if (docSnap.exists()) {
        // Existing user, onAuthStateChanged will redirect
        router.replace('/dashboard');
      } else {
        // New user
        if (user.displayName && user.email) {
            await createProvider(user.displayName, user.email);
        }
        router.replace('/subscription');
      }
    } catch (err: any) {
      setError(err.message);
      setGoogleAuthLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!resetEmail) {
      toast({
        title: 'Email Required',
        description: 'Please enter your email address.',
        variant: 'destructive',
      });
      return;
    }
    setResetLoading(true);
    try {
      await sendPasswordResetEmail(auth, resetEmail);
      toast({
        title: 'Password Reset Email Sent',
        description: 'Please check your inbox for instructions to reset your password.',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to send password reset email.',
        variant: 'destructive',
      });
    } finally {
      setResetLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <Tabs defaultValue="login" className="w-full max-w-md">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="login">Login</TabsTrigger>
          <TabsTrigger value="signup">Sign Up</TabsTrigger>
        </TabsList>
        <TabsContent value="login">
          <Card>
            <form onSubmit={handleEmailSignIn}>
              <CardHeader className="text-center">
                <CardTitle>Welcome Back!</CardTitle>
                <CardDescription>Sign in to access your dashboard.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <Input id="login-email" type="email" placeholder="m@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
                </div>
                <div className="space-y-2">
                   <div className="flex items-center justify-between">
                    <Label htmlFor="login-password">Password</Label>
                     <Dialog>
                       <DialogTrigger asChild>
                          <Button variant="link" type="button" className="p-0 h-auto text-xs">Forgot password?</Button>
                       </DialogTrigger>
                       <DialogContent className="sm:max-w-md">
                          <DialogHeader>
                            <DialogTitle>Reset Password</DialogTitle>
                            <DialogDescription>
                              Enter your email address and we'll send you a link to reset your password.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-2">
                            <Label htmlFor="reset-email">Email</Label>
                            <Input
                              id="reset-email"
                              type="email"
                              placeholder="you@example.com"
                              value={resetEmail}
                              onChange={(e) => setResetEmail(e.target.value)}
                              autoComplete="email"
                            />
                          </div>
                          <DialogFooter>
                             <DialogClose asChild>
                               <Button type="button" variant="secondary">
                                 Cancel
                               </Button>
                            </DialogClose>
                            <Button type="button" onClick={handlePasswordReset} disabled={resetLoading}>
                               {resetLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                               Send Reset Link
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                    </Dialog>
                  </div>
                  <Input id="login-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                <Button type="submit" disabled={emailAuthLoading || googleAuthLoading} className="w-full">
                  {emailAuthLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Login
                </Button>
              </CardContent>
            </form>
            <CardFooter className="flex flex-col gap-4">
                <div className="relative w-full">
                    <Separator />
                    <span className="absolute left-1/2 -translate-x-1/2 -top-2.5 bg-card px-2 text-xs text-muted-foreground">OR</span>
                </div>
                <Button variant="outline" className="w-full" onClick={handleGoogleSignIn} disabled={emailAuthLoading || googleAuthLoading}>
                    {googleAuthLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <Chrome className="mr-2 h-4 w-4" />
                    Sign in with Google
                </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        <TabsContent value="signup">
          <Card>
            <form onSubmit={handleEmailSignUp}>
              <CardHeader className="text-center">
                <CardTitle>Create an Account</CardTitle>
                <CardDescription>Get started with BroBookMe today.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name">Business Name</Label>
                  <Input id="signup-name" type="text" placeholder="Your Company Name" value={name} onChange={(e) => setName(e.target.value)} required autoComplete="name" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input id="signup-email" type="email" placeholder="m@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <Input id="signup-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="new-password" />
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                <Button type="submit" disabled={emailAuthLoading || googleAuthLoading} className="w-full">
                  {emailAuthLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Account
                </Button>
              </CardContent>
            </form>
             <CardFooter className="flex flex-col gap-4">
                <div className="relative w-full">
                    <Separator />
                    <span className="absolute left-1/2 -translate-x-1/2 -top-2.5 bg-card px-2 text-xs text-muted-foreground">OR</span>
                </div>
                <Button variant="outline" className="w-full" onClick={handleGoogleSignIn} disabled={emailAuthLoading || googleAuthLoading}>
                    {googleAuthLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <Chrome className="mr-2 h-4 w-4" />
                    Sign up with Google
                </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
      <div className="mt-6 text-center text-sm text-muted-foreground">
        By signing up, you agree to our{' '}
        <Link href="/terms-of-service" className="underline hover:text-primary">
          Terms of Service
        </Link>{' '}
        and{' '}
        <Link href="/privacy-policy" className="underline hover:text-primary">
          Privacy Policy
        </Link>
        .
      </div>
    </div>
  );
}
