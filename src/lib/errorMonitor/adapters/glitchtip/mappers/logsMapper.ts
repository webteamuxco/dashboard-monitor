import { ErrorLevel } from "@/lib/errorMonitor/domain/ErrorLevel";
import { GlitchTipLevel } from "../dto/GlitchTipType";
import { GlitchTipLogDto } from "../dto/GlitchTipLogs";
import { Log } from "@/lib/errorMonitor/domain/Log";

function mapLevel(level: GlitchTipLevel): ErrorLevel {
  return level === "fatal" ? "error" : level;
}

export function mapGlitchTipLog(dto: GlitchTipLogDto): Log {
  return {
    id: dto.id,
    message: dto.body,
    level: mapLevel(dto.level),
    timestamp: dto.timestamp,
  };
}
