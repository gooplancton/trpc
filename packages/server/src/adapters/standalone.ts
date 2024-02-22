/**
 * If you're making an adapter for tRPC and looking at this file for reference, you should import types and functions from `@trpc/server` and `@trpc/server/http`
 *
 * @example
 * ```ts
 * import type { AnyTRPCRouter } from '@trpc/server'
 * import type { HTTPBaseHandlerOptions } from '@trpc/server/http'
 * ```
 */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import http from 'http';
import http2 from 'http2';
// @trpc/server
import type { AnyRouter, AnyTRPCRouter } from '../@trpc/server';
import { toURL } from '../@trpc/server/http';
import type {
  NodeHTTPCreateContextFnOptions,
  NodeHTTPHandlerOptions,
} from './node-http';
import { nodeHTTPRequestHandler } from './node-http';
import type { NodeHTTP2HandlerOptions } from './node-http2';
import { nodeHTTP2RequestHandler } from './node-http2';

export type CreateHTTPHandlerOptions<TRouter extends AnyRouter> =
  NodeHTTPHandlerOptions<TRouter, http.IncomingMessage, http.ServerResponse>;

export type CreateHTTPContextOptions = NodeHTTPCreateContextFnOptions<
  http.IncomingMessage,
  http.ServerResponse
>;

export function createHTTPHandler<TRouter extends AnyRouter>(
  opts: CreateHTTPHandlerOptions<TRouter>,
) {
  return async (req: http.IncomingMessage, res: http.ServerResponse) => {
    const url = toURL(req.url!);

    // get procedure path and remove the leading slash
    // /procedure -> procedure
    const path = url.pathname.slice(1);

    await nodeHTTPRequestHandler({
      // FIXME: no typecasting should be needed here
      ...(opts as CreateHTTPHandlerOptions<AnyRouter>),
      ...(opts as any),
      req,
      res,
      path,
    });
  };
}

export function createHTTPServer<TRouter extends AnyRouter>(
  opts: CreateHTTPHandlerOptions<TRouter>,
) {
  const handler = createHTTPHandler(opts);
  return http.createServer(handler);
}

export function createHTTP2Handler<TRouter extends AnyTRPCRouter>(
  opts: NodeHTTP2HandlerOptions<TRouter>,
) {
  return async (
    req: http2.Http2ServerRequest,
    res: http2.Http2ServerResponse,
  ) => {
    const url = toURL(req.url);
    const path = url.pathname.slice(1);

    await nodeHTTP2RequestHandler({
      // FIXME: no typecasting should be needed here
      ...(opts as any),
      req,
      res,
      path,
    });
  };
}

export function createHTTP2Server<TRouter extends AnyTRPCRouter>(
  opts: NodeHTTP2HandlerOptions<TRouter>,
) {
  const handler = createHTTP2Handler(opts);

  if (opts.insecure) {
    return http2.createServer(handler);
  }

  return http2.createSecureServer(handler);
}
