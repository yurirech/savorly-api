import type { ApiErrorCode } from "@savorly/shared";

export class AppError extends Error {
  constructor(
    readonly code: ApiErrorCode,
    message: string,
    readonly status: number,
    readonly offerTextPaste = false,
  ) {
    super(message);
  }
}
