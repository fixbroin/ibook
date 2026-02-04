
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function getAllProviders() {
  const providersCol = collection(db, 'providers');
  const snapshot = await getDocs(providersCol);
  return snapshot.docs.map(doc => doc.data());
}

async function generateSitemap() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:9002';

  const providers = await getAllProviders();
  const providerUrls = providers.map(provider => `
    <url>
      <loc>${siteUrl}/${provider.username}</loc>
      <lastmod>${new Date().toISOString()}</lastmod>
      <changefreq>weekly</changefreq>
      <priority>0.8</priority>
    </url>`).join('');

  const staticRoutes = [
    '', 
    '/about', 
    '/login',
    '/terms-of-service',
    '/privacy-policy',
    '/cancellation-policy',
    '/refund-policy'
  ];

  const staticUrls = staticRoutes.map(route => `
    <url>
      <loc>${siteUrl}${route}</loc>
      <lastmod>${new Date().toISOString()}</lastmod>
      <changefreq>${route === '' ? 'daily' : 'monthly'}</changefreq>
      <priority>${route === '' ? '1.0' : '0.7'}</priority>
    </url>`).join('');

  const sitemapContent = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${staticUrls}
  ${providerUrls}
</urlset>`;

  fs.writeFileSync(path.join(__dirname, 'public', 'sitemap.xml'), sitemapContent);
  console.log('Sitemap generated successfully!');
  process.exit(0);
}

generateSitemap().catch(err => {
    console.error('Error generating sitemap:', err);
    process.exit(1);
});
