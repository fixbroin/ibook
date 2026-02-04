
import { getAdminSettings } from '@/lib/data';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  alternates: {
    canonical: '/privacy-policy',
  },
};

export default async function PrivacyPolicyPage() {
    const adminSettings = await getAdminSettings();
    const policyContent = adminSettings?.site?.policies?.privacy;

    if (!policyContent) {
        notFound();
    }

    return (
        <div className="bg-muted/40 py-12">
            <div className="container max-w-4xl mx-auto px-4">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-3xl">Privacy Policy</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div 
                            className="prose dark:prose-invert max-w-none"
                            dangerouslySetInnerHTML={{ __html: policyContent }} 
                        />
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
