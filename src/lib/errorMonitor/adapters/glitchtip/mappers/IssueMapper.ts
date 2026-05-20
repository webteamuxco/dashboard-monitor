import type { Issue } from "../../../domain/Issue";
import type {
  GlitchTipIssueDto,
} from "../dto/GlitchTipIssue";

export function mapGlitchTipIssue(dto: GlitchTipIssueDto): Issue {
  return {
    id: dto.id,
    title: dto.title,
    type: dto.metadata.type,
    level: dto.level,
    projectId: dto.project.id,
    firstSeen: dto.firstSeen,
    lastSeen: dto.lastSeen,
    eventCount: Number(dto.count),
    isResolved: dto.status === "resolved",
  };
}
