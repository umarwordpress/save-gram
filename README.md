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
Two implementations ship.

**yt-dlp (default).** `YtDlpResolver` runs the `yt-dlp` binary as a subprocess.
yt-dlp is actively maintained and tracks these platforms as they change, which
is why it is the default. It needs a real Node server with the binary on PATH
and **will not work on a serverless platform** such as Vercel functions. Use a
VPS, a container, Render, Railway or Fly.

```bash
brew install yt-dlp      # macOS
pipx install yt-dlp      # Linux
```

**HTTP.** `HttpMediaResolver` POSTs `{ platform, url }` to
`SAVEGRAM_RESOLVER_ENDPOINT` and expects a `ResolverResult` back:

```json
{
  "title": "Sunset timelapse",
  "author": "Test Creator",
  "thumbnailUrl": "https://scontent.cdninstagram.com/v/thumb.jpg",
  "durationSeconds": 21,
  "media": [
    { "kind": "video", "url": "https://...mp4", "height": 1080, "sizeBytes": 4200000 }
  ]
}
```

Select one with `SAVEGRAM_RESOLVER`, or implement `MediaResolver` yourself and
pass it to `setDefaultResolver()`.

### Platform status

Verified against live public posts:

| Platform | Works without login | Notes |
| --- | --- | --- |
| TikTok | yes | Streamed through yt-dlp, see below |
| Facebook | yes | HD and SD renditions both offered |
| Instagram | **no** | Requires a cookie file, see below |

**Instagram needs a signed in session.** It answers anonymous requests for reel
media with an empty response, so the tool returns a clear error until
`SAVEGRAM_YTDLP_COOKIES_INSTAGRAM` points at a Netscape format cookie file.
Exporting session cookies puts that account at risk of being rate limited or
disabled, so use a throwaway account rather than a personal one, and never
commit the file.

**Only complete files are offered.** Some renditions are published as video
without an audio track and would need muxing with ffmpeg. Those are filtered
out rather than served as silent video, which is why a 1080p option is sometimes
absent when only a 720p one is listed.

### Two download strategies

`MediaAsset.streamVia` decides how the bytes are fetched:

- `direct` fetches the CDN URL from this server. Used for Facebook.
- `upstream` has the resolver stream the file. Required for TikTok, whose CDN
  ties media links to the challenge cookie held by the session that extracted
  them. A fresh request from this server gets a 403 whatever headers it sends,
  which was verified against the live CDN.

A provider picks its default by overriding `streamStrategy()`. Neither path
buffers the file in memory or writes it to disk.

## Security notes

Resolver responses are untrusted input, since they decide what URLs this server
will fetch. Two independent checks apply:

- At resolve time, any asset whose host is not on the platform's CDN allowlist is
  dropped before it can reach the client. This applies to `direct` assets, whose
  URLs this server fetches; `upstream` assets are streamed by the resolver and
  their CDN URLs are never fetched here.
- At download time, the same check runs again on the URL inside the signed token,
  so a valid signature alone is not enough to make the server fetch something.

Both reject non https URLs, private and link local addresses, and hosts that only
look like a CDN by suffix, such as `cdninstagram.com.attacker.example`.

yt-dlp is invoked with `spawn` and an argument array, never through a shell, and
the post URL is passed after `--` as its own element. A crafted URL cannot become
another argument or a command, and it has already passed the tool's own host and
path validation before it gets that far.

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
