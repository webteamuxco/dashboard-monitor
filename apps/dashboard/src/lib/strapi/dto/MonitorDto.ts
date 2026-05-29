import "server-only";

export interface StrapiMonitorDto {
  id: number;
  documentId: string;
  monitor_name: string;
  slug: string;
  is_interactive: boolean;
}

export interface StrapiListResponse<T> {
  data: T[];
  meta: {
    pagination?: {
      page: number;
      pageSize: number;
      pageCount: number;
      total: number;
    };
  };
}
