import type { Metadata } from "next";
import { Instrument_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import Providers from "@/components/layout/providers";

const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "ForecourIQ DMS — AI-Native Dealer Platform",
  description: "Production-grade dealer management system for UK independent car dealers.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${instrumentSans.variable} ${jetbrainsMono.variable}`} suppressHydrationWarning>
      <body className="bg-void text-cream antialiased font-sans">
        <Providers>
          {children}
          <Toaster 
            position="bottom-right" 
            toastOptions={{
              className: "border font-sans text-[13px]",
              style: {
                background: 'var(--carbon)',
                borderColor: 'var(--steel)',
                color: 'var(--cream)',
                fontFamily: 'var(--font-sans)',
              },
            }}
          />
        </Providers>
      </body>
    </html>
  );
}
