import type { NextFunction, Request, RequestHandler, Response } from 'express';
type AsyncRequestHandler = (req: Request, res: Response, next: NextFunction) => Promise<void | Response>;
export declare const asyncHandler: (fn: AsyncRequestHandler) => RequestHandler;
export {};
//# sourceMappingURL=asyncHandler.d.ts.map