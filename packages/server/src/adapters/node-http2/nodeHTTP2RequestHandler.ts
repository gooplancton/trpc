import type { AnyRouter, AnyTRPCRouter } from "../../@trpc/server";
import type { HTTP2Headers, NodeHTTP2RequestHandlerOptions } from "./types";
import { nodeHTTPJSONContentTypeHandler } from "../node-http/content-type/json";
import type { HTTPRequest, ResolveHTTPRequestOptionsContextFn } from "../../@trpc/server/http";
import { resolveHTTP2Response } from "./resolveHTTP2Response";

export async function nodeHTTP2RequestHandler<TRouter extends AnyTRPCRouter>(opts: NodeHTTP2RequestHandlerOptions<AnyRouter>) {

  const createContext: ResolveHTTPRequestOptionsContextFn<TRouter> = async (
    innerOpts,
  ) => {
    return await opts.createContext?.({
      ...opts,
      ...innerOpts,
    });
  };

  const query = new URLSearchParams(opts.req.url.split('?')[1]);

  const contentTypeHandler = nodeHTTPJSONContentTypeHandler();

  const bodyResult = await contentTypeHandler.getBody({
    // FIXME: no typecasting should be needed here
    ...opts as any,
    query,
  });

  const req: HTTPRequest = {
    method: opts.req.method,
    headers: opts.req.headers,
    query,
    body: bodyResult.ok ? bodyResult.data : undefined,
  };

  await resolveHTTP2Response({
    responseMeta: opts.responseMeta,
    path: opts.path,
    createContext,
    router: opts.router,
    req,
    error: bodyResult.ok ? null : bodyResult.error,
    preprocessedBody: bodyResult.ok ? bodyResult.preprocessed : false,
    onError(o) {
      opts?.onError?.({
        ...o,
        req: opts.req,
      });
    },
    unstable_onEnd: (headers: HTTP2Headers, body: string) => {
      for (const [name, value] of Object.entries(headers)) {
        if (!value) continue;

        opts.res.setHeader(name, value);
      }

      opts.res.write(body);
      opts.res.end()
    },
    contentTypeHandler,
  });

  return opts.res;
}
