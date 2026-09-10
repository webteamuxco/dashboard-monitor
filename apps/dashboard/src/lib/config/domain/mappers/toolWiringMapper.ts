import { ToolConfigurationDto, ToolWiringDto } from "../dto/StrapiTool";
import { ToolConfiguration } from "../tool/ToolConfiguration";
import { ToolWiring } from "../ToolWiring";
import { dynamicZoneError } from "./dynamicZoneError";
import { mapMonitorStrategy } from "./monitorStrategyMapper";

export function mapToolWiring(dto: ToolWiringDto): ToolWiring {
    return {
        id: dto.documentId,
        strategy: mapMonitorStrategy(dto.strategy),
        configuration: dto.tool
            ? mapToolConfiguration(dto.tool.configuration)
            : undefined,
    };
}

/**
 * The vendor is read from the component's `__typename`, never from
 * `tool.slug`: the slug is an editable label in Strapi admin and can drift
 * from the configuration it is supposed to name.
 */
function mapToolConfiguration(
    dtos: (ToolConfigurationDto | null)[],
): ToolConfiguration | undefined {
    const configuration = dtos?.[0];

    if (!configuration) {
        return undefined;
    }

    switch (configuration.__typename) {
        case "ComponentConfigGlitchtipConfiguration":
            return {
                kind: "glitchtip",
                id: configuration.id,
                url: configuration.url,
                projectId: configuration.projectId,
                organization: configuration.organization,
            };
        case "ComponentConfigPosthogConfiguration":
            return {
                kind: "posthog",
                id: configuration.id,
                url: configuration.url,
                projectId: configuration.projectId,
            };
        case "Error":
            throw dynamicZoneError("tool.configuration", configuration);
    }
}
