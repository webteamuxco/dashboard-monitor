import { StrategiesKey } from "@/lib/shared/strategiesEnum";
import { MappedTool } from "./MappedTools";

export type Strategy = {
    mapped_tool?: MappedTool | null;
    name: StrategiesKey;
}