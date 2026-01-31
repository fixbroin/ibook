'use client';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  BookOpen,
  CalendarCheck,
  Share2,
  LayoutDashboard,
  Clock,
  Settings,
  Mail,
  Wallet,
  ShieldCheck,
  Zap,
  Star,
  Twitter,
  Linkedin,
  Facebook,
  ChevronRight,
  Menu,
  Loader2,
  Check as CheckIcon,
  BadgeCent,
  Instagram,
  Youtube,
  LucideProps,
  createElement,
  FileText,
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { Separator } from '@/components/ui/separator';
import { ThemeToggle } from '@/components/theme-toggle';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetClose,
  SheetTrigger,
} from '@/components/ui/sheet';
import React, { useEffect, useState, useRef, ComponentType, lazy, Suspense, useCallback } from 'react';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious, type CarouselApi } from "@/components/ui/carousel"
import Autoplay from "embla-carousel-autoplay"
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { getPlans } from '@/lib/data';
import type { Plan, SiteSettings } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollAnimation } from '@/components/scroll-animation';
import { FloatingButtons } from './floating-buttons';
import { cn } from '@/lib/utils';


const DynamicLucideIcon = ({ name }: { name: string }) => {
  const [Icon, setIcon] = useState<ComponentType<LucideProps> | null>(null);

  useEffect(() => {
    import('lucide-react')
      .then(lucide => {
        const icon = (lucide as any)[name];
        if (icon) {
          setIcon(() => icon);
        } else {
           // Fallback to a default icon if not found
          setIcon(() => lucide.Link);
        }
      })
      .catch(err => {
         import('lucide-react').then(lucide => setIcon(() => lucide.Link));
      });
  }, [name]);
  
  if (!Icon) {
    return <div className="h-5 w-5" />; // Placeholder
  }

  return <Icon className="h-5 w-5 text-foreground hover:text-primary" />;
};

const DotButton: React.FC<{ selected: boolean; onClick: () => void }> = ({ selected, onClick }) => (
    <button
      className={cn(
        "h-3 w-3 rounded-full transition-colors",
        selected ? "bg-primary" : "bg-primary/20"
      )}
      type="button"
      onClick={onClick}
      aria-label="Go to slide"
    />
);


