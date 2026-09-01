import { ProjectConfiguration } from "./ProjectConfiguration";
import { TimeInterval } from "./TimeInterval";

export type Project = {
    documentId: string;
    slug: string;
    defaultConfig?: ProjectConfiguration;
    timeInterval?: TimeInterval[]
};
