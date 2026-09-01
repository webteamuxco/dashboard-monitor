import { ProjectConfiguration } from "./ProjectConfiguration";
import { TimeInterval } from "./TimeInterval";
import { DashboardPanel } from "./DashboardPanels";

export type Project = {
    documentId: string;
    slug: string;
    dashboardPanels: DashboardPanel[];
    defaultConfig?: ProjectConfiguration;
    timeInterval?: TimeInterval[]
};
