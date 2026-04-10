import type { Request, Response } from 'express';
export declare function register(req: Request, res: Response): Promise<Response>;
export declare function verifyEmail(req: Request, res: Response): Promise<Response>;
export declare function login(req: Request, res: Response): Promise<Response>;
export declare function validateTwoFa(req: Request, res: Response): Promise<Response>;
export declare function logout(req: Request, res: Response): Promise<Response>;
export declare function refreshToken(req: Request, res: Response): Promise<Response>;
export declare function forgotPassword(req: Request, res: Response): Promise<Response>;
export declare function resetPassword(req: Request, res: Response): Promise<Response>;
export declare function setupTwoFa(req: Request, res: Response): Promise<Response>;
export declare function verifyTwoFa(req: Request, res: Response): Promise<Response>;
export declare function getMe(req: Request, res: Response): Promise<Response>;
//# sourceMappingURL=org.auth.controller.d.ts.map