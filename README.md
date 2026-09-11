# SaveGram

A multi tool platform for saving publicly posted social media video. Everything
on the site is generated from a tool registry, so adding a downloader is a
configuration change rather than a rebuild.

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in the resolver endpoint and token secret
npm run dev
```

The app runs without any configuration, but a resolve request will return
`resolver_not_configured` until an extraction backend is set.

## Adding a new tool

Four steps, in this order.

**1. Add the tool configuration.** Copy `src/lib/tools/definitions/_template.ts`,
rename it after the slug, and write real content for the platform. Register it in
`src/lib/tools/registry.ts` by adding an import and one array entry.

**2. Add the provider.** Create a class in
`src/lib/downloader/providers/` that extends `BaseProvider` and sets `id`,
`platform` and `toolId`. Override a hook only when the platform needs it:
`prepareUrl` for short link expansion, `labelFor` for asset names,
`preferenceFor` for ordering, `mediaRequestHeaders` for a Referer. Register it
with one line in `src/lib/downloader/service.ts`, and add the platform's CDN
hosts to `CDN_ALLOWLIST` in `src/lib/downloader/media-validation.ts`.

**3. Add the platform specific content.** The how to steps, features, FAQs,
troubleshooting entries and supported link patterns all live in the config from
step 1. Write them for this platform. Do not copy another tool's page and swap
the name.

**4. Enable it.** Set `status: "live"`.

Nothing else needs editing. The tool then appears automatically in the homepage
picker, the Downloaders menu, `/tools`, the footer, the related tools section of
every other tool page, the sitemap, and its own page at `/tools/<slug>` with its
own title, description, canonical URL, breadcrumbs and structured data.

### Tool status

`status` is the single source of truth for whether a tool is usable. There is no
separate `enabled` flag to fall out of step with it; `isToolEnabled()` derives it.

| Status | Listed | Page | Indexed | Accepts links |
| --- | --- | --- | --- | --- |
| `live` | yes | yes | yes | yes |
| `coming-soon` | yes, badged | yes | no | no |
| `hidden` | no | no | no | no |
| `retired` | no | yes | no | no |

Use `hidden` while building. A tool that does not work must never be listed as
if it does.

## Architecture

```
User URL
  -> normalizeUrl        strip tracking parameters, force https, lowercase host
  -> validateForTool     host check, then path patterns from the tool config
  -> detectTool          registry lookup by host, then by path
  -> DownloaderService   registry says which provider owns the tool
  -> Provider.resolve    prepareUrl, then the resolver
  -> MediaResolver       the swappable extraction backend
  -> media validation    https only, no private hosts, CDN allowlist per platform
  -> download token      HMAC signed, short lived, hides the CDN URL
  -> /api/download       streams the bytes through, nothing touches disk
```

The API route handlers contain no platform specific logic. They call the
service, and the service consults the registry.

### The resolver

Reading media out of a social platform is the one part that architecture cannot
make stable, because none of these platforms publish a download API. That work
sits behind the `MediaResolver` interface in `src/lib/downloader/resolver.ts`.

The shipped implementation, `HttpMediaResolver`, POSTs `{ platform, url }` to the
endpoint in `SAVEGRAM_RESOLVER_ENDPOINT` and expects a `ResolverResult` back:

```json
{
  "title": "Sunset timelapse",
  "author": "Test Creator",
  "authorHandle": "@testcreator",
  "thumbnailUrl": "https://scontent.cdninstagram.com/v/thumb.jpg",
  "durationSeconds": 21,
  "media": [
    {
      "kind": "video",
      "url": "https://scontent.cdninstagram.com/v/reel.mp4",
      "height": 1080,
      "sizeBytes": 4200000,
      "watermarkFree": false
    }
  ]
}
```

Responses are validated before use, and any media URL outside the platform's CDN
allowlist is dropped. To use a different backend, implement `MediaResolver` and
pass it to `setDefaultResolver()`, or inject it into a single provider's
constructor.

## Security notes

Resolver responses are untrusted input, since they decide what URLs this server
will fetch. Two independent checks apply:

- At resolve time, any asset whose host is not on the platform's CDN allowlist is
  dropped before it can reach the client.
- At download time, the same check runs again on the URL inside the signed token,
  so a valid signature alone is not enough to make the server fetch something.

Both reject non https URLs, private and link local addresses, and hosts that only
look like a CDN by suffix, such as `cdninstagram.com.attacker.example`.

`SAVEGRAM_TOKEN_SECRET` must be set in production. The app refuses to issue
download tokens without it rather than falling back to a known development value.

## Content rules

These are enforced by review, not by tooling:

- No em dash characters anywhere in user facing content.
- No keyword stuffing. Use the primary keyword in the H1, the introduction, one
  relevant H2, the metadata and the URL, then write normally.
- No generic marketing filler and no claims the product cannot support. Do not
  call anything the fastest, the best, unlimited or always working.
- Each tool page gets its own words. Structure is shared, content is not.

Check for em dashes before shipping:

```bash
# The pattern is written as an escape so the character itself stays out of the repo.
grep -rn "$(printf '\u2014')" src/ && echo "em dash found" || echo "clean"
```

## Scripts

| Command | Does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm start` | Serve the production build |
| `npm run typecheck` | TypeScript, no emit |
| `npm run lint` | Next lint |
