import { HttpMiddleware, HttpRouter } from "@effect/platform"
import { BunHttpServer, BunRuntime } from "@effect/platform-bun"
import { RpcSerialization, RpcServer } from "@effect/rpc"
import { TodoRpcs } from "@shared/rpc/TodoRpcs.js"
import * as HttpServerResponse from "@effect/platform/HttpServerResponse"
import { Effect, Layer } from "effect"
import { TodoService } from "./services/todo-service/TodoService.js"

// ─── Todo RPC handlers ────────────────────────────────────────────────────────
//
// `TodoRpcs.toLayer(...)` takes an Effect that produces implementations for
// every RPC defined in TodoRpcs and turns them into a Layer. Internally the
// Layer wires each handler so the RPC server can dispatch incoming calls.
// These are essrntially impelmentations of the routes, just how trpc does it
const TodoHandlersLive = TodoRpcs.toLayer(
  Effect.gen(function*() {
    const service = yield* TodoService
    return TodoRpcs.of({
      getTodos: () => service.getTodos(),
      addTodo: (payload) => service.addTodo(payload),
      toggleTodo: (payload) => service.toggleTodo(payload),
      deleteTodo: (payload) => service.deleteTodo(payload),
    })
  }),
).pipe(Layer.provide([TodoService.Default]))

// ─── Health route ─────────────────────────────────────────────────────────────
//
// `HttpRouter.Default` is a globally-shared mutable router that
// `RpcServer.layerProtocolWebsocket` also uses under the hood.
//
// `HttpRouter.Default.use(router => ...)` receives that shared instance and
// lets us add routes to it. Routes added here are visible to `.serve()` below
// because they share the same service instance (via Layer.MemoMap).
//
// NOTE: This is different from `HttpLayerRouter.use(...)`, which targets a
// separate context tag and is invisible to `HttpRouter.Default.serve()`.
const HealthRoute = HttpRouter.Default.use((router) => router.get("/health", HttpServerResponse.text("OK")))
const ChefRoute = HttpRouter.Default.use((router) => router.get("/chef", HttpServerResponse.json({
  hello: "darkness",
  my: "old friend"
})))

// ─── RPC protocol ─────────────────────────────────────────────────────────────
//
// Registers a WebSocket upgrade handler at `ws://<host>/rpc`.
// JSON is used as the serialisation format (alternative: MsgPack).
const RpcProtocol = RpcServer.layerProtocolWebsocket({ path: "/rpc" }).pipe(Layer.provide(RpcSerialization.layerJson))

// ─── RPC server layer ─────────────────────────────────────────────────────────
//
// Combines the handler implementations with the transport protocol.
// This Live should include all the trpc handlers, like how TODO is added here
const RpcLive = RpcServer.layer(TodoRpcs).pipe(Layer.provide([TodoHandlersLive, RpcProtocol]))

// ─── HTTP server ──────────────────────────────────────────────────────────────
//
// `HttpRouter.Default.serve(middleware)` creates a Layer that starts the HTTP
// server and applies `middleware` to every request.
//
// CORS is passed here (not via `HttpLayerRouter.cors`) because `.serve()`
// wraps the `HttpRouter.Default` handler, so CORS is applied in the same
// pipeline that serves both the health route and the RPC WebSocket upgrade.
const HttpServerLive = HttpRouter.Default.serve(
  HttpMiddleware.cors({
    allowedOrigins: ["*"],
    allowedMethods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization", "B3", "traceparent"],
    credentials: true,
  }),
).pipe(Layer.provide([RpcLive, HealthRoute, ChefRoute, BunHttpServer.layer({ port: 3000 })]))

BunRuntime.runMain(Layer.launch(HttpServerLive))
