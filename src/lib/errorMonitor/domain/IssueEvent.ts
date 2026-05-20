export interface StackFrame {
  filename: string | null;
  function: string | null;
  lineNo: number | null;
  colNo: number | null;
  inApp: boolean;
  contextLine: string | null;
}

export interface ExceptionEntry {
  type: string | null;
  value: string | null;
  module: string | null;
  frames: StackFrame[];
}

export interface Breadcrumb {
  timestamp: string | null;
  type: string | null;
  category: string | null;
  level: string | null;
  message: string | null;
  data: Record<string, unknown> | null;
}

export interface EventUser {
  id: string | null;
  email: string | null;
  username: string | null;
  ipAddress: string | null;
}

export interface EventRequest {
  url: string | null;
  method: string | null;
  headers: Array<[string, string]>;
  query: Array<[string, string]>;
}

export interface EventSdk {
  name: string | null;
  version: string | null;
}

export interface ProcessingError {
  type: string | null;
  message: string | null;
  data: Record<string, unknown> | null;
}

export interface IssueEvent {
  id: string;
  eventID: string;
  dateCreated: string;
  message: string | null;
  platform: string | null;
  culprit: string | null;
  tags: Array<{ key: string; value: string }>;
  user: EventUser | null;
  request: EventRequest | null;
  contexts: Record<string, Record<string, unknown>>;
  // Free-form `extra` data ("Additional Data" in GlitchTip), distinct from structured `contexts`.
  context: Record<string, unknown>;
  metadata: Record<string, unknown>;
  packages: Record<string, string>;
  sdk: EventSdk | null;
  errors: ProcessingError[];
  exceptions: ExceptionEntry[];
  breadcrumbs: Breadcrumb[];
}
