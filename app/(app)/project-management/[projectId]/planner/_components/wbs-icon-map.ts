import type { LucideIcon } from "lucide-react";
import {
  Folder,
  FolderOpen,
  FolderCog,
  Box,
  Package,
  Layers,
  Star,
  Circle,
  Square,
  Triangle,
  Hexagon,
  Bookmark,
  Flag,
  Zap,
  Shield,
  Target,
} from "lucide-react";

const WBS_ICON_MAP: Record<string, LucideIcon> = {
  Folder,
  FolderOpen,
  FolderCog,
  Box,
  Package,
  Layers,
  Star,
  Circle,
  Square,
  Triangle,
  Hexagon,
  Bookmark,
  Flag,
  Zap,
  Shield,
  Target,
};

const DEFAULT_ICON_ORDER: string[] = [
  "Folder",
  "FolderOpen",
  "Star",
  "Circle",
  "Square",
];

const ALL_ICON_NAMES: string[] = Object.keys(WBS_ICON_MAP);

/** Ordered list of design-token color classes for right-click cycling */
const WBS_ICON_COLORS: string[] = [
  "text-warning",
  "text-info",
  "text-success",
  "text-destructive",
  "text-accent-foreground",
  "text-primary",
  "text-muted-foreground",
];

const DEFAULT_ICON_COLOR = "text-warning";

function getNextIconColor(current: string): string {
  const idx = WBS_ICON_COLORS.indexOf(current);
  if (idx === -1) return WBS_ICON_COLORS[0];
  return WBS_ICON_COLORS[(idx + 1) % WBS_ICON_COLORS.length];
}

export { WBS_ICON_MAP, DEFAULT_ICON_ORDER, ALL_ICON_NAMES, WBS_ICON_COLORS, DEFAULT_ICON_COLOR, getNextIconColor };