export function HomePageContent({ settings }: { settings: SiteSettings }) {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const autoplayPlugin = useRef(Autoplay({ delay: 2000, stopOnInteraction: false, stopOnMouseEnter: true }));

  const [testimonialApi, setTestimonialApi] = useState<CarouselApi>()
  const [testimonialSelectedIndex, setTestimonialSelectedIndex] = useState(0)
  const [testimonialScrollSnaps, setTestimonialScrollSnaps] = useState<number[]>([])

  const onTestimonialDotButtonClick = useCallback(
    (index: number) => {
      if (!testimonialApi) return
      testimonialApi.scrollTo(index)
      autoplayPlugin.current.reset()
    },
    [testimonialApi]
  )

  useEffect(() => {
    if (!testimonialApi) return
    
    const onSelect = () => {
        setTestimonialSelectedIndex(testimonialApi.selectedScrollSnap())
    }
    
    setTestimonialScrollSnaps(testimonialApi.scrollSnapList())
    testimonialApi.on("select", onSelect)
    testimonialApi.on("reInit", onSelect)
    
    return () => {
        testimonialApi?.off("select", onSelect)
        testimonialApi?.off("reInit", onSelect)
    }
  }, [testimonialApi]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });

    const fetchPlans = async () => {
      try {
        const plansData = await getPlans();
        // Sort plans by displayOrder
        plansData.sort((a, b) => (a.displayOrder ?? 99) - (b.displayOrder ?? 99));
        setPlans(plansData);
      } catch (error) {
        console.error("Failed to fetch plans", error);
      } finally {
        setPlansLoading(false);
      }
    }

    fetchPlans();

    return () => unsubscribe();
  }, []);

  const navLinks = [
    { href: '#', label: 'Home' },
    { href: '/about', label: 'About Us' },
    { href: '#features', label: 'Features' },
    { href: '#pricing', label: 'Pricing' },
    { href: '#faq', label: 'FAQ' },
    { href: '#contact', label: 'Contact' },
    { href: '/brobookme', label: 'Demo' },
  ];

  const scrollLink = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (href.startsWith('#')) {
      e.preventDefault();
      const targetId = href === '#' ? document.body : document.querySelector(href);
      targetId?.scrollIntoView({ behavior: 'smooth' });
    }
    // Close mobile menu after clicking a link
    setIsMobileMenuOpen(false);
  };

  const AuthButton = ({ isMobile = false }: { isMobile?: boolean }) => {
    if (authLoading) {
      return (
        <Button disabled className={isMobile ? 'w-full' : ''}>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Loading...
        </Button>
      );
    }
    if (user) {
      return (
        <Button asChild className={isMobile ? 'w-full' : ''}>
          <Link href="/dashboard">Go to Dashboard</Link>
        </Button>
      );
    }
    return (
      <Button asChild className={isMobile ? 'w-full' : ''}>
        <Link href="/login">Login / Sign Up</Link>
      </Button>
    );
  };

  const footerLinks = settings.footer?.siteLinks || [];


  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-14 items-center justify-between px-4 md:px-6">
          <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-80">
            <Image src={settings.branding.logoUrl} alt={`${settings.branding.siteName} logo`} width={32} height={32} onContextMenu={(e) => e.preventDefault()} draggable={false} />
            <h1 className="text-2xl font-bold">{settings.branding.siteName}</h1>
          </Link>
          <nav className="hidden items-center gap-1 lg:flex lg:flex-1 justify-center">
            {navLinks.map(link => (
              <Link
                key={link.href}
                href={link.href}
                onClick={e => scrollLink(e, link.href)}
                className="rounded-full px-3 py-1 text-sm font-medium text-foreground transition-colors hover:bg-primary/10 hover:text-primary"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="hidden items-center gap-2 lg:flex">
             <AuthButton />
            <ThemeToggle />
          </div>

          <div className="flex items-center gap-2 lg:hidden">
            <ThemeToggle />
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
                      <Image src={settings.branding.logoUrl} alt={`${settings.branding.siteName} logo`} width={32} height={32} onContextMenu={(e) => e.preventDefault()} draggable={false} />
                      <h1 className="text-2xl font-bold">{settings.branding.siteName}</h1>
                    </div>
                  </SheetTitle>
                  <SheetDescription className="sr-only">Main navigation menu</SheetDescription>
                </SheetHeader>
                <div className="flex flex-col gap-6 p-6 pt-0">
                  <nav className="flex flex-col gap-4">
                    {navLinks.map(link => (
                        <Link
                          key={link.href}
                          href={link.href}
                           onClick={e => scrollLink(e, link.href)}
                          className="text-lg font-medium text-muted-foreground"
                        >
                          {link.label}
                        </Link>
                    ))}
                  </nav>
                  <Separator />
                  <div className='flex flex-col gap-2'>
                    <SheetClose asChild>
                        <AuthButton isMobile />
                    </SheetClose>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* 1. Hero Section */}
        <section className="relative py-12 md:py-16">
          <div
            className="absolute inset-0 -z-10 bg-gradient-to-b from-background to-muted/50"
            aria-hidden="true"
          />
          <div className="container mx-auto px-4 md:px-6">
            <div className='grid md:grid-cols-2 gap-8 items-center'>
              <div className="text-center md:text-left">
                <ScrollAnimation>
                    <h2 className="text-4xl font-bold tracking-tight text-foreground md:text-6xl">
                    {settings.hero.title}
                    </h2>
                </ScrollAnimation>
                <ScrollAnimation delay={0.1}>
                    <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground md:mx-0">
                    {settings.hero.paragraph}
                    </p>
                </ScrollAnimation>
                <ScrollAnimation delay={0.2}>
                    <div className="mt-8 flex flex-col sm:flex-row justify-center md:justify-start gap-4">
                    {settings.hero.buttons.map((button, index) => (
                        <Button key={index} size="lg" asChild variant={button.variant}>
                            <Link href={button.link}>{button.text}</Link>
                        </Button>
                    ))}
                    </div>
                </ScrollAnimation>
              </div>
               <div>
                <ScrollAnimation delay={0.3}>
                   <a href={settings.hero.clickUrl || '#'} target="_blank" rel="noopener noreferrer" className={settings.hero.clickUrl ? 'cursor-pointer' : 'cursor-default'}>
                        <Image
                            src={settings.hero.imageUrl}
                            alt="BroBookMe Dashboard Mockup"
                            width={1200}
                            height={800}
                            className="rounded-lg shadow-2xl"
                            data-ai-hint="app dashboard"
                            priority
                            onContextMenu={(e) => e.preventDefault()}
                            draggable={false}
                        />
                    </a>
                </ScrollAnimation>
               </div>
            </div>
          </div>
        </section>

        {/* 2. How It Works */}
        <section id="how-it-works" className="py-20">
          <div className="container mx-auto px-4 text-center md:px-6">
            <ScrollAnimation>
                <h3 className="mb-4 text-sm font-semibold uppercase text-primary">Get Started in Minutes</h3>
                <p className="mb-12 text-3xl font-bold">Your effortless booking system is just 3 steps away.</p>
            </ScrollAnimation>
            <div className="grid gap-8 md:grid-cols-3">
              <ScrollAnimation delay={0.1}>
                <div className="flex flex-col items-center">
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Settings className="h-6 w-6" />
                    </div>
                    <h4 className="mb-2 text-xl font-semibold">1. Customize Your Page</h4>
                    <p className="text-muted-foreground">Set your availability, define your services (online, in-person, etc.), and customize your public booking page.</p>
                </div>
              </ScrollAnimation>
              <ScrollAnimation delay={0.2}>
                <div className="flex flex-col items-center">
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Share2 className="h-6 w-6" />
                    </div>
                    <h4 className="mb-2 text-xl font-semibold">2. Share Your Link</h4>
                    <p className="text-muted-foreground">Share your unique BroBookMe link on your website, social media, or directly with clients.</p>
                </div>
              </ScrollAnimation>
              <ScrollAnimation delay={0.3}>
                <div className="flex flex-col items-center">
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <LayoutDashboard className="h-6 w-6" />
                    </div>
                    <h4 className="mb-2 text-xl font-semibold">3. Manage with Ease</h4>
                    <p className="text-muted-foreground">All your appointments appear in one simple dashboard. We handle the reminders and scheduling for you.</p>
                </div>
              </ScrollAnimation>
            </div>
          </div>
        </section>

        {/* 3. Features Section */}
        <section id="features" className="bg-muted py-20">
          <div className="container mx-auto px-4 text-center md:px-6">
            <ScrollAnimation>
                <h3 className="mb-12 text-3xl font-bold">Powerful Features for Modern Professionals</h3>
            </ScrollAnimation>
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {[
                { icon: Clock, title: 'Intelligent Availability', desc: 'Automatically generate available slots based on your working hours and existing appointments.' },
                { icon: LayoutDashboard, title: 'Flexible Service Types', desc: 'Easily offer Online, Shop Visit, or Doorstep services to cater to all your clients.' },
                { icon: Settings, title: 'Custom Booking Rules', desc: 'Control your schedule with booking delays, and allow single or multiple bookings per slot.' },
                { icon: CalendarCheck, title: 'Google Calendar Sync', desc: 'Sync your BroBookMe schedule with your Google Calendar to avoid any booking conflicts.' },
                { icon: Mail, title: 'AI-Enhanced Confirmations', desc: 'Impress clients with smart, personalized booking confirmations that can suggest relevant add-ons.' },
                { icon: Wallet, title: 'Seamless Subscription Billing', desc: 'Integrate with your favorite payment provider for easy subscription and billing management.' },
              ].map((feature, i) => (
                <ScrollAnimation key={feature.title} delay={i * 0.1}>
                    <Card className="text-center flex flex-col items-center h-full">
                        <CardHeader>
                        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary mx-auto">
                            <feature.icon className="h-6 w-6" />
                        </div>
                        <CardTitle>{feature.title}</CardTitle>
                        <CardDescription>{feature.desc}</CardDescription>
                        </CardHeader>
                    </Card>
                </ScrollAnimation>
              ))}
            </div>
          </div>
        </section>
        
        {/* 4. Why Choose Us */}
        <section id="why-choose-us" className="py-20">
            <div className="container mx-auto px-4 text-center md:px-6">
                <ScrollAnimation>
                    <h3 className="mb-12 text-3xl font-bold">The smarter way to manage your time.</h3>
                </ScrollAnimation>
                <div className="grid gap-8 md:grid-cols-3">
                    <ScrollAnimation delay={0.1}>
                        <div className="flex items-start gap-4 text-left">
                            <Zap className="mt-1 h-6 w-6 flex-shrink-0 text-primary" />
                            <div>
                                <h4 className="text-xl font-semibold">Save Time & Reduce Admin</h4>
                                <p className="text-muted-foreground">Stop the back-and-forth emails. Automate your booking process and focus on your clients.</p>
                            </div>
                        </div>
                    </ScrollAnimation>
                    <ScrollAnimation delay={0.2}>
                        <div className="flex items-start gap-4 text-left">
                            <ShieldCheck className="mt-1 h-6 w-6 flex-shrink-0 text-primary" />
                            <div>
                                <h4 className="text-xl font-semibold">Eliminate No-Shows</h4>
                                <p className="text-muted-foreground">Automated reminders and calendar sync ensure you and your clients are always on the same page.</p>
                            </div>
                        </div>
                    </ScrollAnimation>
                    <ScrollAnimation delay={0.3}>
                        <div className="flex items-start gap-4 text-left">
                            <Share2 className="mt-1 h-6 w-6 flex-shrink-0 text-primary" />
                            <div>
                                <h4 className="text-xl font-semibold">Project a Professional Image</h4>
                                <p className="text-muted-foreground">A sleek, branded booking page elevates your business and gives clients confidence.</p>
                            </div>
                        </div>
                    </ScrollAnimation>
                </div>
            </div>
        </section>

        {/* 5. Screenshots Section */}
        {settings.screenshots && settings.screenshots.screenshots && settings.screenshots.screenshots.length > 0 && (
          <section id="screenshots" className="bg-muted py-20">
              <div className="container mx-auto px-4 text-center md:px-6">
                  <ScrollAnimation>
                    <h3 className="mb-12 text-3xl font-bold">{settings.screenshots.title}</h3>
                  </ScrollAnimation>
                  <div className="grid gap-8 md:grid-cols-2">
                    {settings.screenshots.screenshots.map((item, index) => (
                      <ScrollAnimation key={item.id} delay={(index + 1) * 0.1}>
                        <a href={item.url || '#'} target="_blank" rel="noopener noreferrer" className={item.url ? 'cursor-pointer' : 'cursor-default'}>
                            <div className="overflow-hidden rounded-lg border shadow-lg">
                                <Image
                                src={item.imageUrl}
                                alt={`Screenshot ${index + 1}`}
                                width={1200}
                                height={800}
                                className="w-full"
                                data-ai-hint="app screenshot"
                                onContextMenu={(e) => e.preventDefault()}
                                draggable={false}
                                />
                            </div>
                        </a>
                      </ScrollAnimation>
                    ))}
                  </div>
              </div>
          </section>
        )}
        
        {/* 6. Pricing Plans */}
        <section id="pricing" className="py-20">
          <div className="container mx-auto px-4 md:px-6">
            <ScrollAnimation>
                <h3 className="mb-12 text-center text-3xl font-bold">Simple, transparent pricing.</h3>
            </ScrollAnimation>
            <div className="mx-auto grid max-w-5xl items-stretch gap-8 md:grid-cols-2 lg:grid-cols-3">
              {plansLoading ? (
                  [...Array(3)].map((_, i) => (
                      <Card key={i} className="flex flex-col">
                          <CardHeader>
                              <Skeleton className="h-7 w-2/5" />
                              <Skeleton className="h-5 w-4/5" />
                              <Skeleton className="h-10 w-1/2 mt-2" />
                          </CardHeader>
                          <CardContent className="flex-1 space-y-3">
                              <Skeleton className="h-5 w-full" />
                              <Skeleton className="h-5 w-full" />
                              <Skeleton className="h-5 w-2/3" />
                          </CardContent>
                          <CardFooter>
                              <Skeleton className="h-10 w-full" />
                          </CardFooter>
                      </Card>
                  ))
              ) : (
                  plans.map((plan, i) => (
                    <ScrollAnimation key={plan.id} delay={i * 0.1}>
                      <Card className={`relative flex flex-col h-full ${plan.isFeatured ? 'border-2 border-primary shadow-2xl' : ''}`}>
                          {plan.isFeatured && (
                            <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">Best Value</Badge>
                          )}
                          <CardHeader>
                              <CardTitle>{plan.name}</CardTitle>
                              <CardDescription>
                                {plan.duration === 'trial' && `Get a taste of all features for ${plan.days} days`}
                                {plan.duration === 'monthly' && 'For growing businesses'}
                                {plan.duration === 'yearly' && 'Save with an annual plan'}
                                {plan.duration === 'lifetime' && 'Pay once, use forever'}
                              </CardDescription>
                                <div className="flex items-baseline gap-2">
                                  {plan.offerPrice && plan.offerPrice < plan.price ? (
                                    <>
                                      <span className="text-4xl font-bold">₹{plan.offerPrice}</span>
                                      <span className="text-xl font-medium text-muted-foreground line-through">₹{plan.price}</span>
                                    </>
                                  ) : (
                                    <span className="text-4xl font-bold">
                                      {plan.price > 0 ? `₹${plan.price}` : 'Free'}
                                    </span>
                                  )}
                                  {(plan.duration === 'monthly' || plan.duration === 'yearly') && (
                                    <span className="text-base font-normal text-muted-foreground">/{plan.duration.replace('ly', '')}</span>
                                  )}
                                </div>
                          </CardHeader>
                          <CardContent className="flex-1 space-y-2">
                              {plan.features.map(feature => (
                                  <div key={feature} className="flex items-center gap-2 text-sm">
                                      <CheckIcon className="h-4 w-4 text-green-500" />
                                      <span className="text-muted-foreground">{feature}</span>
                                  </div>
                              ))}
                          </CardContent>
                          <CardFooter className="mt-auto">
                              <Button className="w-full" asChild variant={plan.isFeatured ? 'default' : 'outline'}>
                                  <Link href="/login">
                                      {plan.duration === 'trial' ? 'Start Free Trial' : 'Subscribe'}
                                  </Link>
                              </Button>
                          </CardFooter>
                      </Card>
                    </ScrollAnimation>
                  ))
              )}
            </div>
          </div>
        </section>

        {/* 7. Testimonials */}
        <section id="testimonials" className="bg-muted py-20">
          <div className="container mx-auto px-4 md:px-6">
            <ScrollAnimation>
                <h3 className="mb-12 text-center text-3xl font-bold">Loved by professionals like you.</h3>
            </ScrollAnimation>
            <div
                onMouseEnter={autoplayPlugin.current.stop}
                onMouseLeave={autoplayPlugin.current.reset}
            >
             <Carousel
              setApi={setTestimonialApi}
              opts={{
                align: "start",
                loop: true,
              }}
              plugins={[autoplayPlugin.current]}
              className="w-full max-w-6xl mx-auto"
            >
              <CarouselContent>
                {(settings.testimonials && settings.testimonials.length > 0) ? (
                  settings.testimonials.map((testimonial) => (
                    <CarouselItem key={testimonial.id} className="md:basis-1/2 lg:basis-1/3">
                      <div className="p-4 h-full">
                        <Card className="h-full flex flex-col justify-between p-6">
                           <CardHeader className="p-0">
                                <div className="flex items-center gap-0.5">
                                    {[...Array(5)].map((_, i) => (
                                        <Star key={i} className={`h-5 w-5 ${i < testimonial.rating ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground/30'}`} />
                                    ))}
                                </div>
                            </CardHeader>
                          <CardContent className="p-0 flex-1 my-4">
                            <blockquote className="text-lg italic text-foreground">"{testimonial.description}"</blockquote>
                          </CardContent>
                           <CardFooter className="p-0 flex-row gap-4 items-center">
                                <Avatar className="w-12 h-12">
                                    <AvatarImage src={testimonial.imageUrl} alt={testimonial.name} loading="lazy" onContextMenu={(e) => e.preventDefault()} draggable={false} />
                                    <AvatarFallback>{testimonial.name.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div className="text-sm">
                                    <p className="font-semibold">{testimonial.name}</p>
                                </div>
                            </CardFooter>
                        </Card>
                      </div>
                    </CarouselItem>
                  ))
                ) : (
                  <CarouselItem>
                     <p className="text-center text-muted-foreground">No testimonials yet.</p>
                  </CarouselItem>
                )}
              </CarouselContent>
              <CarouselPrevious className="hidden md:flex" />
              <CarouselNext className="hidden md:flex" />
            </Carousel>
            <div className="flex justify-center gap-2 mt-4">
                {testimonialScrollSnaps.map((_, index) => (
                    <DotButton
                    key={index}
                    selected={index === testimonialSelectedIndex}
                    onClick={() => onTestimonialDotButtonClick(index)}
                    />
                ))}
            </div>
            </div>
          </div>
        </section>
        
        {/* 8. FAQ Section */}
        <section id="faq" className="py-20">
            <div className="container max-w-3xl mx-auto px-4 md:px-6">
                <ScrollAnimation>
                    <h3 className="mb-12 text-center text-3xl font-bold">Frequently Asked Questions</h3>
                </ScrollAnimation>
                 <Accordion type="single" collapsible className="w-full">
                    {settings.faq && settings.faq.length > 0 ? (
                        settings.faq.sort((a,b) => a.displayOrder - b.displayOrder).map((faq, i) => (
                            <ScrollAnimation key={faq.id} delay={i * 0.05}>
                                <AccordionItem value={faq.id}>
                                    <AccordionTrigger>{faq.question}</AccordionTrigger>
                                    <AccordionContent>{faq.answer}</AccordionContent>
                                </AccordionItem>
                            </ScrollAnimation>
                        ))
                    ) : (
                        <>
                             <AccordionItem value="item-1">
                                <AccordionTrigger>Is there a free trial?</AccordionTrigger>
                                <AccordionContent>
                                Yes, absolutely! We offer a 3-day free trial with full access to all features. No credit card is required to get started, so you can explore everything BroBookMe has to offer risk-free.
                                </AccordionContent>
                            </AccordionItem>
                            <AccordionItem value="item-2">
                                <AccordionTrigger>Can customers cancel or reschedule through BroBookMe?</AccordionTrigger>
                                <AccordionContent>
                                Yes. You can configure your settings to allow customers to cancel or reschedule their appointments directly from their confirmation email, subject to your booking policies (e.g., no cancellations within 24 hours).
                                </AccordionContent>
                            </AccordionItem>
                        </>
                    )}
                </Accordion>
            </div>
        </section>

        {/* 9. Final CTA */}
        <section className="bg-primary text-primary-foreground py-20">
          <div className="container mx-auto px-4 text-center md:px-6">
            <ScrollAnimation>
                <h3 className="text-4xl font-bold">Ready to Simplify Your Business?</h3>
                <p className="mx-auto mt-4 max-w-xl text-lg text-primary-foreground/80">
                Join hundreds of professionals who are saving time, reducing no-shows, and growing their business with BroBookMe.
                </p>
            </ScrollAnimation>
            <ScrollAnimation delay={0.1}>
                <div className="mt-8">
                <Button size="lg" variant="secondary" asChild>
                    <Link href="/login">Start Your 3-Day Free Trial <ChevronRight className="ml-2 h-5 w-5" /></Link>
                </Button>
                </div>
            </ScrollAnimation>
          </div>
        </section>
      </main>

      {/* 10. Footer */}
      <footer id="contact" className="border-t bg-background">
        <div className="container mx-auto px-4 py-12 md:px-6">
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
                <div className="lg:col-span-1">
                    <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-80">
                      <Image src={settings.branding.logoUrl} alt={`${settings.branding.siteName} logo`} width={32} height={32} onContextMenu={(e) => e.preventDefault()} draggable={false} />
                      <h1 className="text-2xl font-bold">{settings.branding.siteName}</h1>
                    </Link>
                    {settings.footer?.description && <p className="mt-4 text-foreground">{settings.footer.description}</p>}
                </div>
                <div>
                    <h4 className="font-semibold">Quick Links</h4>
                    <ul className="mt-4 space-y-2">
                        <li><Link href="/about" className="rounded-full px-3 py-1 text-sm font-medium text-foreground transition-colors hover:bg-primary/10 hover:text-primary">About Us</Link></li>
                        {footerLinks.map(link => (
                           <li key={link.id}><Link href={link.url} className="rounded-full px-3 py-1 text-sm font-medium text-foreground transition-colors hover:bg-primary/10 hover:text-primary">{link.name}</Link></li>
                        ))}
                    </ul>
                </div>
                 <div>
                    <h4 className="font-semibold">Policies</h4>
                    <ul className="mt-4 space-y-2">
                        <li><Link href="/terms-of-service" className="rounded-full px-3 py-1 text-sm font-medium text-foreground transition-colors hover:bg-primary/10 hover:text-primary">Terms and Conditions</Link></li>
                        <li><Link href="/privacy-policy" className="rounded-full px-3 py-1 text-sm font-medium text-foreground transition-colors hover:bg-primary/10 hover:text-primary">Privacy Policy</Link></li>
                        <li><Link href="/cancellation-policy" className="rounded-full px-3 py-1 text-sm font-medium text-foreground transition-colors hover:bg-primary/10 hover:text-primary">Cancellation Policy</Link></li>
                        <li><Link href="/refund-policy" className="rounded-full px-3 py-1 text-sm font-medium text-foreground transition-colors hover:bg-primary/10 hover:text-primary">Refund Policy</Link></li>
                    </ul>
                </div>
                 <div>
                    {settings.footer?.contact && (
                        <>
                        <h4 className="font-semibold">Contact</h4>
                        <ul className="mt-4 space-y-2 text-sm text-foreground">
                            {settings.footer.contact.email && <li><a href={`mailto:${settings.footer.contact.email}`} className="hover:text-primary">{settings.footer.contact.email}</a></li>}
                            {settings.footer.contact.phone && <li>{settings.footer.contact.phone}</li>}
                            {settings.footer.contact.address && <li className="whitespace-pre-line">{settings.footer.contact.address}</li>}
                        </ul>
                        </>
                    )}
                </div>
            </div>
             <Separator className="my-8" />
             <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
                <p className="text-sm text-foreground">{settings.footer?.copyright || `© ${new Date().getFullYear()} ${settings.branding.siteName}. All rights reserved.`}</p>
                 {settings.footer?.socialLinks && settings.footer.socialLinks.length > 0 && (
                     <div className="flex items-center gap-4">
                        {settings.footer.socialLinks.map(link => (
                            <Link key={link.id} href={link.url} aria-label={link.name} className="transition-opacity hover:opacity-80">
                                <Suspense fallback={<div className="h-5 w-5 bg-muted rounded-full" />}>
                                    <DynamicLucideIcon name={link.icon} />
                                </Suspense>
                            </Link>
                        ))}
                    </div>
                 )}
             </div>
        </div>
      </footer>
      <FloatingButtons />
    </div>
  );
}
