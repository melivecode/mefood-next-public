import type { Metadata } from "next";
import { Providers } from "./providers";
import { StructuredData } from "@/lib/components/StructuredData";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXTAUTH_URL || 'https://mefood.app'),
  title: "MeFood - Restaurant Management System",
  description: "Modern table management and ordering system for small to medium restaurants. Complete solution for restaurant operations, menu management, and customer service.",
  keywords: "restaurant management, table booking, menu management, ordering system, restaurant POS, table management system",
  authors: [{ name: "MeFood Team" }],
  creator: "MeFood",
  publisher: "MeFood",
  
  // Open Graph
  openGraph: {
    title: "MeFood - Restaurant Management System",
    description: "Modern table management and ordering system for small to medium restaurants. Complete solution for restaurant operations, menu management, and customer service.",
    url: "https://mefood.app",
    siteName: "MeFood",
    images: [
      {
        url: "/og-image.svg",
        width: 1200,
        height: 630,
        alt: "MeFood Restaurant Management System",
      },
      {
        url: "/og-image-fallback.svg",
        width: 1200,
        height: 630,
        alt: "MeFood - Modern Restaurant Management",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  
  // Twitter
  twitter: {
    card: "summary_large_image",
    title: "MeFood - Restaurant Management System",
    description: "Modern table management and ordering system for restaurants. Complete solution for operations, menu management, and customer service.",
    images: ["/og-image.svg"],
    creator: "@mefood",
  },
  
  // Additional meta tags
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  
  // Verification tags (add your actual verification codes when available)
  verification: {
    google: "google-site-verification-code",
    yandex: "yandex-verification-code",
    yahoo: "yahoo-verification-code",
  },
  
  // App-specific
  applicationName: "MeFood",
  category: "Business",
  
  // Icons and manifest
  icons: {
    icon: [
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    shortcut: '/favicon-32x32.png',
  },
  
  manifest: "/manifest.json",
  
  // Additional structured data
  other: {
    "theme-color": "#1976d2",
    "color-scheme": "light dark",
    "twitter:image": "/og-image.svg",
    "twitter:image:alt": "MeFood Restaurant Management System",
    "og:image:width": "1200",
    "og:image:height": "630",
    "fb:app_id": "your-facebook-app-id", // Replace with actual Facebook App ID
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <StructuredData type="WebApplication" />
        <StructuredData type="Organization" />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
