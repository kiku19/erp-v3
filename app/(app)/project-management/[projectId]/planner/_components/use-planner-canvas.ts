"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/lib/auth-context";
import type { ProjectData, PlannerEventInput, WbsNodeData, ActivityData, ActivityRelationshipData } from "./types";
import type { SaveStatus } from "@/components/ui/stale-banner";

/* ─────────────────────── Constants ────────────────────────────────────── */

const AUTOSAVE_DEBOUNCE_MS = 2000;
const AUTOSAVE_MAX_WAIT_MS = 10000;
const STALE_POLL_INTERVAL_MS = 5000;

/* ─────────────────────── Types ────────────────────────────────────────── */

interface UsePlannerCanvasReturn {
  project: ProjectData | null;
  loading: boolean;
  error: string | null;
  isStale: boolean;
  isOffline: boolean;
  saveStatus: SaveStatus;
  lastSavedAt: Date | null;
  pendingCount: number;
  initialWbsNodes: WbsNodeData[];
  initialActivities: ActivityData[];
  initialRelationships: ActivityRelationshipData[];
  queueEvent: (event: PlannerEventInput) => void;
  reload: () => Promise<void>;
}

/* ─────────────────────── Hook ─────────────────────────────────────────── */

function usePlannerCanvas(projectId: string): UsePlannerCanvasReturn {
  const { accessToken } = useAuth();
  const [project, setProject] = useState<ProjectData | null>(null);
  const [initialWbsNodes, setInitialWbsNodes] = useState<WbsNodeData[]>([]);
  const [initialActivities, setInitialActivities] = useState<ActivityData[]>([]);
  const [initialRelationships, setInitialRelationships] = useState<ActivityRelationshipData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isStale, setIsStale] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [pendingCount, setPendingCount] = useState(0);

  // Refs for event queue & version tracking
  const pendingEventsRef = useRef<PlannerEventInput[]>([]);
  const localVersionRef = useRef<number>(0);
  const firstUnsavedAtRef = useRef<number | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const maxWaitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSavingRef = useRef(false);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const headers = useCallback(() => {
    const h: Record<string, string> = { "Content-Type": "application/json" };
    if (accessToken) h["Authorization"] = `Bearer ${accessToken}`;
    return h;
  }, [accessToken]);

  /* ── Load planner state ── */
  const loadState = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/planner/canvas/state?projectId=${encodeURIComponent(projectId)}`,
        { headers: headers() },
      );
      if (res.ok) {
        const data = await res.json();
        setProject(data.project);
        setInitialWbsNodes(data.wbsNodes ?? []);
        setInitialActivities(data.activities ?? []);
        setInitialRelationships(data.relationships ?? []);
        localVersionRef.current = data.version ?? 0;
        setIsStale(false);
        pendingEventsRef.current = [];
        firstUnsavedAtRef.current = null;
        setPendingCount(0);
        setSaveStatus("idle");
      } else if (res.status === 404) {
        setError("Project not found");
      } else {
        setError("Failed to load project");
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }, [projectId, headers]);

  /* ── Save pending events ── */
  const saveCanvas = useCallback(async () => {
    const events = pendingEventsRef.current;
    if (events.length === 0 || isSavingRef.current) return;

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setSaveStatus("offline");
      return;
    }

    isSavingRef.current = true;
    setSaveStatus("saving");

    try {
      const res = await fetch("/api/planner/canvas/save", {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({
          projectId,
          baseVersion: localVersionRef.current,
          events,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        localVersionRef.current = data.version;
        pendingEventsRef.current = [];
        firstUnsavedAtRef.current = null;
        setPendingCount(0);
        setLastSavedAt(new Date());
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus((s) => (s === "saved" ? "idle" : s)), 3000);
      } else if (res.status === 409) {
        setIsStale(true);
        setSaveStatus("error");
      } else {
        setSaveStatus("error");
      }
    } catch {
      setSaveStatus("error");
    } finally {
      isSavingRef.current = false;
    }
  }, [projectId, headers]);

  /* ── Autosave scheduling ── */
  const scheduleSave = useCallback(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

    if (firstUnsavedAtRef.current === null) {
      firstUnsavedAtRef.current = Date.now();
      if (maxWaitTimerRef.current) clearTimeout(maxWaitTimerRef.current);
      maxWaitTimerRef.current = setTimeout(() => {
        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
        saveCanvas();
      }, AUTOSAVE_MAX_WAIT_MS);
    }

    const elapsed = Date.now() - (firstUnsavedAtRef.current ?? Date.now());
    if (elapsed >= AUTOSAVE_MAX_WAIT_MS) {
      saveCanvas();
      return;
    }

    debounceTimerRef.current = setTimeout(() => {
      if (maxWaitTimerRef.current) clearTimeout(maxWaitTimerRef.current);
      saveCanvas();
    }, AUTOSAVE_DEBOUNCE_MS);
  }, [saveCanvas]);

  /* ── Queue an event ── */
  const queueEvent = useCallback(
    (event: PlannerEventInput) => {
      pendingEventsRef.current = [...pendingEventsRef.current, event];
      setPendingCount(pendingEventsRef.current.length);
      scheduleSave();
    },
    [scheduleSave],
  );

  /* ── Stale polling ── */
  useEffect(() => {
    if (!accessToken || !projectId) return;

    pollTimerRef.current = setInterval(async () => {
      if (isSavingRef.current) return;
      try {
        const res = await fetch(
          `/api/planner/canvas/version?projectId=${encodeURIComponent(projectId)}`,
          { headers: headers() },
        );
        if (res.ok) {
          const data = await res.json();
          if (data.version > localVersionRef.current && pendingEventsRef.current.length === 0) {
            setIsStale(true);
          }
        }
      } catch {
        // Ignore poll failures
      }
    }, STALE_POLL_INTERVAL_MS);

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [accessToken, projectId, headers]);

  /* ── Initial load ── */
  useEffect(() => {
    if (accessToken && projectId) {
      loadState();
    }
  }, [accessToken, projectId, loadState]);

  /* ── Online/offline ── */
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      if (pendingEventsRef.current.length > 0) {
        setSaveStatus("saving");
        saveCanvas();
      } else {
        setSaveStatus((s) => (s === "offline" ? "idle" : s));
      }
    };
    const handleOffline = () => {
      setIsOffline(true);
      setSaveStatus("offline");
    };

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setIsOffline(true);
      setSaveStatus("offline");
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [saveCanvas]);

  /* ── Cleanup timers ── */
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      if (maxWaitTimerRef.current) clearTimeout(maxWaitTimerRef.current);
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, []);

  /* ── Reload ── */
  const reload = useCallback(async () => {
    pendingEventsRef.current = [];
    setPendingCount(0);
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    if (maxWaitTimerRef.current) clearTimeout(maxWaitTimerRef.current);
    await loadState();
  }, [loadState]);

  return {
    project,
    loading,
    error,
    isStale,
    isOffline,
    saveStatus,
    lastSavedAt,
    pendingCount,
    initialWbsNodes,
    initialActivities,
    initialRelationships,
    queueEvent,
    reload,
  };
}

export { usePlannerCanvas, type UsePlannerCanvasReturn };
