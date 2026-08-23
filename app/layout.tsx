import type { Metadata } from "next";
import { Inter, Syne, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import Providers from "@/components/layout/providers";

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-inter",
});

const syne = Syne({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
  variable: "--font-syne",
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
    <html lang="en" className={`${inter.variable} ${syne.variable} ${jetbrainsMono.variable}`} suppressHydrationWarning>
      <body className="bg-void text-cream antialiased font-inter">
        <Providers>
          {children}
          <Toaster 
            position="bottom-right" 
            toastOptions={{
              className: "border font-inter text-[13px]",
              style: {
                background: 'var(--carbon)',
                borderColor: 'var(--steel)',
                color: 'var(--cream)',
                fontFamily: 'var(--font-inter)',
              },
            }}
          />
        </Providers>
      </body>
    </html>
  );
}
