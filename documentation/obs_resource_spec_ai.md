# OPUS ERP — Phase 1: OBS & Resource Pool
## Machine-Readable Implementation Specification

---

```yaml
metadata:
  product: OPUS ERP
  document_type: implementation_specification
  version: "1.0"
  phase: 1
  phase_name: "OBS and Resource Pool"
  phase_label: "Foundation Layer"
  entry_point: "navigation menu"
  depends_on: []
  required_by:
    - phase: 2
      name: "EPS and WBS"
      reason: "WBS nodes require OBS node assignment for responsibility mapping"
    - phase: 3
      name: "Activity Planning"
      reason: "Activity resource assignment requires Resource Pool records"
    - phase: 4
      name: "Execution"
      reason: "Timesheet approval routing requires OBS approval chain"
    - phase: 5
      name: "EVM and Reporting"
      reason: "Cost centre tagging requires OBS cost centre mapping"
  sub_phases:
    - id: "1A"
      name: "OBS Foundation"
      description: "Organisational tree, roles, rate cards, approval chains, cost centres"
    - id: "1B"
      name: "Resource Pool"
      description: "Person, equipment and material records linked to OBS"
  modules_affected:
    - OBS
    - ResourcePool
    - Finance (cost centre tagging)
    - Timesheet (approval routing)
  can_run_parallel_with: []
  build_priority_order:
    - OBS tree structure
    - OBS role definitions and rate cards
    - OBS approval chain
    - OBS working hours policy
    - OBS cost centre mapping
    - Person records
    - Equipment records
    - Material catalogue
    - Availability heatmap display
    - Cross-project allocation view
```

---

## 1. Module Relationship

```
OBS_MODULE
  └── provides: organisational structure, roles, rate cards, approval chains, cost centres
  └── consumed_by: ResourcePool, ActivityPlanning, Timesheet, Finance

RESOURCE_POOL_MODULE
  └── requires: OBS (every resource record must link to an OBS node)
  └── provides: persons, equipment, materials with project-relevant metadata
  └── consumed_by: ActivityPlanning (resource assignment picker)

DEPENDENCY_RULE:
  A resource record cannot be created without a valid OBS node reference.
  An OBS node cannot be deleted if it has active resource records linked to it.
```

---

## 2. Phase 1A — OBS Module

### 2.1 OBS Node

**Purpose:** Represents one unit in the organisational hierarchy. Every resource, cost, and approval route anchors to an OBS node.

```json
{
  "entity": "OBSNode",
  "fields": {
    "id": {
      "type": "uuid",
      "required": true,
      "auto_generated": true
    },
    "parent_id": {
      "type": "uuid | null",
      "required": false,
      "nullable": true,
      "note": "null only for the single root node (company level)"
    },
    "name": {
      "type": "string",
      "required": true,
      "max_length": 100,
      "example": "Civil Division"
    },
    "code": {
      "type": "string",
      "required": true,
      "max_length": 20,
      "unique": true,
      "example": "CIVIL-01",
      "note": "Used in cost centre tagging and reports"
    },
    "node_type": {
      "type": "enum",
      "required": true,
      "values": ["COMPANY_ROOT", "DIVISION", "DEPARTMENT", "TEAM"],
      "constraint": "Only one COMPANY_ROOT node is allowed per tenant"
    },
    "node_head_person_id": {
      "type": "uuid",
      "required": true,
      "references": "Person.id",
      "note": "Receives approval escalations and notifications for this node"
    },
    "is_active": {
      "type": "boolean",
      "required": true,
      "default": true,
      "note": "Soft delete. Inactive nodes hidden from pickers but retained for history."
    },
    "cost_centre_labour": {
      "type": "string",
      "required": true,
      "example": "CC-CIVIL-001",
      "note": "Auto-tags all labour AC entries from resources in this node"
    },
    "cost_centre_equipment": {
      "type": "string",
      "required": false,
      "example": "CC-CIVIL-EQUIP"
    },
    "cost_centre_material": {
      "type": "string",
      "required": false,
      "example": "CC-CIVIL-MAT"
    },
    "cost_centre_overhead": {
      "type": "string",
      "required": false,
      "note": "Used for LOE and support activities"
    },
    "timesheet_approver_id": {
      "type": "uuid",
      "required": true,
      "references": "Person.id",
      "default_to": "node_head_person_id",
      "note": "Can differ from node_head. Timesheets from persons in this node route here."
    },
    "approval_escalation_days": {
      "type": "integer",
      "required": true,
      "default": 2,
      "note": "If timesheet not approved within N days, auto-escalate to parent node head"
    },
    "expense_threshold_l1": {
      "type": "float",
      "required": true,
      "default": 5000,
      "note": "Expenses below this amount approved by supervisor (Level 1)"
    },
    "expense_threshold_l2": {
      "type": "float",
      "required": true,
      "default": 50000,
      "note": "Expenses between L1 and L2 approved by division head (Level 2). Above L2 = finance."
    },
    "standard_hours_day": {
      "type": "float",
      "required": true,
      "default": 8.0,
      "note": "Used to validate planned_hours vs activity duration in resource assignment"
    },
    "working_days_week": {
      "type": "integer",
      "required": true,
      "default": 5,
      "allowed_values": [5, 6]
    },
    "max_overtime_hours_day": {
      "type": "float",
      "required": false,
      "default": 4.0
    },
    "overtime_multiplier_weekday": {
      "type": "float",
      "required": false,
      "default": 1.5
    },
    "overtime_multiplier_holiday": {
      "type": "float",
      "required": false,
      "default": 2.0
    },
    "holiday_calendar_id": {
      "type": "uuid",
      "required": false,
      "references": "Calendar.id"
    }
  },
  "validation_rules": [
    {
      "rule_id": "OBS-V01",
      "description": "Only one COMPANY_ROOT node allowed per tenant",
      "condition": "node_type == COMPANY_ROOT",
      "check": "COUNT(OBSNode WHERE node_type == COMPANY_ROOT AND tenant_id == current) == 0",
      "action": "BLOCK_SAVE",
      "message": "A root company node already exists."
    },
    {
      "rule_id": "OBS-V02",
      "description": "Cannot delete node with active resources",
      "condition": "DELETE attempted on OBSNode",
      "check": "COUNT(Person WHERE obs_node_id == target_id AND is_active == true) == 0",
      "action": "BLOCK_DELETE",
      "message": "Cannot delete OBS node with active resources. Reassign or deactivate resources first."
    },
    {
      "rule_id": "OBS-V03",
      "description": "node_head_person_id must reference an active person",
      "condition": "ON CREATE or UPDATE",
      "check": "Person(node_head_person_id).is_active == true",
      "action": "BLOCK_SAVE"
    }
  ]
}
```

