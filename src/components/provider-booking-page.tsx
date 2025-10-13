
'use client';

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { BookingForm } from "@/components/booking-form";
import { getPlaceholderImage } from "@/lib/placeholder-images";
import type { Provider } from "@/lib/types";

export function ProviderBookingPageContent({ provider }: { provider: Provider }) {
  const logo = getPlaceholderImage('brobookme');

  return (
    <div className="min-h-screen bg-muted/40 flex flex-col items-center justify-center p-4 md:p-8">
      <div className="container max-w-7xl mx-auto">
        <div className="grid md:grid-cols-5 gap-12 items-center">
          {/* Left Column: Provider Info (40%) */}
          <div className="md:col-span-2 flex flex-col items-center text-center">
            <Avatar className="h-36 w-36 mb-6 border-8 border-background shadow-2xl">
              <AvatarImage src={provider.logoUrl || logo.imageUrl} alt={provider.name} data-ai-hint={logo.imageHint} />
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
    </div>
  );
}
