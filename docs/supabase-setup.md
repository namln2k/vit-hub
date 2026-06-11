# Supabase Setup Guide

VIT Hub uses Supabase Auth for email/password and Google accounts, and a `user` table in Supabase Postgres for user data.

## Create Supabase Resources

1. Create a Supabase project at <https://supabase.com/dashboard>.
2. Open `Project Settings` -> `API` and copy the project URL.
3. Open `Project Settings` -> `API Keys` and copy a publishable key. A legacy anon key also works, but a publishable key is preferred for browser clients.
4. Enable the Email provider in `Authentication` -> `Providers` -> `Email`.
5. Enable the Google provider in `Authentication` -> `Providers` -> `Google` if Google login is needed.
6. Create the `user` table and policies required by the app.

## Environment Variables

Create a `.env.local` file in the project root:

```bash
cp .env.example .env.local
```

Fill in the Supabase values:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your-key
NEXT_PUBLIC_APP_ORIGIN=http://localhost:3000
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_your-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

For local Supabase while the app runs in Docker, keep the public URL reachable from your browser and set the server-side URL reachable from the app container:

```env
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_INTERNAL_URL=http://host.docker.internal:54321
```

The avatar and registration APIs validate users and write pending signup users server-side.
Wherever `/api/avatars/presign` and `/api/auth/register` run, provide:

```env
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_your-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

If you are using a legacy anon key, `SUPABASE_ANON_KEY` can replace `SUPABASE_PUBLISHABLE_KEY`.
Do not put the service role key in frontend `NEXT_PUBLIC_*` variables.
Only the `NEXT_PUBLIC_SUPABASE_*` values are intended for the browser. Keep `SUPABASE_SERVICE_ROLE_KEY`
and all R2 credentials server-only.

Restart the dev server after changing environment variables.

## Authentication Settings

In `Authentication` -> `URL Configuration`, set the Site URL for each environment:

```text
http://localhost:3000
https://vithub-soict.vercel.app
```

Add redirect URLs for the routes used by the app:

```text
http://localhost:3000/auth/callback
http://localhost:3000/login
https://vithub-soict.vercel.app/auth/callback
https://vithub-soict.vercel.app/login
```

For Google login, create OAuth credentials in Google Cloud, then add Supabase's callback URL to Google as an authorized redirect URI:

```text
https://your-project-ref.supabase.co/auth/v1/callback
```

Copy the Google client ID and client secret into the Supabase Google provider settings.

For local Supabase, Google Cloud also needs the local Supabase callback URL:

```text
http://127.0.0.1:54321/auth/v1/callback
```

## Required Services

- Supabase Auth: email/password accounts and optional Google accounts
- Supabase Postgres: `public.user` table for user data
- Row Level Security: enabled on `public.user`
- Optional Cloudflare R2: avatar object storage

## Common Issues

### Supabase config is missing

Confirm that `.env.local` exists and has `NEXT_PUBLIC_SUPABASE_URL` plus `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Restart the dev server after changing environment variables.
For API routes, also confirm `SUPABASE_URL`, either `SUPABASE_PUBLISHABLE_KEY` or `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` are configured wherever the server route runs.

### Register fails with permission errors

Check that `public.user` exists, RLS is enabled, and the authenticated role has `select`, `insert`, and `update` grants. Also confirm the insert and update policies limit writes with `(select auth.uid()) = id`.

### Username checks fail

The app queries `user.username` during registration and when creating Google users. Confirm authenticated users can read `public.user` and that `username` has a unique constraint.

### Email/password login is not available

Enable the Email provider in:

```text
Authentication -> Providers -> Email
```

Hosted Supabase projects may require users to confirm email before signing in, depending on the provider settings.

### Google login is not available

Enable the Google provider in:

```text
Authentication -> Providers -> Google
```

Then confirm the Google OAuth client includes the Supabase callback URL:

```text
https://your-project-ref.supabase.co/auth/v1/callback
```

Also confirm the app redirect URL is allowed in Supabase:

```text
https://vithub-soict.vercel.app/auth/callback
```

### Reset password email is not sent

Check SMTP and email template settings in Supabase Auth. Also check spam folders and use a real email address for end-to-end testing.

### Register fails with `Error sending confirmation email`

This error is returned by Supabase Auth when it cannot hand the confirmation email to your SMTP provider.

Check `Authentication` -> `Logs` -> `Auth` first; the provider error there is usually more specific than the frontend response. Then confirm these SMTP settings in `Authentication` -> `Settings` -> `SMTP Settings`:

- SMTP host is only the hostname, without `https://` or `smtp://`.
- SMTP port matches your provider. Most providers use `587` with STARTTLS, while some use `465` for SSL.
- SMTP username and password/API key are copied from the provider exactly.
- Sender email is a verified sender or belongs to a verified sending domain.
- SPF, DKIM, and DMARC are configured for the sending domain if the provider requires domain verification.
- The confirmation email template still contains `{{ .ConfirmationURL }}`.

After saving SMTP changes, create a new test signup with an email address that has not already registered.
