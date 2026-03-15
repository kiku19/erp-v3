"use client";

import { Home, ChevronRight } from "lucide-react";

interface BreadcrumbBarProps {
  segments: string[];
  current: string;
}

export function BreadcrumbBar({ segments, current }: BreadcrumbBarProps) {
  return (
    <div className="flex items-center gap-1.5 px-5 h-9 border-b border-border bg-card shrink-0">
      <Home size={14} className="text-muted-foreground" />
      {segments.map((seg) => (
        <span key={seg} className="flex items-center gap-1.5">
          <ChevronRight size={12} className="text-muted-foreground" />
          <span className="text-[13px] text-muted-foreground">{seg}</span>
        </span>
      ))}
      <ChevronRight size={12} className="text-muted-foreground" />
      <span className="text-[13px] font-medium text-foreground">{current}</span>
    </div>
  );
}