---

### 2.2 OBS Role

**Purpose:** Defines what roles exist within an OBS node. Roles are node-scoped — the same role name carries different rates in different divisions.

```json
{
  "entity": "OBSRole",
  "fields": {
    "id": { "type": "uuid", "required": true, "auto_generated": true },
    "obs_node_id": {
      "type": "uuid",
      "required": true,
      "references": "OBSNode.id"
    },
    "name": {
      "type": "string",
      "required": true,
      "example": "Senior Painter"
    },
    "code": {
      "type": "string",
      "required": true,
      "unique_within": "obs_node_id",
      "example": "CIVIL-PNTR-SR"
    },
    "level": {
      "type": "enum",
      "required": true,
      "values": ["JUNIOR", "MID", "SENIOR", "LEAD", "MANAGER"]
    },
    "default_pay_type": {
      "type": "enum",
      "required": true,
      "values": ["HOURLY", "SALARIED", "CONTRACT"],
      "note": "Applied as default when a new Person is created with this role. Overridable per person."
    },
    "overtime_eligible": {
      "type": "boolean",
      "required": true,
      "default": true,
      "note": "If false, overtime_pay is always false for persons in this role. OT hours still tracked."
    },
    "skill_tags": {
      "type": "string[]",
      "required": false,
      "example": ["exterior_painting", "scaffolding", "waterproofing"],
      "note": "Used to surface relevant persons in activity resource picker when skills are specified on an activity type"
    },
    "is_active": { "type": "boolean", "required": true, "default": true }
  }
}
```

---

### 2.3 OBS Rate Card

**Purpose:** Time-ranged cost rates per role. Used to auto-fill cost when a person is assigned to an activity. Historical accuracy depends on date-range integrity.

```json
{
  "entity": "OBSRateCard",
  "fields": {
    "id": { "type": "uuid", "required": true, "auto_generated": true },
    "obs_role_id": {
      "type": "uuid",
      "required": true,
      "references": "OBSRole.id"
    },
    "standard_rate": {
      "type": "float",
      "required": true,
      "unit": "currency_per_hour OR currency_per_month",
      "note": "Unit depends on OBSRole.default_pay_type. HOURLY = per hour. SALARIED = per month."
    },
    "overtime_rate": {
      "type": "float",
      "required": false,
      "note": "Required if OBSRole.overtime_eligible == true"
    },
    "holiday_rate": {
      "type": "float",
      "required": false
    },
    "effective_from": {
      "type": "date",
      "required": true,
      "note": "Inclusive start date for this rate. Past activity costs use the rate valid at execution time."
    },
    "effective_to": {
      "type": "date | null",
      "required": false,
      "nullable": true,
      "note": "null = currently active rate. Only one rate record per role should have effective_to = null at any time."
    }
  },
  "validation_rules": [
    {
      "rule_id": "RATE-V01",
      "description": "Only one open-ended rate allowed per role",
      "check": "COUNT(OBSRateCard WHERE obs_role_id == target AND effective_to == null) <= 1",
      "action": "BLOCK_SAVE",
      "message": "Close the existing active rate before creating a new one."
    },
    {
      "rule_id": "RATE-V02",
      "description": "Rate date ranges must not overlap for the same role",
      "check": "No two OBSRateCard records for the same obs_role_id have overlapping effective_from/effective_to ranges",
      "action": "BLOCK_SAVE"
    }
  ],
  "rate_resolution_algorithm": {
    "description": "When resolving rate for an activity executed on a given date",
    "steps": [
      "1. Get person.obs_role_id",
      "2. Find OBSRateCard WHERE obs_role_id == person.obs_role_id AND effective_from <= execution_date AND (effective_to >= execution_date OR effective_to IS NULL)",
      "3. Use standard_rate from matched record",
      "4. If person has an activity-level rate override, use that instead"
    ]
  }
}
```

