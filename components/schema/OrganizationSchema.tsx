// Organization + LocalBusiness + TravelAgency schema for homepage
import React from 'react';
import { requestBaseUrl } from '@/lib/seo/requestBaseUrl';
import { getTenantConfigCached, getTenantFromRequest } from '@/lib/tenant';
import { serializeJsonLd } from '@/lib/security/serializeJsonLd';


export default async function OrganizationSchema() {
  const BASE_URL = await requestBaseUrl();
  // One build serves every brand, so the business described here has to be the
  // brand the visitor is on. Hardcoded, every white-label site was declaring
  // itself to search engines as the flagship company — its name, phone, email,
  // address and social profiles.
  const tenant = await getTenantConfigCached(await getTenantFromRequest()).catch(() => null);
  const brandName = tenant?.name || 'Egypt Excursions Online';
  const brandEmail = tenant?.contact?.email || 'info@egypt-excursionsonline.com';
  const brandPhone = tenant?.contact?.phone || '+20-100-000-0000';
  const brandCity = tenant?.contact?.city || 'Hurghada';
  const brandLogo = tenant?.branding?.logo || `${BASE_URL}/logo.png`;
  const brandSocial = [
    tenant?.socialLinks?.facebook,
    tenant?.socialLinks?.instagram,
    tenant?.socialLinks?.tripadvisor,
  ].filter(Boolean) as string[];
  const ld = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': ['TravelAgency', 'LocalBusiness', 'Organization'],
        '@id': `${BASE_URL}/#organization`,
        name: brandName,
        url: BASE_URL,
        logo: {
          '@type': 'ImageObject',
          url: brandLogo,
          width: 512,
          height: 512,
        },
        image: `${BASE_URL}/og-image.jpg`,
        description: `${brandName} offers tours, day trips and excursions across Egypt.`,
        telephone: brandPhone,
        email: brandEmail,
        address: {
          '@type': 'PostalAddress',
          addressLocality: brandCity,
          addressRegion: 'Red Sea Governorate',
          addressCountry: 'EG',
        },
        geo: {
          '@type': 'GeoCoordinates',
          latitude: 27.2579,
          longitude: 33.8116,
        },
        areaServed: [
          { '@type': 'Country', name: 'Egypt' },
          { '@type': 'City', name: 'Hurghada' },
          { '@type': 'City', name: 'Cairo' },
          { '@type': 'City', name: 'Luxor' },
          { '@type': 'City', name: 'Sharm El Sheikh' },
          { '@type': 'City', name: 'Aswan' },
        ],
        priceRange: '$$',
        currenciesAccepted: 'USD, EUR, GBP',
        paymentAccepted: 'Credit Card, PayPal, Cash',
        openingHoursSpecification: {
          '@type': 'OpeningHoursSpecification',
          dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
          opens: '00:00',
          closes: '23:59',
        },
        ...(brandSocial.length > 0 ? { sameAs: brandSocial } : {}),
        // A hardcoded 4.8 from 2,450 reviews used to be emitted here for every
        // brand. Structured data is a factual claim to search engines, and that
        // figure was backed by nothing — same invented-numbers class already
        // removed from the page templates. Omitted until it can be computed
        // from this brand's real reviews.
        speakable: {
          '@type': 'SpeakableSpecification',
          cssSelector: ['h1', '.organization-description'],
        },
        makesOffer: {
          '@type': 'AggregateOffer',
          lowPrice: '15',
          highPrice: '500',
          priceCurrency: 'USD',
          offerCount: '200',
        },
        hasOfferCatalog: {
          '@type': 'OfferCatalog',
          name: 'Egypt Tours & Excursions',
          itemListElement: [
            { '@type': 'Product', name: 'Day Tours', description: 'Guided day tours across Egypt' },
            { '@type': 'Product', name: 'Multi-Day Tours', description: 'Extended tours and packages' },
            { '@type': 'Event', name: 'Nile Cruises', description: 'Cruise the Nile with expert guides' },
          ],
        },
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(ld) }}
    />
  );
}
