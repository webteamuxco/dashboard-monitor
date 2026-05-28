import "server-only";
import type { LogMonitorFactoryInterface } from "../../factory/LogMonitorFactoryInterface";
import type { LogMonitorStrategyInterface } from "../../strategy/LogMonitorStrategyInterface";
import { GlitchTipClient } from "@/lib/glitchtip/GlitchTipClient";
import { GlitchTipLogMonitorStrategy } from "./GlitchTipLogMonitorStrategy";
import { GLITCHTIP } from "../../LogMonitorTypeEnums";

export class GlitchTipLogMonitorFactory implements LogMonitorFactoryInterface {
  support(logMonitorType: string): boolean {
    return logMonitorType === GLITCHTIP;
  }

  create(): LogMonitorStrategyInterface {
    const baseUrl = process.env.GLITCHTIP_URL;
    const token = process.env.GLITCHTIP_TOKEN;
    const organizationSlug = process.env.GLITCHTIP_ORGANIZATION_SLUG;

    if (!baseUrl || !token || !organizationSlug) {
      throw new Error(
        "GlitchTip env vars missing: GLITCHTIP_URL, GLITCHTIP_TOKEN, " +
          "GLITCHTIP_ORGANIZATION_SLUG are all required.",
      );
    }

    const client = new GlitchTipClient({ baseUrl, token });
    return new GlitchTipLogMonitorStrategy(client, organizationSlug);
  }
}
