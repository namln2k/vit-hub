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

## Quality gates

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

## Documentation

- [Environment profiles](docs/environment-profiles.md)
- [Supabase setup](docs/supabase-setup.md)
- [Cloudflare R2 setup](docs/cloudflare-setup.md)
- [Server architecture plan](docs/plan-refactor-API-for-native-mobile-app.md)

## Deployment

Vercel reads environment variables from project settings. Configure the variables listed in
`.env.example`; do not upload `.env` or `.env.local`.
