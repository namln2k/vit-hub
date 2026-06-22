# VIT Hub

VIT Hub is a React web application for VIT Volunteers management.

## Project Highlights

- Email/password and Google authentication with Supabase Auth
- User data stored in Supabase Postgres
- Optional avatar uploads through Cloudflare R2
- React 19, Vite, TypeScript, and Tailwind CSS

## Requirements

- Docker Desktop for the recommended local development workflow
- Node.js `24.16.0` for direct host-machine development
- npm `11.6.2` for direct host-machine development
- A Supabase project with Auth and Postgres enabled
- Optional Cloudflare R2 bucket for avatar uploads
- A modern browser such as Chrome, Edge, Firefox, or Safari

## Setup

1. Create a local environment file:

   ```bash
   cp .env.example .env.local
   ```

2. Set up Supabase. This is required for authentication and users.

   Follow the [Supabase setup guide](docs/supabase-setup.md), then copy the Supabase project URL, publishable key, and service role key into `.env.local`.

   Google One Tap is disabled by default. To enable it, configure the application's origin in
   Google Cloud, then set `NEXT_PUBLIC_GOOGLE_ONE_TAP_ENABLED=true` and
   `NEXT_PUBLIC_GOOGLE_CLIENT_ID`.

3. Set up Cloudflare R2 if avatar uploads are enabled.

   Follow the [Cloudflare setup guide](docs/cloudflare-setup.md), then set the server-only R2
   values from `.env.example` wherever the Next.js server runs. Do not expose R2 secrets with the
   `NEXT_PUBLIC_` prefix.

4. Start the development server with Docker Compose:

   ```bash
   docker compose up
   ```

   Open:

   ```text
   http://localhost:3000
   ```

## Direct Host Development

Docker Compose is the recommended workflow for consistent Node.js versions across the team. If you run the app directly on your machine, use the pinned project Node.js version first:

```bash
nvm use
```

On nvm-windows, pass the version explicitly:

```powershell
nvm install 24.16.0
nvm use 24.16.0
```

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

## Scripts

```bash
npm run dev
npm run build
npm run preview
npm run lint
npm run format
npm run format:check
```

## Documentation

- [Supabase setup guide](docs/supabase-setup.md)
- [Cloudflare setup guide](docs/cloudflare-setup.md)

## Deployment

Vercel only supports selecting Node.js major versions, so production deployment uses `24.x` through `package.json#engines.node`. Local development is pinned more strictly through `.nvmrc` and `.node-version`.

Create a production build:

```bash
npm run build
```

The generated files are placed in `dist`. Deploy `dist` to a static hosting provider that supports single-page applications, such as Vercel, Netlify, or Cloudflare Pages.
