import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Land & Home Properties | Ficksburg & Eastern Free State",
  description: "Modern property. Local knowledge. Better marketing. Find homes, request an appraisal and discover property management in Ficksburg and the Eastern Free State.",
  robots: {index:false,follow:false},
  other: {
    "codex-preview": "development",
  },
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
      <body className="antialiased">{children}</body>
    </html>
  );
}
