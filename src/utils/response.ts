import { Response } from "express";

export const successResponse = <T>(
  res: Response,
  message: string,
  data?: T,
  statusCode = 200
) => { 
  return res.status(statusCode).json({
    success: true,
    message,
    ...(data !== undefined && { data }),
  });
};

export const errorResponse = (
  res: Response,
  message: string,
  statusCode = 500,
  code?: string,
  details?: string
) => {
  return res.status(statusCode).json({
    success: false,
    message,
    ...(code && {
      error: {
        code,
        statusCode,
        ...(details && { details }),
      },
    }),
  });
};