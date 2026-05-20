import { ErrorLevel } from "@/lib/errorMonitor/domain/ErrorLevel";
import type { Issue } from "../../../domain/Issue";
import type {
  GlitchTipIssueDto,
} from "../dto/GlitchTipIssue";
import { GlitchTipLevel } from "../dto/GlitchTipType";

function mapLevel(level: GlitchTipLevel): ErrorLevel {
  return level === "fatal" ? "error" : level;
}

export function mapGlitchTipIssue(dto: GlitchTipIssueDto): Issue {
  return {
    id: dto.id,
    title: dto.title,
    type: dto.metadata.type,
    level: mapLevel(dto.level),
    projectId: dto.project.id,
    firstSeen: dto.firstSeen,
    lastSeen: dto.lastSeen,
    eventCount: Number(dto.count),
    isResolved: dto.status === "resolved",
  };
}
