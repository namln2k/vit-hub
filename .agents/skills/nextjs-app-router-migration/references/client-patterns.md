# Client Component Patterns in App Router

How to handle context providers, hooks, and client-only libraries.

---

## The Golden Rule

> Keep Server Components as high as possible. Push `"use client"` as low/deep as possible.

Marking a component `"use client"` makes it and **all its children** client-rendered. This is why providers should be isolated in a thin wrapper rather than placed directly in `layout.tsx`.

---

## Pattern 1: Context Providers

Extract every provider into a dedicated `"use client"` wrapper:

```tsx
// app/providers.tsx
'use client'
import { SessionProvider } from 'next-auth/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from 'next-themes'
import { useState } from 'react'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient())
  return (
    <SessionProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider attribute="class">
          {children}
        </ThemeProvider>
      </QueryClientProvider>
    </SessionProvider>
  )
}
```

```tsx
// app/layout.tsx  (Server Component — no "use client")
import { Providers } from './providers'

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

## Pattern 2: Mixing Server and Client in the same route

Pass server-fetched data as props to a client component:

```tsx
// app/dashboard/page.tsx  (Server Component)
import { DashboardClient } from './dashboard-client'

export default async function DashboardPage() {
  const data = await fetchDashboardData() // server-only fetch
  return <DashboardClient initialData={data} />
}
```

```tsx
// app/dashboard/dashboard-client.tsx
'use client'
import { useState } from 'react'

export function DashboardClient({ initialData }) {
  const [data, setData] = useState(initialData)
  // interactive logic here
  return <div>...</div>
}
```

---

## Pattern 3: useSearchParams must be wrapped in Suspense

`useSearchParams()` opts the component into client rendering. Next.js requires it to be inside `<Suspense>`:

```tsx
// app/search/page.tsx
import { Suspense } from 'react'
import { SearchResults } from './search-results'

export default function SearchPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SearchResults />
    </Suspense>
  )
}
```

```tsx
// app/search/search-results.tsx
'use client'
import { useSearchParams } from 'next/navigation'

export function SearchResults() {
  const searchParams = useSearchParams()
  const query = searchParams.get('q')
  // ...
}
```

---

## Pattern 4: Third-party libraries that don't support Server Components

Some libraries (Framer Motion, Recharts, Lottie, etc.) require a client context.
Wrap them:

```tsx
// components/motion-div.tsx
'use client'
import { motion } from 'framer-motion'
export { motion }
```

Then import from your wrapper instead of directly from the library.

---

## Pattern 5: Browser-only code (localStorage, window, document)

**Option A**: Guard inline
```tsx
'use client'
import { useEffect, useState } from 'react'

export function ThemeToggle() {
  const [theme, setTheme] = useState('light')
  useEffect(() => {
    setTheme(localStorage.getItem('theme') ?? 'light')
  }, [])
  // ...
}
```

**Option B**: Dynamic import with `ssr: false`
```tsx
import dynamic from 'next/dynamic'
const HeavyClientComponent = dynamic(() => import('./heavy-client'), { ssr: false })
```

---

## Pattern 6: Auth (NextAuth / Clerk / Auth0)

**NextAuth v4 → v5 (App Router)**

```tsx
// app/providers.tsx
'use client'
import { SessionProvider } from 'next-auth/react'

export function AuthProvider({ children, session }) {
  return <SessionProvider session={session}>{children}</SessionProvider>
}
```

For protected pages, use `auth()` from `next-auth` directly in Server Components:
```tsx
import { auth } from '@/auth'
import { redirect } from 'next/navigation'

export default async function ProtectedPage() {
  const session = await auth()
  if (!session) redirect('/login')
  return <div>Welcome {session.user.name}</div>
}
```

---

## Checklist before marking something "use client"

- [ ] Does it use `useState`, `useReducer`, `useEffect`, `useRef`, `useContext`?
- [ ] Does it use browser APIs (`window`, `document`, `localStorage`)?
- [ ] Does it attach event listeners (`onClick`, `onChange`, `onSubmit`)?
- [ ] Does it use `useRouter`, `usePathname`, or `useSearchParams`?
- [ ] Does it import a library that isn't Server Component compatible?

If **none** of the above → keep it a Server Component.
