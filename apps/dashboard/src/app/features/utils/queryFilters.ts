export const SHOW_DEV_PANEL_QUERY_PARAM = "showDevelopmentPanel";

// No "use client" and no next/navigation import: page.tsx reads the param off
// its searchParams prop while usePanels reads it through useSearchParams, and
// both sides must resolve the flag through this one function.
export function readDevelopmentPanelParam(
  value: string | string[] | undefined,
): boolean {
  return (Array.isArray(value) ? value[0] : value) === "true";
}
