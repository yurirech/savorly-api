export type ApiErrorCode =
  | "validation_error"
  | "unauthorized"
  | "not_found"
  | "import_blocked"
  | "ssrf_rejected"
  | "unsupported_content_type"
  | "upstream_timeout"
  | "normalizer_failed"
  | "conflict"
  | "internal_error";

export type ApiErrorBody = {
  error: {
    code: ApiErrorCode;
    message: string;
    offerTextPaste?: boolean;
  };
};

export type AuthUser = {
  id: string;
  email: string;
};

export type AuthResponse = {
  token: string;
  user: AuthUser;
};
