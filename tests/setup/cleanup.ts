import { afterEach } from "vitest";

// The suite runs with `globals: false`, so testing-library registers no cleanup
// of its own: without this, components mounted by one test survive into the
// next one and keep writing to the module-level Zustand stores.
//
// Loaded for every test file, including the node-environment ones — hence the
// guard and the dynamic import: `@testing-library/dom` touches `document` at
// module scope and would throw outside jsdom.
if (typeof document !== "undefined") {
  const { cleanup } = await import("@testing-library/react");
  afterEach(() => {
    cleanup();
  });
}
