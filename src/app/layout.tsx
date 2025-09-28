
import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { ThemeProvider } from '@/components/theme-provider';
import Script from 'next/script';
import { Suspense } from 'react';
import Loading from './loading';
import { Roboto } from 'next/font/google';
import { getAdminSettings } from '@/lib/data';

const roboto = Roboto({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-roboto',
  display: 'swap',
});


const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:9002';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'BroBookMe - Smart Booking for Professionals',
    template: `%s | BroBookMe`,
  },
  description: 'The smart booking platform for service providers. Simplify your scheduling, reduce no-shows, and manage your business with ease.',
  keywords: ['booking', 'scheduling', 'appointment', 'service provider', 'calendar management', 'online booking'],
  
  alternates: {
    canonical: '/',
  },
  
  // Google Search Console Verification
  verification: {
    google: 'YOUR_VERIFICATION_CODE', // Replace with your verification code
  },

  // Open Graph (for social media sharing)
  openGraph: {
    title: 'BroBookMe - Smart Booking for Professionals',
    description: 'Focus on your work, we\'ll handle the bookings. Get your own professional booking page in minutes.',
    url: siteUrl,
    siteName: 'BroBookMe',
    images: [
      {
        url: '/android-chrome-192x192.png', // Placed in the public folder
        width: 1200,
        height: 630,
        alt: 'BroBookMe - Smart Booking Platform',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },

  // Twitter Card
  twitter: {
    card: 'summary_large_image',
    title: 'BroBookMe - Smart Booking for Professionals',
    description: 'Simplify your scheduling and grow your business with BroBookMe, the smart booking platform.',
    images: ['/android-chrome-192x192.png'], // Placed in the public folder
    creator: '@yourtwitterhandle', // Replace with your Twitter handle
  },

  // Favicons and PWA
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon-16x16.png',
    apple: '/apple-touch-icon.png',
  },
  
  // PWA Manifest
  manifest: '/manifest.json',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const adminSettings = await getAdminSettings();
  const marketingSettings = adminSettings?.marketing;

  return (
    <html lang="en" suppressHydrationWarning className={roboto.variable}>
      <head>
        {/* PWA Theme Color */}
        <meta name="theme-color" content="#FFFFFF" media="(prefers-color-scheme: light)" />
        <meta name="theme-color" content="#09090B" media="(prefers-color-scheme: dark)" />

        {/* Additional Favicon formats */}
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        
        {/* Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "LocalBusiness",
            "name": "BroBookMe",
            "image": `${siteUrl}/android-chrome-192x192.png`,
            "url": siteUrl,
            "telephone": "+91-7353113455",
            "address": {
              "@type": "PostalAddress",
              "streetAddress": "#44, G S Palya Road, Konappana Agrahara, Electronic City Phase 2",
              "addressLocality": "Bangalore",
              "postalCode": "560100",
              "addressCountry": "IN"
            },
            "priceRange": "₹₹",
            "sameAs": [
              "https://facebook.com/BroBookMe",
              "https://instagram.com/BroBookMe"
            ]
          }) }}
        />

        {/* Google Tag Manager */}
        {marketingSettings?.googleTagManager?.enabled && marketingSettings?.googleTagManager?.id && (
          <Script id="google-tag-manager" strategy="afterInteractive">
            {`
              (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
              new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
              j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
              'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
              })(window,document,'script','dataLayer','${marketingSettings.googleTagManager.id}');
            `}
          </Script>
        )}

        {/* Google Analytics 4 */}
        {marketingSettings?.googleAnalytics?.enabled && marketingSettings?.googleAnalytics?.id && (
          <>
            <Script src={`https://www.googletagmanager.com/gtag/js?id=${marketingSettings.googleAnalytics.id}`} strategy="afterInteractive" />
            <Script id="google-analytics" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${marketingSettings.googleAnalytics.id}');
              `}
            </Script>
          </>
        )}
        
        {/* Google Ads Conversion */}
        {marketingSettings?.googleAdsConversion?.enabled && marketingSettings?.googleAdsConversion?.id && (
            <Script src={`https://www.googletagmanager.com/gtag/js?id=${marketingSettings.googleAdsConversion.id}`} strategy="afterInteractive" />
        )}

        {/* Microsoft Clarity */}
        {marketingSettings?.microsoftClarity?.enabled && marketingSettings?.microsoftClarity?.id && (
          <Script id="microsoft-clarity" strategy="afterInteractive">
            {`
              (function(c,l,a,r,i,t,y){
                  c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
                  t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
                  y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
              })(window, document, "clarity", "script", "${marketingSettings.microsoftClarity.id}");
            `}
          </Script>
        )}


        {/* Custom Head Script */}
        {marketingSettings?.customHeadScript?.enabled && marketingSettings?.customHeadScript?.script && (
          <Script id="custom-head-script" strategy="afterInteractive" dangerouslySetInnerHTML={{ __html: marketingSettings.customHeadScript.script }} />
        )}


      </head>
      <body className="font-body antialiased">
         {/* GTM noscript */}
        {marketingSettings?.googleTagManager?.enabled && marketingSettings?.googleTagManager?.id && (
            <noscript>
                <iframe
                    src={`https://www.googletagmanager.com/ns.html?id=${marketingSettings.googleTagManager.id}`}
                    height="0"
                    width="0"
                    style={{ display: 'none', visibility: 'hidden' }}
                ></iframe>
            </noscript>
        )}
        <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            disableTransitionOnChange
        >
          <Suspense fallback={<Loading />}>
            {children}
          </Suspense>
          <Toaster />
        </ThemeProvider>
        <Script src="https://checkout.razorpay.com/v1/checkout.js" />

        {/* Custom Body Script */}
        {marketingSettings?.customBodyScript?.enabled && marketingSettings?.customBodyScript?.script && (
          <Script id="custom-body-script" strategy="lazyOnload" dangerouslySetInnerHTML={{ __html: marketingSettings.customBodyScript.script }} />
        )}
      </body>
    </html>
  );
}
