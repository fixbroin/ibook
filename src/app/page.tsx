

import { getAdminSettings, getTestimonials, getHeroSettings } from '@/lib/data';
import { HomePageContent } from '@/components/home-page-content';
import type { SiteSettings, Testimonial, HeroSettings } from '@/lib/types';
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
    // Fetch all data in parallel
    const [adminSettings, testimonials, heroSettings] = await Promise.all([
      getAdminSettings(),
      getTestimonials(),
      getHeroSettings()
    ]);

    // Construct the final settings object
    let siteSettings = adminSettings?.site || defaultSettings;
    
    // Override the hero section from site settings with the one from its own collection
    if (heroSettings) {
      siteSettings.hero = heroSettings;
    }

    // Attach testimonials to the settings object for the component
    siteSettings.testimonials = testimonials;
    
    return <HomePageContent settings={siteSettings} />;
}
