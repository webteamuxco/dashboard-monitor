import { defineConfig, globalIgnores } from "eslint/config";
import js from "@eslint/js";
import tseslint from "typescript-eslint";

// Lints the root-level Vitest suite. Each app lints itself with its own config
// (see apps/dashboard/eslint.config.mjs); nothing here reaches into apps/.
export default defineConfig([
  globalIgnores([
    "node_modules/**",
    "apps/**",
    ".turbo/**",
    "coverage/**",
  ]),
  {
    files: ["tests/**/*.ts", "tests/**/*.tsx", "vitest.config.ts"],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // Mock factories legitimately take parameters they ignore, marked with a
      // leading underscore.
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
]);
