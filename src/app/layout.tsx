import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { TRPCProvider } from "@/lib/trpc/provider";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://store.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Store - Premium Fashion & Lifestyle",
    template: "%s | Store",
  },
  description:
    "Discover premium fashion and lifestyle products. Shop the latest trends with fast delivery across India.",
  keywords: [
    "fashion",
    "clothing",
    "lifestyle",
    "online shopping",
    "India",
    "premium fashion",
    "trendy clothes",
    "men fashion",
    "women fashion",
  ],
  authors: [{ name: "Store" }],
  creator: "Store",
  publisher: "Store",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: siteUrl,
    siteName: "Store",
    title: "Store - Premium Fashion & Lifestyle",
    description:
      "Discover premium fashion and lifestyle products. Shop the latest trends with fast delivery across India.",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Store - Premium Fashion & Lifestyle",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Store - Premium Fashion & Lifestyle",
    description:
      "Discover premium fashion and lifestyle products. Shop the latest trends with fast delivery across India.",
    images: ["/og-image.jpg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <TRPCProvider>
            {children}
            <Toaster position="top-right" richColors />
          </TRPCProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
