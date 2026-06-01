# VIT Hub

VIT Hub is a React web application for VIT Volunteers management.

## Project Highlights

- Email/password and Google authentication with Supabase Auth
- User data stored in Supabase Postgres
- Optional avatar uploads through Cloudflare R2
- React 19, Vite, TypeScript, and Tailwind CSS

## Requirements

- Node.js `20.19.0+` or `22.12.0+`
- npm `10+`
- A Supabase project with Auth and Postgres enabled
- Optional Cloudflare R2 bucket for avatar uploads
- A modern browser such as Chrome, Edge, Firefox, or Safari

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create a local environment file:

   ```bash
   cp .env.example .env
   ```

3. Set up Supabase. This is required for authentication and users.

   Follow the [Supabase setup guide](docs/supabase-setup.md), then copy the Supabase project URL, publishable key, and service role key into `.env`.

4. Set up Cloudflare R2 if avatar uploads are enabled.

   Follow the [Cloudflare setup guide](docs/cloudflare-setup.md), then set the server-only R2 values from `.env.example` wherever `/api/auth/register` and `/api/avatars/presign` run. Do not expose R2 secrets with the `VITE_` prefix.

5. Start the development server:

   ```bash
   npm run dev
   ```

   Open the local URL printed by Vite, usually:

   ```text
   http://localhost:5173
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

Create a production build:

```bash
npm run build
```

The generated files are placed in `dist`. Deploy `dist` to a static hosting provider that supports single-page applications, such as Vercel, Netlify, or Cloudflare Pages.
