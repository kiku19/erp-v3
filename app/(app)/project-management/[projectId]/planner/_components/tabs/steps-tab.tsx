"use client";

import { memo } from "react";

const StepsTab = memo(function StepsTab() {
  return (
    <div
      data-testid="steps-tab"
      className="flex items-center justify-center h-full"
    >
      <p className="text-sm text-muted-foreground">Steps coming soon</p>
    </div>
  );
});

export { StepsTab };
