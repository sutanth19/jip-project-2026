import type { Response } from "express";

export function successResponse(
  res: Response,
  statusCode: number,
  message: string,
  data?: unknown
) {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
}