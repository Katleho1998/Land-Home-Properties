import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Land & Home Properties | Ficksburg & Eastern Free State",
  description: "Modern property. Local knowledge. Better marketing. Find homes, request an appraisal and discover property management in Ficksburg and the Eastern Free State.",
  robots: {index:false,follow:false},
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased"><Suspense fallback={<main aria-busy="true" style={{padding:'3rem'}}>Loading Land &amp; Home…</main>}>{children}</Suspense></body>
    </html>
  );
}

