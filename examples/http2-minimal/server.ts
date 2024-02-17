import http2 from "http2"
import { AnyRouter, AnyTRPCRouter, initTRPC } from '@trpc/server';

const t = initTRPC.create();

const appRouter = t.router({
  // procedures...
});

// Export type router type signature, this is used by the client.
export type AppRouter = typeof appRouter;

type NodeHTTP2Request = http2.Http2ServerRequest & {}
type NodeHTTP2Response = http2.Http2ServerResponse & {}

type NodeHTTP2HandlerOptions<TRouter extends AnyRouter, TRequest extends NodeHTTP2Request, TResonse extends NodeHTTP2Response> = any;

type CreateHTTP2HandlerOptions<TRouter extends AnyTRPCRouter> = NodeHTTP2HandlerOptions<TRouter, http2.Http2ServerRequest, http2.Http2ServerResponse>;

declare function createHTTP2Server<TRouter extends AnyTRPCRouter>(opts: CreateHTTP2HandlerOptions<TRouter>): http2.Http2Server

const server = createHTTP2Server({
  router: appRouter,
});

server.listen(3000);

