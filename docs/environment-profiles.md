# Environment Profiles

VIT Hub has two credential profiles and two local runtimes. The selected profile is always injected
into `process.env` before Next.js starts, which prevents `.env` and `.env.local` from being mixed by
Next.js environment-file fallback rules.

## Profile files

| File | Purpose | Supabase URL |
| --- | --- | --- |
| `.env` | Production credentials for Vercel-compatible local testing | Hosted HTTPS project URL |
| `.env.local` | Local Supabase credentials | `http://127.0.0.1:54321` |

Create them from the committed templates:

```bash
cp .env.example .env
cp .env.local.example .env.local
```

Both files are ignored by Git. Do not copy production secrets into `.env.local`.

## Commands

| Runtime | Production credentials | Local credentials |
| --- | --- | --- |
| Host Node.js | `npm run dev:production` | `npm run dev` or `npm run dev:local` |
| Docker | `npm run docker:production` | `npm run docker:local` |

Production-equivalent builds can also be checked explicitly:

```bash
npm run build:production
npm run build:local
```

Validate both files without starting the app:

```bash
npm run env:check
```

Extra Next.js or Docker arguments can be appended after `--`:

```bash
npm run dev:local -- --port 3100
npm run docker:local -- --build
```

## Canonical variables

### Supabase

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

The public URL and publishable key are intentionally shared by browser and server modules.
`SUPABASE_SERVICE_ROLE_KEY` is server-only.

The local profile also requires:

```env
SUPABASE_INTERNAL_URL=http://host.docker.internal:54321
```

The browser uses `127.0.0.1`; a Docker app uses `host.docker.internal`. Host Node.js ignores the
internal URL.

### Google

```env
NEXT_PUBLIC_GOOGLE_ONE_TAP_ENABLED=false
NEXT_PUBLIC_GOOGLE_CLIENT_ID=
```

OAuth through Supabase does not require One Tap. Enable One Tap only after the current app origin is
configured in Google Cloud.

Local Supabase can read its Google provider secrets from `.env.local`:

```env
SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID=
SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_SECRET=
```

### Cloudflare R2

R2 credentials and upload limits are server-only:

```env
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
R2_PUBLIC_BASE_URL=
R2_FREE_TIER_MAX_UPLOAD_BYTES=1048576
R2_POST_IMAGE_MAX_UPLOAD_BYTES=5242880
```

## Vercel

Vercel does not use the local profile files. Add the variables from `.env.example` in the Vercel
project settings for Production and Preview as appropriate.

Do not configure:

- `SUPABASE_INTERNAL_URL`
- `DOCKER_CONTAINER`
- legacy `VITE_*`, `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, or
  `NEXT_PUBLIC_APP_ORIGIN` variables

Redirect origins are derived from the incoming request or browser location, so production and
preview deployments do not require an app-origin variable.

Remember that `NEXT_PUBLIC_*` values are embedded into browser JavaScript during `next build`.