---

### 2.4 OBS Approval Delegation

**Purpose:** Allows a node head to delegate approval authority to another person for a time period (e.g., during leave).

```json
{
  "entity": "OBSApprovalDelegation",
  "fields": {
    "id": { "type": "uuid", "required": true, "auto_generated": true },
    "obs_node_id": { "type": "uuid", "required": true, "references": "OBSNode.id" },
    "delegated_from_person_id": { "type": "uuid", "required": true, "references": "Person.id" },
    "delegated_to_person_id": { "type": "uuid", "required": true, "references": "Person.id" },
    "valid_from": { "type": "date", "required": true },
    "valid_to": { "type": "date", "required": true },
    "scope": {
      "type": "enum",
      "required": true,
      "values": ["TIMESHEET_ONLY", "EXPENSE_ONLY", "ALL"]
    }
  }
}
```

---

## 3. Phase 1B — Resource Pool Module

### 3.1 Person Record

**Purpose:** Intersection of HR identity and project management capability. Fields are grouped into permission tiers.

**Permission tiers:**
- `PUBLIC` — visible to all authenticated users
- `PM` — visible to project managers and above
- `HR_ADMIN` — visible to HR admins and finance only
- `SYSTEM` — auto-computed, read-only

```json
{
  "entity": "Person",
  "permission_model": "field-level",
  "fields": {
    "id": { "type": "uuid", "required": true, "auto_generated": true },
    "employee_id": {
      "type": "string",
      "required": true,
      "unique": true,
      "permission": "PUBLIC",
      "hrm_source": true,
      "note": "Links HRM record to OPUS record. Immutable after creation."
    },
    "name": {
      "type": "string",
      "required": true,
      "permission": "PUBLIC",
      "hrm_source": true
    },
    "photo_url": {
      "type": "string | null",
      "required": false,
      "permission": "PUBLIC",
      "hrm_source": true
    },
    "obs_node_id": {
      "type": "uuid",
      "required": true,
      "references": "OBSNode.id",
      "permission": "PUBLIC",
      "hrm_source": true,
      "note": "Drives rate card lookup, approval routing, and cost centre tagging"
    },
    "obs_role_id": {
      "type": "uuid",
      "required": true,
      "references": "OBSRole.id",
      "permission": "PUBLIC",
      "constraint": "OBSRole.obs_node_id must equal this person's obs_node_id"
    },
    "employment_type": {
      "type": "enum",
      "required": true,
      "values": ["FULL_TIME", "PART_TIME", "CONTRACT", "CONSULTANT"],
      "permission": "PUBLIC",
      "hrm_source": true
    },
    "join_date": {
      "type": "date",
      "required": true,
      "permission": "PUBLIC",
      "hrm_source": true
    },
    "reporting_manager_id": {
      "type": "uuid | null",
      "required": false,
      "references": "Person.id",
      "permission": "PUBLIC",
      "hrm_source": true
    },
    "is_active": {
      "type": "boolean",
      "required": true,
      "default": true,
      "permission": "HR_ADMIN",
      "hrm_source": true
    },

    "pay_type": {
      "type": "enum",
      "required": true,
      "values": ["HOURLY", "SALARIED", "CONTRACT"],
      "permission": "HR_ADMIN",
      "hrm_source": true,
      "note": "Master switch. Changes which cost fields are active and how AC is computed."
    },
    "hourly_rate": {
      "type": "float | null",
      "required_when": "pay_type == HOURLY",
      "permission": "PM",
      "note": "Auto-populated from OBSRateCard. PM-visible. Overridable per activity assignment."
    },
    "overtime_rate": {
      "type": "float | null",
      "required_when": "pay_type == HOURLY AND OBSRole.overtime_eligible == true",
      "permission": "PM",
      "note": "Auto-populated from OBSRateCard."
    },
    "monthly_salary": {
      "type": "float | null",
      "required_when": "pay_type == SALARIED",
      "permission": "HR_ADMIN",
      "hrm_source": true,
      "note": "Never exposed to PMs. Used to compute daily_allocation."
    },
    "daily_allocation": {
      "type": "float | null",
      "required_when": "pay_type == SALARIED",
      "permission": "PM",
      "compute": "monthly_salary / working_days_per_month",
      "note": "This is what PMs see for salaried workers — not the monthly salary."
    },
    "contract_amount": {
      "type": "float | null",
      "required_when": "pay_type == CONTRACT",
      "permission": "PM",
      "note": "Fixed fee for the activity or contract period"
    },
    "overtime_pay": {
      "type": "boolean",
      "required": true,
      "default": true,
      "permission": "HR_ADMIN",
      "constraint": "If pay_type == SALARIED then overtime_pay must be false (locked)",
      "note": "When false: overtime hours are tracked but not costed. AC does not increase for OT hours."
    },

    "base_calendar_id": {
      "type": "uuid",
      "required": true,
      "references": "Calendar.id",
      "permission": "PM",
      "note": "Inherited from OBSNode working hours policy. Overridable per person."
    },
    "default_hours_day": {
      "type": "float",
      "required": true,
      "default": 8.0,
      "permission": "PM",
      "note": "Override for part-time workers"
    },
    "max_allocation_pct": {
      "type": "float",
      "required": false,
      "default": 100.0,
      "permission": "PM",
      "note": "e.g., 80 means 20% is reserved for non-project work. Used in over-allocation warnings."
    },

    "skill_tags": {
      "type": "string[]",
      "required": false,
      "permission": "PM",
      "note": "Matched against activity type competency requirements in resource picker"
    },
    "certifications": {
      "type": "Certification[]",
      "required": false,
      "permission": "PM",
      "hrm_source": true
    },

    "productivity_rates": {
      "type": "ProductivityRate[]",
      "required": false,
      "permission": "PM",
      "note": "Auto-built from execution history. PM can manually override per assignment."
    }
  }
}
```

