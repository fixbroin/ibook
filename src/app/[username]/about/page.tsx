
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
  if (!provider || !provider.settings.customPages?.about?.enabled) {
    return { title: 'Not Found' };
  }
  
  const aboutSettings = provider.settings.customPages.about;
  const pageTitle = aboutSettings.title || `About ${provider.name}`;
  
  return {
    title: pageTitle,
    description: aboutSettings.description?.substring(0, 160) || `Learn more about ${provider.name}.`,
    alternates: {
      canonical: `/${params.username}/about`,
    },
    openGraph: {
      title: pageTitle,
      description: aboutSettings.description?.substring(0, 160),
      url: `/${params.username}/about`,
    }
  };
}

export default async function ProviderAboutPage({ params }: Props) {
    const provider = await getProviderByUsername(params.username);

    if (!provider || !provider.settings.customPages?.about?.enabled) {
        notFound();
    }

    const { title, description } = provider.settings.customPages.about;

    return (
        <PublicPageLayout provider={provider} pageName="About">
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
