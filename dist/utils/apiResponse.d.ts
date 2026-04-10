import type { IFieldError, IPaginationMeta } from '@app-types/index';
import type { Response } from 'express';
export declare function sendSuccess<T>(res: Response, data: T, message?: string, statusCode?: number, meta?: IPaginationMeta): Response;
export declare function sendCreated<T>(res: Response, data: T, message?: string): Response;
export declare function sendNoContent(res: Response): Response;
export declare function sendError(res: Response, message: string, statusCode?: number, errors?: IFieldError[]): Response;
//# sourceMappingURL=apiResponse.d.ts.map