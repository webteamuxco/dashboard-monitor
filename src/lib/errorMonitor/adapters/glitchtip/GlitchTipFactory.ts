import "server-only";
import type { ErrorMonitorFactoryInterface } from "../../factory/ErrorMonitorFactoryInterface";
import type { ErrorMonitorStrategyInterface } from "../../strategy/ErrorMonitorStrategyInterface";
import { GlitchTipClient } from "./GlitchTipClient";
import { GlitchTipStrategy } from "./GlitchTipStrategy";
import { GLITCHTIP } from "../../ErrorMonitorTypeEnums";

export class GlitchTipFactory implements ErrorMonitorFactoryInterface {
  support(errorMonitorType: string): boolean {
    return errorMonitorType === GLITCHTIP;
  }

  create(): ErrorMonitorStrategyInterface {
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
    return new GlitchTipStrategy(client, organizationSlug);
  }
}
