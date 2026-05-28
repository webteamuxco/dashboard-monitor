import type { IssueComment } from "../../../domain/IssueComment";
import type { GlitchTipCommentDto } from "../dto/GlitchTipComment";

export function mapGlitchTipComment(dto: GlitchTipCommentDto): IssueComment {
  return {
    id: dto.id,
    dateCreated: dto.dateCreated,
    text: dto.data?.text ?? "",
    authorName: dto.user?.name ?? null,
    authorEmail: dto.user?.email ?? null,
  };
}
