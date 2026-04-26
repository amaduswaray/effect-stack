// ─── index.tsx ────────────────────────────────────────────────────────────────
//
// The filename `index.tsx` maps to the root URL `/` in TanStack Router's
// file-based routing convention — exactly like index.html in a web server.
//
// File → URL mapping examples:
//   src/routes/index.tsx          →  /
//   src/routes/learn.tsx          →  /learn
//   src/routes/posts/index.tsx    →  /posts
//   src/routes/posts/$id.tsx      →  /posts/:id
//
// This file is intentionally thin. All the real Todo app logic lives in
// App.tsx — we just mount it here so the router can control when it renders.
// ─────────────────────────────────────────────────────────────────────────────

import { createFileRoute } from "@tanstack/react-router"
import App from "../App.js"

// ─── Route definition ─────────────────────────────────────────────────────────
//
// `createFileRoute` is the file-based routing API. You pass the *exact* path
// string that matches the file's location in the routes directory. The Vite
// plugin validates this at build time — if the path doesn't match the file
// location, TypeScript will complain.
//
// Options you can add here:
//   loader:      () => fetch(...)   — load data before the component renders
//   beforeLoad:  () => redirect()  — auth guards, redirects
//   validateSearch: Schema         — type-safe URL search params
export const Route = createFileRoute("/")({
	component: App,
})
