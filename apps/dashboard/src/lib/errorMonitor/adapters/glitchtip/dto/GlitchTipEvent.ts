export interface GlitchTipStackFrameDto {
  filename?: string | null;
  function?: string | null;
  lineNo?: number | null;
  colNo?: number | null;
  inApp?: boolean;
  contextLine?: string | null;
}

export interface GlitchTipExceptionValueDto {
  type?: string | null;
  value?: string | null;
  module?: string | null;
  stacktrace?: {
    frames?: GlitchTipStackFrameDto[];
  } | null;
}

export interface GlitchTipBreadcrumbDto {
  timestamp?: string | null;
  type?: string | null;
  category?: string | null;
  level?: string | null;
  message?: string | null;
  data?: Record<string, unknown> | null;
}

export interface GlitchTipRequestDto {
  url?: string | null;
  method?: string | null;
  headers?: Array<[string, string]>;
  query?: Array<[string, string]>;
}

export type GlitchTipEntryDto =
  | {
      type: "exception";
      data: { values?: GlitchTipExceptionValueDto[] };
    }
  | {
      type: "breadcrumbs";
      data: { values?: GlitchTipBreadcrumbDto[] };
    }
  | {
      type: "request";
      data: GlitchTipRequestDto;
    }
  | {
      type: string;
      data: unknown;
    };

export interface GlitchTipEventUserDto {
  id?: string | null;
  email?: string | null;
  username?: string | null;
  ip_address?: string | null;
}

export interface GlitchTipEventDto {
  id: string;
  eventID: string;
  dateCreated: string;
  message?: string | null;
  platform?: string | null;
  tags?: Array<{ key: string; value: string }>;
  user?: GlitchTipEventUserDto | null;
  contexts?: Record<string, Record<string, unknown>>;
  entries?: GlitchTipEntryDto[];
}
