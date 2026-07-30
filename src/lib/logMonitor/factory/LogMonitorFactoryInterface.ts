import { FactoryInterface } from "@/lib/shared/factory/FactoryInterface";


export interface LogMonitorConnection {
  baseUrl: string;
  organizationSlug: string;
  projectId: string;
}

export interface LogMonitorFactoryInterface<TStrategy> extends FactoryInterface<TStrategy> {
}
