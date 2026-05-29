import "server-only";
import { EventEmitter } from "node:events";

export type MonitorChangedEvent = {
  event: string;
  documentId?: string;
};

type EventMap = {
  "monitor:changed": (payload: MonitorChangedEvent) => void;
};

export interface MonitorEventBus {
  on<K extends keyof EventMap>(event: K, listener: EventMap[K]): this;
  off<K extends keyof EventMap>(event: K, listener: EventMap[K]): this;
  emit<K extends keyof EventMap>(
    event: K,
    ...args: Parameters<EventMap[K]>
  ): boolean;
}

class MonitorEventBusImpl extends EventEmitter implements MonitorEventBus {}

// Single instance per Node process: the webhook receiver (producer) and every
// open SSE stream (consumers) must share the same EventEmitter. globalThis
// pinning survives Next.js dev-mode HMR, which would otherwise create a fresh
// module instance and silently break the link.
const globalForBus = globalThis as unknown as {
  __monitorEventBus?: MonitorEventBus;
};

function createBus(): MonitorEventBus {
  const bus = new MonitorEventBusImpl();
  // One listener per connected SSE client; default cap of 10 is too low for
  // multi-TV deployments and would print spurious MaxListenersExceededWarning.
  bus.setMaxListeners(0);
  return bus;
}

export const eventBus: MonitorEventBus =
  globalForBus.__monitorEventBus ??
  (globalForBus.__monitorEventBus = createBus());
