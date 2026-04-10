import type { IFieldError } from '@app-types/index';
export declare class ApiError extends Error {
    readonly statusCode: number;
    readonly isOperational: boolean;
    readonly errors: IFieldError[];
    constructor(statusCode: number, message: string, errors?: IFieldError[], isOperational?: boolean);
}
export declare class BadRequestError extends ApiError {
    constructor(message?: string, errors?: IFieldError[]);
}
export declare class UnauthorizedError extends ApiError {
    constructor(message?: string);
}
export declare class ForbiddenError extends ApiError {
    constructor(message?: string);
}
export declare class NotFoundError extends ApiError {
    constructor(message?: string);
}
export declare class ConflictError extends ApiError {
    constructor(message?: string);
}
export declare class UnprocessableError extends ApiError {
    constructor(message?: string, errors?: IFieldError[]);
}
export declare class TooManyRequestsError extends ApiError {
    constructor(message?: string);
}
export declare class InternalError extends ApiError {
    constructor(message?: string);
}
//# sourceMappingURL=apiError.d.ts.map