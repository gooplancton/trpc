import {
  TRPCError,
  type AnyTRPCRouter,
} from '../../@trpc/server';
import type {
  HTTPHeaders,
  HTTPRequest,
  ResolveHTTPRequestOptionsContextFn,
} from '../../@trpc/server/http';
import { nodeHTTPJSONContentTypeHandler } from '../node-http/content-type/json';
import { resolveHTTP2UnaryRequest } from './internals/unary';
import type { NodeHTTP2RequestHandlerOptions } from './types';

export async function nodeHTTP2RequestHandler<TRouter extends AnyTRPCRouter>(
  opts: NodeHTTP2RequestHandlerOptions<AnyTRPCRouter>,
) {
  const createContext: ResolveHTTPRequestOptionsContextFn<TRouter> = async (
    innerOpts,
  ) => {
    return await opts.createContext?.({
      ...opts,
      ...innerOpts,
    });
  };

  const query = new URLSearchParams(opts.req.url.split('?')[1]);

  // TODO:
  const contentTypeHandler = nodeHTTPJSONContentTypeHandler();

  const bodyResult = await contentTypeHandler.getBody({
    // FIXME: no typecasting should be needed here
    ...(opts as any),
    query,
  });

  const req: HTTPRequest = {
    method: opts.req.method,
    headers: opts.req.headers,
    query,
    body: bodyResult.ok ? bodyResult.data : undefined,
  };

  const proc = opts.router._def.procedures[opts.path];
  if (!proc || typeof proc !== 'function') {
    opts.onError?.({
      error: new TRPCError({
        code: 'NOT_FOUND',
        message: `No procedure on path "${opts.path}"`,
      }),
      ctx: {},
      path: opts.path,
      req: opts.req,
      type: "unknown",
      input: {}
    });

    opts.res.stream.respond({ ':status': 404 });
    opts.res.write(JSON.stringify({ error: `No procedure on path "${opts.path}"`}));
    opts.res.end();

    return opts.res
  }

  const isUnary = proc._def.type !== 'subscription';
  if (isUnary) {
    await resolveHTTP2UnaryRequest({
      req,
      createContext,
      responseMeta: opts.responseMeta,
      path: opts.path,
      router: opts.router,
      error: bodyResult.ok ? null : bodyResult.error,
      preprocessedBody: bodyResult.ok ? bodyResult.preprocessed : false,
      onError(o) {
        opts?.onError?.({
          ...o,
          req: opts.req,
        });
      },
      unstable_onEnd: (status: number, headers: HTTPHeaders, body: string) => {
        for (const [name, value] of Object.entries(headers)) {
          if (!value) continue;

          opts.res.setHeader(name, value);
        }

        opts.res.stream.respond({ ':status': status });
        opts.res.write(body);
        opts.res.end();
      },
      contentTypeHandler,
    });
  } else {
    opts.onError?.({
      error: new TRPCError({
        code: 'METHOD_NOT_SUPPORTED',
        message: `Subscriptions are not supported yet`,
      }),
      ctx: {},
      path: opts.path,
      req: opts.req,
      type: "unknown",
      input: {}
    });

    opts.res.stream.respond({ ':status': 400 });
    opts.res.write(JSON.stringify({ error: "Subscriptions are not supported yet"}));
    opts.res.end();

    return opts.res
  }

  return opts.res;
}
