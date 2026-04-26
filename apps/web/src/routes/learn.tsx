// ─── learn.tsx ────────────────────────────────────────────────────────────────
//
// URL: /learn
//
// This page is a documented walkthrough of every major Effect-TS pattern used
// in this codebase. Nothing here is abstract — every section maps directly to
// a real file you can open alongside this one.
//
// Reading order:
//   1. Schema          → packages/shared/src/types/
//   2. Service         → apps/server/src/services/todo-service/TodoService.ts
//   3. Layer           → apps/server/src/server/main.ts
//   4. RPC             → packages/shared/src/rpc/TodoRpcs.ts
//   5. Client atoms    → apps/web/src/rpc/TodoClient.ts + App.tsx
// ─────────────────────────────────────────────────────────────────────────────

import { createFileRoute, Link } from "@tanstack/react-router"

export const Route = createFileRoute("/learn")({
	component: LearnPage,
})

// ─── Small UI helpers ─────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
	return (
		<section className="mb-10">
			<h2 className="text-lg font-semibold text-neutral-100 mb-3 pb-2 border-b border-neutral-800">{title}</h2>
			{children}
		</section>
	)
}

function CodeRef({ path }: { path: string }) {
	return <code className="text-xs bg-neutral-800 text-emerald-400 px-2 py-0.5 rounded font-mono">{path}</code>
}

