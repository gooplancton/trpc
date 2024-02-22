import { initTRPC } from "@trpc/server";
import { createHTTP2Server } from "@trpc/server/adapters/standalone"
import { observable } from "@trpc/server/observable";

type Context = {
  foo: string
}

const t = initTRPC.context<Context>().create();

const testQ = t.procedure.query(({ ctx }) => "hello from http/2, my name is " + ctx.foo)
const testMut = t.procedure.input((o) => o).mutation(({ input }) => "your input is " + JSON.stringify(input))
const testSub = t.procedure.subscription(() => {
  return observable(() => () => undefined)
})

const appRouter = t.router({
  testQ,
  testMut,
  testSub
});

// Export type router type signature, this is used by the client.
export type AppRouter = typeof appRouter;

const server = createHTTP2Server({
  router: appRouter,
  insecure: true,
  createContext: () => ({ foo: "bar" })
});

server.listen(3000);
