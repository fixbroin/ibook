

import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '@/components/providers';
import Script from 'next/script';
import { Roboto } from 'next/font/google';
import { getAdminSettings } from '@/lib/data';

const roboto = Roboto({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-roboto',
  display: 'swap',
});


const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:9002';

export async function generateMetadata(): Promise<Metadata> {
  const adminSettings = await getAdminSettings();
  const seoSettings = adminSettings?.site?.seo;
  const brandingSettings = adminSettings?.site?.branding;

  const titleTemplate = seoSettings?.titleTemplate || `%s | ${brandingSettings?.siteName || 'BroBookMe'}`;
  const defaultTitle = seoSettings?.defaultTitle || `${brandingSettings?.siteName || 'BroBookMe'} - Online Booking System for Service Providers`;
  const defaultDescription = seoSettings?.defaultDescription || 'BroBookMe is a smart online booking platform for professionals. Manage appointments, reduce no-shows, accept payments securely, and streamline your business effortlessly.';
  const defaultKeywords = seoSettings?.defaultKeywords || 'online booking system, appointment scheduling software, service booking app, professional booking software, appointment management, BroBookMe';
  const ogImageUrl = seoSettings?.openGraphImageUrl || '/og-image.png';
  const twitterHandle = seoSettings?.twitterHandle || '@brobookme';

  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: defaultTitle,
      template: titleTemplate,
    },
    description: defaultDescription,
    keywords: defaultKeywords.split(',').map(k => k.trim()),
    
    alternates: {
      canonical: '/',
    },
    
    verification: {
      google: 'iFBPpPeK-lz9ciWDaXBbyqpf0KDqz_dOj920N4wmRdk',
    },

    openGraph: {
      title: defaultTitle,
      description: defaultDescription,
      url: siteUrl,
      siteName: brandingSettings?.siteName || 'BroBookMe',
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: `${brandingSettings?.siteName || 'BroBookMe'} - Streamline Your Appointments & Bookings Online`,
        },
      ],
      locale: 'en_US',
      type: 'website',
    },

    twitter: {
      card: 'summary_large_image',
      title: defaultTitle,
      description: defaultDescription,
      images: [ogImageUrl],
      creator: twitterHandle,
    },

    icons: {
      icon: '/favicon.ico',
      shortcut: '/favicon-16x16.png',
      apple: '/apple-touch-icon.png',
    },
    
    manifest: '/manifest.json',
  };
}


export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const adminSettings = await getAdminSettings();
  const marketingSettings = adminSettings?.marketing;
  const brandingSettings = adminSettings?.site?.branding;

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
            "name": brandingSettings?.siteName || 'BroBookMe',
            "image": `${siteUrl}/${brandingSettings?.logoUrl || 'android-chrome-192x192.png'}`,
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
              "https://facebook.com/brobookme",
              "https://instagram.com/brobookme"
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
        <Providers>{children}</Providers>
        <Script src="https://checkout.razorpay.com/v1/checkout.js" />

        {/* Custom Body Script */}
        {marketingSettings?.customBodyScript?.enabled && marketingSettings?.customBodyScript?.script && (
          <Script id="custom-body-script" strategy="lazyOnload" dangerouslySetInnerHTML={{ __html: marketingSettings.customBodyScript.script }} />
        )}
      </body>
    </html>
  );
}
