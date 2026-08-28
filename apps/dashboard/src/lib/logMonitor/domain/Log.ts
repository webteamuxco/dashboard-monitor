import { LogLevel } from "./LogLevel";

export interface Log {
  id: string;
  message: string;
  level: LogLevel;
  timestamp: string;
}

export interface LogFilters {
  query?: string;
}
