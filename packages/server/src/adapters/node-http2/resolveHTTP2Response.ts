import type { HTTP2Headers } from '.';
import type { inferRouterContext } from '../../@trpc/server';
import {
  callTRPCProcedure,
  getErrorShape,
  getTRPCErrorFromUnknown,
  transformTRPCResponse,
  type AnyTRPCRouter,
  type TRPCError,
} from '../../@trpc/server';
import type { TRPCRequestInfo } from '../../@trpc/server/http';
import {
  getJsonContentTypeInputs,
  type BaseContentTypeHandler,
  type HTTPBaseHandlerOptions,
  type HTTPRequest,
  type ResolveHTTPRequestOptionsContextFn,
} from '../../@trpc/server/http';

type Maybe<TType> = TType | null | undefined;

interface ResolveHTTP2RequestOptions<
  TRouter extends AnyTRPCRouter,
  TRequest extends HTTPRequest,
> extends HTTPBaseHandlerOptions<TRouter, TRequest> {
  createContext: ResolveHTTPRequestOptionsContextFn<TRouter>;
  req: TRequest;
  path: string;
  error?: Maybe<TRPCError>;
  contentTypeHandler?: BaseContentTypeHandler<any>;
  preprocessedBody?: boolean;
  /**
   * Called upon end of request handling.
   *
   * NOTE: as opposed to HTTP/1.1, we get streaming and batching (concatenation)
   * out of the box for free with HTTP/2
   */
  unstable_onEnd: (headers: HTTP2Headers, body: string) => any;
}

export async function resolveHTTP2Response<
  TRouter extends AnyTRPCRouter,
  TRequest extends HTTPRequest,
>(opts: ResolveHTTP2RequestOptions<TRouter, TRequest>): Promise<void> {
  const { router, req, path, unstable_onEnd, createContext } = opts;

  if (req.method === 'HEAD') {
    // can be used for lambda warmup
    unstable_onEnd({}, '');
    return;
  }

  const contentTypeHandler = opts.contentTypeHandler ?? {
    getInputs: getJsonContentTypeInputs,
  };

  const type = 'query' as const; // TODO: map to request methods

  try {
    if (opts.error) {
      throw opts.error;
    }

    const inputs = await contentTypeHandler.getInputs({
      isBatchCall: false,
      req,
      router,
      preprocessedBody: opts.preprocessedBody ?? false,
    });

    const input = inputs[0] ?? undefined;

    const info: TRPCRequestInfo = {
      isBatchCall: false,
      calls: [
        {
          path,
          type,
          input,
        },
      ],
    };

    const ctx: inferRouterContext<TRouter> = await createContext({ info });

    const result = await callTRPCProcedure({
      procedures: router._def.procedures,
      path,
      getRawInput: async () => input,
      ctx,
      type,
    })
      .then((data) => ({ result: { data } }))
      .catch((cause) => {
        const error = getTRPCErrorFromUnknown(cause);
        opts.onError?.({
          error,
          path,
          input,
          ctx,
          type,
          req,
        });

        return {
          error: getErrorShape({
            config: opts.router._def._config,
            error,
            type,
            path,
            input,
            ctx,
          }),
        };
      });

    // TODO: implement proper response init
    const headers: HTTP2Headers = {
      'content-type': 'application/json',
    };

    const transformedJSON = transformTRPCResponse(router._def._config, result);
    const body = JSON.stringify(transformedJSON);
    unstable_onEnd(headers, body);
  } catch (err) {
    // TODO:
    unstable_onEnd({}, JSON.stringify({ error: err }))
  }
}
