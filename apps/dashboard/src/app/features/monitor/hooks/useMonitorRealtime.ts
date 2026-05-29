"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { monitorKeys } from "../queryKeys";

const SSE_PATH = "/api/realtime/monitor";

// Mount this hook ONCE per browser tab (typically at the kiosk root). Each
// instance opens its own EventSource; multiple mounts mean multiple sockets
// and duplicate invalidations.
export function useMonitorRealtime() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const source = new EventSource(SSE_PATH);

    const onMessage = () => {
      queryClient.invalidateQueries({ queryKey: monitorKeys.all });
    };

    source.addEventListener("message", onMessage);

    return () => {
      source.removeEventListener("message", onMessage);
      source.close();
    };
  }, [queryClient]);
}
