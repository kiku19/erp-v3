"use client";

import { memo } from "react";

const CodesTab = memo(function CodesTab() {
  return (
    <div
      data-testid="codes-tab"
      className="flex items-center justify-center h-full"
    >
      <p className="text-sm text-muted-foreground">Codes coming soon</p>
    </div>
  );
});

export { CodesTab };
