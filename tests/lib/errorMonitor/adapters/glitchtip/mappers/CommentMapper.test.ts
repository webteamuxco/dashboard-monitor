import { describe, it, expect } from "vitest";
import { mapGlitchTipComment } from "@/lib/errorMonitor/adapters/glitchtip/mappers/CommentMapper";
import type { GlitchTipCommentDto } from "@/lib/errorMonitor/adapters/glitchtip/dto/GlitchTipComment";

describe("mapGlitchTipComment", () => {
  it("maps the fully populated dto", () => {
    const dto: GlitchTipCommentDto = {
      id: "c1",
      dateCreated: "2026-05-28T10:00:00Z",
      user: { name: "Alice", email: "a@b.c" },
      data: { text: "hello" },
    };

    expect(mapGlitchTipComment(dto)).toEqual({
      id: "c1",
      dateCreated: "2026-05-28T10:00:00Z",
      text: "hello",
      authorName: "Alice",
      authorEmail: "a@b.c",
    });
  });

  it("uses an empty string when data.text is missing", () => {
    const dto: GlitchTipCommentDto = {
      id: "c2",
      dateCreated: "2026-05-28T10:00:00Z",
      data: {},
    };

    expect(mapGlitchTipComment(dto).text).toBe("");
  });

  it("defaults authorName and authorEmail to null when user is null or missing", () => {
    const out = mapGlitchTipComment({
      id: "c3",
      dateCreated: "2026-05-28T10:00:00Z",
      user: null,
    });

    expect(out.authorName).toBeNull();
    expect(out.authorEmail).toBeNull();
  });

  it("preserves null individual user fields", () => {
    const out = mapGlitchTipComment({
      id: "c4",
      dateCreated: "2026-05-28T10:00:00Z",
      user: { name: null, email: null },
    });

    expect(out.authorName).toBeNull();
    expect(out.authorEmail).toBeNull();
  });
});
