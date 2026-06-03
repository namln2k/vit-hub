# Cloudflare Setup Guide

VIT Hub can store optional user avatars and post images in Cloudflare R2. During registration, `/api/auth/register` creates the Supabase user, uploads the avatar from the server, and stores `avatar_url` plus `avatar_key` in the user's Supabase row even while email confirmation is pending. Signed-in avatar changes use `/api/avatars/presign` for short-lived direct uploads. Super admin post images use `/api/posts/presign`, upload directly to R2, then store the public image URL in the post content.

## Create The R2 Bucket

1. Open Cloudflare Dashboard.
2. Go to `Storage & databases` -> `R2 Object Storage` -> `Overview`.
3. Create a bucket named `vit-hub`, or use another bucket name and set `R2_BUCKET_NAME` to match it exactly.
4. Choose Standard storage. Do not choose Infrequent Access for avatars.
5. Enable public access using either a custom domain for production or the bucket's public `r2.dev` domain for quick testing.
6. Set `R2_PUBLIC_BASE_URL` to that public origin, without a trailing slash.

Example:

```env
R2_PUBLIC_BASE_URL=https://avatars.example.com
```

Quick testing option:

```env
R2_PUBLIC_BASE_URL=https://pub-your-generated-id.r2.dev
```

Production option:

```env
R2_PUBLIC_BASE_URL=https://avatars.your-domain.com
```

Prefer a custom domain for production if your domain is already on Cloudflare. Cloudflare documents that custom domains can use Cloudflare Cache in front of R2, while the managed `r2.dev` URL is convenient for public development access.

## Create R2 API Credentials

Create an R2 API token with access scoped only to the avatar bucket.

1. In Cloudflare Dashboard, go to `R2 Object Storage`.
2. Open `Manage API Tokens`.
3. Create an API token.
4. Scope it to the bucket named by `R2_BUCKET_NAME`, such as `vit-hub`.
5. Give it object read/write permission. The app needs write permission for uploads and delete permission for replacing old avatars.
6. Copy the generated `Access Key ID` and `Secret Access Key` immediately.

Set:

```env
R2_ACCESS_KEY_ID=the-access-key-id
R2_SECRET_ACCESS_KEY=the-secret-access-key
```

Keep these values only in Vercel environment variables or your VPS server environment.

## Find Your Account ID

In Cloudflare Dashboard, open your account and look for `Account ID` in the right sidebar, or in the R2 overview/API token confirmation screen.

Set:

```env
R2_ACCOUNT_ID=your-cloudflare-account-id
```

## Configure R2 CORS

Add a CORS rule to the same bucket named by `R2_BUCKET_NAME`. The browser uploads to the
private S3-compatible API endpoint for that bucket, so setting CORS on a different bucket will
still fail even if the public `r2.dev` URL works.

1. In Cloudflare Dashboard, go to `Storage & databases` -> `R2 Object Storage` -> `Overview`.
2. Open the bucket from `R2_BUCKET_NAME`, such as `vit-hub`.
3. Open the bucket `Settings` tab.
4. Find `CORS policy` and choose `Add CORS policy` or `Edit CORS policy`.
5. Paste this JSON and save:

```json
[
  {
    "AllowedOrigins": ["http://localhost:5173", "https://your-app.example.com"],
    "AllowedMethods": ["PUT"],
    "AllowedHeaders": ["content-type"],
    "ExposeHeaders": ["etag"],
    "MaxAgeSeconds": 3600
  }
]
```

Replace `https://your-app.example.com` with your Vercel or VPS domain.

For local testing, keep `http://localhost:5173` exactly, with no trailing slash or path. For Vercel preview deployments, add the preview URL if you want avatar uploads to work before production.

If the browser reports `No 'Access-Control-Allow-Origin' header is present` for a URL like
`https://<account-id>.r2.cloudflarestorage.com/<bucket>/avatars/...`, check that the CORS policy is
saved on the `<bucket>` shown in that failing URL and that `AllowedOrigins` contains the exact app
origin shown in the browser error.

## Local End-To-End Test

The Vite dev server serves `api/auth/register.js`, `api/avatars/presign.js`, and `api/posts/presign.js` through a local dev middleware, so uploads can be tested with the normal app server:

```bash
npm run dev
```

Then:

