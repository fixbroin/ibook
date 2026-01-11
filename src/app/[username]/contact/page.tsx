
import { getProviderByUsername } from "@/lib/data";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PublicPageLayout } from "../_components/public-page-layout";
import type { Metadata } from 'next';
import { Mail, MapPin, Phone } from "lucide-react";

type Props = {
  params: { username: string };
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const provider = await getProviderByUsername(params.username);
  if (!provider || !provider.settings.customPages?.contact?.enabled) {
    return { title: 'Not Found' };
  }
  
  const contactSettings = provider.settings.customPages.contact;
  const pageTitle = contactSettings.title || `Contact ${provider.name}`;
  const description = `Get in touch with ${provider.name}. Find our contact details and location.`;
  
  return {
    title: pageTitle,
    description: description,
    alternates: {
      canonical: `/${params.username}/contact`,
    },
     openGraph: {
      title: pageTitle,
      description: description,
      url: `/${params.username}/contact`,
    }
  };
}


export default async function ProviderContactPage({ params }: Props) {
    const provider = await getProviderByUsername(params.username);

    if (!provider || !provider.settings.customPages?.contact?.enabled) {
        notFound();
    }

    const { title, mobile, email, address, mapLink } = provider.settings.customPages.contact;

    return (
        <PublicPageLayout provider={provider} pageName="Contact">
            <Card>
                <CardHeader>
                    <CardTitle className="text-3xl">{title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    {mobile && (
                        <div className="flex items-center gap-4">
                            <Phone className="h-6 w-6 text-primary"/>
                            <a href={`tel:${mobile}`} className="text-lg hover:underline">{mobile}</a>
                        </div>
                    )}
                    {email && (
                        <div className="flex items-center gap-4">
                            <Mail className="h-6 w-6 text-primary"/>
                            <a href={`mailto:${email}`} className="text-lg hover:underline">{email}</a>
                        </div>
                    )}
                    {address && (
                         <div className="flex items-start gap-4">
                            <MapPin className="h-6 w-6 text-primary mt-1"/>
                            <p className="text-lg whitespace-pre-line">{address}</p>
                        </div>
                    )}
                    {mapLink && (
                        <div className="aspect-video w-full">
                            <iframe 
                                src={mapLink} 
                                width="100%" 
                                height="100%" 
                                style={{ border: 0 }}
                                allowFullScreen={false}
                                loading="lazy" 
                                referrerPolicy="no-referrer-when-downgrade"
                                className="rounded-lg"
                            ></iframe>
                        </div>
                    )}
                </CardContent>
            </Card>
        </PublicPageLayout>
    );
}
