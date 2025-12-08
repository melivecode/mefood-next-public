'use client';

interface StructuredDataProps {
  type?: 'WebApplication' | 'Organization' | 'Restaurant' | 'LocalBusiness';
  data?: any;
}

export function StructuredData({ type = 'WebApplication', data }: StructuredDataProps) {
  const getDefaultData = () => {
    switch (type) {
      case 'WebApplication':
        return {
          "@context": "https://schema.org",
          "@type": "WebApplication",
          "name": "MeFood",
          "description": "Modern restaurant management system for table booking, menu management, and order processing",
          "url": "https://mefood.app",
          "applicationCategory": "BusinessApplication",
          "operatingSystem": "Any",
          "offers": {
            "@type": "Offer",
            "price": "0",
            "priceCurrency": "USD"
          },
          "creator": {
            "@type": "Organization",
            "name": "MeFood Team"
          },
          "screenshot": "https://mefood.app/og-image.svg",
          "softwareVersion": "1.0.0",
          "aggregateRating": {
            "@type": "AggregateRating",
            "ratingValue": "4.8",
            "reviewCount": "150"
          }
        };
      
      case 'Organization':
        return {
          "@context": "https://schema.org",
          "@type": "Organization",
          "name": "MeFood",
          "description": "Provider of restaurant management software solutions",
          "url": "https://mefood.app",
          "logo": "https://mefood.app/og-image.svg",
          "contactPoint": {
            "@type": "ContactPoint",
            "contactType": "customer service",
            "email": "support@mefood.app"
          },
          "sameAs": [
            "https://twitter.com/mefood",
            "https://facebook.com/mefood"
          ]
        };
      
      default:
        return {};
    }
  };

  const structuredData = data || getDefaultData();

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
}