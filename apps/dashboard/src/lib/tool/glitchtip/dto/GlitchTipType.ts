export type GlitchTipLevel =
  | "error"
  | "warning"
  | "info"
  | "debug"
  | "fatal";

export const GLITCHTIP_STATUSES = [
  "unresolved",
  "resolved",
  "ignored",
] as const

export type GlitchTipStatus = typeof GLITCHTIP_STATUSES[number]

export const isGlitchTipStatus = (status: string): status is GlitchTipStatus => {
  return GLITCHTIP_STATUSES.includes(status as GlitchTipStatus)
}