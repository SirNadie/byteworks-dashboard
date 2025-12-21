import type { Metadata } from "next";
import { Inter, Manrope } from "next/font/google";
import AppShell from "@/components/layout/AppShell";
import { ToastProvider } from "@/components/ui/Toast";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope" });

export const metadata: Metadata = {
  title: {
    default: "ByteWorks Dashboard",
    template: "%s | ByteWorks Dashboard",
  },
  description: "CRM and Agency Management System - Manage contacts, quotes, invoices, and analytics for your digital agency.",
  keywords: ["CRM", "dashboard", "agency management", "quotes", "invoices", "contacts"],
  authors: [{ name: "ByteWorks Agency" }],
  creator: "ByteWorks Agency",
  metadataBase: new URL("https://portal.byteworksagency.com"),
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://portal.byteworksagency.com",
    siteName: "ByteWorks Dashboard",
    title: "ByteWorks Dashboard",
    description: "CRM and Agency Management System for digital agencies.",
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Theme Initialization Script to preventing flashing */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                  document.documentElement.classList.add('dark')
                } else {
                  document.documentElement.classList.remove('dark')
                }
              } catch (_) {}
            `,
          }}
        />
        {/* Material Symbols Outlined */}
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" />
      </head>
      <body className={`${inter.variable} ${manrope.variable} font-sans antialiased bg-background-light dark:bg-background-dark text-gray-900 dark:text-gray-100`}>
        <ToastProvider>
          <AppShell>
            {children}
          </AppShell>
        </ToastProvider>
      </body>
    </html>
  );
}
