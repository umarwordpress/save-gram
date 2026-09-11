# SaveGram extraction service

A small wrapper around yt-dlp for hosts that cannot run a binary, such as Vercel
functions. The SaveGram app calls it instead of running extraction itself.

It does no format mapping on purpose. `/extract` returns yt-dlp's JSON unchanged
and the app maps it, so the mapping rules live in one place rather than in two
codebases that can drift apart.

## Endpoints

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/health` | none | Liveness probe |
| POST | `/extract` | bearer token | Returns yt-dlp info JSON for a link |
| POST | `/stream` | bearer token | Streams the media back to the caller |
| GET | `/download?token=` | signed link | Streams the media to a visitor's browser |

`/download` is the one a visitor actually reaches. The app signs a short lived
token with the shared secret and redirects the browser here, so the file goes
from this service to the visitor without passing through the app. That keeps
large downloads off hosts that cap response size or function duration.

## Running locally

```bash
cd services/extractor
SAVEGRAM_EXTRACTOR_TOKEN=dev-token \
SAVEGRAM_TOKEN_SECRET=dev-secret-at-least-16-chars \
node server.mjs
```

yt-dlp must be on PATH (`brew install yt-dlp` or `pipx install yt-dlp`).

## Deploying

The Dockerfile installs Python and yt-dlp, and upgrades yt-dlp on each start so
the container keeps working as platforms change without a rebuild.

**Railway or Render:** point the service at this directory, let it detect the
Dockerfile, and set the environment variables from `.env.example`.

**Fly:** `fly launch --dockerfile Dockerfile` from this directory.

Set both secrets to the same values used by the app:

| Service variable | App variable |
| --- | --- |
| `SAVEGRAM_EXTRACTOR_TOKEN` | `SAVEGRAM_EXTRACTOR_TOKEN` |
| `SAVEGRAM_TOKEN_SECRET` | `SAVEGRAM_TOKEN_SECRET` |

## Security

- `/extract` and `/stream` require the bearer token. `/download` requires a
  valid signature instead, since a browser cannot carry a secret.
- Only Instagram, TikTok and Facebook hosts are accepted. yt-dlp supports over a
  thousand sites, and without that list anyone holding the token could use this
  as a general purpose downloader. Add hosts to `ALLOWED_HOSTS` when the app
  gains a tool for a new platform.
- yt-dlp is invoked with an argument array and the URL after `--`, never through
  a shell.
