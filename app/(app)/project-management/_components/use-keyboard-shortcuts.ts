import { useEffect } from "react";

interface KeyboardShortcutActions {
  onCreateEps: () => void;
  onAddNode: () => void;
  onAddProject: () => void;
  onSearch: () => void;
}

function useKeyboardShortcuts(actions: KeyboardShortcutActions) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Don't trigger shortcuts when typing in inputs
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;

      if ((e.ctrlKey || e.metaKey) && e.key === "e") {
        e.preventDefault();
        actions.onCreateEps();
      } else if ((e.ctrlKey || e.metaKey) && e.altKey && e.key === "n") {
        e.preventDefault();
        actions.onAddNode();
      } else if ((e.ctrlKey || e.metaKey) && e.altKey && e.key === "p") {
        e.preventDefault();
        actions.onAddProject();
      } else if ((e.ctrlKey || e.metaKey) && e.key === "f") {
        e.preventDefault();
        actions.onSearch();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [actions]);
}

export { useKeyboardShortcuts, type KeyboardShortcutActions };
