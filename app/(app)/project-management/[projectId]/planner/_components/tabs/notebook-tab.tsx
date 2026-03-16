"use client";

import { Edit3, Paperclip } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

function NotebookTab() {
  return (
    <div data-testid="notebook-tab" className="flex gap-5 p-4 h-full overflow-auto">
      {/* Description & Notes */}
      <div className="flex flex-col gap-2.5 flex-1">
        <div className="flex items-center justify-between">
          <span className="text-[12px] font-semibold text-foreground">Description & Notes</span>
          <button className="text-muted-foreground hover:text-foreground cursor-pointer">
            <Edit3 size={14} />
          </button>
        </div>
        <Textarea
          placeholder="Enter activity notes and descriptions..."
          className="flex-1 min-h-[120px] text-[12px] resize-none"
        />
      </div>

      {/* Attachments */}
      <div className="flex flex-col gap-2.5 w-[320px]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[12px] font-semibold text-foreground">Attachments</span>
            <span className="text-[11px] text-muted-foreground">0</span>
          </div>
          <button className="text-muted-foreground hover:text-foreground cursor-pointer">
            <Paperclip size={14} />
          </button>
        </div>
        <div className="flex items-center justify-center py-6 rounded-md border border-dashed border-border">
          <span className="text-[12px] text-muted-foreground">No attachments</span>
        </div>
      </div>
    </div>
  );
}

export { NotebookTab };
