

import { getAdminSettings } from '@/lib/data';
import { HomePageContent } from '@/components/home-page-content';
import type { SiteSettings, Testimonial } from '@/lib/types';
import { getPlaceholderImage } from '@/lib/placeholder-images';
import type { Metadata } from 'next';


// Default settings to prevent errors if nothing is in the database
const defaultSettings: SiteSettings = {
    branding: {
        siteName: 'BroBookMe',
        logoUrl: getPlaceholderImage('default-logo').imageUrl,
    },
    hero: {
        title: 'Focus on Your Work, We\'ll Handle the Bookings',
        paragraph: 'BroBookMe provides a simple, elegant booking page for your clients. Share your link and let the appointments roll in.',
        imageUrl: getPlaceholderImage('dashboard-mockup').imageUrl,
        buttons: [
            { text: 'Get Started for Free', link: '/login', variant: 'default' },
            { text: 'View Demo Page', link: '/brobookme', variant: 'outline' },
        ],
    },
};

export const metadata: Metadata = {
  alternates: {
    canonical: '/',
  },
};


export default async function Home() {
    const adminSettings = await getAdminSettings();
    let siteSettings = adminSettings?.site || defaultSettings;

    // Serialize Firestore Timestamps to plain objects for Client Component
    if (siteSettings.testimonials) {
      siteSettings = {
        ...siteSettings,
        testimonials: siteSettings.testimonials.map(testimonial => {
          const createdAt = testimonial.createdAt as any;
          return {
            ...testimonial,
            // Safely convert Timestamp to a serializable format (ISO string)
            createdAt: createdAt?.toDate ? createdAt.toDate().toISOString() : createdAt,
          } as Testimonial;
        }),
      };
    }
    
    return <HomePageContent settings={siteSettings} />;
}
