import { GlitchTipLevel } from "@/lib/glitchtip/dto/GlitchTipType";

export interface GlitchTipLogDto {
  id: string;
  body: string;
  level: GlitchTipLevel;
  timestamp: string;
}
