"use client";

import { GripVertical } from "lucide-react";

function SplitterHandle() {
  return (
    <div
      data-testid="splitter-handle"
      className="flex items-center justify-center bg-border cursor-col-resize shrink-0 hover:bg-muted-hover"
      style={{ width: "6px" }}
    >
      <GripVertical size={10} className="text-muted-foreground" />
    </div>
  );
}

export { SplitterHandle };
