import { describe, it, expect } from "vitest";
import { mapGlitchTipIssue } from "@/lib/errorMonitor/adapters/glitchtip/mappers/IssueMapper";
import type { GlitchTipIssueDto } from "@/lib/errorMonitor/adapters/glitchtip/dto/GlitchTipIssue";

function buildDto(overrides: Partial<GlitchTipIssueDto> = {}): GlitchTipIssueDto {
  return {
    id: "abc",
    title: "boom",
    level: "error",
    status: "unresolved",
    firstSeen: "2026-05-01T10:00:00Z",
    lastSeen: "2026-05-02T11:00:00Z",
    count: "42",
    project: { id: "p1", slug: "proj", name: "Proj", platform: "node" },
    metadata: { type: "TypeError", value: "x is undefined" },
    ...overrides,
  };
}

describe("mapGlitchTipIssue", () => {
  it("maps all flat fields", () => {
    const out = mapGlitchTipIssue(buildDto());

    expect(out).toEqual({
      id: "abc",
      title: "boom",
      type: "TypeError",
      level: "error",
      projectId: "p1",
      firstSeen: "2026-05-01T10:00:00Z",
      lastSeen: "2026-05-02T11:00:00Z",
      eventCount: 42,
      isResolved: false,
    });
  });

  it("coerces eventCount from string to number", () => {
    expect(mapGlitchTipIssue(buildDto({ count: "1000" })).eventCount).toBe(1000);
  });

  it("flags isResolved when status === resolved", () => {
    expect(mapGlitchTipIssue(buildDto({ status: "resolved" })).isResolved).toBe(true);
  });

  it("keeps isResolved false for unresolved or ignored", () => {
    expect(mapGlitchTipIssue(buildDto({ status: "unresolved" })).isResolved).toBe(false);
    expect(mapGlitchTipIssue(buildDto({ status: "ignored" })).isResolved).toBe(false);
  });

  it("pulls type from metadata, projectId from project", () => {
    const out = mapGlitchTipIssue(
      buildDto({
        metadata: { type: "ReferenceError", value: "y" },
        project: { id: "99", slug: "s", name: "n", platform: "py" },
      }),
    );

    expect(out.type).toBe("ReferenceError");
    expect(out.projectId).toBe("99");
  });
});
