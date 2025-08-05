import type { Metadata } from "next";
import { UserProvider } from '@auth0/nextjs-auth0/client';
import "./globals.css";
import "./styles.css";

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
        <UserProvider>
          {children}
        </UserProvider>
      </body>
    </html>
  );
}
