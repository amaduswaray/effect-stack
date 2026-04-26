import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import "./index.css"

// ─── TanStack Router ──────────────────────────────────────────────────────────
//
// `createRouter` builds a fully type-safe router from the auto-generated
// routeTree. The routeTree.gen.ts file is produced by the TanStackRouterVite
// Vite plugin — every time you save a file inside src/routes/, the plugin
// regenerates it to reflect the current file tree.
//
// Because the tree is generated from filenames, TypeScript knows every valid
// path at compile time. `<Link to="/typo">` would be a type error.
import { RouterProvider, createRouter } from "@tanstack/react-router"
import { routeTree } from "./routeTree.gen.js"

// `createRouter` accepts the routeTree and optional config (defaultPreload,
// scrollRestoration, context etc.). Keeping it simple for now.
const router = createRouter({ routeTree })

// ─── Module augmentation ──────────────────────────────────────────────────────
//
// TanStack Router is fully type-safe via a "Register" interface. Augmenting it
// here tells every hook (useRouter, useParams, useSearch…) about OUR specific
// router instance so they return correctly typed values everywhere in the app.
declare module "@tanstack/react-router" {
	interface Register {
		router: typeof router
	}
}

// ─── Mount ────────────────────────────────────────────────────────────────────
//
// `RouterProvider` replaces the old `<App />` as the root component.
// It sets up the router context so that <Link>, useNavigate, useParams etc.
// work anywhere in the component tree.
createRoot(document.getElementById("root")!).render(
	<StrictMode>
		<RouterProvider router={router} />
	</StrictMode>,
)
