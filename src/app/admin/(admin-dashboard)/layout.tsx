

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
import { LayoutDashboard, Settings, Users, LogOut, CreditCard, Shield, Image as ImageIcon, HelpCircle, Star, Palette, Footprints } from "lucide-react";
import { Loader2 } from 'lucide-react';

const ADMIN_EMAIL = 'wecanfix.in@gmail.com';

export default function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user && user.email === ADMIN_EMAIL) {
        setUser(user);
      } else {
        router.push('/admin/login');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router, toast]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push('/admin/login');
    } catch (error) {
      console.error("Error signing out: ", error);
      toast({ title: 'Error', description: 'Failed to sign out.', variant: 'destructive' });
    }
  };

  if (loading || !user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

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
                 <NavMenuItem href="/admin/footer-settings" tooltip="Footer Settings" icon={Footprints}>
                Footer Settings
                </NavMenuItem>
                <NavMenuItem href="/admin/marketing-setup" tooltip="Marketing Setup" icon={Palette}>
                Marketing Setup
                </NavMenuItem>
                 <NavMenuItem href="/admin/reports" tooltip="Reports" icon={LayoutDashboard}>
                Reports
                </NavMenuItem>
                <NavMenuItem href="/admin/settings" tooltip="Settings" icon={Settings}>
                Settings
                </NavMenuItem>
            </SidebarMenu>
        </SidebarContent>
      </Sidebar>
      <SidebarInset>
        <header className="flex h-14 items-center gap-4 border-b bg-background px-4 lg:px-6">
            <SidebarTrigger />
            <div className="flex-1 flex justify-end items-center gap-4">
                <Button variant="outline" asChild>
                    <Link href="/">
                        View Site
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
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
