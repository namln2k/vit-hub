# VIT Hub

VIT Hub is a React web application for VIT Volunteers management.

## Project Highlights

- Email/password authentication with Firebase Authentication
- User profile data stored in Cloud Firestore
- Optional avatar uploads through Cloudflare R2
- React 19, Vite, TypeScript, and Tailwind CSS

## Requirements

- Node.js `20.19.0+` or `22.12.0+`
- npm `10+`
- A Firebase project with Authentication and Firestore enabled
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

3. Set up Firebase. This is required for authentication and user profiles.

   Follow the [Firebase setup guide](docs/firebase-setup.md), then copy the Firebase Web App config values into `.env`.

4. Set up Cloudflare R2 if avatar uploads are enabled.

   Follow the [Cloudflare setup guide](docs/cloudflare-setup.md), then add the server-only R2 values wherever `/api/avatars/presign` runs. Do not expose R2 secrets with the `VITE_` prefix.

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

- [Firebase setup guide](docs/firebase-setup.md)
- [Cloudflare setup guide](docs/cloudflare-setup.md)

## Deployment

Create a production build:

```bash
npm run build
```

The generated files are placed in `dist`. Deploy `dist` to a static hosting provider that supports single-page applications, such as Firebase Hosting, Vercel, Netlify, or Cloudflare Pages.
