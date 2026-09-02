import {
  render,
  renderHook,
  type RenderHookResult,
  type RenderResult,
} from "@testing-library/react";
import type { ReactElement } from "react";
import type { QueryClient } from "@tanstack/react-query";
import { createTestQueryClient, withQueryClient } from "./queryClient";

// Unmounting between tests is handled globally by tests/setup/cleanup.ts.

// NoInfer on initialProps: the prop type must come from the hook's own
// signature, otherwise TS narrows it to the first value passed and `rerender`
// with anything else stops type-checking.
/**
 * Renders a hook inside a fresh QueryClientProvider. Every call gets its own
 * client, so one test's cache can never satisfy another's query.
 */
export function renderQueryHook<TProps, TResult>(
  hook: (props: TProps) => TResult,
  initialProps: NoInfer<TProps>,
): RenderHookResult<TResult, TProps> {
  return renderHook(hook, {
    initialProps: initialProps as TProps,
    wrapper: withQueryClient(createTestQueryClient()),
  });
}

/**
 * Same, but hands back the client so a test can inspect the resolved query
 * options — the only reliable way to assert on `refetchInterval` without
 * racing timers.
 */
export function renderQueryHookWithClient<TProps, TResult>(
  hook: (props: TProps) => TResult,
  initialProps: NoInfer<TProps>,
): RenderHookResult<TResult, TProps> & { client: QueryClient } {
  const client = createTestQueryClient();

  return {
    ...renderHook(hook, {
      initialProps: initialProps as TProps,
      wrapper: withQueryClient(client),
    }),
    client,
  };
}

/** The `refetchInterval` TanStack Query resolved for a mounted query. */
export function refetchIntervalOf(
  client: QueryClient,
  queryKey: readonly unknown[],
): number | false | undefined {
  const query = client.getQueryCache().find({ queryKey });
  // The cache types `options` as QueryOptions, which drops the observer-only
  // fields; refetchInterval is one of them.
  const options = query?.options as
    | { refetchInterval?: number | false }
    | undefined;

  return options?.refetchInterval;
}

/** Same contract for a component under test. */
export function renderWithQuery(ui: ReactElement): RenderResult {
  return render(ui, { wrapper: withQueryClient(createTestQueryClient()) });
}
