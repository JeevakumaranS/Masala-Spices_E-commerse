import type { Metadata, Viewport } from "next";
import { Fraunces } from "next/font/google";
import "./globals.css";
import { SiteChrome } from "@/components/SiteChrome";
import { SiteFooter } from "@/components/SiteFooter";
import { Toast } from "@/components/Toast";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Masala House | Freshly ground spice blends",
    template: "%s · Masala House",
  },
  description:
    "Small-batch masalas, whole spices and recipe-first blends — roasted and ground the slow way for everyday Indian cooking.",
  keywords: [
    "masala",
    "spices",
    "Indian spices",
    "sambar masala",
    "garam masala",
    "small batch spices",
    "freshly ground masala",
  ],
  applicationName: "Masala House",
  openGraph: {
    type: "website",
    locale: "en_IN",
    siteName: "Masala House",
    title: "Masala House | Freshly ground spice blends",
    description:
      "Small-batch masalas, whole spices and recipe-first blends — roasted and ground the slow way.",
    images: [
      {
        url: "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=1200&q=80",
        width: 1200,
        height: 630,
        alt: "Assorted whole spices and ground masalas",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Masala House | Freshly ground spice blends",
    description:
      "Small-batch masalas, whole spices and recipe-first blends for everyday Indian cooking.",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#fdfaf5",
  colorScheme: "light",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={fraunces.variable}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* The root layout applies this stylesheet across every route. */}
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,100..900;1,100..900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="montserrat-ui min-h-screen font-sans antialiased">
        <a href="#main-content" className="skip-link">
          Skip to content
        </a>

        <SiteChrome />
        <Toast />

        <main id="main-content" tabIndex={-1} className="flex min-h-[60vh] flex-col">
          {children}
        </main>

        <SiteFooter />

      </body>
    </html>
  );
}
