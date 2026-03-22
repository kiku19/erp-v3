/* ─────────────────────── OBS Node Types ─────────────────────────── */

type OBSNodeType = "COMPANY_ROOT" | "DIVISION" | "DEPARTMENT" | "TEAM";

interface OBSNode {
  id: string;
  name: string;
  code: string;
  type: OBSNodeType;
  parentId: string | null;
  children: string[];
  nodeHeadPersonId: string | null;
  calendarId: string | null;
  assignedRoles: AssignedRole[];
  costCentres: {
    labour: string | null;
    equipment: string | null;
    material: string | null;
    overhead: string | null;
  };
  isActive: boolean;
}

interface AssignedRole {
  roleId: string;
  standardRate: number | null;
  overtimeRate: number | null;
}

/* ─────────────────────── Resource Types ─────────────────────────── */

type PayType = "hourly" | "salaried" | "contract";
type EmploymentType = "full-time" | "part-time" | "contract" | "consultant";

interface Person {
  id: string;
  nodeId: string;
  name: string;
  employeeId: string;
  email: string;
  roleId: string | null;
  payType: PayType;
  standardRate: number | null;
  overtimeRate: number | null;
  overtimePay: boolean;
  monthlySalary: number | null;
  dailyAllocation: number | null;
  contractAmount: number | null;
  employmentType: EmploymentType;
  joinDate: string | null;
  photoUrl: string | null;
}

type EquipmentCategory = "safety" | "power-tool" | "hand-tool" | "machinery" | "vehicle" | "other";
type OwnershipType = "owned" | "rented" | "leased";
type BillingType = "daily-rental" | "hourly-rental" | "pay-per-use" | "owned-internal" | "fixed-hire";

interface Equipment {
  id: string;
  nodeId: string;
  name: string;
  code: string;
  category: EquipmentCategory;
  ownershipType: OwnershipType;
  billingType: BillingType;
  standardRate: number;
  idleRate: number | null;
  mobilizationCost: number | null;
  rentalStart: string | null;
  rentalEnd: string | null;
}

type MaterialCategory = "consumable" | "raw-material" | "component" | "chemical";
type UOM = "litre" | "kg" | "bag" | "piece" | "m2" | "m3" | "box" | "roll" | "set";
type CostBasis = "fixed" | "market-rate" | "contract-rate";

interface Material {
  id: string;
  nodeId: string;
  name: string;
  sku: string;
  category: MaterialCategory;
  uom: UOM;
  standardCostPerUnit: number;
  costBasis: CostBasis;
  wastageStandardPct: number;
  leadTimeDays: number | null;
  reorderPointQty: number | null;
}

/* ─────────────────────── Global Config Types ────────────────────── */

import type { CalendarData, CalendarExceptionData } from "@/lib/planner/calendar-types";

type Calendar = CalendarData;

type RoleLevel = "junior" | "mid" | "senior" | "lead" | "manager";

interface Role {
  id: string;
  name: string;
  code: string;
  level: RoleLevel;
  defaultPayType: PayType;
  overtimeEligible: boolean;
  skillTags: string[];
}

type CostCentreType = "labour" | "equipment" | "material" | "overhead" | "other";

interface CostCentre {
  id: string;
  code: string;
  description: string;
  type: CostCentreType;
}

/* ─────────────────────── UI State ───────────────────────────────── */

type GlobalPanelType = "calendars" | "roles" | "costcentres" | null;

interface UIState {
  selectedNodeId: string | null;
  openNodeModalId: string | null;
  activeModalTab: "people" | "resources" | "settings";
  zoom: number;
  panX: number;
  panY: number;
  addNodeTarget: { parentId: string; type: "child" | "sibling" } | null;
  globalPanelOpen: GlobalPanelType;
}

/* ─────────────────────── Root State ─────────────────────────────── */

interface OrgSetupState {
  company: {
    name: string;
    rootNodeId: string;
  };
  nodes: Record<string, OBSNode>;
  people: Record<string, Person>;
  equipment: Record<string, Equipment>;
  materials: Record<string, Material>;
  calendars: Record<string, Calendar>;
  roles: Record<string, Role>;
  costCentres: Record<string, CostCentre>;
  ui: UIState;
}

/* ─────────────────────── Layout Types ───────────────────────────── */

interface NodeLayout {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

/* ─────────────────────── Constants ──────────────────────────────── */

const NODE_WIDTH = 220;
const NODE_HEIGHT = 140;
const H_GAP = 80;
const V_GAP = 24;
const CANVAS_PADDING = 60;

const NODE_TYPE_BY_DEPTH: Record<number, OBSNodeType> = {
  0: "COMPANY_ROOT",
  1: "DIVISION",
  2: "DEPARTMENT",
  3: "TEAM",
};

const NODE_TYPE_LABELS: Record<OBSNodeType, string> = {
  COMPANY_ROOT: "Company",
  DIVISION: "Division",
  DEPARTMENT: "Department",
  TEAM: "Team",
};

const MAX_DEPTH = 3;

export {
  type OBSNodeType,
  type OBSNode,
  type AssignedRole,
  type PayType,
  type EmploymentType,
  type Person,
  type EquipmentCategory,
  type OwnershipType,
  type BillingType,
  type Equipment,
  type MaterialCategory,
  type UOM,
  type CostBasis,
  type Material,
  type Calendar,
  type CalendarExceptionData,
  type RoleLevel,
  type Role,
  type CostCentreType,
  type CostCentre,
  type GlobalPanelType,
  type UIState,
  type OrgSetupState,
  type NodeLayout,
  NODE_WIDTH,
  NODE_HEIGHT,
  H_GAP,
  V_GAP,
  CANVAS_PADDING,
  NODE_TYPE_BY_DEPTH,
  NODE_TYPE_LABELS,
  MAX_DEPTH,
};
