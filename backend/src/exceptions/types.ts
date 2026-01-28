export interface ApiResponse<T = unknown> {
  ok: boolean;
  code: string;
  message: string;
  data?: T;
  warnings?: string[];
  details?: Record<string, any>;
  needs_confirmation?: boolean;
}