1. Register a new account.
2. Pick a JPG, PNG, or WebP avatar under 1 MB.
3. Confirm the user's `user` row in Supabase contains `avatar_url` and `avatar_key`.
4. Open the R2 bucket and confirm the object exists under `avatars/{uid}/...`.
5. Visit the saved `avatar_url` in a browser and confirm the image loads.
6. As a super admin, create or edit a post, upload a JPG, PNG, or WebP image block, and confirm the object exists under `posts/{uid}/...`.

If upload fails with CORS, check the R2 bucket CORS rule first. If upload fails with an auth or missing environment error, check the server-only environment variables.

If the saved avatar URL returns this XML in a browser:

```xml
<Error>
  <Code>InvalidArgument</Code>
  <Message>Authorization</Message>
</Error>
```

then `R2_PUBLIC_BASE_URL` is pointing at the private S3-compatible API endpoint. Do not use:

```env
R2_PUBLIC_BASE_URL=https://your-account-id.r2.cloudflarestorage.com
```

Use the bucket's public `r2.dev` URL or a custom public domain instead. `R2_PUBLIC_BASE_URL` must be only the public origin, without `/avatars/...` or any other object path.

## Environment Variables

Set these server-only values wherever the API route runs:

```env
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_your-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
R2_ACCOUNT_ID=your-cloudflare-account-id
R2_ACCESS_KEY_ID=your-r2-access-key-id
R2_SECRET_ACCESS_KEY=your-r2-secret-access-key
R2_BUCKET_NAME=vit-hub
R2_PUBLIC_BASE_URL=https://your-public-r2-domain.example.com
R2_FREE_TIER_MAX_UPLOAD_BYTES=1048576
R2_POST_IMAGE_MAX_UPLOAD_BYTES=5242880
```

Do not prefix R2 secrets with `VITE_` or `NEXT_PUBLIC_`. Vite exposes `VITE_*` values to the browser, and public-prefixed variables in frontend frameworks are browser-readable. R2 access keys must stay server-side.

## Free Tier Guardrails

Cloudflare R2 Standard storage includes a monthly free tier of 10 GB-month storage, 1 million Class A operations, 10 million Class B operations, and free Internet egress. Keep the avatar bucket on Standard storage; the free tier does not apply to Infrequent Access storage.

This project keeps avatar usage small by default:

- Avatar uploads are optional.
- Accepted file types are JPG, PNG, and WebP.
- Each avatar is limited to 1 MB by `R2_FREE_TIER_MAX_UPLOAD_BYTES`.
- Each post image is limited to 5 MB by default, or `R2_POST_IMAGE_MAX_UPLOAD_BYTES` when set.
- Upload URLs expire after 60 seconds.
- R2 credentials stay server-side.

With a 1 MB limit, the 10 GB free storage tier can hold roughly 10,000 avatars before image replacements and overhead. Old avatar cleanup is still recommended later if users can update avatars repeatedly.

## Vercel Deployment

Deploying to Vercel can use the included `api/avatars/presign.js` and `api/posts/presign.js` serverless functions.

Set these environment variables in:

```text
Vercel Project -> Settings -> Environment Variables
```

```env
SUPABASE_URL
SUPABASE_PUBLISHABLE_KEY
SUPABASE_SERVICE_ROLE_KEY
R2_ACCOUNT_ID
R2_ACCESS_KEY_ID
R2_SECRET_ACCESS_KEY
R2_BUCKET_NAME
R2_PUBLIC_BASE_URL
R2_FREE_TIER_MAX_UPLOAD_BYTES
R2_POST_IMAGE_MAX_UPLOAD_BYTES
```

Also keep the existing `VITE_SUPABASE_*` values configured for the frontend.

## VPS Deployment

For a VPS, serve the Vite `dist` directory with Nginx or another web server, and run an API service that exposes the same route:

```text
POST /api/auth/register
POST /api/avatars/presign
POST /api/posts/presign
```

The included handler is written with Node's request/response APIs, so it can be reused from a small Node server or adapted into Express/Fastify. Keep the R2 server-only environment variables on the VPS, not in `.env` files served to the browser.

## Supabase Avatar Fields

User rows include:

```sql
avatar_url text
avatar_key text
```

`avatar_url` is used for display. `avatar_key` is kept so avatar replacement can delete the previous R2 object.
