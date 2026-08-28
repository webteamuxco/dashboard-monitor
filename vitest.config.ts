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
    },
  },

  test: {
    globals: false,
    environment: "node",
    include: ["tests/**/*.test.ts"],

    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      include: ["apps/dashboard/src/**/*.ts"],
      exclude: [
        "apps/dashboard/src/**/*.d.ts",
        "apps/dashboard/src/**/queryKeys.ts",
        "apps/dashboard/src/**/domain/**",
        "apps/dashboard/src/**/dto/**",
        "apps/dashboard/src/**/strategy/**Interface.ts",
        "apps/dashboard/src/app/api/**",
      ],
    },
  },
});