# Migration Patterns Reference

Full before/after code examples for every Pages Router → App Router transformation.

---

## 1. getServerSideProps → async Server Component

**Before (pages/products/[id].tsx)**
```tsx
import { GetServerSideProps } from 'next'

type Props = { product: { name: string; price: number } }

export default function ProductPage({ product }: Props) {
  return <div>{product.name} — ${product.price}</div>
}

export const getServerSideProps: GetServerSideProps = async ({ params }) => {
  const res = await fetch(`https://api.example.com/products/${params?.id}`)
  const product = await res.json()
  return { props: { product } }
}
```

**After (app/products/[id]/page.tsx)**
```tsx
type Props = { params: { id: string } }

export default async function ProductPage({ params }: Props) {
  const res = await fetch(`https://api.example.com/products/${params.id}`, {
    cache: 'no-store', // equivalent to getServerSideProps (always fresh)
  })
  const product = await res.json()
  return <div>{product.name} — ${product.price}</div>
}
```

---

## 2. getStaticProps → async Server Component with revalidate

**Before (pages/blog/[slug].tsx)**
```tsx
export const getStaticProps = async ({ params }) => {
  const post = await fetchPost(params.slug)
  return { props: { post }, revalidate: 60 }
}
```

**After (app/blog/[slug]/page.tsx)**
```tsx
export default async function BlogPost({ params }: { params: { slug: string } }) {
  const res = await fetch(`https://api.example.com/posts/${params.slug}`, {
    next: { revalidate: 60 }, // ISR equivalent
  })
  const post = await res.json()
  return <article>{post.content}</article>
}
```

---

## 3. getStaticPaths → generateStaticParams

**Before**
```tsx
export async function getStaticPaths() {
  const posts = await fetchAllPosts()
  return {
    paths: posts.map(p => ({ params: { slug: p.slug } })),
    fallback: 'blocking',
  }
}
```

**After**
```tsx
export async function generateStaticParams() {
  const posts = await fetchAllPosts()
  return posts.map(p => ({ slug: p.slug }))
}
// fallback 'blocking' → dynamicParams = true (default)
// fallback false → export const dynamicParams = false
```

---

## 4. next/router → next/navigation

**Before**
```tsx
import { useRouter } from 'next/router'

export default function Page() {
  const router = useRouter()
  const { id } = router.query
  return (
    <button onClick={() => router.push('/home')}>Go Home</button>
  )
}
```

**After**
```tsx
'use client'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'

export default function Page() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const id = searchParams.get('id')
  return (
    <button onClick={() => router.push('/home')}>Go Home</button>
  )
}
```

> Note: `router.query` is gone. Use `params` prop for dynamic segments, `useSearchParams()` for query strings.

---

## 5. next/head → metadata export

**Before**
```tsx
import Head from 'next/head'

export default function Page() {
  return (
    <>
      <Head>
        <title>My Page</title>
        <meta name="description" content="Page description" />
        <meta property="og:image" content="/og.png" />
      </Head>
      <main>...</main>
    </>
  )
}
```

**After (static)**
```tsx
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'My Page',
  description: 'Page description',
  openGraph: { images: ['/og.png'] },
}

export default function Page() {
  return <main>...</main>
}
```

**After (dynamic)**
```tsx
export async function generateMetadata({ params }): Promise<Metadata> {
  const product = await fetchProduct(params.id)
  return { title: product.name }
}
```

---

## 6. API Routes

**Before (pages/api/users.ts)**
```ts
import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    res.status(200).json({ users: [] })
  } else if (req.method === 'POST') {
    const data = req.body
    res.status(201).json({ created: true })
  }
}
```

**After (app/api/users/route.ts)**
```ts
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({ users: [] })
}

export async function POST(request: NextRequest) {
  const data = await request.json()
  return NextResponse.json({ created: true }, { status: 201 })
}
```

---

## 7. _app.tsx → app/layout.tsx

**Before (pages/_app.tsx)**
```tsx
import type { AppProps } from 'next/app'
import { ThemeProvider } from 'my-theme-lib'
import '../styles/globals.css'

export default function App({ Component, pageProps }: AppProps) {
  return (
    <ThemeProvider>
      <Component {...pageProps} />
    </ThemeProvider>
  )
}
```

**After: split into layout + client wrapper**

```tsx
// app/providers.tsx  ← "use client" wrapper
'use client'
import { ThemeProvider } from 'my-theme-lib'

export function Providers({ children }: { children: React.ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>
}
```

```tsx
// app/layout.tsx  ← Server Component (no "use client")
import { Providers } from './providers'
import '../styles/globals.css'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
```

---

## 8. Error & Not Found pages

**pages/404.tsx → app/not-found.tsx**
```tsx
// app/not-found.tsx
export default function NotFound() {
  return <h1>404 — Page not found</h1>
}
```

**pages/500.tsx → app/error.tsx**
```tsx
// app/error.tsx
'use client'
import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => { console.error(error) }, [error])
  return (
    <div>
      <h2>Something went wrong</h2>
      <button onClick={reset}>Try again</button>
    </div>
  )
}
```

---

## 9. Middleware

`middleware.ts` at the project root works in both routers. The main change:
- Replace `NextResponse.rewrite(new URL(...))` patterns with App Router-aware paths
- `matcher` config still works the same way

No migration needed unless the middleware references `pages/` paths directly.
