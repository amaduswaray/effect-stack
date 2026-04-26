// ─── TodoService.ts ───────────────────────────────────────────────────────────
//
// The Todo domain service — provides CRUD operations backed by SQLite via
// drizzle ORM.
//
// ─── Why drizzle? ─────────────────────────────────────────────────────────────
//
// The previous version used `@effect/sql` tagged template queries:
//   sql<Todo>`SELECT * FROM todos ORDER BY created_at DESC`
//
// Drizzle gives us a type-safe query builder instead:
//   db.select().from(todos).orderBy(desc(todos.createdAt))
//
// Benefits:
//   - Column names are compiler-checked (typos are type errors)
//   - Results are typed by the schema — no manual `Schema.decodeUnknown` needed
//     for the row shape (we still decode into our domain `Todo` type below)
//   - Queries compose as plain JS objects, making them easier to extend
//
// ─── Error handling ───────────────────────────────────────────────────────────
//
// `@effect/sql-drizzle` patches drizzle's `QueryPromise.prototype` so that
// every query is also an `Effect<T, SqlError>`. We catch `SqlError` and map
// it to our domain error type with `handleSqlError`.
//
// ─────────────────────────────────────────────────────────────────────────────

import * as BunFileSystem from "@effect/platform-bun/BunFileSystem"
import type { SqlError } from "@effect/sql/SqlError"
import { SqliteDrizzle, DrizzleLive } from "@server/db/drizzle-client.js"
import { MigrationsLayer, MigrationsLive } from "@server/db/migrations.js"
import { todos } from "@server/db/schema.js"
import { Todo } from "@shared/types/Todo.js"
import type { TodoId } from "@shared/types/TodoId.js"
import { TodoNotFoundError, TodoValidationError, UnknownTodoServiceError } from "@shared/types/TodoServiceError.js"
import { desc, eq } from "drizzle-orm"
import { DateTime, Effect, Layer, Option, Schema } from "effect"

// ─── Error helpers ────────────────────────────────────────────────────────────

/**
 * Catch `SqlError` (the typed error drizzle queries surface) and convert it to
 * our domain `UnknownTodoServiceError`. This keeps service method signatures
 * free of `SqlError`.
 */
const handleSqlError = <A, E>(effect: Effect.Effect<A, SqlError | E>) =>
	effect.pipe(
		Effect.catchTag("SqlError", (error) =>
			UnknownTodoServiceError.make({
				message: (error as { message?: string }).message ?? "Database operation failed",
			}),
		),
	)

/**
 * Drizzle row → domain `Todo`.
 *
 * The drizzle row already has JS-typed fields (`boolean`, `string`, etc.) thanks
 * to the `mode: "boolean"` column option in schema.ts. We still validate and
 * transform through `Todo` to apply any domain-level checks (e.g. branded types,
 * DateTime parsing).
 */
const decodeTodoRow = (row: typeof todos.$inferSelect): Effect.Effect<Todo, TodoValidationError> =>
	Schema.decodeUnknown(Todo)({
		id: row.id,
		title: row.title,
		completed: row.completed,
		createdAt: row.createdAt,
	}).pipe(
		Effect.mapError((error) =>
			TodoValidationError.make({
				message: String(error.message ?? "Validation failed"),
			}),
		),
	)

const decodeTodoRows = (rows: (typeof todos.$inferSelect)[]): Effect.Effect<readonly Todo[], TodoValidationError> =>
	Effect.all(rows.map(decodeTodoRow))

/**
 * SQLite-backed Todo service using drizzle ORM + Effect.
 *
 * **Available Layers:**
 * - `TodoService.Default` — SQLite production implementation.
 *   Requires {@link MigrationsLayer} and {@link BunFileSystem.layer}.
 *
 * - `TodoService.TestLayer` — in-memory implementation for unit tests.
 *   Fresh array storage per test, no DB setup overhead.
 */
