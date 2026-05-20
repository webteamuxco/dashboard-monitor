import { GlitchTipLevel } from "./GlitchTipType";

export interface GlitchTipLogDto {
  id: string;
  body: string;
  level: GlitchTipLevel;
  timestamp: string;
}
