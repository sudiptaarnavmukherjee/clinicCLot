import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import QueryProvider from "@/components/providers/QueryProvider";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "ClinicQ — Smart Queue & Booking for Clinics",
    template: "%s | ClinicQ",
  },
  description:
    "The world's best doctor booking and queue management system for small clinics and pharmacies. Real-time queue tracking, instant updates, and seamless booking.",
  keywords: ["clinic booking", "doctor appointment", "queue management"],
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "ClinicQ",
  },
  openGraph: {
    type: "website",
    siteName: "ClinicQ",
    title: "ClinicQ — Smart Queue & Booking for Clinics",
    description: "Real-time queue management for small clinics and pharmacies",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#2563EB",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} antialiased`}>
        <QueryProvider>
          {children}
          <Toaster
            position="top-center"
            richColors
            closeButton
            toastOptions={{ style: { borderRadius: "12px" } }}
          />
        </QueryProvider>
      </body>
    </html>
  );
}
