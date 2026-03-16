"use client";

import { useState } from "react";
import { Network, X, ChevronRight, ChevronDown, Search, User } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/* ─────────────────────── Sample data ──────────────────────────── */

interface OrgNode {
  id: string;
  name: string;
  role: string;
  roleBadgeVariant: "default" | "secondary" | "success" | "warning" | "error";
  children?: OrgNode[];
}

const SAMPLE_ORG: OrgNode[] = [
  {
    id: "p1",
    name: "Rajesh Kumar",
    role: "Chief Operations Officer",
    roleBadgeVariant: "warning",
    children: [
      {
        id: "p2",
        name: "Sarah Chen",
        role: "Chief Technology Officer",
        roleBadgeVariant: "default",
        children: [
          { id: "p5", name: "Lisa Park", role: "Senior Engineer", roleBadgeVariant: "secondary" },
          { id: "p6", name: "Alex Rivera", role: "Software Engineer", roleBadgeVariant: "secondary" },
          { id: "p7", name: "Priya Sharma", role: "HR Manager", roleBadgeVariant: "success" },
        ],
      },
      {
        id: "p3",
        name: "Mike Torres",
        role: "Engineering Manager",
        roleBadgeVariant: "success",
        children: [
          { id: "p8", name: "James Wilson", role: "Operations Lead", roleBadgeVariant: "secondary" },
          { id: "p9", name: "Anita Patel", role: "Finance Controller", roleBadgeVariant: "warning" },
        ],
      },
      { id: "p4", name: "David Kim", role: "QA Engineer", roleBadgeVariant: "secondary" },
    ],
  },
];

interface PersonDetail {
  name: string;
  role: string;
  email: string;
  phone: string;
  department: string;
  location: string;
  jobTitle: string;
  employeeId: string;
  utilizationRate: number;
  activeProjects: number;
  availableHours: string;
  performanceGrade: string;
  skills: string[];
  projects: { name: string; role: string; status: string }[];
  calendar: string;
}

const SAMPLE_PERSON: PersonDetail = {
  name: "Sarah Chen",
  role: "Chief Technology Officer",
  email: "sarah.chen@acme.com",
  phone: "+1 (555) 234-5678",
  department: "Engineering",
  location: "Houston, TX — Office B6",
  jobTitle: "Engineering Lead",
  employeeId: "ME-0042",
  utilizationRate: 85,
  activeProjects: 3,
  availableHours: "24h/wk",
  performanceGrade: "A+",
  skills: ["Project Management", "Structural Engineering", "AutoCAD", "Risk Analysis", "Team Leadership", "MATLAB"],
  projects: [
    { name: "Horizon LNG Terminal", role: "Project Manager", status: "Active" },
    { name: "Deepwater Pipeline", role: "Tech Lead", status: "Active" },
    { name: "Solar Farm Alpha", role: "Advisor", status: "Support" },
  ],
  calendar: "Standard 6-Day Work Week",
};

/* ─────────────────────── Props ─────────────────────────────────── */

interface ObsModalProps {
  open: boolean;
  onClose: () => void;
}

/* ─────────────────────── Tree Node ─────────────────────────────── */

function TreeNode({
  node,
  depth,
  selectedId,
  expandedIds,
  onSelect,
  onToggle,
}: {
  node: OrgNode;
  depth: number;
  selectedId: string;
  expandedIds: Set<string>;
  onSelect: (id: string) => void;
  onToggle: (id: string) => void;
}) {
  const hasChildren = node.children && node.children.length > 0;
  const isExpanded = expandedIds.has(node.id);
  const isSelected = selectedId === node.id;

  return (
    <>
      <button
        onClick={() => {
          onSelect(node.id);
          if (hasChildren) onToggle(node.id);
        }}
        className={cn(
          "flex items-center gap-2 w-full py-1.5 px-2 text-left cursor-pointer transition-colors duration-[var(--duration-fast)] rounded-[4px]",
          isSelected ? "bg-primary-active text-primary-active-foreground" : "hover:bg-muted-hover",
        )}
        style={{ paddingLeft: `${8 + depth * 16}px` }}
      >
        {hasChildren ? (
          isExpanded ? <ChevronDown size={12} className="shrink-0" /> : <ChevronRight size={12} className="shrink-0" />
        ) : (
          <span className="w-3 shrink-0" />
        )}
        <User size={14} className="shrink-0" />
        <span className="text-[12px] font-medium truncate">{node.name}</span>
        <Badge
          variant={isSelected ? "secondary" : node.roleBadgeVariant}
          className="text-[9px] px-1.5 py-0 ml-auto shrink-0"
        >
          {node.role}
        </Badge>
      </button>
      {hasChildren && isExpanded && node.children!.map((child) => (
        <TreeNode
          key={child.id}
          node={child}
          depth={depth + 1}
          selectedId={selectedId}
          expandedIds={expandedIds}
          onSelect={onSelect}
          onToggle={onToggle}
        />
      ))}
    </>
  );
}

/* ─────────────────────── Stat Card ─────────────────────────────── */

function StatCard({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-1 rounded-md border border-border p-3 flex-1", className)}>
      <span className="text-lg font-bold text-foreground">{value}</span>
      <span className="text-[10px] text-muted-foreground">{label}</span>
    </div>
  );
}

/* ─────────────────────── Component ─────────────────────────────── */

