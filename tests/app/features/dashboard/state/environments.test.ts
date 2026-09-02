import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const ENV_LIST = "NEXT_PUBLIC_DASHBOARD_ENVIRONMENTS";
const ENV_DEFAULT = "NEXT_PUBLIC_DASHBOARD_DEFAULT_ENVIRONMENT";

/**
 * `environments.ts` reads the env list at module scope (ENVIRONMENT_OPTIONS),
 * so each case re-imports the module with a fresh registry.
 */
async function loadEnvironments() {
  vi.resetModules();
  return import("@/app/features/dashboard/state/environments");
}

describe("parseEnvironmentOptions", () => {
  beforeEach(() => {
    delete process.env[ENV_LIST];
    delete process.env[ENV_DEFAULT];
  });

  afterEach(() => {
    delete process.env[ENV_LIST];
    delete process.env[ENV_DEFAULT];
  });

  it("returns an empty list when the variable is unset", async () => {
    const { parseEnvironmentOptions } = await loadEnvironments();

    expect(parseEnvironmentOptions()).toEqual([]);
  });

  it("splits a comma-separated list", async () => {
    process.env[ENV_LIST] = "production,staging";
    const { parseEnvironmentOptions } = await loadEnvironments();

    expect(parseEnvironmentOptions()).toEqual(["production", "staging"]);
  });

  it("trims whitespace and drops empty entries", async () => {
    process.env[ENV_LIST] = " production , , staging ,";
    const { parseEnvironmentOptions } = await loadEnvironments();

    expect(parseEnvironmentOptions()).toEqual(["production", "staging"]);
  });
});

describe("resolveDefaultEnvironment", () => {
  beforeEach(() => {
    delete process.env[ENV_LIST];
    delete process.env[ENV_DEFAULT];
  });

  afterEach(() => {
    delete process.env[ENV_LIST];
    delete process.env[ENV_DEFAULT];
  });

  it("returns null when no environment is configured — 'all environments'", async () => {
    const { resolveDefaultEnvironment } = await loadEnvironments();

    expect(resolveDefaultEnvironment()).toBeNull();
  });

  it("returns the requested default when it belongs to the list", async () => {
    process.env[ENV_LIST] = "production,staging";
    process.env[ENV_DEFAULT] = "staging";
    const { resolveDefaultEnvironment } = await loadEnvironments();

    expect(resolveDefaultEnvironment()).toBe("staging");
  });

  it("trims the requested default before matching", async () => {
    process.env[ENV_LIST] = "production,staging";
    process.env[ENV_DEFAULT] = "  staging  ";
    const { resolveDefaultEnvironment } = await loadEnvironments();

    expect(resolveDefaultEnvironment()).toBe("staging");
  });

  it("falls back to the first entry when the requested default is unknown", async () => {
    process.env[ENV_LIST] = "production,staging";
    process.env[ENV_DEFAULT] = "preprod";
    const { resolveDefaultEnvironment } = await loadEnvironments();

    expect(resolveDefaultEnvironment()).toBe("production");
  });

  it("falls back to the first entry when no default is requested", async () => {
    process.env[ENV_LIST] = "production,staging";
    const { resolveDefaultEnvironment } = await loadEnvironments();

    expect(resolveDefaultEnvironment()).toBe("production");
  });

  it("returns null when a default is requested but the list is empty", async () => {
    process.env[ENV_DEFAULT] = "production";
    const { resolveDefaultEnvironment } = await loadEnvironments();

    // The server prefetch and the Zustand store must agree on this value, so
    // an unusable default has to resolve the same way on both sides.
    expect(resolveDefaultEnvironment()).toBeNull();
  });
});

describe("useEnvironment store", () => {
  afterEach(() => {
    delete process.env[ENV_LIST];
    delete process.env[ENV_DEFAULT];
  });

  it("starts from the same resolver the server prefetch uses", async () => {
    process.env[ENV_LIST] = "production,staging";
    process.env[ENV_DEFAULT] = "staging";
    vi.resetModules();

    const { useEnvironment } = await import(
      "@/app/features/dashboard/state/useEnvironment"
    );
    const { resolveDefaultEnvironment } = await import(
      "@/app/features/dashboard/state/environments"
    );

    expect(useEnvironment.getState().environment).toBe(
      resolveDefaultEnvironment(),
    );
  });

  it("stores the selected environment, null meaning all", async () => {
    vi.resetModules();
    const { useEnvironment } = await import(
      "@/app/features/dashboard/state/useEnvironment"
    );

    useEnvironment.getState().setEnvironment("production");
    expect(useEnvironment.getState().environment).toBe("production");

    useEnvironment.getState().setEnvironment(null);
    expect(useEnvironment.getState().environment).toBeNull();
  });
});
