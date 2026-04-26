// ─── __root.tsx ───────────────────────────────────────────────────────────────
//
// The double-underscore prefix is a TanStack Router convention meaning
// "root route". This file defines the layout that wraps EVERY page in the app.
//
// Think of it like a Next.js layout.tsx or a React Router <Outlet /> shell.
// Every other route file is rendered *inside* the <Outlet /> here.
//
// URL mapping: __root.tsx has no URL of its own — it is purely structural.
// ─────────────────────────────────────────────────────────────────────────────

import { RegistryProvider } from "@effect-atom/atom-react"
import { createRootRoute, Link, Outlet } from "@tanstack/react-router"

// ─── Route definition ─────────────────────────────────────────────────────────
//
// `createRootRoute` tells the router "this is the top of the tree".
// The `component` prop is the React component that renders the layout.
//
// Every other route uses `createRoute({ getParentRoute: () => rootRoute })`
// or (in file-based routing) is implicitly a child of this root.
export const Route = createRootRoute({
  component: RootLayout,
})

// ─── Nav link styles ──────────────────────────────────────────────────────────
//
// TanStack Router's <Link> is type-safe: the `to` prop only accepts paths
// that actually exist in your routeTree. A typo like `to="/lear"` would be
// a TypeScript error — no runtime 404 surprises.
//
// `[data-status="active"]` is a data attribute TanStack Router adds
// automatically to <Link> when the current URL matches `to`. We use it
// to style the active nav item without any extra state.
const navLinkClass =
  "text-sm font-medium text-neutral-400 transition-colors hover:text-neutral-100 " +
  "[&[data-status=active]]:text-neutral-100 [&[data-status=active]]:underline underline-offset-4"

function RootLayout() {
  return (
    // Full-page dark shell — shared by every route
    <RegistryProvider defaultIdleTTL={60_000}>

      <div className="min-h-screen bg-neutral-950 text-neutral-100">
        {/* ── Navigation bar ─────────────────────────────────────────────── */}
        {/*                                                                   */}
        {/* Sits at the top of every page. Routes rendered below via Outlet  */}
        <nav className="border-b border-neutral-800 px-8 py-4">
          <div className="max-w-2xl mx-auto flex items-center gap-6">
            <span className="text-sm font-semibold text-neutral-500 mr-2">effect-stack</span>

            {/* `to="/"` → index.tsx (the Todo app) */}
            <Link to="/" className={navLinkClass}>
              Todos
            </Link>

            {/* `to="/learn"` → learn.tsx (the Effect-TS walkthrough) */}
            <Link to="/learn" className={navLinkClass}>
              Learn Effect
            </Link>
          </div>
        </nav>

        {/* ── Outlet ─────────────────────────────────────────────────────── */}
        {/*                                                                   */}
        {/* <Outlet /> is where the matched child route renders.              */}
        {/* When the URL is `/`  → index.tsx renders here.                   */}
        {/* When the URL is `/learn` → learn.tsx renders here.               */}
        {/* The nav bar above never re-mounts — only the Outlet swaps.       */}
        <Outlet />
      </div>
    </RegistryProvider>
  )
}
