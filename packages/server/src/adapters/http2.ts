import http2 from "http2"
import { AnyTRPCRouter } from "..";
import { NodeHTTP2HandlerOptions, nodeHTTP2RequestHandler } from "./node-http2";
import { toURL } from "../@trpc/server/http";


export function createHTTP2Handler<TRouter extends AnyTRPCRouter>(
  opts: NodeHTTP2HandlerOptions<TRouter>
) {
  return async (req: http2.Http2ServerRequest, res: http2.Http2ServerResponse) => {
    const url = toURL(req.url);
    const path = url.pathname.slice(1);

    await nodeHTTP2RequestHandler({
      ...opts,
      req,
      res,
      path
    });
  }
}

export function createHTTP2Server<TRouter extends AnyTRPCRouter>(
  opts: NodeHTTP2HandlerOptions<TRouter>
) {
  const handler = createHTTP2Handler(opts);

  if (opts.insecure) {
    return http2.createServer(handler);
  }

  return http2.createSecureServer(handler);
}

