import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./styles.css";

export const metadata: Metadata = {
  title: "Appalti AI - Sales Optimalisatie Platform",
  description: "AI-gestuurd platform voor aanbestedingsbeheer en sales optimalisatie",
  keywords: ["aanbestedingen", "AI", "sales", "tenders", "bids"],
  authors: [{ name: "Appalti" }],
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#9333ea',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="nl">
      <body>{children}</body>
    </html>
  );
}
