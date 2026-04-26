// ─── schema.ts ────────────────────────────────────────────────────────────────
//
// Drizzle schema — the single source of truth for the todos table shape.
//
// Drizzle reads this at compile time to generate fully-typed query builders.
// For example:
//
//   db.select().from(todos)
//   // → Promise<{ id: number; title: string; completed: boolean; createdAt: string }[]>
//
// The column names here use camelCase (`createdAt`). Drizzle's `{ mode: ... }`
// options and the column string arg (`"created_at"`) handle the mapping to the
// real snake_case column names already in the database.
//
// ─────────────────────────────────────────────────────────────────────────────

import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core"

// ─── todos table ──────────────────────────────────────────────────────────────
//
// Mirrors the CREATE TABLE statement in migrations/0001_create_todos.ts.
// If you ever change the real schema (via a new migration), update this too.
export const todos = sqliteTable("todos", {
	// INTEGER PRIMARY KEY AUTOINCREMENT — drizzle infers autoIncrement from this
	id: integer("id").primaryKey({ autoIncrement: true }),

	// TEXT NOT NULL
	title: text("title").notNull(),

	// BOOLEAN NOT NULL DEFAULT 0
	// `mode: "boolean"` tells drizzle to coerce the SQLite integer (0/1) to a JS boolean
	completed: integer("completed", { mode: "boolean" }).notNull().default(false),

	// DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
	// Stored as text in SQLite; we keep it as a string in JS (matching the existing Todo schema)
	// `$defaultFn` runs at query-build time when no value is provided on insert
	createdAt: text("created_at")
		.notNull()
		.$defaultFn(() => new Date().toISOString()),
})

// ─── Inferred types ───────────────────────────────────────────────────────────
//
// `$inferSelect` / `$inferInsert` let you derive TypeScript types directly from
// the table definition — no need to maintain a separate interface.
//
// These are useful when you need plain types outside of drizzle query results.
export type TodoRow = typeof todos.$inferSelect
// e.g. { id: number; title: string; completed: boolean; createdAt: string }

export type NewTodoRow = typeof todos.$inferInsert
// e.g. { id?: number; title: string; completed?: boolean; createdAt?: string }