---

### 3.2 Productivity Rate

**Purpose:** Tracks how much output a person produces per hour, per activity type. Used to validate plan feasibility and generate predictive warnings during execution.

```json
{
  "entity": "ProductivityRate",
  "parent": "Person",
  "fields": {
    "id": { "type": "uuid", "required": true, "auto_generated": true },
    "person_id": { "type": "uuid", "required": true, "references": "Person.id" },
    "activity_type_tag": {
      "type": "string",
      "required": true,
      "example": "exterior_painting",
      "note": "Matches the skill/activity type tag on activities"
    },
    "rate": {
      "type": "float",
      "required": true,
      "unit": "quantity_uom_per_hour",
      "example": 11.8,
      "note": "e.g., 11.8 m²/hr for painting. UOM must match the activity's quantity UOM."
    },
    "source": {
      "type": "enum",
      "required": true,
      "values": ["HISTORICAL", "MANUAL", "COMPUTED"],
      "note": "HISTORICAL = average from past completed activities. MANUAL = PM override. COMPUTED = live-updated during execution."
    },
    "sample_count": {
      "type": "integer",
      "required": false,
      "note": "Number of completed activities that contributed to HISTORICAL rate. Lower count = less reliable."
    },
    "last_updated": { "type": "datetime", "required": true, "auto_generated": true }
  },
  "compute_algorithm": {
    "trigger": "On activity completion",
    "steps": [
      "1. Find all completed activities of matching activity_type_tag where this person was a resource",
      "2. For each: actual_productivity = total_quantity_done / actual_total_hours_logged",
      "3. average_rate = mean(all individual productivity rates)",
      "4. Update ProductivityRate.rate = average_rate, source = HISTORICAL, sample_count = N"
    ]
  },
  "plan_feasibility_check": {
    "trigger": "When PM saves resource assignment on an activity",
    "formula": "required_hours = activity.planned_quantity / productivity_rate.rate",
    "check": "required_hours <= activity.duration_days * person.default_hours_day",
    "on_fail": {
      "action": "WARN",
      "message": "At planned productivity of {rate} {uom}/hr, this activity requires {required_hours} hrs but only {available_hours} hrs available in {duration} days."
    }
  },
  "predictive_warning_algorithm": {
    "trigger": "Daily — after each progress entry is logged",
    "steps": [
      "1. actual_productivity_today = quantity_done_today / hours_logged_today",
      "2. remaining_qty = planned_quantity - cumulative_actual_quantity",
      "3. remaining_days = planned_finish_date - today",
      "4. projected_remaining = SUM(all assigned persons: actual_productivity * default_hours_day) * remaining_days",
      "5. projected_total = cumulative_actual_quantity + projected_remaining",
      "6. IF projected_total < planned_quantity THEN raise PREDICTIVE_SHORTFALL alert"
    ],
    "alert_fields": {
      "projected_completion_pct": "projected_total / planned_quantity * 100",
      "shortfall_qty": "planned_quantity - projected_total",
      "days_remaining": "remaining_days"
    }
  }
}
```

---

### 3.3 AC Computation Rules per Pay Type

