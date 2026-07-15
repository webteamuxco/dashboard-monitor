import type {
  IssueEvent,
  ExceptionEntry,
  Breadcrumb,
  EventRequest,
  EventUser,
  EventSdk,
  ProcessingError,
  StackFrame,
} from "../../../domain/IssueEvent";
import type {
  GlitchTipEventDto,
  GlitchTipEntryDto,
  GlitchTipStackFrameDto,
  GlitchTipExceptionValueDto,
  GlitchTipBreadcrumbDto,
  GlitchTipRequestDto,
  GlitchTipEventUserDto,
  GlitchTipSdkDto,
  GlitchTipProcessingErrorDto,
} from "../dto/GlitchTipEvent";

function mapFrame(dto: GlitchTipStackFrameDto): StackFrame {
  return {
    filename: dto.filename ?? null,
    function: dto.function ?? null,
    lineNo: dto.lineNo ?? null,
    colNo: dto.colNo ?? null,
    inApp: dto.inApp ?? false,
    contextLine: dto.contextLine ?? null,
  };
}

function mapException(dto: GlitchTipExceptionValueDto): ExceptionEntry {
  return {
    type: dto.type ?? null,
    value: dto.value ?? null,
    module: dto.module ?? null,
    frames: (dto.stacktrace?.frames ?? []).map(mapFrame),
  };
}

function mapBreadcrumb(dto: GlitchTipBreadcrumbDto): Breadcrumb {
  return {
    timestamp: dto.timestamp ?? null,
    type: dto.type ?? null,
    category: dto.category ?? null,
    level: dto.level ?? null,
    message: dto.message ?? null,
    data: dto.data ?? null,
  };
}

function mapRequest(dto: GlitchTipRequestDto): EventRequest {
  return {
    url: dto.url ?? null,
    method: dto.method ?? null,
    headers: dto.headers ?? [],
    query: dto.query ?? [],
  };
}

function mapUser(dto: GlitchTipEventUserDto | null | undefined): EventUser | null {
  if (!dto) return null;
  return {
    id: dto.id ?? null,
    email: dto.email ?? null,
    username: dto.username ?? null,
    ipAddress: dto.ip_address ?? null,
  };
}

function mapSdk(dto: GlitchTipSdkDto | null | undefined): EventSdk | null {
  if (!dto) return null;
  return { name: dto.name ?? null, version: dto.version ?? null };
}

function mapPackages(
  dto: Record<string, string | null> | null | undefined,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [name, version] of Object.entries(dto ?? {})) {
    if (version != null) out[name] = version;
  }
  return out;
}

function mapErrors(
  dto: GlitchTipProcessingErrorDto[] | null | undefined,
): ProcessingError[] {
  return (dto ?? []).map((e) => ({
    type: e.type ?? null,
    message: e.message ?? null,
    data: e.data ?? null,
  }));
}

function pickExceptions(entries: GlitchTipEntryDto[]): ExceptionEntry[] {
  const entry = entries.find((e) => e.type === "exception");
  if (!entry) return [];
  const data = entry.data as { values?: GlitchTipExceptionValueDto[] };
  return (data.values ?? []).map(mapException);
}

function pickBreadcrumbs(entries: GlitchTipEntryDto[]): Breadcrumb[] {
  const entry = entries.find((e) => e.type === "breadcrumbs");
  if (!entry) return [];
  const data = entry.data as { values?: GlitchTipBreadcrumbDto[] };
  return (data.values ?? []).map(mapBreadcrumb);
}

function pickRequest(entries: GlitchTipEntryDto[]): EventRequest | null {
  const entry = entries.find((e) => e.type === "request");
  if (!entry) return null;
  return mapRequest(entry.data as GlitchTipRequestDto);
}

export function mapGlitchTipEvent(dto: GlitchTipEventDto): IssueEvent {
  const entries = dto.entries ?? [];
  return {
    id: dto.id,
    eventID: dto.eventID,
    dateCreated: dto.dateCreated,
    message: dto.message ?? null,
    platform: dto.platform ?? null,
    culprit: dto.culprit ?? null,
    tags: dto.tags ?? [],
    user: mapUser(dto.user),
    request: pickRequest(entries),
    contexts: dto.contexts ?? {},
    context: dto.context ?? {},
    metadata: dto.metadata ?? {},
    packages: mapPackages(dto.packages),
    sdk: mapSdk(dto.sdk),
    errors: mapErrors(dto.errors),
    exceptions: pickExceptions(entries),
    breadcrumbs: pickBreadcrumbs(entries),
  };
}
