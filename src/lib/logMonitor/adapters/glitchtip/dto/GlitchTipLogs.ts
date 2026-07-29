import { GlitchTipLevel } from "@/lib/tool/glitchtip/dto/GlitchTipType";

export interface GlitchTipLogDto {
  id: string;
  body: string;
  level: GlitchTipLevel;
  timestamp: string;
}
