import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { JsonLd } from "@/components/json-ld";
import { Prose } from "@/components/prose";
import { breadcrumbSchema, buildPageMetadata } from "@/lib/seo";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = buildPageMetadata({
  title: "Privacy",
  description:
    "What SaveGram does with the links you paste, what it logs, and what it does not keep. Written plainly.",
  path: "/privacy",
});

const CRUMBS = [
  { name: "Home", href: "/" },
  { name: "Privacy", href: "/privacy" },
];

export default function PrivacyPage() {
  return (
    <>
      <JsonLd data={breadcrumbSchema(CRUMBS)} />
      <div className="mx-auto max-w-content px-4 py-10 sm:px-6 sm:py-14">
        <Breadcrumbs crumbs={CRUMBS} />

        <h1 className="mt-6 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">Privacy</h1>
        <p className="mt-3 max-w-2xl text-base text-ink-soft">
          This page describes what happens to the data involved in using {siteConfig.name}.
        </p>

        <Prose>
          <section>
            <h2>Links you paste</h2>
            <p>
              A link you submit is used to resolve the media you asked for and to serve it back to you. Links are not
              attached to an account, because there are no accounts, and they are not sold or shared for advertising.
            </p>
            <p>
              Tracking parameters that platforms add to shared links, such as igsh or fbclid, are removed before the link
              is used. They are not stored.
            </p>
          </section>

          <section>
            <h2>Files you download</h2>
            <p>
              Media is streamed through the request that delivers it to you. It is not written to disk on the server and
              no copy is kept once the response has finished.
            </p>
          </section>

          <section>
            <h2>Logs</h2>
            <p>
              Standard server logs may record the time of a request, the response status, and technical details such as a
              truncated IP address and a user agent string. These exist to keep the service running and to limit abuse.
              They are kept for a short period and then discarded.
            </p>
          </section>

          <section>
            <h2>Cookies</h2>
            <p>
              The site does not set advertising or tracking cookies and does not use third party analytics that profile
              you across sites.
            </p>
          </section>

          <section>
            <h2>Third parties</h2>
            <p>
              To resolve a link, a request is made to the platform the link belongs to. That platform receives the
              request, as it would for any visit to the same public page. Platform privacy policies apply to what they do
              on their side.
            </p>
          </section>

          <section>
            <h2>Children</h2>
            <p>
              The service is not directed at children and does not knowingly collect information from them.
            </p>
          </section>

          <section>
            <h2>Changes</h2>
            <p>
              If this policy changes in a way that affects how data is handled, the updated version replaces this page.
            </p>
          </section>
        </Prose>
      </div>
    </>
  );
}
