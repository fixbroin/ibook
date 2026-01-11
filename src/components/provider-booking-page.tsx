
'use client';

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { BookingForm } from "@/components/booking-form";
import { getPlaceholderImage } from "@/lib/placeholder-images";
import type { Provider } from "@/lib/types";
import { Button } from "./ui/button";
import Link from "next/link";
import { ThemeToggle } from "./theme-toggle";
import Image from "next/image";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from '@/components/ui/sheet';
import { Menu } from 'lucide-react';
import React from "react";

export function ProviderBookingPageContent({ provider }: { provider: Provider }) {
  const logo = getPlaceholderImage('brobookme');
  const customPages = provider.settings.customPages;
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const navLinks = [
      { href: `/${provider.username}/about`, label: 'About', enabled: customPages?.about?.enabled },
      { href: `/${provider.username}/contact`, label: 'Contact', enabled: customPages?.contact?.enabled },
      { href: `/${provider.username}/cancellation-policy`, label: 'Cancellation Policy', enabled: customPages?.cancellationPolicy?.enabled },
  ].filter(link => link.enabled);


  return (
    <div className="min-h-screen bg-muted/40 flex flex-col items-center p-4 md:py-4 md:px-8">
      <header className="w-full max-w-7xl mx-auto">
        <div className="flex h-14 items-center justify-between rounded-lg bg-background px-4 shadow-sm border">
            <Link href={`/${provider.username}`} className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                    <AvatarImage src={provider.logoUrl || logo.imageUrl} alt={provider.name} onContextMenu={(e) => e.preventDefault()} draggable={false} />
                    <AvatarFallback>{provider.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <h1 className="text-xl font-bold">{provider.name}</h1>
            </Link>
            <nav className="hidden items-center gap-4 lg:flex">
                 {navLinks.map(link => (
                    <Link key={link.href} href={link.href} className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary">
                        {link.label}
                    </Link>
                ))}
            </nav>
            <div className="flex items-center gap-2">
                <div className="hidden lg:block">
                    <ThemeToggle />
                </div>
                 <div className="lg:hidden">
                    <ThemeToggle />
                </div>
                 <div className="lg:hidden">
                    {navLinks.length > 0 && (
                     <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                        <SheetTrigger asChild>
                            <Button variant="outline" size="icon">
                                <Menu />
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="right">
                            <SheetHeader>
                                <SheetTitle>
                                    <div className="flex items-center gap-2">
                                         <Avatar className="h-8 w-8">
                                            <AvatarImage src={provider.logoUrl || logo.imageUrl} alt={provider.name} />
                                            <AvatarFallback>{provider.name.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <h1 className="text-xl font-bold">{provider.name}</h1>
                                    </div>
                                </SheetTitle>
                            </SheetHeader>
                             <nav className="flex flex-col gap-4 p-6 pt-10">
                                {navLinks.map(link => (
                                    <SheetClose asChild key={link.href}>
                                        <Link
                                        href={link.href}
                                        className="text-lg font-medium text-muted-foreground"
                                        >
                                        {link.label}
                                        </Link>
                                    </SheetClose>
                                ))}
                            </nav>
                        </SheetContent>
                    </Sheet>
                    )}
                </div>
            </div>
        </div>
      </header>

      <div className="container max-w-7xl mx-auto pt-4 md:pt-8">
        <div className="grid md:grid-cols-5 gap-12 items-start">
          {/* Left Column: Provider Info (40%) */}
          <div className="md:col-span-2 flex flex-col items-center text-center">
            <Avatar className="h-36 w-36 mb-6 border-8 border-background shadow-2xl">
              <AvatarImage src={provider.logoUrl || logo.imageUrl} alt={provider.name} data-ai-hint={logo.imageHint} onContextMenu={(e) => e.preventDefault()} draggable={false} />
              <AvatarFallback>{provider.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <h1 className="text-4xl font-bold tracking-tight">{provider.name}</h1>
            <p className="mt-4 text-lg text-muted-foreground max-w-md">{provider.description}</p>
          </div>

          {/* Right Column: Booking Form (60%) */}
          <div className="md:col-span-3 w-full">
            <BookingForm provider={provider} />
          </div>
        </div>
      </div>
      <footer className="mt-8 py-4 text-center text-sm text-muted-foreground">
        Powered by <Link href="/" className="font-semibold text-primary hover:underline">BroBookMe</Link>
      </footer>
    </div>
  );
}


