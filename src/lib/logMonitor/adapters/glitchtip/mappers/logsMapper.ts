import { LogLevel } from "@/lib/logMonitor/domain/LogLevel";
import { GlitchTipLevel } from "@/lib/glitchtip/dto/GlitchTipType";
import { GlitchTipLogDto } from "../dto/GlitchTipLogs";
import { Log } from "@/lib/logMonitor/domain/Log";

function mapLevel(level: GlitchTipLevel): LogLevel {
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
