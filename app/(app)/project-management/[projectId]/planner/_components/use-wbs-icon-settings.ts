"use client";

import { useState, useCallback, useEffect } from "react";
import { DEFAULT_ICON_ORDER } from "./wbs-icon-map";

const STORAGE_KEY = "wbs-icon-settings";

interface WbsIconSettings {
  icons: string[];
}

interface UseWbsIconSettingsReturn {
  settings: WbsIconSettings;
  updateSettings: (icons: string[]) => void;
  getNextIcon: (currentIcon: string) => string;
}

function loadSettings(): WbsIconSettings {
  if (typeof window === "undefined") return { icons: DEFAULT_ICON_ORDER };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as WbsIconSettings;
      if (Array.isArray(parsed.icons) && parsed.icons.length > 0) {
        return parsed;
      }
    }
  } catch {
    // ignore parse errors
  }
  return { icons: DEFAULT_ICON_ORDER };
}

function useWbsIconSettings(): UseWbsIconSettingsReturn {
  const [settings, setSettings] = useState<WbsIconSettings>(loadSettings);

  // Sync from localStorage on mount (for SSR hydration)
  useEffect(() => {
    setSettings(loadSettings());
  }, []);

  const updateSettings = useCallback((icons: string[]) => {
    const next: WbsIconSettings = { icons };
    setSettings(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // storage full or unavailable
    }
  }, []);

  const getNextIcon = useCallback(
    (currentIcon: string): string => {
      const { icons } = settings;
      if (icons.length === 0) return currentIcon;
      const idx = icons.indexOf(currentIcon);
      if (idx === -1) return icons[0];
      return icons[(idx + 1) % icons.length];
    },
    [settings],
  );

  return { settings, updateSettings, getNextIcon };
}

export { useWbsIconSettings, STORAGE_KEY, DEFAULT_ICON_ORDER };
export type { WbsIconSettings, UseWbsIconSettingsReturn };
