import { ApiCode, ApiCodes } from "./codes";

type ErrorOptions = {
  status: number;
  code: ApiCode;
  message: string;
  warnings?: string[];
  details?: Record<string, any>;
  needs_confirmation?: boolean;
};

export class AppError extends Error {
  public readonly status: number;
  public readonly code: ApiCode;
  public readonly warnings?: string[];
  public readonly details?: Record<string, any>;
  public readonly needs_confirmation?: boolean;

  constructor(options: ErrorOptions) {
    super(options.message);
    this.name = "AppError";
    this.status = options.status;
    this.code = options.code;
    this.warnings = options.warnings;
    this.details = options.details;
    this.needs_confirmation = options.needs_confirmation;
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, any>) {
    super({
      status: 400,
      code: ApiCodes.VALIDATION_ERROR,
      message,
      details,
    });
    this.name = "ValidationError";
  }
}

export class NotFoundError extends AppError {
  constructor(message: string, details?: Record<string, any>) {
    super({
      status: 404,
      code: ApiCodes.NOT_FOUND,
      message,
      details,
    });
    this.name = "NotFoundError";
  }
}

export class DuplicateBlockedError extends AppError {
  constructor(message: string, details?: Record<string, any>) {
    super({
      status: 409,
      code: ApiCodes.DUPLICATE_BLOCKED,
      message,
      details,
    });
    this.name = "DuplicateBlockedError";
  }
}

export class ConfirmationRequiredError extends AppError {
  constructor(
    message: string,
    details?: Record<string, any>,
    warnings?: string[],
  ) {
    super({
      status: 409,
      code: ApiCodes.CONFIRMATION_REQUIRED,
      message,
      details,
      warnings,
      needs_confirmation: true,
    });
    this.name = "ConfirmationRequiredError";
  }
}

export class InternalError extends AppError {
  constructor(message = "Internal server error", details?: Record<string, any>) {
    super({
      status: 500,
      code: ApiCodes.INTERNAL_ERROR,
      message,
      details,
    });
    this.name = "InternalError";
  }
}
