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

export interface GlitchTipSdkDto {
  name?: string | null;
  version?: string | null;
}

export interface GlitchTipProcessingErrorDto {
  type?: string | null;
  message?: string | null;
  data?: Record<string, unknown> | null;
}

export interface GlitchTipEventDto {
  id: string;
  eventID: string;
  dateCreated: string;
  message?: string | null;
  platform?: string | null;
  culprit?: string | null;
  tags?: Array<{ key: string; value: string }>;
  user?: GlitchTipEventUserDto | null;
  contexts?: Record<string, Record<string, unknown>>;
  // `context` (singular) is the free-form `extra` dict — GlitchTip's "Additional Data" panel.
  // Distinct from `contexts` (plural), which holds structured device/os/runtime data.
  context?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
  packages?: Record<string, string | null> | null;
  sdk?: GlitchTipSdkDto | null;
  errors?: GlitchTipProcessingErrorDto[] | null;
  entries?: GlitchTipEntryDto[];
}