**Purpose:** Defines how Actual Cost is computed from timesheet data depending on pay type. This is the authoritative logic for all AC calculations.

```json
{
  "entity": "LaborACComputationRules",
  "rules": [
    {
      "pay_type": "HOURLY",
      "overtime_pay": true,
      "formula": "AC = (regular_hours * hourly_rate) + (overtime_hours * overtime_rate)",
      "note": "regular_hours = MIN(logged_hours, standard_hours_day). overtime_hours = MAX(0, logged_hours - standard_hours_day)"
    },
    {
      "pay_type": "HOURLY",
      "overtime_pay": false,
      "formula": "AC = total_logged_hours * hourly_rate",
      "note": "All hours treated equally. No overtime premium."
    },
    {
      "pay_type": "SALARIED",
      "overtime_pay": false,
      "formula": "AC = daily_allocation",
      "note": "AC is flat per working day regardless of hours logged. Overtime hours tracked in actual_overtime_hours field but contribute zero to AC.",
      "overtime_tracking": "actual_overtime_hours still recorded for workforce analytics and over-allocation flagging"
    },
    {
      "pay_type": "CONTRACT",
      "formula": "AC = contract_amount",
      "note": "Lump sum. Logged once on activity completion or at milestones defined in contract."
    }
  ]
}
```

---

### 3.4 Equipment Record

```json
{
  "entity": "Equipment",
  "fields": {
    "id": { "type": "uuid", "required": true, "auto_generated": true },
    "name": { "type": "string", "required": true, "example": "Ladder — 6m Aluminium" },
    "code": { "type": "string", "required": true, "unique": true, "note": "Asset tag number" },
    "category": {
      "type": "enum",
      "required": true,
      "values": ["SAFETY", "POWER_TOOL", "HAND_TOOL", "MACHINERY", "VEHICLE", "OTHER"]
    },
    "obs_node_id": {
      "type": "uuid",
      "required": true,
      "references": "OBSNode.id",
      "note": "Owning division. Determines which projects can request this equipment."
    },
    "ownership_type": {
      "type": "enum",
      "required": true,
      "values": ["OWNED", "RENTED", "LEASED"]
    },
    "billing_type": {
      "type": "enum",
      "required": true,
      "values": ["DAILY_RENTAL", "HOURLY_RENTAL", "PAY_PER_USE", "OWNED_DEPRECIATION", "FIXED_HIRE"],
      "note": "Determines when AC ticks during execution. See billing_type_rules below."
    },
    "standard_rate": {
      "type": "float",
      "required": true,
      "unit": "currency_per_day OR currency_per_hour",
      "note": "Unit depends on billing_type"
    },
    "idle_rate": {
      "type": "float | null",
      "required": false,
      "note": "For equipment with different idle vs active cost. If null, standard_rate applies always."
    },
    "mobilization_cost": {
      "type": "float | null",
      "required": false,
      "note": "One-time cost to bring equipment to site. Added to activity expense on deployment."
    },
    "current_status": {
      "type": "enum",
      "required": true,
      "values": ["AVAILABLE", "DEPLOYED", "UNDER_MAINTENANCE", "RETIRED"],
      "default": "AVAILABLE"
    },
    "rental_contract_start": { "type": "date | null", "required": false },
    "rental_contract_end": { "type": "date | null", "required": false },
    "next_maintenance_date": { "type": "date | null", "required": false }
  },
  "billing_type_rules": [
    {
      "billing_type": "DAILY_RENTAL",
      "ac_ticks_when": "Equipment is deployed for the day — regardless of whether actively used",
      "idle_treatment": "AC still accumulates. Equipment idle on daily rental is a cost variance signal.",
      "formula": "AC_per_day = standard_rate"
    },
    {
      "billing_type": "HOURLY_RENTAL",
      "ac_ticks_when": "Active use hours are logged",
      "idle_treatment": "No AC when idle",
      "formula": "AC = active_hours_logged * standard_rate"
    },
    {
      "billing_type": "PAY_PER_USE",
      "ac_ticks_when": "Output is produced",
      "idle_treatment": "No AC when idle",
      "formula": "AC = usage_units * standard_rate"
    },
    {
      "billing_type": "OWNED_DEPRECIATION",
      "ac_ticks_when": "Equipment is deployed on site (internal cost transfer)",
      "formula": "AC_per_day = standard_rate"
    },
    {
      "billing_type": "FIXED_HIRE",
      "ac_ticks_when": "Single charge logged when equipment confirmed for activity",
      "formula": "AC = standard_rate (flat, once)"
    }
  ],
  "validation_rules": [
    {
      "rule_id": "EQ-V01",
      "description": "billing_type is mandatory. Without it system cannot compute AC.",
      "check": "billing_type IS NOT NULL",
      "action": "BLOCK_SAVE"
    }
  ]
}
```

---

### 3.5 Material Record

