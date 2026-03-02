
import React from 'react';
import { Metadata } from 'next';
import { firestoreAdmin } from '@/firebase/admin';
import { LandingClient } from '@/components/landing/LandingClient';

export async function generateMetadata(): Promise<Metadata> {
  let seoData = {
    title: "LexFlow | Gestão Jurídica de Elite",
    description: "Plataforma integrada de gestão jurídica com tecnologia de elite.",
    keywords: "advocacia, gestão jurídica, software jurídico"
  };

  try {
    const seoDoc = await firestoreAdmin?.collection('system_settings').doc('seo').get();
    if (seoDoc?.exists) {
      const data = seoDoc.data();
      seoData = {
        title: data?.title || seoData.title,
        description: data?.description || seoData.description,
        keywords: data?.keywords || seoData.keywords
      };
    }
  } catch (e) {
    console.error("Error fetching SEO metadata:", e);
  }

  return {
    title: seoData.title,
    description: seoData.description,
    keywords: seoData.keywords,
    viewport: 'width=device-width, initial-scale=1',
    robots: 'index, follow',
    alternates: {
      canonical: 'https://seusite.com.br',
    },
    openGraph: {
      title: seoData.title,
      description: seoData.description,
      type: 'website',
      locale: 'pt_BR',
      url: 'https://seusite.com.br',
      siteName: 'LexFlow',
    }
  };
}

export default async function Page() {
  let initialSettings = null;
  let initialSeo = null;

  try {
    const [settingsDoc, seoDoc] = await Promise.all([
      firestoreAdmin?.collection('system_settings').doc('general').get(),
      firestoreAdmin?.collection('system_settings').doc('seo').get()
    ]);

    if (settingsDoc?.exists) initialSettings = JSON.parse(JSON.stringify(settingsDoc.data()));
    if (seoDoc?.exists) initialSeo = JSON.parse(JSON.stringify(seoDoc.data()));
  } catch (e) {
    console.error("Error fetching landing data:", e);
  }

  // Structured Data for Google (JSON-LD)
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LegalService",
    "name": initialSettings?.officeName || "Bueno Gois Advogados",
    "description": initialSeo?.description || "Escritório de advocacia especializado.",
    "url": "https://seusite.com.br",
    "telephone": initialSettings?.phone || "+550000000000",
    "address": {
      "@type": "PostalAddress",
      "streetAddress": initialSettings?.address || "Endereço da Sede",
      "addressLocality": "Cidade",
      "addressRegion": "UF",
      "postalCode": "00000-000",
      "addressCountry": "BR"
    }
  };

  return (
    <>
      <script
        type="application/ld-json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <LandingClient initialSettings={initialSettings} initialSeo={initialSeo} />
    </>
  );
}
