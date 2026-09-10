export type ALLOWED_INTERVAL = "seconds" | "minutes" | "days" | "hours"
export interface TimeIntervalDto {
    duration: number;
    interval: ALLOWED_INTERVAL
}

export interface DefaultConfigDto {
    DefaultRefreshIntervalMS: number | null;
}

export interface ProjectDto {
    documentId: string;
    slug: string;
    default_config: DefaultConfigDto | null;
    timeInterval: TimeIntervalDto[]
}

export interface DashboardPanelDto {
    documentId: string;
    name: string;
    icon: string;
    order: number;
    slug: string;
    is_development: boolean;
    display_name: string;
}

export interface ProjectSummaryDto {
    documentId: string;
    publishedAt: string;
    title: string;
    updatedAt: string;
    slug: string;
}
