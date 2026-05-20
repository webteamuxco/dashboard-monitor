import { ErrorLevel } from "./ErrorLevel";

export interface Log {
  id: string;
  message: string;
  level: ErrorLevel;
  timestamp: string;
}

export interface LogFilters {
  query?: string;
}
