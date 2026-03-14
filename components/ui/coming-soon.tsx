"use client";

import { cn } from "@/lib/utils";
import { Construction } from "lucide-react";

interface ComingSoonProps {
  pageName: string;
  className?: string;
}

function ComingSoon({ pageName, className }: ComingSoonProps) {
  return (
    <div
      data-testid="coming-soon"
      className={cn(
        "flex flex-1 flex-col items-center justify-center gap-4 p-8",
        className,
      )}
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
        <Construction className="h-8 w-8 text-muted-foreground" />
      </div>
      <div className="flex flex-col items-center gap-1">
        <h1 className="text-2xl font-semibold text-foreground">{pageName}</h1>
        <p className="text-sm text-muted-foreground">
          This page is coming soon.
        </p>
      </div>
    </div>
  );
}

export { ComingSoon, type ComingSoonProps };
