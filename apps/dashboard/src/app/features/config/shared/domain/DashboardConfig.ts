export type MonitoringTool = string;

export interface DashboardConfig {
  selectedLogTool: MonitoringTool | null;
  selectedErrorTool: MonitoringTool | null;
}

export function getDefaultDashboardConfig(): DashboardConfig {
  return {
    selectedLogTool: process.env.NEXT_PUBLIC_LOG_MONITOR_DRIVER ?? null,
    selectedErrorTool: process.env.NEXT_PUBLIC_ERROR_MONITOR_DRIVER ?? null,
  };
}
