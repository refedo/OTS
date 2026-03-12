import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SessionProvider } from "@/components/SessionProvider";
import { DialogProvider } from "@/contexts/DialogContext";
import { ChunkErrorBoundary } from "@/components/ChunkErrorBoundary";
import { ChunkErrorHandler } from "@/components/ChunkErrorHandler";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ServiceWorkerProvider } from "@/components/ServiceWorkerProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Hexa Steel® OTS - Operations Tracking System",
  description: "Comprehensive operations tracking and management system for Hexa Steel",
  manifest: "/manifest.json",
  themeColor: "#0f172a",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Hexa Steel® OTS",
  },
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ChunkErrorBoundary>
          <ChunkErrorHandler />
          <ThemeProvider>
            <SessionProvider>
              <DialogProvider>
                <ServiceWorkerProvider>
                  {children}
                </ServiceWorkerProvider>
              </DialogProvider>
            </SessionProvider>
          </ThemeProvider>
        </ChunkErrorBoundary>
      </body>
    </html>
  );
}
