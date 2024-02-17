import http2 from "http2"
import { AnyTRPCRouter } from "@trpc/server";
import { HTTPBaseHandlerOptions } from "../../@trpc/server/http"
import { NodeHTTPCreateContextOption } from "./../node-http";

export type NodeHTTP2HandlerOptions<
  TRouter extends AnyTRPCRouter,
> = HTTPBaseHandlerOptions<TRouter, http2.Http2ServerRequest> &
  NodeHTTPCreateContextOption<TRouter, http2.Http2ServerRequest, http2.Http2ServerResponse> & {

    insecure?: boolean

    // /**
    //  * By default, http `OPTIONS` requests are not handled, and CORS headers are not returned.
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
    //  *
    //  * You can also use it for other needs which a connect/node.js compatible middleware can solve,
    //  *  though you might wish to consider an alternative solution like the Express adapter if your needs are complex.
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

