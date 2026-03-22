"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { OrgSetupState } from "./types";
import type { SaveStatus } from "@/components/ui/stale-banner";

/* ─────────────────────── Constants ──────────────────────────────── */

const AUTOSAVE_DEBOUNCE_MS = 2000;
const AUTOSAVE_MAX_WAIT_MS = 10000;
const STORAGE_KEY = "opus_setup_draft";

/* ─────────────────────── Types ──────────────────────────────────── */

interface UseOrgAutosaveReturn {
  saveStatus: SaveStatus;
  lastSavedAt: Date | null;
}

/* ─────────────────────── Hook ───────────────────────────────────── */

/**
 * Auto-saves org setup state to localStorage with debounce.
 * Mirrors the planner's save pattern: 2s debounce + 10s max wait.
 * Strips ephemeral UI state before saving.
 */
function useOrgAutosave(state: OrgSetupState): UseOrgAutosaveReturn {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const maxWaitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firstUnsavedAtRef = useRef<number | null>(null);
  const isInitialLoadRef = useRef(true);
  const prevStateRef = useRef<string>("");

  // Strip UI state — only persist data
  const getDataFingerprint = useCallback((s: OrgSetupState): string => {
    const { ui: _ui, ...dataOnly } = s;
    return JSON.stringify(dataOnly);
  }, []);

  // Actual save to localStorage
  const save = useCallback(() => {
    try {
      const { ui: _ui, ...dataState } = state;
      const draft = {
        state: { ...dataState, ui: undefined },
        timestamp: new Date().toISOString(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
      setLastSavedAt(new Date());
      setSaveStatus("saved");
      firstUnsavedAtRef.current = null;
      setTimeout(() => setSaveStatus((s) => (s === "saved" ? "idle" : s)), 3000);
    } catch {
      setSaveStatus("error");
    }
  }, [state]);

  // Schedule save with debounce + max wait
  const scheduleSave = useCallback(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

    if (firstUnsavedAtRef.current === null) {
      firstUnsavedAtRef.current = Date.now();
      if (maxWaitTimerRef.current) clearTimeout(maxWaitTimerRef.current);
      maxWaitTimerRef.current = setTimeout(() => {
        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
        save();
      }, AUTOSAVE_MAX_WAIT_MS);
    }

    const elapsed = Date.now() - (firstUnsavedAtRef.current ?? Date.now());
    if (elapsed >= AUTOSAVE_MAX_WAIT_MS) {
      save();
      return;
    }

    debounceTimerRef.current = setTimeout(() => {
      if (maxWaitTimerRef.current) clearTimeout(maxWaitTimerRef.current);
      save();
    }, AUTOSAVE_DEBOUNCE_MS);
  }, [save]);

  // Watch state changes (data only, skip UI-only changes)
  useEffect(() => {
    const fingerprint = getDataFingerprint(state);

    // Skip initial mount (draft was just loaded — don't re-save it immediately)
    if (isInitialLoadRef.current) {
      isInitialLoadRef.current = false;
      prevStateRef.current = fingerprint;
      return;
    }

    // Skip if data hasn't actually changed (e.g. UI-only change like zoom/pan)
    if (fingerprint === prevStateRef.current) return;
    prevStateRef.current = fingerprint;

    scheduleSave();
  }, [state, getDataFingerprint, scheduleSave]);

  // Detect existing draft on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { timestamp?: string };
        if (parsed.timestamp) {
          setLastSavedAt(new Date(parsed.timestamp));
        }
      }
    } catch {
      // ignore
    }
  }, []);

  // Cleanup timers
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      if (maxWaitTimerRef.current) clearTimeout(maxWaitTimerRef.current);
    };
  }, []);

  return { saveStatus, lastSavedAt };
}

export { useOrgAutosave, type UseOrgAutosaveReturn };
