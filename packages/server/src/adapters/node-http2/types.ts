import type http2 from "http2"
import type { AnyTRPCRouter } from "../../@trpc/server";
import type { HTTPBaseHandlerOptions } from "../../@trpc/server/http"
import type { NodeHTTPCreateContextOption } from "./../node-http";

export type NodeHTTP2HandlerOptions<
  TRouter extends AnyTRPCRouter,
> = HTTPBaseHandlerOptions<TRouter, http2.Http2ServerRequest> & NodeHTTPCreateContextOption<TRouter, http2.Http2ServerRequest, http2.Http2ServerResponse> & {

    // TODO: description
    insecure?: boolean

    // /**
    //  * By default, http/2 `OPTIONS` requests are not handled, and CORS headers are not returned.
    //  *
    //  * This can be used to handle them manually or via the `cors` npm package: https://www.npmjs.com/package/cors
    //  *
    //  * ```ts
    //  * import cors from 'cors'
    //  *
    //  * nodeHTTPRequestHandler({
    //  *   cors: cors()
    //  * })
    //  * ```
    //  */
    // middleware?: ConnectMiddleware;
    // maxBodySize?: number;
    // experimental_contentTypeHandlers?: NodeHTTPContentTypeHandler<
    //   TRequest,
    //   TResponse
    // >[];
  }

export type NodeHTTP2RequestHandlerOptions<
  TRouter extends AnyTRPCRouter,
> = {
  req: http2.Http2ServerRequest;
  res: http2.Http2ServerResponse;
  path: string;
} & NodeHTTP2HandlerOptions<TRouter>;

export type HTTP2Headers = {
  [x: string]: string | string[] | undefined;
}
