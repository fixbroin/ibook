
'use client';

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getPlaceholderImage } from "@/lib/placeholder-images";
import type { Provider, ProviderTestimonial, ProviderGalleryItem } from "@/lib/types";
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
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious, type CarouselApi } from "@/components/ui/carousel";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Menu, Star, Expand, ChevronLeft, ChevronRight, Camera, Plus, Minus } from 'lucide-react';
import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import Autoplay from "embla-carousel-autoplay";
import { motion } from "framer-motion";
import { ScrollAnimation } from "./scroll-animation";
import { useToast } from "@/hooks/use-toast";
import { getCurrency } from "@/lib/currencies";
import { ProviderFloatingButtons } from './provider-floating-buttons';

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


export function ProviderBookingPageContent({ provider }: { provider: Provider }) {
  const logo = getPlaceholderImage('brobookme');
  const customPages = provider.settings.customPages;
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);

  const [testimonialApi, setTestimonialApi] = useState<CarouselApi>()
  const [canScrollPrevTestimonial, setCanScrollPrevTestimonial] = useState(false)
  const [canScrollNextTestimonial, setCanScrollNextTestimonial] = useState(false)
  const [testimonialSelectedIndex, setTestimonialSelectedIndex] = useState(0)
  const [testimonialScrollSnaps, setTestimonialScrollSnaps] = useState<number[]>([])

  const [galleryApi, setGalleryApi] = useState<CarouselApi>()
  const [canScrollPrevGallery, setCanScrollPrevGallery] = useState(false)
  const [canScrollNextGallery, setCanScrollNextGallery] = useState(false)
  const [gallerySelectedIndex, setGallerySelectedIndex] = useState(0)
  const [galleryScrollSnaps, setGalleryScrollSnaps] = useState<number[]>([])

  const testimonialAutoplay = useRef(Autoplay({ delay: 3000, stopOnInteraction: false, stopOnMouseEnter: true }));
  const galleryAutoplay = useRef(Autoplay({ delay: 5000, stopOnInteraction: false, stopOnMouseEnter: true }));

  const galleryItems = useMemo(() => 
    provider.settings.gallery?.items.filter(item => item.enabled).sort((a, b) => a.displayOrder - b.displayOrder) || [],
    [provider.settings.gallery]
  );
  
  const showNextImage = useCallback(() => {
    if (selectedImageIndex === null || galleryItems.length === 0) return;
    setSelectedImageIndex((prevIndex) => (prevIndex! + 1) % galleryItems.length);
  }, [selectedImageIndex, galleryItems.length]);

  const showPrevImage = useCallback(() => {
    if (selectedImageIndex === null || galleryItems.length === 0) return;
    setSelectedImageIndex((prevIndex) => (prevIndex! - 1 + galleryItems.length) % galleryItems.length);
  }, [selectedImageIndex, galleryItems.length]);
  
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (selectedImageIndex !== null) {
        if (event.key === 'ArrowRight') {
          showNextImage();
        } else if (event.key === 'ArrowLeft') {
          showPrevImage();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedImageIndex, showNextImage, showPrevImage]);

  const onTestimonialDotButtonClick = useCallback(
    (index: number) => {
      if (!testimonialApi) return
      testimonialApi.scrollTo(index)
      testimonialAutoplay.current.reset()
    },
    [testimonialApi]
  )

  const onGalleryDotButtonClick = useCallback(
    (index: number) => {
      if (!galleryApi) return
      galleryApi.scrollTo(index)
      galleryAutoplay.current.reset()
    },
    [galleryApi]
  )

  useEffect(() => {
    if (!testimonialApi) return
    
    const onSelect = () => {
        setTestimonialSelectedIndex(testimonialApi.selectedScrollSnap())
        setCanScrollPrevTestimonial(testimonialApi.canScrollPrev())
        setCanScrollNextTestimonial(testimonialApi.canScrollNext())
    }
    
    setTestimonialScrollSnaps(testimonialApi.scrollSnapList())
    testimonialApi.on("select", onSelect)
    testimonialApi.on("reInit", onSelect)
    
    return () => {
        testimonialApi.off("select", onSelect)
        testimonialApi.off("reInit", onSelect)
    }
  }, [testimonialApi])

  useEffect(() => {
    if (!galleryApi) return

    const onSelect = () => {
        setGallerySelectedIndex(galleryApi.selectedScrollSnap())
        setCanScrollPrevGallery(galleryApi.canScrollPrev())
        setCanScrollNextGallery(galleryApi.canScrollNext())
    }
    
    setGalleryScrollSnaps(galleryApi.scrollSnapList())
    galleryApi.on("select", onSelect)
    galleryApi.on("reInit", onSelect)
    
    return () => {
        galleryApi.off("select", onSelect)
        galleryApi.off("reInit", onSelect)
    }
  }, [galleryApi])


  const navLinks = [
      { href: `/${provider.username}/about`, label: 'About', enabled: customPages?.about?.enabled },
      { href: `/${provider.username}/contact`, label: 'Contact', enabled: customPages?.contact?.enabled },
      { href: `/${provider.username}/cancellation-policy`, label: 'Cancellation Policy', enabled: customPages?.cancellationPolicy?.enabled },
  ].filter(link => link.enabled);

  const { toast } = useToast();
  const [serviceQuantities, setServiceQuantities] = useState<Record<string, number>>({});
  const currency = useMemo(() => getCurrency(provider.settings.currency), [provider.settings.currency]);
  const services = useMemo(() => provider.settings.services?.filter(s => s.enabled).sort((a, b) => a.displayOrder - b.displayOrder) || [], [provider.settings.services]);

  const handleQuantityChange = (serviceId: string, delta: number) => {
      const newQty = (serviceQuantities[serviceId] || 1) + delta;
      
      if (newQty < 1) return;
  
      const service = provider.settings.services?.find(s => s.id === serviceId);
      if (service?.maxQuantity && newQty > service.maxQuantity) {
        toast({
            title: 'Maximum Quantity Reached',
            description: `You cannot add more than ${service.maxQuantity} units for this service.`,
            variant: 'destructive',
        });
        return; 
      }
      
      setServiceQuantities(prev => ({ ...prev, [serviceId]: newQty }));
    };


  return (
    <motion.div
      initial={{ opacity: 0, x: 60 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="min-h-screen bg-muted/40 flex flex-col items-center p-4 md:py-4 md:px-8"
    >
      <header className="w-full max-w-7xl mx-auto">
        <div className="flex h-14 items-center justify-between rounded-lg bg-background px-4 shadow-sm border">
            <Link href={`/${provider.username}`} className="flex items-center gap-2 min-w-0">
                <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarImage src={provider.logoUrl || logo.imageUrl} alt={provider.name} onContextMenu={(e) => e.preventDefault()} draggable={false} />
                    <AvatarFallback>{provider.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <h1 className="text-xl font-bold truncate">{provider.name}</h1>
            </Link>
            <div className="flex items-center gap-4">
                <nav className="hidden items-center gap-4 lg:flex">
                     {navLinks.map(link => (
                        <Link key={link.href} href={link.href} className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary">
                            {link.label}
                        </Link>
                    ))}
                </nav>
                <ThemeToggle />
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
        <ScrollAnimation>
            <div className="mb-12 flex flex-col items-center text-center">
                <Avatar className="h-36 w-36 mb-6 border-8 border-background shadow-2xl">
                <AvatarImage src={provider.logoUrl || logo.imageUrl} alt={provider.name} data-ai-hint={logo.imageHint} onContextMenu={(e) => e.preventDefault()} draggable={false} />
                <AvatarFallback>{provider.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <h1 className="text-4xl font-bold tracking-tight">{provider.name}</h1>
                <p className="mt-4 max-w-3xl text-lg text-muted-foreground">{provider.description}</p>
            </div>
        </ScrollAnimation>
          
        {provider.settings.enableServicesPage ? (
            <section className="w-full max-w-7xl mx-auto">
                <ScrollAnimation>
                    <h2 className="text-3xl font-bold tracking-tight text-center mb-12">Our Services</h2>
                </ScrollAnimation>
                <ScrollAnimation delay={0.1}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {services.map(s => {
                             const quantity = serviceQuantities[s.id] || 1;
                             const totalPrice = (s.offerPrice ?? s.price) * quantity;
                             const buttonText = s.quantityEnabled && quantity > 1 ? `Book Now (${currency?.symbol}${totalPrice})` : 'Book Now';

                             return (
                                <Card key={s.id} className="flex flex-col">
                                    <div className="p-4 flex flex-col flex-1">
                                        <div className="aspect-square w-full relative mb-4">
                                            <Image
                                                src={s.imageUrl}
                                                alt={s.title}
                                                fill
                                                className="rounded-lg object-cover"
                                                onContextMenu={(e) => e.preventDefault()}
                                                draggable={false}
                                            />
                                        </div>
                                        <h4 className="font-semibold">{s.title}</h4>
                                        <p className="text-sm text-muted-foreground mt-1 flex-1">{s.description}</p>
                                        <div className="text-lg font-bold mt-2">
                                            {s.offerPrice != null && s.offerPrice < s.price ? (
                                                <span><span className="line-through text-muted-foreground text-sm">{currency?.symbol}{s.price}</span> {currency?.symbol}{s.offerPrice}</span>
                                            ) : (
                                                s.price > 0 ? <span>{currency?.symbol}{s.price}</span> : <span className="text-green-600">Free</span>
                                            )}
                                        </div>
                                        <div className="mt-4 flex flex-col gap-2">
                                            {s.quantityEnabled && (
                                                <div className="flex items-center justify-center gap-2">
                                                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleQuantityChange(s.id, -1)}><Minus/></Button>
                                                    <span className="font-bold text-lg w-10 text-center">{quantity}</span>
                                                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleQuantityChange(s.id, 1)}><Plus/></Button>
                                                </div>
                                            )}
                                            <Button asChild className="w-full">
                                                <Link href={`/${provider.username}/book?serviceId=${s.id}${s.quantityEnabled ? '&quantity=' + quantity : ''}`}>
                                                    {buttonText}
                                                </Link>
                                            </Button>
                                        </div>
                                    </div>
                                </Card>
                            )
                        })}
                    </div>
                </ScrollAnimation>
            </section>
        ) : (
             <ScrollAnimation delay={0.1}>
                <div className="w-full">
                    <Card>
                        <CardContent className="p-6 text-center">
                            <h2 className="text-2xl font-semibold mb-4">Ready to book?</h2>
                            <p className="text-muted-foreground mb-6">Click the button below to start scheduling your appointment.</p>
                            <Button asChild size="lg">
                                <Link href={`/${provider.username}/book`}>
                                    Book an Appointment
                                </Link>
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </ScrollAnimation>
        )}
      </div>

       {provider.settings?.testimonials?.enabled && provider.settings.testimonials.items.filter(t => t.enabled).length > 0 && (
        <section className="w-full max-w-7xl mx-auto pt-16">
            <ScrollAnimation>
                <h2 className="text-3xl font-bold tracking-tight text-center mb-12">⭐ What Our Customers Say</h2>
            </ScrollAnimation>
            <ScrollAnimation delay={0.1}>
                <Carousel 
                    setApi={setTestimonialApi} 
                    opts={{ align: "start", loop: true }}
                    plugins={[testimonialAutoplay.current]}
                    className="w-full"
                >
                    <CarouselContent>
                        {provider.settings.testimonials.items.filter(t => t.enabled).sort((a,b) => a.displayOrder - b.displayOrder).map(testimonial => (
                        <CarouselItem key={testimonial.id} className="md:basis-1/2 lg:basis-1/3">
                            <div className="h-full p-1">
                                <Card className="h-full flex flex-col">
                                    <CardHeader className="flex-row gap-4 items-center">
                                        <Avatar className="w-14 h-14">
                                            <AvatarImage src={testimonial.imageUrl} alt={testimonial.name} loading="lazy" onContextMenu={(e) => e.preventDefault()} draggable={false} />
                                            <AvatarFallback>{testimonial.name.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <h4 className="font-semibold">{testimonial.name}</h4>
                                            <p className="text-xs text-muted-foreground">{testimonial.role}</p>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="flex-1">
                                        <div className="flex items-center gap-0.5 mb-2">
                                            {[...Array(5)].map((_, i) => (
                                                <Star key={i} className={`h-4 w-4 ${i < testimonial.rating ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground/30'}`} />
                                            ))}
                                        </div>
                                        <p className="text-muted-foreground text-sm">"{testimonial.description}"</p>
                                    </CardContent>
                                </Card>
                            </div>
                        </CarouselItem>
                        ))}
                    </CarouselContent>
                    {canScrollPrevTestimonial && <CarouselPrevious className="absolute -left-12 top-1/2 -translate-y-1/2 z-10 bg-primary text-primary-foreground hidden md:flex" />}
                    {canScrollNextTestimonial && <CarouselNext className="absolute -right-12 top-1/2 -translate-y-1/2 z-10 bg-primary text-primary-foreground hidden md:flex" />}
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
            </ScrollAnimation>
        </section>
        )}

        {galleryItems.length > 0 && provider.settings?.gallery?.enabled && (
        <section className="w-full max-w-7xl mx-auto pt-16">
            <ScrollAnimation>
                <h2 className="text-3xl font-bold tracking-tight text-center mb-12 flex items-center justify-center gap-3">
                    <Camera className="h-8 w-8" />
                    {provider.settings.gallery?.title || 'Our Work Gallery'}
                </h2>
            </ScrollAnimation>
            <ScrollAnimation delay={0.1}>
                <Carousel 
                    setApi={setGalleryApi} 
                    opts={{ align: "start", loop: true }}
                    plugins={[galleryAutoplay.current]}
                    className="w-full"
                >
                    <CarouselContent>
                        {galleryItems.map((item, index) => (
                            <CarouselItem key={item.id} className="md:basis-1/2 lg:basis-1/3">
                                <Card
                                    className="overflow-hidden cursor-pointer group"
                                    onClick={() => setSelectedImageIndex(index)}
                                >
                                    <CardContent className="p-0">
                                        <div className="aspect-video relative">
                                            <Image src={item.imageUrl} alt={item.title || 'Gallery image'} fill className="object-cover" onContextMenu={(e) => e.preventDefault()} draggable={false} />
                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                                                <Expand className="h-10 w-10 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                            </div>
                                        </div>
                                        {(item.title || item.caption) && (
                                            <div className="p-4">
                                                {item.title && <h4 className="font-semibold">{item.title}</h4>}
                                                {item.caption && <p className="text-sm text-muted-foreground">{item.caption}</p>}
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </CarouselItem>
                        ))}
                    </CarouselContent>
                    {canScrollPrevGallery && <CarouselPrevious className="absolute -left-12 top-1/2 -translate-y-1/2 z-10 bg-primary text-primary-foreground hidden md:flex" />}
                    {canScrollNextGallery && <CarouselNext className="absolute -right-12 top-1/2 -translate-y-1/2 z-10 bg-primary text-primary-foreground hidden md:flex" />}
                </Carousel>
                <div className="flex justify-center gap-2 mt-4">
                    {galleryScrollSnaps.map((_, index) => (
                        <DotButton
                        key={index}
                        selected={index === gallerySelectedIndex}
                        onClick={() => onGalleryDotButtonClick(index)}
                        />
                    ))}
                </div>
            </ScrollAnimation>
        </section>
        )}


      <ScrollAnimation>
        <footer className="mt-8 py-4 text-center text-sm text-muted-foreground">
            Powered by <Link href="/" className="font-semibold text-primary hover:underline">BroBookMe</Link>
        </footer>
      </ScrollAnimation>
      
      <Dialog open={selectedImageIndex !== null} onOpenChange={(isOpen) => !isOpen && setSelectedImageIndex(null)}>
        <DialogContent className="p-2 m-0 w-full max-w-6xl h-auto bg-transparent border-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0">
          <DialogTitle className="sr-only">Full screen gallery view</DialogTitle>
          {selectedImageIndex !== null && (
            <div className="relative w-full h-auto max-h-[90vh]">
              <Image
                src={galleryItems[selectedImageIndex].imageUrl}
                alt={galleryItems[selectedImageIndex].title || "Full screen gallery view"}
                width={1920}
                height={1080}
                className="w-full h-full object-contain rounded-lg"
                onContextMenu={(e) => e.preventDefault()}
                draggable={false}
              />
               <Button
                variant="secondary"
                size="icon"
                className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full h-10 w-10 opacity-70 hover:opacity-100"
                onClick={(e) => { e.stopPropagation(); showPrevImage(); }}
                aria-label="Previous image"
              >
                <ChevronLeft className="h-6 w-6" />
              </Button>
              <Button
                variant="secondary"
                size="icon"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full h-10 w-10 opacity-70 hover:opacity-100"
                onClick={(e) => { e.stopPropagation(); showNextImage(); }}
                aria-label="Next image"
              >
                <ChevronRight className="h-6 w-6" />
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
      <ProviderFloatingButtons settings={provider.settings.floatingButtons} />
    </motion.div>
  );
}
