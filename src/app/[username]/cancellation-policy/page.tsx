
import { getProviderByUsername } from "@/lib/data";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PublicPageLayout } from "../_components/public-page-layout";
import type { Metadata } from 'next';

type Props = {
  params: { username: string };
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const provider = await getProviderByUsername(params.username);
  if (!provider || !provider.settings.customPages?.cancellationPolicy?.enabled) {
    return { title: 'Not Found' };
  }
  
  const policySettings = provider.settings.customPages.cancellationPolicy;
  const pageTitle = policySettings.title || `Cancellation Policy`;
  
  return {
    title: pageTitle,
    description: policySettings.description?.substring(0, 160) || `Read our cancellation policy.`,
    alternates: {
      canonical: `/${params.username}/cancellation-policy`,
    },
    openGraph: {
      title: pageTitle,
      description: policySettings.description?.substring(0, 160),
      url: `/${params.username}/cancellation-policy`,
    }
  };
}


export default async function ProviderCancellationPolicyPage({ params }: Props) {
    const provider = await getProviderByUsername(params.username);

    if (!provider || !provider.settings.customPages?.cancellationPolicy?.enabled) {
        notFound();
    }

    const { title, description } = provider.settings.customPages.cancellationPolicy;

    return (
        <PublicPageLayout provider={provider} pageName="Cancellation Policy">
            <Card>
                <CardHeader>
                    <CardTitle className="text-3xl">{title}</CardTitle>
                </CardHeader>
                <CardContent>
                     <div 
                        className="prose dark:prose-invert max-w-none whitespace-pre-line"
                    >
                      {description}
                    </div>
                </CardContent>
            </Card>
        </PublicPageLayout>
    );
}
