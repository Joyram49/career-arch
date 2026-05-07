import type { IApiResponse, IFieldError, IPaginationMeta } from '@app-types/index';
import type { Response } from 'express';

export function sendSuccess<T>(
  res: Response,
  data: T,
  message = 'Success',
  statusCode = 200,
  meta?: IPaginationMeta,
): Response {
  const response: IApiResponse<T> = {
    success: true,
    message,
    data,
    ...(meta !== undefined && { meta }),
  };
  return res.status(statusCode).json(response);
}

export function sendCreated<T>(res: Response, data: T, message = 'Created successfully'): Response {
  return sendSuccess(res, data, message, 201);
}

export function sendNoContent(res: Response): Response {
  return res.status(204).send();
}

export function sendError(
  res: Response,
  message: string,
  statusCode = 500,
  errors: IFieldError[] = [],
): Response {
  const response: IApiResponse = {
    success: false,
    message,
    ...(errors.length > 0 && { errors }),
  };
  return res.status(statusCode).json(response);
}
