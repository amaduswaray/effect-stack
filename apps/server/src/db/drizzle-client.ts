// ─── drizzle-client.ts ────────────────────────────────────────────────────────
//
// This module wires the drizzle ORM into the Effect dependency injection system.
//
// The key idea: `@effect/sql-drizzle` provides a bridge between drizzle and
// Effect's `SqlClient`. You give it a `SqlClient` (our existing SQLite layer)
// and it gives back a fully functional drizzle `db` object — but with one
// superpower: every drizzle query is *also* an `Effect`.
//
// That means instead of:
//   const rows = await db.select().from(todos)   // Promise-based
//
// You write:
//   const rows = yield* db.select().from(todos)  // Effect-based, typed errors
//
// ─── Architecture ─────────────────────────────────────────────────────────────
//
//   DbLayer (SqliteClient)
//       │
//       │  provides SqlClient
//       ▼
//   DrizzleLive (SqliteDrizzle layer)
//       │
//       │  provides SqliteDrizzle (the drizzle `db` instance)
//       ▼
//   TodoService (yields* SqliteDrizzle to run queries)
//
// ─────────────────────────────────────────────────────────────────────────────

import * as SqliteDrizzleModule from "@effect/sql-drizzle/Sqlite"
import { Layer } from "effect"
import { DbLayer } from "./client.js"

// ─── Re-export the tag ────────────────────────────────────────────────────────
//
// `SqliteDrizzleModule.SqliteDrizzle` is the Effect Context.Tag for the drizzle db.
// Service code does `yield* SqliteDrizzle` to access the db instance.
//
// We re-export it here so the rest of the app imports from one place:
//   import { SqliteDrizzle } from "@server/db/drizzle-client.js"
export { SqliteDrizzle } from "@effect/sql-drizzle/Sqlite"

// ─── DrizzleLive layer ────────────────────────────────────────────────────────
//
// `SqliteDrizzleModule.layer` creates a Layer that:
//   1. Requires `SqlClient` in context — provided by DbLayer below
//   2. Creates a sqlite-proxy drizzle db, patching `QueryPromise.prototype` so
//      every drizzle query is *also* an `Effect` (see internal/patch.ts in sql-drizzle)
//   3. Provides the `SqliteRemoteDatabase` instance under the `SqliteDrizzle` tag
//
// Why `layer` and not `layerWithConfig({ schema })`?
//   The `SqliteDrizzle` context tag holds `SqliteRemoteDatabase` (non-generic).
//   A schema-typed `SqliteRemoteDatabase<typeof schema>` is not assignable to it,
//   so passing schema here causes a type error.
//
//   We don't need it anyway: the relational `db.query.*` API requires schema
//   registration, but we use `db.select().from(todos)` / `db.insert(todos)` etc.
//   Those builder-style queries are typed by the table object imported from
//   schema.ts at the call-site — no client-level registration needed.
//
// `Layer.provide(DbLayer)` satisfies the `SqlClient` requirement, so callers
// only need to provide `DrizzleLive` — not DbLayer separately.
export const DrizzleLive = SqliteDrizzleModule.layer.pipe(Layer.provide(DbLayer))
