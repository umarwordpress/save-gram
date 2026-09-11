import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { JsonLd } from "@/components/json-ld";
import { Prose } from "@/components/prose";
import { breadcrumbSchema, buildPageMetadata } from "@/lib/seo";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = buildPageMetadata({
  title: "Terms of Use",
  description:
    "The rules for using SaveGram: public content only, respect for copyright, and no guarantee that any given link will resolve.",
  path: "/terms",
});

const CRUMBS = [
  { name: "Home", href: "/" },
  { name: "Terms", href: "/terms" },
];

export default function TermsPage() {
  return (
    <>
      <JsonLd data={breadcrumbSchema(CRUMBS)} />
      <div className="mx-auto max-w-content px-4 py-10 sm:px-6 sm:py-14">
        <Breadcrumbs crumbs={CRUMBS} />

        <h1 className="mt-6 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">Terms of use</h1>
        <p className="mt-3 max-w-2xl text-base text-ink-soft">
          Using {siteConfig.name} means accepting the points below.
        </p>

        <Prose>
          <section>
            <h2>What the service is</h2>
            <p>
              {siteConfig.name} resolves publicly available media from a link you provide and serves the file to you. It
              does not host a library of content and it does not index anyone&apos;s posts.
            </p>
          </section>

          <section>
            <h2>Your responsibilities</h2>
            <ul>
              <li>Use the tools only for content that is publicly available.</li>
              <li>Respect the copyright and other rights of the people who made the content.</li>
              <li>Get permission before republishing, editing or monetizing someone else&apos;s work.</li>
              <li>Follow the terms of the platform the content came from.</li>
              <li>Do not use the service to harass anyone or to redistribute material at scale.</li>
            </ul>
          </section>

          <section>
            <h2>What is not allowed</h2>
            <p>
              Automated bulk requests, attempts to work around rate limits, and use of the service as a backend for
              another product are not permitted. Access may be limited or blocked when the service is being abused.
            </p>
          </section>

          <section>
            <h2>No guarantee</h2>
            <p>
              Platforms change how they serve media without notice, so a link that worked yesterday may not work today.
              The service is provided as it is, with no promise of availability, completeness or fitness for a particular
              purpose.
            </p>
          </section>

          <section>
            <h2>Trademarks and affiliation</h2>
            <p>
              {siteConfig.name} is not affiliated with, endorsed by or connected to Instagram, TikTok, Facebook, Meta or
              ByteDance. Product names and logos belong to their respective owners and are used only to describe what
              each tool works with.
            </p>
          </section>

          <section>
            <h2>Rights holders</h2>
            <p>
              If you hold rights to content and believe the service is being used improperly in relation to it, get in
              touch and the matter will be looked into.
            </p>
          </section>

          <section>
            <h2>Changes</h2>
            <p>These terms may be updated. Continuing to use the service means accepting the current version.</p>
          </section>
        </Prose>
      </div>
    </>
  );
}
