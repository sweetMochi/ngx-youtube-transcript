export type ApiErrorCode =
  'INVALID_URL' | 'INVALID_TRACK' | 'LOGIN_REQUIRED' | 'VIDEO_UNAVAILABLE' | 'YTDLP_FAILED';

const STATUS: Record<ApiErrorCode, number> = {
  INVALID_URL: 400,
  INVALID_TRACK: 400,
  LOGIN_REQUIRED: 403,
  VIDEO_UNAVAILABLE: 404,
  YTDLP_FAILED: 502,
};

/** 會以 `{ error: { code, message } }` 回傳給前端的錯誤 */
export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number;

  constructor(code: ApiErrorCode, message: string) {
    super(message);
    this.code = code;
    this.status = STATUS[code];
  }
}
