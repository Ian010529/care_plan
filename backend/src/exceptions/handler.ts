import { NextFunction, Request, Response } from "express";
import { ApiResponse } from "./types";
import { ApiCodes } from "./codes";
import { AppError } from "./errors";

export function exceptionHandler(
  err: unknown,
  _req: Request,
  res: Response<ApiResponse>,
  _next: NextFunction,
) {
  if (err instanceof AppError) {
    const payload: ApiResponse = {
      ok: false,
      code: err.code,
      message: err.message,
    };

    if (err.warnings?.length) {
      payload.warnings = err.warnings;
    }
    if (err.details) {
      payload.details = err.details;
    }
    if (err.needs_confirmation) {
      payload.needs_confirmation = true;
    }

    return res.status(err.status).json(payload);
  }

  console.error("Unhandled error:", err);
  return res.status(500).json({
    ok: false,
    code: ApiCodes.INTERNAL_ERROR,
    message: "Internal server error",
  });
}
