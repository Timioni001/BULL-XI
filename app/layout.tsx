import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { GeistSans } from "geist/font/sans";
import { Providers } from "@/components/providers/providers";
import { copy } from "@/lib/copy";
import "./globals.css";

// Mono is only used for tickers, so it isn't preloaded.
const geistMono = localFont({
  src: "../node_modules/geist/dist/fonts/geist-mono/GeistMono-Variable.woff2",
  variable: "--font-geist-mono",
  weight: "100 900",
  display: "swap",
  preload: false,
});

const spaceGrotesk = localFont({
  src: "../node_modules/@fontsource-variable/space-grotesk/files/space-grotesk-latin-wght-normal.woff2",
  variable: "--font-space-grotesk",
  weight: "300 700",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: { default: `${copy.brand.name}: ${copy.brand.tagline}`, template: `%s · ${copy.brand.name}` },
  description: copy.brand.subline,
  applicationName: copy.brand.name,
  appleWebApp: { capable: true, title: copy.brand.name, statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false },
  openGraph: { title: copy.brand.tagline, description: copy.brand.subline, siteName: copy.brand.name, type: "website" },
};

export const viewport: Viewport = {
  themeColor: "#0A0A0A",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`dark ${GeistSans.variable} ${geistMono.variable} ${spaceGrotesk.variable}`}>
      <body className="min-h-dvh bg-background">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
