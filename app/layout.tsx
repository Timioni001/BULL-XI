import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Providers } from "@/components/providers/providers";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "BULL-XI", template: "%s · BULL-XI" },
  description: "Fantasy football for stocks. Pick a 15-stock squad, wear the armband and win live leagues 24/7.",
  applicationName: "BULL-XI",
  appleWebApp: { capable: true, title: "BULL-XI", statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false },
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
    <html lang="en" className={`dark ${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="min-h-dvh bg-[#050505]">
        <Providers>
          <div className="relative mx-auto flex min-h-dvh w-full max-w-[440px] flex-col bg-background sm:border-x sm:border-hairline">
            {children}
          </div>
        </Providers>
      </body>
    </html>
  );
}
