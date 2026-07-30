import { FactoryInterface } from "@/lib/shared/factory/FactoryInterface";

export interface ErrorMonitorConnection {
  baseUrl: string;
  organizationSlug: string;
  projectId: string;
}

export interface ErrorMonitorFactoryInterface<TStrategy> extends FactoryInterface<TStrategy> {

}
