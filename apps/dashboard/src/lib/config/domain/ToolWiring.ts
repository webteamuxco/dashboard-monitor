import { MonitorStrategy } from "./MonitorStrategy";
import { ToolConfiguration } from "./tool/ToolConfiguration";

/**
 * What a dashboard element (a KPI, a block) declares about the data it shows:
 * which monitor strategy it asks for, and through which tool. Both Strapi
 * content types project onto this same shape, which is why the monitor layer
 * receives it instead of a documentId — it never has to know which collection
 * the element came from.
 */
export interface ToolWiring {
    id: string
    strategy?: MonitorStrategy
    configuration?: ToolConfiguration
}
