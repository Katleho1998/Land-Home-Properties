import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import "./globals.css";
import "./front-refinement.css";
import "./brand-refinement.css";
import "./support-chat.css";
import "./property-gallery.css";
import "./property-finance.css";
import "./mobile-refinement.css";

export const viewport: Viewport = {width:"device-width",initialScale:1,viewportFit:"cover",interactiveWidget:"resizes-content"};

export const metadata: Metadata = {
  title: "Land & Home Properties | Ficksburg & Eastern Free State",
  description: "Modern property. Local knowledge. Better marketing. Find homes, request an appraisal and discover property management in Ficksburg and the Eastern Free State.",
  robots: {index:false,follow:false},
  icons: {
    icon: [{url:"/favicon-48.png?v=brand-white-2",type:"image/png",sizes:"48x48"}],
    shortcut: "/favicon-48.png?v=brand-white-2",
    apple: "/apple-touch-icon.png?v=brand-white-2",
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

