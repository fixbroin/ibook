
import { getProviderByUsername } from "@/lib/data";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Loader2, ShieldAlert } from "lucide-react";
import type { Metadata, ResolvingMetadata } from 'next';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProviderBookingPageContent } from "@/components/provider-booking-page";
import type { Provider } from "@/lib/types";

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

// Deep serialization function to handle nested Timestamps
const serializeObject = (obj: any): any => {
  if (obj === null || obj === undefined || typeof obj !== 'object') {
      return obj;
  }

  // Firestore Timestamps
  if (obj.toDate && typeof obj.toDate === 'function') {
      return obj.toDate().toISOString();
  }

  // Plain Date objects
  if (obj instanceof Date) {
    return obj.toISOString();
  }
  
  if (Array.isArray(obj)) {
      return obj.map(serializeObject);
  }
  
  const newObj: { [key: string]: any } = {};
  for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
          newObj[key] = serializeObject(obj[key]);
      }
  }
  return newObj;
};


export default async function ProviderBookingPage({ params }: Props) {
  const providerData = await getProviderByUsername(params.username);

  if (!providerData || providerData.isSuspended) {
    notFound();
  }

  // Check for subscription status
  const isLifetime = providerData.plan?.duration === 'lifetime';
  const hasActivePlan = isLifetime || (providerData.planId && providerData.planExpiry && providerData.planExpiry > new Date());

  if (!hasActivePlan) {
    return (
        <div className="min-h-screen bg-muted/40 flex flex-col items-center justify-center p-4 md:p-8">
            <Card className="max-w-lg text-center">
                <CardHeader>
                    <div className="mx-auto bg-destructive/10 text-destructive rounded-full p-3 w-fit">
                        <ShieldAlert className="h-10 w-10" />
                    </div>
                    <CardTitle className="mt-4">Booking Page Unavailable</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">
                        This provider's subscription is currently inactive. Please check back later or contact the provider directly.
                    </p>
                </CardContent>
            </Card>
        </div>
    );
  }
  
  const provider = serializeObject(providerData) as Provider;

  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
      <ProviderBookingPageContent provider={provider} />
    </Suspense>
  )
}
