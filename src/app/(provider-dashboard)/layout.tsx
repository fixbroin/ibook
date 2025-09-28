
'use client';

import { useEffect, useState, useRef } from 'react';
import { Logo } from "@/components/icons";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarInset,
  SidebarTrigger,
  SidebarFooter,
  SidebarTitle,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LayoutDashboard, Settings, User as UserIcon, Loader2, CalendarCheck, LogOut, CreditCard, CalendarX, Home, CalendarDays } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { useRouter, usePathname } from 'next/navigation';
import { getProviderByUsername, getAdminSettings } from '@/lib/data';
import type { Provider, SiteSettings } from '@/lib/types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from '@/hooks/use-toast';
import { NavMenuItem } from '@/components/nav-menu-item';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import Image from 'next/image';


const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<User | null>(null);
  const [provider, setProvider] = useState<Provider | null>(null);
  const [siteSettings, setSiteSettings] = useState<SiteSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  const retryIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef(0);

  useEffect(() => {
    const clearRetryInterval = () => {
        if (retryIntervalRef.current) {
            clearInterval(retryIntervalRef.current);
            retryIntervalRef.current = null;
        }
    };

    const fetchProviderData = async (username: string, isRetry: boolean = false) => {
        try {
            const [providerData, adminSettings] = await Promise.all([
              getProviderByUsername(username),
              getAdminSettings()
            ]);

            if (adminSettings?.site) {
              setSiteSettings(adminSettings.site);
            }

            if (providerData) {
                clearRetryInterval(); // Stop retrying once data is found
                if (providerData.isSuspended) {
                    await signOut(auth);
                    toast({
                        title: 'Account Suspended',
                        description: 'Your account has been suspended. Please contact support.',
                        variant: 'destructive',
                    });
                    router.push('/login');
                    return;
                }
                setProvider(providerData);
                setLoading(false);
            } else {
                if (!isRetry) {
                    // Start retrying if provider not found on initial load
                    console.warn(`Provider not found for username: ${username}. Starting retry mechanism...`);
                    retryCountRef.current = 0;
                    retryIntervalRef.current = setInterval(() => {
                        retryCountRef.current += 1;
                        if (retryCountRef.current > 5) { // Stop after 5 retries (10 seconds)
                            clearRetryInterval();
                            toast({ title: 'Error', description: 'Could not load your profile. Please try logging in again.', variant: 'destructive' });
                            signOut(auth); // Log out the user
                            router.push('/login');
                        } else {
                            fetchProviderData(username, true);
                        }
                    }, 2000);
                }
            }
        } catch (error) {
            console.error("Error fetching provider data:", error);
            clearRetryInterval();
            await signOut(auth);
            router.push('/login');
        }
    };

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
        clearRetryInterval(); // Clear any existing interval on auth state change
        if (currentUser && currentUser.email) {
            setUser(currentUser);
            const username = currentUser.email.split('@')[0] || '';
            fetchProviderData(username);
        } else {
            router.push('/login');
            setLoading(false);
        }
    });

    return () => {
        unsubscribe();
        clearRetryInterval();
    };
  }, [router, toast]);

  useEffect(() => {
    // This effect handles redirection based on plan status once the provider is loaded
    if (!loading && provider) {
      // Lifetime plan users should never be redirected
      if (provider.plan?.duration === 'lifetime') {
        return;
      }
      
      const hasActivePlan = provider.planId && provider.planExpiry && provider.planExpiry > new Date();
      if (!hasActivePlan && pathname !== '/subscription') {
        router.push('/subscription');
      }
    }
  }, [loading, provider, pathname, router]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push('/login');
    } catch (error) {
      console.error("Error signing out: ", error);
    }
  };

  const generateBreadcrumbs = () => {
    const segments = pathname.split('/').filter(Boolean);
    const pageName = segments[segments.length - 1] || 'Dashboard';
    
    return (
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/dashboard"><Home className="h-4 w-4" /></Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{capitalize(pageName.replace(/-/g, ' '))}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    );
  };


  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!provider) {
     return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="ml-2">Finalizing setup...</p>
      </div>
    );
  }

  // Lifetime plans are always considered active.
  const isLifetime = provider.plan?.duration === 'lifetime';
  const hasActivePlan = isLifetime || (provider.planId && provider.planExpiry && provider.planExpiry > new Date());
  
  if (!hasActivePlan && pathname !== '/subscription') {
     return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="ml-2">Redirecting to subscription...</p>
      </div>
    );
  }

  const bookingPageUrl = `/${provider.username}`;

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
           <SidebarTitle>
            {siteSettings?.branding ? (
              <div className="flex items-center gap-2">
                <Image src={siteSettings.branding.logoUrl} alt={siteSettings.branding.siteName} width={32} height={32} />
                <h1 className="text-xl font-bold">{siteSettings.branding.siteName}</h1>
              </div>
            ) : (
              <Logo />
            )}
           </SidebarTitle>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            <NavMenuItem href="/dashboard" tooltip="Dashboard" icon={LayoutDashboard}>
              Dashboard
            </NavMenuItem>
            <NavMenuItem href="/bookings" tooltip="Bookings" icon={CalendarCheck}>
              Bookings
            </NavMenuItem>
            <NavMenuItem href="/slot-management" tooltip="Slot Management" icon={CalendarX}>
              Slot Management
            </NavMenuItem>
            <NavMenuItem href="/calendar-setup" tooltip="Calendar Setup" icon={CalendarDays}>
              Calendar Setup
            </NavMenuItem>
            <NavMenuItem href="/settings" tooltip="Settings" icon={Settings}>
              Settings
            </NavMenuItem>
            <NavMenuItem href="/profile" tooltip="Profile" icon={UserIcon}>
              Profile
            </NavMenuItem>
            <NavMenuItem href="/subscription" tooltip="Subscription" icon={CreditCard}>
              Subscription
            </NavMenuItem>
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="flex h-14 items-center gap-4 border-b bg-background px-4 lg:px-6">
            <div className="flex items-center gap-4">
              <SidebarTrigger />
            </div>
            <div className="flex flex-1 items-center justify-end gap-2 md:gap-4 flex-wrap">
                <Button variant="outline" asChild>
                    <Link href={bookingPageUrl}>
                        View Booking Page
                    </Link>
                </Button>
                <ThemeToggle />
                 <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="rounded-full">
                        <Avatar>
                          <AvatarImage src={user?.photoURL || undefined} alt={user?.displayName || ''} />
                          <AvatarFallback>{provider.name.charAt(0) || user?.email?.charAt(0)}</AvatarFallback>
                        </Avatar>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>{provider.name}</DropdownMenuLabel>
                       <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link href="/profile">Profile</Link>
                      </DropdownMenuItem>
                       <DropdownMenuItem asChild>
                         <Link href="/subscription">Subscription</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                         <Link href="/settings">Settings</Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleLogout}>
                        <LogOut className="mr-2 h-4 w-4" />
                        <span>Log out</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
            </div>
        </header>
        <div className="px-4 md:px-6 pt-6">
            {generateBreadcrumbs()}
        </div>
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}