```json
{
  "entity": "Material",
  "fields": {
    "id": { "type": "uuid", "required": true, "auto_generated": true },
    "name": { "type": "string", "required": true, "example": "Exterior Wall Paint — White" },
    "sku": { "type": "string", "required": true, "unique": true },
    "category": {
      "type": "enum",
      "required": true,
      "values": ["CONSUMABLE", "RAW_MATERIAL", "COMPONENT", "CHEMICAL"]
    },
    "obs_node_id": {
      "type": "uuid",
      "required": true,
      "references": "OBSNode.id",
      "note": "Which store/division stocks and manages this material"
    },
    "uom": {
      "type": "string",
      "required": true,
      "examples": ["litre", "kg", "bag", "piece", "m2", "m3"],
      "note": "MANDATORY. Quantity is meaningless without unit. Block save if absent."
    },
    "standard_cost_per_unit": {
      "type": "float",
      "required": true,
      "note": "Auto-fills activity assignment. Cannot be zero or null."
    },
    "cost_basis": {
      "type": "enum",
      "required": true,
      "values": ["FIXED", "MARKET_RATE", "CONTRACT_RATE"],
      "note": "MARKET_RATE allows PM to override with current market price at assignment time"
    },
    "wastage_standard_pct": {
      "type": "float",
      "required": false,
      "default": 0.0,
      "note": "Industry-standard wastage allowance. planned_qty is auto-increased by this % in activity assignments."
    },
    "preferred_vendor_id": { "type": "uuid | null", "required": false },
    "lead_time_days": {
      "type": "integer",
      "required": false,
      "note": "Days to procure. Used to raise pre-emptive alerts before stock runs out on active activities."
    },
    "current_stock_qty": {
      "type": "float",
      "required": false,
      "note": "From inventory module if integrated, else manually maintained"
    },
    "reorder_point_qty": {
      "type": "float",
      "required": false,
      "note": "Below this level → alert procurement team"
    },
    "minimum_order_qty": { "type": "float", "required": false }
  },
  "validation_rules": [
    {
      "rule_id": "MAT-V01",
      "check": "uom IS NOT NULL AND uom != ''",
      "action": "BLOCK_SAVE",
      "message": "Unit of measure is mandatory. Quantity without unit is meaningless."
    },
    {
      "rule_id": "MAT-V02",
      "check": "standard_cost_per_unit > 0",
      "action": "BLOCK_SAVE",
      "message": "Cost per unit must be greater than zero."
    }
  ],
  "note": "consumption_rate is NOT stored here. It is set per ActivityResourceAssignment, specific to that job."
}
```

---

## 4. Cross-Cutting Rules

### 4.1 Resource Availability and Conflict Detection

```json
{
  "rule_group": "ResourceAvailability",
  "rules": [
    {
      "rule_id": "AVAIL-01",
      "name": "Over-allocation warning",
      "trigger": "When PM assigns a person to an activity",
      "check": [
        "1. Compute: existing_allocation_pct = SUM(all active activity assignments for person on overlapping dates)",
        "2. new_total_pct = existing_allocation_pct + new_assignment_pct",
        "3. IF new_total_pct > person.max_allocation_pct THEN warn"
      ],
      "action": "WARN (not block — PM can override)",
      "message": "{person.name} is already {existing_pct}% allocated on {dates}. Adding this assignment brings total to {new_total_pct}%."
    },
    {
      "rule_id": "AVAIL-02",
      "name": "Leave block alert",
      "trigger": "When approved leave is synced from HRM OR manually entered",
      "check": "IF person has active activity assignments on leave dates THEN alert PM",
      "action": "NOTIFY PM",
      "message": "{person.name} has approved leave on {dates}. They are assigned to {activity_name}. Please review."
    },
    {
      "rule_id": "AVAIL-03",
      "name": "Equipment deployment conflict",
      "trigger": "When PM assigns equipment to an activity",
      "check": "Equipment.current_status == AVAILABLE AND no overlapping deployment on same dates",
      "action": "WARN if conflict",
      "message": "{equipment.name} is already deployed on {conflicting_project} until {return_date}."
    }
  ]
}
```

---

### 4.2 Cost Centre Auto-Tagging Flow

```
TRIGGER: Any resource logs hours, material consumption, equipment usage, or expense against an activity

RESOLUTION:
  1. Get resource.obs_node_id
  2. Get OBSNode.cost_centre_labour (for labor)
     OR OBSNode.cost_centre_equipment (for equipment)
     OR OBSNode.cost_centre_material (for material)
  3. Tag the AC entry with resolved cost_centre code
  4. If no cost_centre configured on OBS node → fallback to parent node cost_centre
  5. If no cost_centre at any ancestor → log to DEFAULT cost centre and raise config warning
```

---

### 4.3 Timesheet Approval Routing Flow

