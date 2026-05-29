import "server-only";
import { cache } from "react";
import { getStrapiClient } from "@/lib/strapi/getStrapiClient";
import type {
  StrapiListResponse,
  StrapiMonitorDto,
} from "@/lib/strapi/dto/MonitorDto";
import type { Monitor } from "../domain/Monitor";

const MONITORS_PATH = "/api/monitors";

function toDomain(dto: StrapiMonitorDto): Monitor {
  return {
    id: dto.id,
    documentId: dto.documentId,
    name: dto.monitor_name,
    slug: dto.slug,
    isInteractive: dto.is_interactive,
  };
}

const fetchList = cache(async (): Promise<Monitor[]> => {
  const params = new URLSearchParams();
  params.set("pagination[pageSize]", "100");
  const res = await getStrapiClient().get<StrapiListResponse<StrapiMonitorDto>>(
    MONITORS_PATH,
    params,
  );
  return res.data.map(toDomain);
});

const fetchBySlug = cache(async (slug: string): Promise<Monitor | null> => {
  const params = new URLSearchParams();
  params.set("filters[slug][$eq]", slug);
  params.set("pagination[pageSize]", "1");
  const res = await getStrapiClient().get<StrapiListResponse<StrapiMonitorDto>>(
    MONITORS_PATH,
    params,
  );
  const first = res.data[0];
  return first ? toDomain(first) : null;
});

export class MonitorDataAccess {
  list(): Promise<Monitor[]> {
    return fetchList();
  }

  bySlug(slug: string): Promise<Monitor | null> {
    return fetchBySlug(slug);
  }
}

export const monitorDataAccess = new MonitorDataAccess();
