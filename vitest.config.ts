import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  root: path.resolve(__dirname),

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./apps/dashboard/src"),
      "server-only": path.resolve(
        __dirname,
        "./tests/shims/server-only.ts"
      ),
      // `next` is only installed in apps/dashboard, so the suite cannot resolve
      // — nor vi.mock — this specifier. See tests/shims/next-navigation.ts.
      "next/navigation": path.resolve(
        __dirname,
        "./tests/shims/next-navigation.ts"
      ),
    },
    // React, TanStack Query and Zustand live in apps/dashboard; the suite lives
    // here, so the root package.json devDependencies pin the same versions.
    // Deduping guarantees a single instance of each — two React copies break
    // every hook, and two QueryClient copies break every provider lookup.
    dedupe: ["react", "react-dom", "@tanstack/react-query", "zustand"],
  },

  test: {
    globals: false,
    // Node by default. Files that render React opt in with a
    // `// @vitest-environment jsdom` pragma on their first line.
    environment: "node",
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
    setupFiles: ["./tests/setup/cleanup.ts"],

    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      include: ["apps/dashboard/src/**/*.ts", "apps/dashboard/src/**/*.tsx"],
      exclude: [
        "apps/dashboard/src/**/*.d.ts",
        "apps/dashboard/src/**/domain/**",
        "apps/dashboard/src/**/dto/**",
        "apps/dashboard/src/**/strategy/**Interface.ts",
        "apps/dashboard/src/**/*TypeEnums.ts",
        "apps/dashboard/src/app/api/**",
        // shadcn-derived primitives and app shell.
        "apps/dashboard/src/components/**",
        "apps/dashboard/src/app/layout.tsx",
        "apps/dashboard/src/app/page.tsx",
        "apps/dashboard/src/app/providers.tsx",
        // Presentational widgets: a hook call (covered) plus Recharts markup.
        // Their logic — which of them mounts — is covered by DashboardContent
        // and KpiRow instead.
        "apps/dashboard/src/app/features/*/ui/*Panel.tsx",
        "apps/dashboard/src/app/features/*/ui/*Kpi.tsx",
        "apps/dashboard/src/app/features/*/ui/*KpiCard.tsx",
        "apps/dashboard/src/app/features/*/ui/*Sheet.tsx",
        "apps/dashboard/src/app/features/dashboard/ui/KpiCard.tsx",
      ],
    },
  },
});
