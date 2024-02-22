import type {
  inferRouterContext,
  inferRouterError,
  TRPCProcedureType,
} from '../../../@trpc/server';
import {
  callTRPCProcedure,
  getErrorShape,
  getTRPCErrorFromUnknown,
  transformTRPCResponse,
  TRPCError,
  type AnyTRPCRouter,
} from '../../../@trpc/server';
import type {
  HTTPHeaders,
  HTTPResponse,
  TRPCRequestInfo,
} from '../../../@trpc/server/http';
import {
  getHTTPStatusCode,
  getJsonContentTypeInputs,
  type BaseContentTypeHandler,
  type HTTPBaseHandlerOptions,
  type HTTPRequest,
  type ResolveHTTPRequestOptionsContextFn,
} from '../../../@trpc/server/http';
import type {
  TRPCResponse,
  TRPCSuccessResponse,
} from '../../../@trpc/server/rpc';

type Maybe<TType> = TType | null | undefined;

interface ResolveHTTP2UnaryRequestOptions<
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
  unstable_onEnd: (status: number, headers: HTTPHeaders, body: string) => any;
}

export async function resolveHTTP2UnaryRequest<
  TRouter extends AnyTRPCRouter,
  TRequest extends HTTPRequest,
>(opts: ResolveHTTP2UnaryRequestOptions<TRouter, TRequest>): Promise<void> {
  const { router, req, path, unstable_onEnd, createContext } = opts;

  if (req.method === 'HEAD') {
    // can be used for lambda warmup
    unstable_onEnd(204, {}, '');
    return;
  }

  const contentTypeHandler = opts.contentTypeHandler ?? {
    getInputs: getJsonContentTypeInputs,
  };

  try {
    if (opts.error) {
      throw opts.error;
    }

    let type: TRPCProcedureType;
    if (req.method === 'GET') {
      type = 'query';
    } else if (req.method === 'POST') {
      type = "mutation"
    } else {
      throw new TRPCError({
        message: `Unexpected request method ${req.method}`,
        code: 'METHOD_NOT_SUPPORTED',
      });
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

    const { status, headers } = initResponse({
      ctx,
      path,
      type,
      responseMeta: opts.responseMeta,
      result,
    });

    const transformedJSON = transformTRPCResponse(router._def._config, result);
    const body = JSON.stringify(transformedJSON);
    unstable_onEnd(status, headers ?? {}, body);
  } catch (err) {
    // TODO:
    unstable_onEnd(400, {}, JSON.stringify({ error: err }));
  }
}

function initResponse<
  TRouter extends AnyTRPCRouter,
  TRequest extends HTTPRequest,
>(opts: {
  ctx: inferRouterContext<TRouter> | undefined;
  path: string | undefined;
  type: TRPCProcedureType | 'unknown';
  responseMeta?: HTTPBaseHandlerOptions<TRouter, TRequest>['responseMeta'];
  result?: TRPCResponse<unknown, inferRouterError<TRouter>> | undefined;
}): HTTPResponse {
  const result = opts.result;

  let status = result ? getHTTPStatusCode(result) : 200;
  const headers: HTTPHeaders = {
    'Content-Type': 'application/json',
  };

  const data: TRPCSuccessResponse<unknown>[] = [];
  const errors: TRPCError[] = [];
  if (result && 'error' in result) {
    errors.push(result.error);
  } else if (result) {
    data.push(result);
  }

  const meta =
    opts.responseMeta?.({
      ctx: opts.ctx,
      paths: opts.path ? [opts.path] : [],
      type: opts.type,
      data,
      errors,
      eagerGeneration: !result,
    }) ?? {};

  for (const [key, value] of Object.entries(meta.headers ?? {})) {
    headers[key] = value;
  }

  if (meta.status) {
    status = meta.status;
  }

  return { status, headers };
}
