
import { getProviderByUsername } from "@/lib/data";
import { notFound } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { BookingForm } from "@/components/booking-form";
import { getPlaceholderImage } from "@/lib/placeholder-images";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import type { Metadata, ResolvingMetadata } from 'next';


type Props = {
  params: { username: string };
};

// This line forces the page to be dynamically rendered, ensuring fresh data on every request.
export const dynamic = 'force-dynamic';

export async function generateMetadata(
  { params }: Props,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const username = params.username;
  const provider = await getProviderByUsername(username);

  if (!provider) {
    return {
      title: 'Provider Not Found',
    };
  }

  const previousImages = (await parent).openGraph?.images || [];

  return {
    title: `Book with ${provider.name}`,
    description: provider.description,
    alternates: {
      canonical: `/${username}`,
    },
    openGraph: {
      title: `Book an Appointment with ${provider.name}`,
      description: provider.description,
      images: [provider.logoUrl, ...previousImages],
    },
  };
}


async function ProviderBookingPageComponent({ params }: Props) {
  const provider = await getProviderByUsername(params.username);

  if (!provider || provider.isSuspended) {
    notFound();
  }

  const logo = getPlaceholderImage('srikanth-logo');

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

export default function ProviderBookingPage({ params }: Props) {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
      <ProviderBookingPageComponent params={params} />
    </Suspense>
  )
}
