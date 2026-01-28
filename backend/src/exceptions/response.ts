import { Response } from "express";
import { ApiResponse } from "./types";

type SuccessOptions<T> = {
  code: string;
  message: string;
  data?: T;
  warnings?: string[];
  details?: Record<string, any>;
  needs_confirmation?: boolean;
};

export function sendSuccess<T>(
  res: Response<ApiResponse<T>>,
  status: number,
  options: SuccessOptions<T>,
) {
  const payload: ApiResponse<T> = {
    ok: true,
    code: options.code,
    message: options.message,
  };

  if (options.data !== undefined) {
    payload.data = options.data;
  }
  if (options.warnings?.length) {
    payload.warnings = options.warnings;
  }
  if (options.details) {
    payload.details = options.details;
  }
  if (options.needs_confirmation) {
    payload.needs_confirmation = true;
  }

  return res.status(status).json(payload);
}
