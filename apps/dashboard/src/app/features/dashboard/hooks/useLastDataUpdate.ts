"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useSyncExternalStore } from "react";

/**
 * Freshest `dataUpdatedAt` across every mounted query, or 0 when nothing has
 * resolved yet.
 *
 * The header owns no query of its own since the wiring moved to the dashboard
 * elements, so the cache itself is the only thing that knows when the grid last
 * received data — which is also what the blanket "Rafraîchir" invalidation acts
 * on. The server snapshot stays 0 so the first paint agrees with the SSR one.
 */
export function useLastDataUpdate(): number {
  const cache = useQueryClient().getQueryCache();

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      // The cache notifies during another component's render — `useQuery`
      // builds its entry in the render pass of every card that mounts — and
      // React refuses a store update from there. A microtask lands it once that
      // pass is over, coalescing a whole grid's worth of events into one.
      let active = true;
      let scheduled = false;

      const unsubscribe = cache.subscribe(() => {
        if (scheduled) return;
        scheduled = true;
        queueMicrotask(() => {
          scheduled = false;
          if (active) onStoreChange();
        });
      });

      return () => {
        active = false;
        unsubscribe();
      };
    },
    [cache],
  );

  const getSnapshot = useCallback(
    () =>
      cache
        .getAll()
        .reduce((latest, query) => Math.max(latest, query.state.dataUpdatedAt), 0),
    [cache],
  );

  return useSyncExternalStore(subscribe, getSnapshot, () => 0);
}