```
TRIGGER: Person submits timesheet

RESOLUTION:
  1. Get person.obs_node_id → OBSNode
  2. Check if active OBSApprovalDelegation exists for this node on submission date
     IF YES → route to delegated_to_person_id
     IF NO  → route to OBSNode.timesheet_approver_id
  3. If not approved within OBSNode.approval_escalation_days:
     → Route to parent OBSNode.node_head_person_id
  4. If still not approved after another escalation_days:
     → Route to grandparent OBSNode.node_head_person_id
  5. Finance approval triggered separately if expense lines exceed expense_threshold_l2
```

---

## 5. HRM Integration Specification

### 5.1 Integration Modes

```json
{
  "entity": "HRMIntegrationConfig",
  "modes": [
    {
      "mode": "API_REALTIME",
      "description": "Live API sync. OPUS listens to HRM webhooks or polls on schedule.",
      "hrm_fields_locked_in_opus": ["name", "employee_id", "obs_node_id", "pay_type", "monthly_salary", "employment_type", "join_date", "is_active"]
    },
    {
      "mode": "CSV_IMPORT",
      "description": "Periodic import from HR-exported CSV. Fields refreshed on import cycle.",
      "hrm_fields_locked_in_opus": ["name", "employee_id"]
    },
    {
      "mode": "STANDALONE",
      "description": "OPUS is system of record. No HRM. All fields editable in OPUS.",
      "hrm_fields_locked_in_opus": [],
      "upgrade_path": "All HRM-tagged fields can be locked when integration is added later. No rebuild required."
    }
  ],
  "field_mapping": [
    { "hrm_field": "department_code", "opus_field": "Person.obs_node_id", "transform": "LOOKUP: hrm_dept_code → OBSNode.code → OBSNode.id" },
    { "hrm_field": "designation", "opus_field": "Person.obs_role_id", "transform": "LOOKUP: title → nearest matching OBSRole.name in resolved OBS node" },
    { "hrm_field": "basic_salary", "opus_field": "Person.monthly_salary", "transform": "DIRECT" },
    { "hrm_field": "employee_type", "opus_field": "Person.pay_type", "transform": "MAP: Permanent→SALARIED, Contract→CONTRACT, DailyWage→HOURLY" },
    { "hrm_field": "reporting_manager_id", "opus_field": "Person.reporting_manager_id", "transform": "LOOKUP: hrm_employee_id → Person.employee_id → Person.id" },
    { "hrm_field": "leave_balance", "opus_field": "Person.available_leave_days", "transform": "DIRECT" }
  ],
  "conflict_resolution": {
    "rule": "HRM is master for all hrm_source=true fields. OPUS never writes back to HRM.",
    "opus_owned_always": ["productivity_rates", "project_allocation", "activity_assignments", "skill_tags_project_specific", "rate_overrides_per_activity"]
  },
  "leave_sync": {
    "on_leave_approved_in_hrm": [
      "Mark person.availability_calendar as blocked for leave dates",
      "Check for active activity assignments on those dates",
      "IF assignments exist → NOTIFY assigned activity's PM with leave_conflict alert"
    ]
  },
  "attendance_sync": {
    "on_attendance_logged_in_hrm": [
      "Pre-fill timesheet entry for that person + date with hours_present",
      "Person only needs to allocate pre-filled hours to specific activities",
      "Tolerance: attendance_time within OBSNode.pre_fill_tolerance_minutes of shift_start = present"
    ]
  }
}
```

---

## 6. Display Specifications

### 6.1 OBS Module Screens

```yaml
screens:
  - id: obs_tree_manager
    route: /settings/obs
    access: ADMIN
    layout: split_panel
    left_panel:
      content: collapsible_tree
      features:
        - search_filter_by_name
        - headcount_badge_per_node
        - active_inactive_indicator
        - add_child_node_button_per_node
        - drag_to_reorder
    right_panel:
      content: selected_node_detail
      sections:
        - node_identity (name, code, type, head)
        - roles_and_rate_card
        - people_in_node (count + list)
        - equipment_owned
        - cost_centre_mapping
        - active_projects_responsible_for
        - utilisation_pct (allocated / available)

  - id: role_rate_card_editor
    route: /settings/obs/{node_id}/roles
    access: ADMIN
    features:
      - role_list_per_node
      - rate_card_with_date_ranges
      - add_new_rate_version

  - id: approval_chain_configurator
    route: /settings/obs/{node_id}/approvals
    access: ADMIN
    features:
      - approver_assignment
      - escalation_days_config
      - expense_threshold_config
      - delegation_management

  - id: obs_utilisation_view
    route: /reports/obs/utilisation
    access: PM, ADMIN
    content: per_node_utilisation_bars
    data:
      allocated_count: COUNT(active assignments in date range)
      available_count: COUNT(active persons in node)
      utilisation_pct: allocated_count / available_count * 100
```

---

### 6.2 Resource Pool Screens

