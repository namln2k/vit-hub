# VIT Hub

VIT Hub is a Next.js application for VIT Volunteers management.

## Requirements

- Node.js 24
- npm 11
- Docker for container development
- Supabase Auth and Postgres
- Optional Cloudflare R2 media storage

## Setup

Create both credential profiles:

```bash
cp .env.example .env
cp .env.local.example .env.local
```

Fill `.env` with hosted production credentials and `.env.local` with credentials reported by:

```bash
npx supabase status
```

See [Environment Profiles](docs/environment-profiles.md) for the complete configuration matrix.

## Run

```bash
# Host Node.js + local Supabase
npm run dev

# Host Node.js + hosted Supabase
npm run dev:production

# Docker + local Supabase
npm run docker:local

# Docker + hosted Supabase
npm run docker:production
```

Validate configuration:

```bash
npm run env:check
```

## Sync production data to local

Use this when local Supabase should mirror the hosted production database data:

```bash
npx supabase start
npx supabase link --project-ref lausvdwsgrlhzpbpthxg
npx supabase db dump --linked --data-only --file supabase/seed.sql
npx supabase db reset --local
```

`supabase db pull` only pulls schema, not data. The reset command wipes the local database, runs
local migrations, then loads `supabase/seed.sql` through the seed configuration in
`supabase/config.toml`.

Do not commit a freshly dumped `supabase/seed.sql` if it contains production user/session data.
Check `git status` before committing.

## Quality gates

GitHub Actions runs these checks for pull requests targeting `main` and again after changes
are merged into `main`:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

After a successful push-to-`main` check, the workflow triggers the configured Vercel deploy
hook. Commits authored by `namln2k` retain the existing deploy-hook exclusion.

## Documentation

- [Environment profiles](docs/environment-profiles.md)
- [Supabase setup](docs/supabase-setup.md)
- [Cloudflare R2 setup](docs/cloudflare-setup.md)
- [Server architecture plan](docs/plan-refactor-API-for-native-mobile-app.md)

## Deployment

Vercel reads environment variables from project settings. Configure the variables listed in
`.env.example`; do not upload `.env` or `.env.local`.
