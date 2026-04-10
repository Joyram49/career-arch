import type { NextFunction, Request, Response } from 'express';
export declare function authenticate(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function optionalAuthenticate(req: Request, _res: Response, next: NextFunction): Promise<void>;
//# sourceMappingURL=authenticate.d.ts.map