import { icons, LucideIcon } from "lucide-react";

export function getLucideIcon(name?: string | null): LucideIcon {
  if (!name) {
    return icons.Circle;
  }

  const iconName = name
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");

  return icons[iconName as keyof typeof icons] ?? icons.Circle;
}