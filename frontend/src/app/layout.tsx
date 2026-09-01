import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";
import SiteChrome from "../components/SiteChrome";

export const metadata: Metadata = {
  title: "CompraVentaOnline - El Marketplace de La Pampa",
  description: "Compra y venta de productos nuevos y usados en La Pampa, Argentina. Encuentra las mejores ofertas de comercios locales y usuarios particulares.",
  keywords: "La Pampa, Santa Rosa, General Pico, compra, venta, marketplace, clasificados, nuevo, usado",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="h-full" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var saved = localStorage.getItem('theme');
                  if (saved === 'light' || saved === 'dark') {
                    document.documentElement.setAttribute('data-theme', saved);
                  } else {
                    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                    document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
                  }
                } catch (e) {}
              })()
            `,
          }}
        />
      </head>
      <body className="flex min-h-screen flex-col font-sans bg-background text-foreground antialiased selection:bg-accent-gold selection:text-white">
        <Script
          src="https://cloud.umami.is/script.js"
          data-website-id="f7038b2c-d579-41cc-9a2f-7fad22cde88d"
          strategy="afterInteractive"
        />
        <SiteChrome>{children}</SiteChrome>
      </body>
    </html>
  );
}
