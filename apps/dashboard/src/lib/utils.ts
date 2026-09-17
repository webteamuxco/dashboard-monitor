import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { MonitorStrategyTag } from "./config/domain/MonitorStrategy";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * The log monitor filters on a single query string, and the environment is a
 * suffix of the tag in this project's log naming (`reservation.sent.production`).
 * Several tags are ANDed, which is how the provider reads space-separated terms.
 */
export function buildLogQuery(
  tags: MonitorStrategyTag[],
  environment: string | null,
): string {
  return tags
    .map((tag) => (environment ? `${tag.value}.${environment}` : tag.value))
    .join(" ");
}


