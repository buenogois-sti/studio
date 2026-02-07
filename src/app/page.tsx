
import React from 'react';
import { Metadata } from 'next';
import { firestoreAdmin } from '@/firebase/admin';
import { LandingClient } from '@/components/landing/LandingClient';

export async function generateMetadata(): Promise<Metadata> {
  let seoData = {
    title: "Bueno Gois Advogados | Advocacia Trabalhista em São Bernardo do Campo",
    description: "Escritório de advocacia especializado em direitos do trabalhador, rescisões e horas extras. Atendimento humano e estratégico em SBC.",
    keywords: "advogado trabalhista, sbc, são bernardo do campo, rescisão, horas extras"
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
      canonical: 'https://buenogoisadvogado.com.br',
    },
    openGraph: {
      title: seoData.title,
      description: seoData.description,
      type: 'website',
      locale: 'pt_BR',
      url: 'https://buenogoisadvogado.com.br',
      siteName: 'Bueno Gois Advogados',
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
    "name": "Bueno Gois Advogados e Associados",
    "description": initialSeo?.description || "Escritório de advocacia especializado em Direito do Trabalho em SBC.",
    "url": "https://buenogoisadvogado.com.br",
    "telephone": "+5511980590128",
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "Rua Marechal Deodoro, 1594 - Sala 2",
      "addressLocality": "São Bernardo do Campo",
      "addressRegion": "SP",
      "postalCode": "09715-070",
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
