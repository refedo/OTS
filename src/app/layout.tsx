import type { Metadata, Viewport } from "next";
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
  manifest: "/api/manifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Hexa Steel® OTS",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#0f172a",
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
