import { GlitchTipLevel, GlitchTipStatus } from "./GlitchTipType";

export interface GlitchTipIssueDto {
  id: string;
  title: string;
  level: GlitchTipLevel;
  status: GlitchTipStatus;
  firstSeen: string;
  lastSeen: string;
  count: string;
  project: {
    id: string;
    slug: string;
    name: string;
    platform: string;
  };
  metadata: {
    type: string;
    value: string;
  }
}