export class TodoService extends Effect.Service<TodoService>()("TodoService", {
	accessors: true,
	// ─── Dependencies ──────────────────────────────────────────────────────────
	//
	// `DrizzleLive` transitively provides:
	//   DbLayer (SqliteClient) → SqlClient → DrizzleLive (SqliteDrizzle)
	//
	// `MigrationsLive` runs schema migrations on startup (also depends on DbLayer
	// internally, but Layer deduplicates shared dependencies via MemoMap).
	dependencies: [DrizzleLive, MigrationsLive],
	scoped: Effect.gen(function* () {
		// Yield the drizzle db instance from context.
		// Thanks to the sql-drizzle patch, every method on `db` returns an Effect.
		const db = yield* SqliteDrizzle

		return {
			/**
			 * Get all todos ordered by creation date (newest first).
			 * Secondary sort by id DESC for consistent ordering when timestamps match.
			 */
			getTodos: () =>
				// db.select().from(todos) → Effect<{ id, title, completed, createdAt }[], SqlError>
				db
					.select()
					.from(todos)
					.orderBy(desc(todos.createdAt), desc(todos.id))
					.pipe(handleSqlError, Effect.flatMap(decodeTodoRows)),

			/**
			 * Create a new todo with the given title.
			 * Returns the persisted todo with its generated id and timestamp.
			 */
			addTodo: (title: string) =>
				Effect.gen(function* () {
					// INSERT INTO todos (title, completed) VALUES (?, false) RETURNING *
					// `createdAt.$defaultFn` in schema.ts runs here to fill in the timestamp.
					const rows = yield* db.insert(todos).values({ title, completed: false }).returning().pipe(handleSqlError)

					const row = rows[0]
					if (!row) {
						return yield* UnknownTodoServiceError.make({ message: "Insert returned no rows" })
					}

					return yield* decodeTodoRow(row)
				}),

			/**
			 * Toggle the completion status of a todo by ID.
			 * Fails with `TodoNotFoundError` if the ID doesn't exist.
			 */
			toggleTodo: (id: TodoId) =>
				Effect.gen(function* () {
					// SQLite doesn't support `SET completed = NOT completed` portably in
					// drizzle's type-safe API, so we fetch first, then update.
					//
					// Alternatively you could use `sql` tagged template for the NOT trick,
					// but keeping it in drizzle's builder keeps everything type-checked.
					const existing = yield* db.select().from(todos).where(eq(todos.id, id)).pipe(handleSqlError)

					const current = Option.fromNullable(existing[0])

					const todo = yield* Option.match(current, {
						onNone: () => TodoNotFoundError.make({ id }),
						onSome: Effect.succeed,
					})

					const updated = yield* db
						.update(todos)
						.set({ completed: !todo.completed })
						.where(eq(todos.id, id))
						.returning()
						.pipe(handleSqlError)

					const updatedRow = updated[0]
					if (!updatedRow) {
						return yield* UnknownTodoServiceError.make({ message: "Update returned no rows" })
					}

					return yield* decodeTodoRow(updatedRow)
				}),

			/**
			 * Delete a todo by ID.
			 * Returns the deleted ID, or fails with `TodoNotFoundError` if not found.
			 */
			deleteTodo: (id: TodoId) =>
				Effect.gen(function* () {
					// Check existence before deleting so we can return a typed error
					const existing = yield* db.select().from(todos).where(eq(todos.id, id)).pipe(handleSqlError)

					if (existing.length === 0) {
						return yield* TodoNotFoundError.make({ id })
					}

					yield* db.delete(todos).where(eq(todos.id, id)).pipe(handleSqlError)

					return id
				}),
		} as const
	}),
}) {
	/**
	 * In-memory test implementation — no database, no migrations, no file system.
	 * Fresh array storage created per test for full isolation.
	 */
	static readonly TestLayer = Layer.effect(
		TodoService,
		Effect.sync(() => {
			let idCounter = 0
			const store: Todo[] = []

			const addTodo = (title: string) =>
				Effect.sync(() => {
					const newTodo = Todo.make({
						id: idCounter++ as TodoId,
						title,
						completed: false,
						createdAt: DateTime.unsafeMake(new Date().toISOString()),
					})
					store.push(newTodo)
					return newTodo
				})

			const getTodos = () => Effect.sync(() => [...store].reverse() as readonly Todo[])

			const toggleTodo = (id: TodoId) =>
				Effect.gen(function* () {
					const index = store.findIndex((t) => t.id === id)
					if (index === -1) return yield* TodoNotFoundError.make({ id })
					const t = store[index]
					const updated = Todo.make({ id: t.id, title: t.title, completed: !t.completed, createdAt: t.createdAt })
					store[index] = updated
					return updated
				})

			const deleteTodo = (id: TodoId) =>
				Effect.gen(function* () {
					const index = store.findIndex((t) => t.id === id)
					if (index === -1) return yield* TodoNotFoundError.make({ id })
					store.splice(index, 1)
					return id
				})

			return TodoService.make({ addTodo, getTodos, toggleTodo, deleteTodo })
		}),
	)
}
