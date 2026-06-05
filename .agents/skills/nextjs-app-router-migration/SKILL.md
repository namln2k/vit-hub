---
name: nextjs-app-router-migration
description: >
  Migrates a Next.js project from the Pages Router to the App Router.
  Use this skill whenever the user wants to migrate, convert, or upgrade a
  Next.js project from pages/ directory to app/ directory structure, or mentions
  migrating getServerSideProps, getStaticProps, _app.tsx, _document.tsx,
  next/router, or API routes to App Router equivalents. Also trigger when the
  user says "upgrade Next.js routing", "move to app directory", or "convert
  Next.js to server components".
---

# Next.js App Router Migration Skill

Migrate a Next.js Pages Router project to the App Router **incrementally and safely**, file by file.

---

## Phase 0 — Reconnaissance

Before touching any files, build a complete picture of the project.

```bash
# 1. Confirm next.js version (need 13.4+ for stable App Router)
cat package.json | grep next

# 2. Map pages/ structure
find pages -type f | sort

# 3. Detect data-fetching patterns
grep -rl "getServerSideProps\|getStaticProps\|getStaticPaths\|getInitialProps" pages/

# 4. Detect router usage
grep -rl "next/router" pages/ components/ --include="*.tsx" --include="*.ts" --include="*.jsx" --include="*.js"

# 5. Detect next/head usage
grep -rl "next/head" pages/ components/ --include="*.tsx" --include="*.ts"

# 6. Check _app and _document
ls pages/_app* pages/_document* 2>/dev/null

# 7. Check for API routes
find pages/api -type f 2>/dev/null | sort

# 8. Check next.config.js
cat next.config.js 2>/dev/null || cat next.config.ts 2>/dev/null
```

Summarise findings: list every file and which patterns it uses, before doing anything else.

---

## Phase 1 — Project Setup

### 1.1 Upgrade Next.js if needed
```bash
npm install next@latest react@latest react-dom@latest
```

### 1.2 Create the app/ directory
```bash
mkdir -p app
```

### 1.3 Create the root layout (replaces `_app.tsx` + `_document.tsx`)
```tsx
// app/layout.tsx
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'My App',
  description: '...',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
```

Port global styles, providers, and font imports from `_app.tsx` into this layout.
For context providers that use client-side state, wrap them in a `"use client"` component (see `references/client-patterns.md`).

---

## Phase 2 — Migrate Routes (one at a time)

Work through routes **from leaves to root** (deepest nested first, index last).

For each `pages/foo/bar.tsx` → create `app/foo/bar/page.tsx`.

### 2.1 Conversion cheatsheet

| Pages Router | App Router |
|---|---|
| `export default function Page()` | Same — no change needed |
| `getServerSideProps` | `async` Server Component + `fetch(..., { cache: 'no-store' })` |
| `getStaticProps` | `async` Server Component + `fetch(..., { next: { revalidate: N } })` |
| `getStaticPaths` | `export async function generateStaticParams()` |
| `useRouter` (next/router) | `useRouter` from `next/navigation` (must be `"use client"`) |
| `useRouter().query` | `useSearchParams()` or `params` prop (must be `"use client"`) |
| `next/head` | `export const metadata` or `generateMetadata()` |
| `pages/_app.tsx` | `app/layout.tsx` |
| `pages/_document.tsx` | `app/layout.tsx` (html/body tags) |
| `pages/api/foo.ts` | `app/api/foo/route.ts` with named exports `GET`, `POST`, etc. |
| `pages/404.tsx` | `app/not-found.tsx` |
| `pages/500.tsx` | `app/error.tsx` (must be `"use client"`) |
| `pages/_error.tsx` | `app/error.tsx` + `app/global-error.tsx` |

Read `references/patterns.md` for full code examples of each transformation.

### 2.2 Decide: Server Component or Client Component?

Default to **Server Component** (no directive needed). Add `"use client"` only if the component uses:
- React hooks (`useState`, `useEffect`, `useRef`, etc.)
- Browser APIs (`window`, `document`, `localStorage`)
- Event handlers (`onClick`, `onChange`)
- `useRouter`, `usePathname`, `useSearchParams` from `next/navigation`
- Third-party libraries that require client context

**Never** add `"use client"` to a layout unless absolutely necessary — it forces every child to be a client component.

### 2.3 Per-file migration steps

1. Copy the file content into the new `app/.../page.tsx` path
2. Remove `getServerSideProps` / `getStaticProps` exports; inline the data fetching into the component as `async`
3. Replace `next/router` imports with `next/navigation`
4. Replace `<Head>` with `metadata` export or `generateMetadata`
5. Add `"use client"` if needed (see 2.2)
6. Delete the original `pages/` file once the app/ version is working

---

## Phase 3 — Migrate API Routes

For each `pages/api/foo.ts` → create `app/api/foo/route.ts`:

```ts
// app/api/foo/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  return NextResponse.json({ data: '...' })
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  return NextResponse.json({ result: '...' })
}
```

---

## Phase 4 — Special Files

| File | Action |
|---|---|
| `pages/_app.tsx` | Merge into `app/layout.tsx`; providers → `"use client"` wrapper component |
| `pages/_document.tsx` | Merge `<html lang>`, custom fonts, body classes into `app/layout.tsx` |
| `pages/404.tsx` | Rename to `app/not-found.tsx`; remove props |
| `pages/500.tsx` | Rename to `app/error.tsx`; add `"use client"` and `useEffect` reset |

---

## Phase 5 — Validation

```bash
# Type-check
npx tsc --noEmit

# Build
npm run build

# Dev server — visually verify each route
npm run dev
```

Fix errors one by one. Common issues:
- **`useSearchParams()` without Suspense** → wrap the component in `<Suspense>`
- **Async component in Client Component** → move data fetching to a parent Server Component and pass as props
- **`window is not defined`** → add `"use client"` or guard with `typeof window !== 'undefined'`
- **Context provider errors** → extract into a `"use client"` wrapper component

---

## Phase 6 — Cleanup

Once all routes are migrated and the build passes:

```bash
# Remove the pages/ directory (keep pages/api only if not yet migrated)
rm -rf pages/

# Remove next/head if no longer used
npm uninstall @types/... # any now-unused deps
```

Update `next.config.js` — remove any `experimental.appDir: true` flag (it's default in Next.js 13.4+).

---

## Reference Files

- `references/patterns.md` — Full code examples for every transformation pattern
- `references/client-patterns.md` — How to handle providers, hooks, and client-only libs in App Router
