import { DynamicZoneErrorDto } from "../dto/StrapiDynamicZone";

/**
 * Strapi lists `Error` among the members of every dynamic zone union. It only
 * arrives when Strapi itself failed to resolve a component, which no fallback
 * can repair — so the mappers turn it into a throw rather than an absent value.
 */
export function dynamicZoneError(zone: string, dto: DynamicZoneErrorDto): Error {
    return new Error(
        `Strapi returned an error for the "${zone}" dynamic zone: ${dto.code}` +
            (dto.message ? ` — ${dto.message}` : ""),
    );
}
