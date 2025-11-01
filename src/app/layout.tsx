import type { Metadata } from "next";
import "./globals.css";
import "./styles.css";
import NextAuthSessionProvider from '@/components/providers/session-provider';

export const metadata: Metadata = {
  title: "Appalti AI - Sales Optimalisatie Platform",
  description: "AI-gestuurd platform voor aanbestedingsbeheer en sales optimalisatie",
  keywords: ["aanbestedingen", "AI", "sales", "tenders", "bids"],
  authors: [{ name: "Appalti" }],
  viewport: "width=device-width, initial-scale=1",
  themeColor: "#9333ea",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="nl">
      <body>
        <NextAuthSessionProvider>
          {children}
        </NextAuthSessionProvider>
      </body>
    </html>
  );
}
