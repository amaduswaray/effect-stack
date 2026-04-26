import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import path from "path"
import { defineConfig } from "vite"
// TanStackRouterVite watches src/routes/** and auto-generates
// src/routeTree.gen.ts every time you add, rename, or remove a route file.
// You never edit routeTree.gen.ts by hand — treat it like a build artifact.
import tanstackRouter from "@tanstack/router-plugin/vite"

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    // ↓ Must come BEFORE the React plugin so the route tree is ready
    //   before React starts transforming JSX.
    tanstackRouter({
      // The directory Vite watches for route files.
      // File name → URL path mapping rules:
      //   __root.tsx        → the invisible wrapper around every route
      //   index.tsx         → /
      //   learn.tsx         → /learn
      //   posts/$postId.tsx → /posts/:postId  ($ = dynamic segment)
      //   _layout.tsx       → a pathless layout (no URL segment added)
      routesDirectory: "./src/routes",
      // Where the generated file lands. Import it in main.tsx.
      generatedRouteTree: "./src/routeTree.gen.ts",
    }),
    react({
      babel: {
        plugins: [["babel-plugin-react-compiler"]],
      },
    }),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      "@shared": path.resolve(__dirname, "../../packages/shared/src"),
      "@client": path.resolve(__dirname, "./src"),
    },
  },
})
