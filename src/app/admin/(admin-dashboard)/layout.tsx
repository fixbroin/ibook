
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Logo } from "@/components/icons";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarInset,
  SidebarTrigger,
  SidebarTitle,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { NavMenuItem } from '@/components/nav-menu-item';
import { LayoutDashboard, Settings, Users, LogOut, CreditCard, Shield, Image as ImageIcon, HelpCircle, Star, Palette, Footprints, FileText, Home, Database, CalendarDays, Info, Bell, Globe, Phone } from "lucide-react";
import { Loader2 } from 'lucide-react';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { listenForNotifications } from '@/lib/data';
import type { Notification } from '@/lib/types';
import { Badge } from '@/components/ui/badge';


const ADMIN_EMAIL = 'wecanfix.in@gmail.com';
const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export default function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user && user.email === ADMIN_EMAIL) {
        setUser(user);
      } else {
        router.push('/admin/login');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router, toast]);
  
  useEffect(() => {
    if (user) {
        const unsubscribe = listenForNotifications('admin', setNotifications);
        return () => unsubscribe();
    }
  }, [user]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push('/admin/login');
    } catch (error) {
      console.error("Error signing out: ", error);
      toast({ title: 'Error', description: 'Failed to sign out.', variant: 'destructive' });
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
              <Link href="/admin"><Home className="h-4 w-4" /></Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
             {segments.length > 1 ? (
              <BreadcrumbLink asChild>
                <Link href={`/${segments.slice(0, -1).join('/')}`}>{capitalize(segments[segments.length-2])}</Link>
              </BreadcrumbLink>
            ) : (
              <BreadcrumbPage>Dashboard</BreadcrumbPage>
            )}
          </BreadcrumbItem>
           {segments.length > 1 && (
            <>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{capitalize(pageName.replace(/-/g, ' '))}</BreadcrumbPage>
              </BreadcrumbItem>
            </>
          )}
        </BreadcrumbList>
      </Breadcrumb>
    );
  };

  if (loading || !user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }
  
  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <SidebarTitle>
            <div className="flex items-center gap-2">
                <Shield className="h-6 w-6 text-primary" />
                <h1 className="text-xl font-bold">Admin Panel</h1>
            </div>
          </SidebarTitle>
        </SidebarHeader>
        <SidebarContent>
            <SidebarMenu>
                <NavMenuItem href="/admin" tooltip="Dashboard" icon={LayoutDashboard}>
                Dashboard
                </NavMenuItem>
                <NavMenuItem href="/admin/notifications" tooltip="Notifications" icon={Bell}>
                 Notifications
                </NavMenuItem>
                <NavMenuItem href="/admin/providers" tooltip="Providers" icon={Users}>
                Providers
                </NavMenuItem>
                <NavMenuItem href="/admin/plans" tooltip="Plans" icon={CreditCard}>
                Plans
                </NavMenuItem>
                 <NavMenuItem href="/admin/testimonials" tooltip="Testimonials" icon={Star}>
                Testimonials
                </NavMenuItem>
                <NavMenuItem href="/admin/hero-settings" tooltip="Hero Settings" icon={ImageIcon}>
                Hero Settings
                </NavMenuItem>
                 <NavMenuItem href="/admin/screenshots-settings" tooltip="Screenshots" icon={ImageIcon}>
                Screenshots
                </NavMenuItem>
                <NavMenuItem href="/admin/faq-settings" tooltip="FAQ Settings" icon={HelpCircle}>
                FAQ Settings
                </NavMenuItem>
                 <NavMenuItem href="/admin/about-settings" tooltip="About Page" icon={Info}>
                About Page
                </NavMenuItem>
                 <NavMenuItem href="/admin/footer-settings" tooltip="Footer Settings" icon={Footprints}>
                Footer Settings
                </NavMenuItem>
                 <NavMenuItem href="/admin/floating-buttons" tooltip="Floating Buttons" icon={Phone}>
                Floating Buttons
                </NavMenuItem>
                 <NavMenuItem href="/admin/policy-settings" tooltip="Policies" icon={FileText}>
                Policies
                </NavMenuItem>
                <NavMenuItem href="/admin/marketing-setup" tooltip="Marketing Setup" icon={Palette}>
                Marketing Setup
                </NavMenuItem>
                 <NavMenuItem href="/admin/reports" tooltip="Reports" icon={LayoutDashboard}>
                Reports
                </NavMenuItem>
                <NavMenuItem href="/admin/database" tooltip="Database" icon={Database}>
                Database
                </NavMenuItem>
                <NavMenuItem href="/admin/seo-settings" tooltip="SEO Settings" icon={Globe}>
                SEO Settings
                </NavMenuItem>
                <NavMenuItem href="/admin/settings" tooltip="Settings" icon={Settings}>
                Settings
                </NavMenuItem>
            </SidebarMenu>
        </SidebarContent>
      </Sidebar>
      <SidebarInset>
        <header className="flex h-14 items-center gap-4 border-b bg-background px-4 lg:px-6">
            <div className="flex items-center gap-4">
              <SidebarTrigger />
            </div>
            <div className="flex-1 flex justify-end items-center gap-4">
                <Button variant="outline" asChild>
                    <Link href="/">
                        View Site
                    </Link>
                </Button>
                <Button variant="ghost" size="icon" className="relative" asChild>
                  <Link href="/admin/notifications">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                        <Badge className="absolute -top-1 -right-1 h-5 w-5 justify-center rounded-full p-0 bg-red-500 text-white">{unreadCount}</Badge>
                    )}
                  </Link>
                </Button>
                <ThemeToggle />
                 <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="rounded-full">
                        <Avatar>
                          <AvatarImage src={user?.photoURL || undefined} alt={user?.displayName || ''} />
                          <AvatarFallback>A</AvatarFallback>
                        </Avatar>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Admin</DropdownMenuLabel>
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
