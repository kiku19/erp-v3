"use client";

import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";

function ResourcesTab() {
  return (
    <div data-testid="resources-tab" className="flex flex-col gap-4 p-4 h-full overflow-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-[12px] font-semibold text-foreground">Assigned Resources</span>
        </div>
        <Button variant="ghost" size="sm" className="h-6 px-2 text-[11px]">
          <UserPlus size={12} />
          Assign Resource
        </Button>
      </div>

      {/* Column headers */}
      <div className="flex items-center rounded-t-[4px] bg-muted px-2 py-1.5">
        <span className="w-[200px] text-[11px] font-semibold text-muted-foreground">Resource</span>
        <span className="flex-1 text-[11px] font-semibold text-muted-foreground">Role</span>
        <span className="w-[100px] text-right text-[11px] font-semibold text-muted-foreground">Budgeted (h)</span>
        <span className="w-[100px] text-right text-[11px] font-semibold text-muted-foreground">Actual (h)</span>
        <span className="w-[100px] text-right text-[11px] font-semibold text-muted-foreground">Remaining (h)</span>
        <span className="w-[80px] text-right text-[11px] font-semibold text-muted-foreground">Hrs/Day</span>
      </div>

      {/* Empty state */}
      <div className="flex items-center justify-center py-8">
        <span className="text-[12px] text-muted-foreground">No resources assigned</span>
      </div>
    </div>
  );
}

export { ResourcesTab };
