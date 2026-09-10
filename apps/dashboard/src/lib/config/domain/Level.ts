export const LEVELS = {
  TRACE: 'trace',
  DEBUG: 'debug',
  INTERNATIONAL: 'international',
  NOTICE: 'notice',
  INFO: 'info',
  WARNING: 'warning',
  ERROR: 'error',
  CRITICAL: 'critical',
  ALERT: 'alert',
  EMERGENCY: 'emergency',
} as const

export type Level = typeof LEVELS[keyof typeof LEVELS]