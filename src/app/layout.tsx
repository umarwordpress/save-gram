import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { JsonLd } from "@/components/json-ld";
import { websiteSchema } from "@/lib/seo";
import { getNavTools } from "@/lib/tools/registry";
import { siteConfig } from "@/lib/site";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: `${siteConfig.name}: Save Public Social Media Video`,
    // Tool pages set their own full title, so this only wraps other pages.
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  openGraph: {
    type: "website",
    siteName: siteConfig.name,
    locale: siteConfig.locale,
    url: siteConfig.url,
  },
  twitter: { card: "summary_large_image", site: siteConfig.twitter },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // The header needs only a small, serializable slice of each tool config.
  const navTools = getNavTools().map((tool) => ({
    id: tool.id,
    name: tool.name,
    slug: tool.slug,
    icon: tool.icon,
    shortDescription: tool.shortDescription,
    status: tool.status,
    accentClass: tool.accentClass,
  }));

  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col">
        <JsonLd data={websiteSchema()} />
        <SiteHeader tools={navTools} />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
