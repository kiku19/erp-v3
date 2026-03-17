"use client";

import { useCallback, useRef, type MouseEvent as ReactMouseEvent } from "react";
import { GripVertical } from "lucide-react";

interface SplitterHandleProps {
  onResizeStart?: () => void;
  onResize: (delta: number) => void;
  onResizeEnd?: () => void;
  testId?: string;
}

function SplitterHandle({ onResizeStart, onResize, onResizeEnd, testId = "splitter-handle" }: SplitterHandleProps) {
  const onResizeRef = useRef(onResize);
  onResizeRef.current = onResize;

  const handleMouseDown = useCallback(
    (e: ReactMouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const startX = e.clientX;
      onResizeStart?.();

      const onMouseMove = (ev: globalThis.MouseEvent) => {
        onResizeRef.current(ev.clientX - startX);
      };

      const onMouseUp = () => {
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
        onResizeEnd?.();
      };

      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    },
    [onResizeStart, onResizeEnd],
  );

  return (
    <div
      data-testid={testId}
      className="flex items-center justify-center bg-border cursor-col-resize shrink-0 hover:bg-muted-hover active:bg-primary/30"
      style={{ width: "6px" }}
      onMouseDown={handleMouseDown}
    >
      <GripVertical size={10} className="text-muted-foreground" />
    </div>
  );
}

export { SplitterHandle };