function ObsModal({ open, onClose }: ObsModalProps) {
  const [selectedId, setSelectedId] = useState("p2");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set(["p1", "p2", "p3"]));

  const handleToggle = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const person = SAMPLE_PERSON; // In real implementation, derive from selectedId

  return (
    <Modal open={open} onClose={onClose} width={1152} className="h-[743px] max-h-[90vh]">
      <div className="flex flex-col h-full">
        {/* ── Header ── */}
        <div className="flex items-center justify-between h-14 px-6 border-b border-border shrink-0">
          <div className="flex items-center gap-2.5">
            <Network size={18} className="text-accent-foreground" />
            <span className="text-base font-semibold text-foreground">
              OBS — Organizational Breakdown Structure
            </span>
          </div>
          <button
            data-testid="obs-close-btn"
            onClick={onClose}
            className="flex items-center justify-center rounded-md border border-border bg-background p-2 text-foreground hover:bg-muted-hover cursor-pointer transition-colors duration-[var(--duration-fast)]"
          >
            <X size={16} />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left Panel — Org Tree */}
          <div className="w-[320px] border-r border-border flex flex-col shrink-0 bg-card">
            {/* Tree Header */}
            <div className="flex items-center justify-between h-11 px-4 border-b border-border">
              <span className="text-[13px] font-semibold text-foreground">Organization Tree</span>
              <button className="text-muted-foreground hover:text-foreground cursor-pointer">
                <Search size={14} />
              </button>
            </div>

            {/* Tree Content */}
            <div className="flex-1 overflow-auto py-2 px-2">
              {SAMPLE_ORG.map((node) => (
                <TreeNode
                  key={node.id}
                  node={node}
                  depth={0}
                  selectedId={selectedId}
                  expandedIds={expandedIds}
                  onSelect={setSelectedId}
                  onToggle={handleToggle}
                />
              ))}
            </div>

            {/* Shortcut Hints */}
            <div className="flex items-center justify-center gap-3 py-1.5 px-3 bg-muted text-[10px] text-muted-foreground">
              <span>↑↓ Navigate</span>
              <span>→ Expand</span>
              <span>← Collapse</span>
            </div>

            {/* Footer Stats */}
            <div className="flex items-center justify-between h-9 px-4 border-t border-border text-[11px] text-muted-foreground">
              <span>9 People</span>
              <span>4 Departments</span>
              <span>6 Positions</span>
            </div>
          </div>

          {/* Right Panel — Person Details */}
          <div className="flex-1 overflow-auto bg-background">
            {/* Person Header */}
            <div className="flex items-center justify-between h-[52px] px-6 border-b border-border">
              <div className="flex items-center gap-3">
                <span className="text-[14px] font-semibold text-foreground">{person.name}</span>
                <Badge variant="default">{person.role}</Badge>
                <Badge variant="success">Active</Badge>
              </div>
            </div>

            <div className="flex flex-col gap-5 p-6">
              {/* Stats Row */}
              <div className="flex gap-3">
                <StatCard label="Utilization Rate" value={`${person.utilizationRate}%`} />
                <StatCard label="Active Projects" value={`${person.activeProjects}`} />
                <StatCard label="Available Hours" value={person.availableHours} />
                <StatCard label="Performance" value={person.performanceGrade} className="border-success" />
              </div>

              {/* Current Project Assignments */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] font-semibold text-foreground">Current Project Assignments</span>
                    <Badge variant="secondary" className="text-[10px] px-2 py-0.5">{person.projects.length} projects</Badge>
                  </div>
                </div>
                <div className="border border-border rounded-md overflow-hidden">
                  {person.projects.map((proj, i) => (
                    <div key={i} className="flex items-center justify-between px-4 py-2.5 border-b border-border last:border-0">
                      <span className="text-[12px] text-foreground">{proj.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-muted-foreground">{proj.role}</span>
                        <Badge variant={proj.status === "Active" ? "success" : "secondary"} className="text-[10px]">
                          {proj.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Assigned Calendar */}
              <div className="flex items-center gap-3">
                <span className="text-[12px] font-semibold text-foreground">Assigned Calendar</span>
                <Badge variant="outline" className="text-[11px]">{person.calendar}</Badge>
              </div>

              {/* Skills & Competencies */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-[12px] font-semibold text-foreground">Skills & Competencies</span>
                  <Badge variant="secondary" className="text-[10px] px-2 py-0.5">{person.skills.length} skills</Badge>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {person.skills.map((skill) => (
                    <Badge key={skill} variant="outline" className="text-[11px]">{skill}</Badge>
                  ))}
                </div>
              </div>

              {/* Contact & Role */}
              <div className="flex flex-col gap-2">
                <span className="text-[12px] font-semibold text-foreground">Contact & Role</span>
                <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] text-muted-foreground">Email</span>
                    <span className="text-[12px] text-foreground">{person.email}</span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] text-muted-foreground">Job Title</span>
                    <span className="text-[12px] text-foreground">{person.jobTitle}</span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] text-muted-foreground">Phone</span>
                    <span className="text-[12px] text-foreground">{person.phone}</span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] text-muted-foreground">Department</span>
                    <span className="text-[12px] text-foreground">{person.department}</span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] text-muted-foreground">Location</span>
                    <span className="text-[12px] text-foreground">{person.location}</span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] text-muted-foreground">Employee ID</span>
                    <span className="text-[12px] text-foreground">{person.employeeId}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}

export { ObsModal };
export type { ObsModalProps };
