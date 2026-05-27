import { ToolMappedType } from "../ToolMappedType";

export const POSTHOG = "posthog";

type TrackerMonitorType = ToolMappedType & {};

export const trackerMonitorMapper: TrackerMonitorType = {
  toolList: [POSTHOG],
};
