import type { Request, Response } from 'express';
export declare function login(req: Request, res: Response): Promise<Response>;
export declare function logout(req: Request, res: Response): Promise<Response>;
export declare function refreshToken(req: Request, res: Response): Promise<Response>;
export declare function getMe(req: Request, res: Response): Promise<Response>;
//# sourceMappingURL=admin.auth.controller.d.ts.map