function Concept({ label, children }: { label: string; children: React.ReactNode }) {
	return (
		<div className="mb-4">
			<span className="inline-block text-xs font-semibold text-sky-400 uppercase tracking-wider mb-1">{label}</span>
			<div className="text-sm text-neutral-300 leading-relaxed">{children}</div>
		</div>
	)
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function LearnPage() {
	return (
		<div className="p-8">
			<div className="max-w-2xl mx-auto">
				{/* Header */}
				<div className="mb-10">
					<h1 className="text-3xl font-semibold text-neutral-100 mb-2">Effect-TS — How this app is built</h1>
					<p className="text-neutral-400 text-sm">
						A bottom-up walkthrough of the patterns used in this codebase. Each concept links to the real file it lives
						in.
					</p>
				</div>

				{/* ── 1. Schema ─────────────────────────────────────────────────────── */}
				{/*                                                                      */}
				{/* Effect's Schema module is the foundation of everything here.         */}
				{/* It replaces Zod/io-ts and does three things at once:                 */}
				{/*   - Runtime validation / parsing   (Schema.decodeUnknown)            */}
				{/*   - TypeScript type inference      (Schema.Type<typeof MySchema>)    */}
				{/*   - Serialisation / deserialisation (used by the RPC layer)          */}
				<Section title="1 · Schema — the single source of truth for types">
					<Concept label="What it is">
						<code className="text-sky-300">Schema</code> from <code className="text-sky-300">effect/Schema</code> lets
						you define a data shape once and get runtime validation AND a TypeScript type from the same definition. No
						duplication.
					</Concept>

					<Concept label="Where to look">
						<ul className="space-y-2 mt-1">
							<li>
								<CodeRef path="packages/shared/src/types/Todo.ts" /> — <code className="text-sky-300">Todo</code> is a{" "}
								<code className="text-sky-300">Schema.Class</code>. The class itself IS the schema; the inferred type is{" "}
								<code className="text-sky-300">Schema.Schema.Type&lt;typeof Todo&gt;</code>.
							</li>
							<li>
								<CodeRef path="packages/shared/src/types/TodoId.ts" /> —{" "}
								<code className="text-sky-300">Schema.Number.pipe(Schema.fromBrand(TodoId))</code> shows how to attach a
								branded nominal type to a plain schema so <code className="text-sky-300">number</code> and{" "}
								<code className="text-sky-300">TodoId</code> are not interchangeable.
							</li>
							<li>
								<CodeRef path="packages/shared/src/types/TodoServiceError.ts" /> —{" "}
								<code className="text-sky-300">Schema.TaggedError</code> creates typed error classes that are part of
								the schema system, making them serialisable over the wire.
							</li>
						</ul>
					</Concept>

					<Concept label="Key pattern">
						<code className="text-sky-300">Schema.transform(From, To, {"{ decode, encode }"})</code> — used in{" "}
						<code className="text-sky-300">TodoFromDb</code> to convert between the raw SQLite row shape (numbers for
						booleans) and the clean domain type. The RPC layer and database layer both use this automatically.
					</Concept>
				</Section>

				{/* ── 2. Effect + Service ───────────────────────────────────────────── */}
				{/*                                                                      */}
				{/* An `Effect<A, E, R>` is a description of a computation that:         */}
				{/*   A = the success value                                               */}
				{/*   E = the typed error (can only fail with these specific types)       */}
				{/*   R = the requirements (services this effect needs injected)          */}
				{/*                                                                       */}
				{/* Nothing runs until you pass the Effect to a runtime (BunRuntime).     */}
				<Section title="2 · Effect + Service — typed async with dependency injection">
					<Concept label="What it is">
						Every async operation in the server returns an <code className="text-sky-300">Effect&lt;A, E, R&gt;</code>.
						The <code className="text-sky-300">R</code> slot is what makes it different from a plain Promise — it
						declares which services the computation needs. The runtime refuses to run it until all requirements are
						satisfied.
					</Concept>

					<Concept label="Where to look">
						<ul className="space-y-2 mt-1">
							<li>
								<CodeRef path="apps/server/src/services/todo-service/TodoService.ts" /> —{" "}
								<code className="text-sky-300">Effect.Service</code> macro. The string{" "}
								<code className="text-sky-300">"TodoService"</code> is the dependency injection key.{" "}
								<code className="text-sky-300">accessors: true</code> generates static convenience methods like{" "}
								<code className="text-sky-300">TodoService.getTodos()</code> so call sites don't have to{" "}
								<code className="text-sky-300">yield* TodoService</code> first.
							</li>
							<li>
								<code className="text-sky-300">TestLayer</code> — same static property on the class, but backed by an
								in-memory array. Tests swap layers; production code is untouched.
							</li>
						</ul>
					</Concept>

					<Concept label="Key pattern">
						<code className="text-sky-300">{"Effect.gen(function* () { const x = yield* someEffect })"}</code> — the
						generator syntax is Effect's equivalent of <code className="text-sky-300">async/await</code>.{" "}
						<code className="text-sky-300">yield*</code> unwraps an Effect (like{" "}
						<code className="text-sky-300">await</code>) but also threads the requirement and error types through
						automatically.
					</Concept>
				</Section>

				{/* ── 3. Layer ──────────────────────────────────────────────────────── */}
				{/*                                                                      */}
				{/* A Layer is the "how to build a service" recipe.                      */}
				{/* Effect's DI system composes Layers into a full dependency graph       */}
				{/* and builds everything in the right order at startup.                 */}
				<Section title="3 · Layer — dependency injection and wiring">
					<Concept label="What it is">
						A <code className="text-sky-300">Layer&lt;Out, E, In&gt;</code> describes how to construct a service{" "}
						<code className="text-sky-300">Out</code> given its dependencies <code className="text-sky-300">In</code>.
						You compose layers with <code className="text-sky-300">Layer.provide</code> to satisfy dependencies, then
						hand the final layer to the runtime.
					</Concept>

					<Concept label="Where to look">
						<CodeRef path="apps/server/src/main.ts" /> — read it bottom-up. Each variable is a layer that depends on the
						one above it:
						<ol className="list-decimal list-inside mt-2 space-y-1 text-neutral-400">
							<li>
								<code className="text-sky-300">TodoHandlersLive</code> — RPC handlers, needs{" "}
								<code className="text-sky-300">TodoService</code>
							</li>
							<li>
								<code className="text-sky-300">RpcProtocol</code> — WebSocket transport, needs JSON serialisation
							</li>
							<li>
								<code className="text-sky-300">RpcLive</code> — dispatch layer, needs handlers + protocol
							</li>
							<li>
								<code className="text-sky-300">HttpServerLive</code> — HTTP server, needs the RPC layer + Bun HTTP
							</li>
						</ol>
					</Concept>

					<Concept label="Key pattern">
						<code className="text-sky-300">SomeLayer.pipe(Layer.provide([Dep1, Dep2]))</code> — satisfies{" "}
						<code className="text-sky-300">SomeLayer</code>'s requirements. TypeScript tracks which requirements are
						still unmet in the type — if you forget a dependency, it's a compile error, not a runtime crash.
					</Concept>
				</Section>

				{/* ── 4. RPC ────────────────────────────────────────────────────────── */}
				{/*                                                                      */}
				{/* @effect/rpc is a type-safe RPC system built on top of Schema.        */}
				{/* The shared contract (RpcGroup) is imported by both client and server */}
				{/* so there is only one definition of each endpoint.                    */}
				<Section title="4 · RPC — type-safe client↔server communication">
					<Concept label="What it is">
						<code className="text-sky-300">@effect/rpc</code> lets you define RPC endpoints as schemas in shared code.
						The server implements them, the client calls them — both sides share the same types with no codegen step.
					</Concept>

					<Concept label="Where to look">
						<ul className="space-y-2 mt-1">
							<li>
								<CodeRef path="packages/shared/src/rpc/TodoRpcs.ts" /> — the contract.{" "}
								<code className="text-sky-300">Rpc.make("addTodo", {"{ payload, success, error }"})</code> is the only
								place <code className="text-sky-300">addTodo</code> is defined. Everything else is derived from it.
							</li>
							<li>
								<CodeRef path="apps/server/src/main.ts" /> — <code className="text-sky-300">TodoRpcs.toLayer(...)</code>{" "}
								is where you write the server implementations. TypeScript enforces that every RPC in the group has a
								handler.
							</li>
							<li>
								<CodeRef path="apps/web/src/rpc/TodoClient.ts" /> — <code className="text-sky-300">AtomRpc.Tag</code>{" "}
								wraps the RPC client with the atom system so you can use RPCs as reactive queries and mutations.
							</li>
						</ul>
					</Concept>

					<Concept label="Wire protocol">
						WebSocket + JSON. The transport is swappable (HTTP, fetch) — the{" "}
						<code className="text-sky-300">RpcSerialization.layerJson</code> and{" "}
						<code className="text-sky-300">layerProtocolWebsocket</code> layers are what choose it.
					</Concept>
				</Section>

				{/* ── 5. Atoms (client state) ───────────────────────────────────────── */}
				{/*                                                                      */}
				{/* @effect-atom/atom-react bridges Effect's RPC layer with React.       */}
				{/* Query atoms are reactive — mutations that share a reactivityKey       */}
				{/* automatically invalidate and refetch their matching queries.          */}
				<Section title="5 · Atoms — reactive state on the client">
					<Concept label="What it is">
						<code className="text-sky-300">@effect-atom/atom-react</code> provides three atom types:
						<ul className="list-disc list-inside mt-1 space-y-1">
							<li>
								<code className="text-sky-300">Atom.make(initialValue)</code> — plain reactive state (like{" "}
								<code className="text-sky-300">useState</code> but shared across components)
							</li>
							<li>
								<code className="text-sky-300">Atom.make((get) =&gt; ...)</code> — derived/computed state (re-runs when
								dependencies change)
							</li>
							<li>
								<code className="text-sky-300">TodoClient.query(...)</code> — RPC-backed atom, result is a{" "}
								<code className="text-sky-300">Result&lt;A, E&gt;</code> (Initial | Loading | Failure | Success)
							</li>
						</ul>
					</Concept>

					<Concept label="Where to look">
						<CodeRef path="apps/web/src/App.tsx" /> — see how <code className="text-sky-300">todosAtom</code>,{" "}
						<code className="text-sky-300">filteredTodosAtom</code>, and the three mutations are declared at module
						level (outside the component) and consumed with <code className="text-sky-300">useAtomValue</code> /{" "}
						<code className="text-sky-300">useAtomSet</code>.
					</Concept>

					<Concept label="Key pattern — reactivityKeys">
						Both the query and each mutation declare <code className="text-sky-300">reactivityKeys: ["todos"]</code>.
						When a mutation fires, the atom system automatically re-fetches every query that shares the same key. No
						manual cache invalidation.
					</Concept>
				</Section>

				{/* Footer nav */}
				<div className="pt-4 border-t border-neutral-800">
					<Link to="/" className="text-sm text-neutral-400 hover:text-neutral-100 transition-colors">
						← Back to the Todo app
					</Link>
				</div>
			</div>
		</div>
	)
}
