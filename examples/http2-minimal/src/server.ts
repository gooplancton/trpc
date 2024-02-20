import { initTRPC } from "@trpc/server";
import { createHTTP2Server } from "@trpc/server/adapters/standalone"

const t = initTRPC.create();

const testProc = t.procedure.query(() => "hello from http/2")

const appRouter = t.router({
  testProc
});

// Export type router type signature, this is used by the client.
export type AppRouter = typeof appRouter;

const server = createHTTP2Server({
  router: appRouter,
  insecure: true
});

server.listen(3000);
