import type React from "react";
import { Suspense } from "react";
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme-provider";
import { CartProvider } from "@/components/cart-provider";
import { Analytics } from "@vercel/analytics/next";
import CustomScroll from "@/components/custom-scroll";
import SmoothScroll from "@/components/smooth-scroll";
import PWAInstallPrompt from "@/components/pwa-install";
import AnalyticsTracker from "@/components/analytics-tracker";
import { LanguageProvider } from "@/hooks/use-language";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Noziya Milliy Taomlar - Menyu",
  description: "Zamonaviy restoran ovqat buyurtma tizimi",
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icon-192.png" },
    ],
    shortcut: ["/icon-192.png"],
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Noziya Milliy Taomlar",
  },
  formatDetection: {
    telephone: false,
  },
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
    "apple-mobile-web-app-title": "Noziya Milliy Taomlar",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#000000",
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Preconnect to image hosts for faster loading */}
        <link rel="preconnect" href="https://raw.githubusercontent.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://firebasestorage.googleapis.com" crossOrigin="anonymous" />
        {/* Preload static banner and logo */}
        <link rel="preload" href="/Banner.png" as="image" />
        <link rel="preload" href="/Logo.png" as="image" />
      </head>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
        >
          <LanguageProvider>
            <CartProvider>
              <SmoothScroll>
                <CustomScroll />
                {children}
                <Analytics />
              </SmoothScroll>
              <Suspense fallback={null}>
                <AnalyticsTracker />
              </Suspense>
              <PWAInstallPrompt />
              <Toaster />
            </CartProvider>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