```yaml
screens:
  - id: people_list
    route: /resources/people
    access: PM, HR_ADMIN, ADMIN
    filters:
      - obs_node (tree selector)
      - role
      - pay_type
      - availability_status (available / partially_allocated / fully_booked)
      - skill_tags
    list_columns:
      - photo
      - name
      - role
      - obs_node
      - current_allocation_pct
      - availability_status_badge

  - id: person_detail
    route: /resources/people/{id}
    sections:
      - group_a_identity: access=PUBLIC
      - group_b_compensation: access=HR_ADMIN (PM sees daily_allocation only, not monthly_salary)
      - group_c_availability: access=PM
      - group_d_skills_productivity: access=PM

  - id: availability_heatmap
    route: /resources/availability
    access: PM, ADMIN
    description: Week/month grid. Each cell = one person × one day. Colour encodes allocation %.
    cell_colours:
      - green: allocation_pct == 0 (fully available)
      - amber: 0 < allocation_pct < max_allocation_pct
      - red: allocation_pct >= max_allocation_pct
    cell_hover:
      - project names and activities allocated
      - allocation pct per project
      - approving manager

  - id: cross_project_allocation
    route: /resources/allocation
    access: PM, ADMIN
    description: Every resource with their current allocation across ALL projects.
    primary_use: Conflict detection before assigning to a new activity.

  - id: equipment_list
    route: /resources/equipment
    access: PM, ADMIN
    filters:
      - category
      - obs_node
      - current_status
      - billing_type
    status_badges:
      - AVAILABLE: green
      - DEPLOYED: amber (shows current project)
      - UNDER_MAINTENANCE: red (shows return date)
      - RETIRED: gray

  - id: material_catalogue
    route: /resources/materials
    access: PM, ADMIN
    filters:
      - category
      - obs_node
      - uom
    stock_indicator:
      - green: current_stock_qty > reorder_point_qty * 1.5
      - amber: reorder_point_qty < current_stock_qty <= reorder_point_qty * 1.5
      - red: current_stock_qty <= reorder_point_qty
```

---

## 7. Build Priority Matrix

```yaml
release_1_must_build:
  - OBS tree CRUD (nodes, hierarchy)
  - OBS role definitions with rate cards
  - OBS approval chain configuration
  - OBS working hours policy
  - OBS cost centre mapping
  - Person record — identity, pay_type, rate, calendar
  - Person record — salaried model with overtime tracking
  - Equipment record — name, billing_type, rate
  - Material catalogue — name, UOM, cost
  - Availability heatmap (basic)
  - Cross-project allocation view
  - Productivity rate — manual entry
  - All validation rules listed in this document

release_2_build_next:
  - Productivity rate — HISTORICAL auto-compute (requires completed execution data)
  - HRM API integration
  - Equipment utilisation reporting
  - Material stock alerts and reorder triggers
  - OBSApprovalDelegation management UI
  - Attendance pre-fill from HRM

not_in_phase_1:
  - Activity resource assignment UI (Phase 3)
  - Timesheet submission UI (Phase 4)
  - EVM metrics (Phase 5)
  - WBS responsibility assignment (Phase 2)
```

---

## 8. Glossary

```yaml
terms:
  OBS: "Organisational Breakdown Structure. Hierarchical representation of company units."
  Resource_Pool: "The registry of all persons, equipment and materials available for project assignment."
  BAC: "Budget at Completion. Total planned cost for an activity. BAC = SUM of all resource planned costs."
  AC: "Actual Cost. What has actually been spent. Computed differently per resource type."
  EV: "Earned Value. EV = percent_complete × BAC. Represents work earned in cost terms."
  PV: "Planned Value. What should have been earned by today. PV = planned_percent_by_today × BAC."
  CV: "Cost Variance. CV = EV − AC. Positive = under budget. Negative = over budget."
  SV: "Schedule Variance. SV = EV − PV. Positive = ahead. Negative = behind."
  EAC: "Estimate at Completion. EAC = AC + (BAC − EV). Projected final cost."
  pay_type: "Determines how AC is computed for a labour resource. HOURLY | SALARIED | CONTRACT."
  billing_type: "Determines when AC ticks for equipment. DAILY_RENTAL | HOURLY | PAY_PER_USE | OWNED_DEPRECIATION | FIXED_HIRE."
  productivity_rate: "Output per hour for a person on a specific activity type. Unit = quantity_uom / hour."
  daily_allocation: "For salaried workers: monthly_salary / working_days_per_month. AC per day regardless of hours."
  overtime_pay_false: "Overtime hours are tracked but contribute zero to AC. Used for salaried workers."
  cost_centre: "Finance code used to tag all AC entries for reporting and reconciliation."
  node_head: "Person responsible for a given OBS node. Receives approvals and escalations."
  HRM: "Human Resource Management system. External system that may be the source of truth for employee data."
  hrm_source: "Field annotation indicating this field's authoritative source is the HRM system when integrated."
```

---

*End of specification. Document version 1.0 — OPUS ERP Phase 1 — OBS and Resource Pool.*
