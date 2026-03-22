Remove the welcome screen and add this organization structure screen instead , use the design system only

---

# OPUS ERP — Organisation Setup Screen
## Complete Implementation Prompt

---

## 1. Product Context

**Product:** OPUS ERP — a cloud-native ERP system for construction and engineering firms.

**Screen:** Organisation Setup Screen — the first and most critical onboarding screen an admin sees after signing up and verifying their email. This screen is a one-time setup wizard surface that collects the company's organisational structure, people, resources, roles, calendars, and cost centres before the admin can access the main product.

**Who uses it:** Company admin / IT admin / Operations head. Desktop only. One-time use. High stakes — mistakes here affect the entire product's behavior downstream.

**Core principle:** The flowchart is the hero. Everything else is accessed through it. The admin builds their company's org tree visually — adding nodes, opening modals, and configuring each division — without ever leaving this screen.

---

## 3. Layout Architecture

The screen has four layers stacked in z-order:

```
Layer 1 (base):      Full-screen canvas — the flowchart lives here
Layer 2 (fixed):     Top header bar — always visible
Layer 3 (overlay):   Global settings panels — slide in over canvas
Layer 4 (modal):     Node modal — centered over everything
```

### 3.1 Header Bar (Layer 2)

**Position:** Fixed top. Full width. Height: 56px.

**Left side:**
```
OPUS logo 
Separator
"Organisation Setup" label 
```

**Center:**
```
Three global settings buttons (pill-shaped, outlined):
  [📅 Calendars]   [👔 Roles]   [₹ Cost Centres]

Each button:
  - Default state: outlined, muted
  - Hover: slight background fill
  - Active (panel open): filled background, accent color
  - Shows a count badge if items exist:
    e.g., "📅 Calendars · 3" when 3 calendars are created
```

**Right side:**
```
[Save Draft]        secondary button — outlined
[Save & Continue →] primary button — filled accent color
```

---

### 3.2 Canvas (Layer 1)

**Position:** Full screen below header. Scrollable. Pannable. Zoomable.

**Background:** Subtle dot-grid pattern (CSS radial-gradient dots, very light — not distracting).

**Canvas controls (bottom right corner, fixed position):**
```
[+]  Zoom in
[-]  Zoom out
[⊡]  Fit to screen
```

**Canvas interactions:**
```
Click and drag on empty area  → pan the canvas
Mouse scroll                  → zoom in/out centered on cursor
Ctrl + scroll                 → zoom in/out (alternative)
Right-click on empty area     → no context menu (ignore)
```

**Zoom range:** 50% to 150%. Default: 100%.

**Transform origin:** Center of viewport.

**The flowchart nodes are rendered as absolutely-positioned HTML elements inside a transform container div. The container div has `transform: translate(X, Y) scale(Z)` applied via JavaScript.**

---

## 4. Flowchart Node Design

### 4.1 Node Card

Each OBS node is a card rendered in the flowchart.

**Dimensions:** min-width 200px, auto-height based on content.

**Visual structure:**
```
┌─────────────────────────────────┐
│ ● Node Name                     │  ← name in DM Sans 14px bold
│   NODE-CODE                     │  ← code in DM Mono 11px muted
│ ─────────────────────────────── │
│ 👤 N people   🔧 N roles         │  ← stats row
│ 📅 Calendar name                │  ← assigned calendar (if set)
│ ─────────────────────────────── │
│ [⚙ Open]  [+ Child]  [+ Sibling]│  ← action buttons
└─────────────────────────────────┘
```

**Color dot (●) by node type:**
```
COMPANY_ROOT  → deep blue dot
DIVISION      → teal dot
DEPARTMENT    → amber dot
TEAM          → coral/red dot
```

**States:**
```
Default:   white background, 1px border, soft shadow
Hover:     slightly elevated shadow, border darkens
Selected:  accent color left border (3px), light accent background tint
```

**Action buttons (inside card):**
```
[⚙ Open]     → small outlined button, opens node modal
[+ Child]    → small text button with + icon, adds child node
[+ Sibling]  → small text button with + icon, adds sibling node

Root node shows:
  [⚙ Open]   [+ Add Division]   (no sibling button — root is unique)

At depth 4 (maximum):
  [+ Child] is hidden — cannot go deeper
```

### 4.2 Connector Lines

Nodes are connected by SVG lines rendered in a separate SVG layer behind the node cards.

**Line style:**
```
Stroke color: muted gray (#d3d1c7)
Stroke width: 1.5px
No arrowheads on lines — direction is implied by top-to-bottom or left-to-right layout
Corners: rounded using cubic bezier curves (not sharp L-bends)
```

**Layout direction:** Left to right (horizontal tree).
```
Root is leftmost.
Children fan out to the right.
Siblings are stacked vertically.
Connector lines go from right edge of parent to left edge of child.
```

**Layout algorithm (simple, not a full D3 tree):**

Use a recursive function to calculate node positions:
```javascript
function layoutTree(node, x, y) {
  node.x = x;
  node.y = y;
  let childY = y;
  for (let child of node.children) {
    layoutTree(child, x + NODE_WIDTH + H_GAP, childY);
    childY += subtreeHeight(child) + V_GAP;
  }
}
```

Constants:
```
NODE_WIDTH = 220px
NODE_HEIGHT = 120px (approx)
H_GAP = 80px (horizontal gap between parent and children)
V_GAP = 24px (vertical gap between siblings)
CANVAS_PADDING = 60px (from canvas edges)
```

---

## 5. State Model (JavaScript)

The entire screen is driven by this in-memory state object:

```javascript
const state = {
  company: {
    name: "Kishore Constructions Pvt Ltd",  // from Company Setup
    rootNodeId: "node-root"
  },

  nodes: {
    "node-root": {
      id: "node-root",
      name: "Kishore Constructions Pvt Ltd",
      code: "KCL-ROOT",
      type: "COMPANY_ROOT",
      parentId: null,
      children: [],
      nodeHeadPersonId: null,
      calendarId: null,
      assignedRoles: [],     // [{ roleId, standardRate, overtimeRate }]
      costCentres: {
        labour: null,
        equipment: null,
        material: null,
        overhead: null
      },
      isActive: true
    }
  },

  people: {},
  // "person-001": { id, nodeId, name, employeeId, email, roleId,
  //                 payType, standardRate, overtimeRate, overtimeEligible,
  //                 overtimePay, monthlySalary, dailyAllocation,
  //                 contractAmount, employmentType, joinDate, photoUrl }

  equipment: {},
  // "eq-001": { id, nodeId, name, code, category, ownershipType,
  //             billingType, standardRate, idleRate, mobilizationCost,
  //             rentalStart, rentalEnd, currentStatus }

  materials: {},
  // "mat-001": { id, nodeId, name, sku, category, uom,
  //              standardCostPerUnit, costBasis, wastageStandardPct,
  //              leadTimeDays, reorderPointQty }

  calendars: {},
  // "cal-001": { id, name, workingDays: [1,2,3,4,5,6], hoursPerDay: 8,
  //              publicHolidays: [{ date, name }] }

  roles: {},
  // "role-001": { id, name, code, level, defaultPayType,
  //               overtimeEligible, skillTags: [] }

  costCentres: {},
  // "cc-001": { id, code, description, type }

  ui: {
    selectedNodeId: null,
    openModal: null,        // null | "node" | "calendars" | "roles" | "costcentres" | "addnode"
    activeModalTab: "people",
    nodeModalPersonForm: false,
    nodeModalEquipmentForm: false,
    nodeModalMaterialForm: false,
    zoom: 1,
    panX: 0,
    panY: 0,
    editingPersonId: null,
    editingEquipmentId: null,
    editingMaterialId: null,
    addNodeTarget: null,     // { parentId, type: "child" | "sibling" }
    globalPanelOpen: null    // "calendars" | "roles" | "costcentres" | null
  }
};
```

Every user interaction mutates this state object, then calls `render()` which re-renders the relevant parts of the DOM.

---

## 6. Global Settings Panels

All three global panels (Calendars, Roles, Cost Centres) share the same structural pattern:

**Layout:**
```
Position: Fixed, right: 0, top: 56px, bottom: 0
Width: 560px
Background: white
Border-left: 1px solid border color
Shadow: large left-facing box shadow
z-index: 200
Transition: transform 0.25s ease (slides in from right)
```

**Panel structure:**
```
┌──────────────────────────────────────────┐
│  Panel Title                    [✕ Close]│
│  Description text                        │
├──────────────────────────────────────────┤
│  List area (left 55%)                    │
│  ─────────────────────────────────────  │
│  [Item 1]                    [Edit]      │
│  [Item 2]                    [Edit]      │
│  [+ Add New]                             │
├──────────────────────────────────────────┤
│  Form area (right 45%) — appears when   │
│  [+ Add New] or [Edit] is clicked        │
│  Form slides in from right within panel  │
└──────────────────────────────────────────┘
```

Alternatively — on smaller screens, the form takes over the full panel and has a [← Back] button.

---

### 6.1 Calendars Panel

**Panel title:** "Calendars"
**Description:** "Create working schedules and assign them to divisions. Each division can have its own calendar."

**List item display:**
```
Calendar Name
Working days summary (e.g., "Mon–Sat · 8 hrs/day")
"Used by: N nodes" in muted text
[Edit] button
```

**Add / Edit Calendar Form:**
```
FIELD: Calendar Name
  Type: text input
  Required: yes
  Placeholder: e.g., "Standard 6-day Mon–Sat"

FIELD: Working Days
  Type: checkbox group
  Options: Mon, Tue, Wed, Thu, Fri, Sat, Sun
  Required: at least one checked
  Default: Mon–Fri checked

FIELD: Standard Hours per Day
  Type: number input
  Required: yes
  Min: 1, Max: 24
  Default: 8
  Step: 0.5

FIELD: Public Holidays
  Type: dynamic list of date entries
  Each entry: [Date picker] [Holiday Name] [✕ remove]
  [+ Add Holiday] button adds a new row
  Optional

ACTIONS:
  [Cancel] → clears form, returns to list
  [Save Calendar] → validates, saves to state, updates list
```

**Validation:**
```
Name: required, max 100 chars
Working days: at least one required
Hours: required, 1-24
Duplicate name: warn but allow (names are not unique keys)
```

---

### 6.2 Roles Panel

**Panel title:** "Role Catalogue"
**Description:** "Define job roles for your company. Rates are set per division — not here."

**List item display:**
```
Role Name · Role Code
Level · Default Pay Type
"Used by: N nodes" in muted text
[Edit] button
```

**Add / Edit Role Form:**
```
FIELD: Role Name
  Type: text input
  Required: yes
  Placeholder: e.g., "Senior Painter"

FIELD: Role Code
  Type: text input
  Required: yes
  Auto-suggested: uppercase first letters of name words
    e.g., "Senior Painter" → "PNTR-SR" (abbreviation logic)
  Unique across all roles
  Max 20 chars, no spaces

FIELD: Level
  Type: select dropdown
  Options: Junior | Mid | Senior | Lead | Manager
  Required: yes

FIELD: Default Pay Type
  Type: radio group or select
  Options: Hourly | Salaried | Contract
  Required: yes
  Note shown below: "This is the default — overridable per person"

FIELD: Overtime Eligible
  Type: toggle switch
  Default: Yes (on)
  Note: "If off, overtime hours are tracked but the OT rate
         field is hidden in resource assignment."

FIELD: Skill Tags
  Type: tag input
  Optional
  User types a tag and presses Enter or comma to add
  Each tag shows as a removable pill
  Placeholder: "e.g., exterior_painting, scaffolding"

ACTIONS:
  [Cancel] → clears form
  [Save Role] → validates, saves to state

NOTE shown at bottom of form (not a field):
  "ℹ️ Rates for this role are set inside each division's Settings tab.
   The same role can have different rates in different divisions."
```

---

### 6.3 Cost Centres Panel

**Panel title:** "Cost Centres"
**Description:** "Finance codes for tagging actual costs by type. Assigned to divisions from their settings."

**List item display:**
```
CC-CODE    Description    Type badge
[Edit] button
```

**Add / Edit Cost Centre Form:**
```
FIELD: Code
  Type: text input
  Required: yes
  Placeholder: e.g., CC-CIVIL-001
  Unique across all cost centres
  Uppercase enforced
  Max 30 chars

FIELD: Description
  Type: text input
  Required: yes
  Placeholder: e.g., "Civil Division — Labour"
  Max 100 chars

FIELD: Type
  Type: select dropdown
  Options: Labour | Equipment | Material | Overhead | (blank/Other)
  Optional
  Used for filtering in node cost centre mapping

ACTIONS:
  [Cancel]
  [Save]
```

---

## 7. Quick Add Node Modal

Triggered by [+ Child] or [+ Sibling] on any node card.

**Layout:** Small centered modal. Width: 400px. Not full-screen.

```
┌─────────────────────────────────────────┐
│  Add [Division / Department / Team]     │
│  [Under / Same level as] [Parent Name]  │
│  ─────────────────────────────────────  │
│  Name    [_____________________________]│
│  Code    [_____________________________]│
│          Auto-suggested from name       │
│  ─────────────────────────────────────  │
│  [Cancel]              [Add Node]       │
└─────────────────────────────────────────┘
```

**Node type is auto-determined by depth — never shown to user:**
```
Depth 0: COMPANY_ROOT (auto, one only)
Depth 1: DIVISION
Depth 2: DEPARTMENT
Depth 3: TEAM
Depth 4+: blocked — [+ Child] hidden
```

**Title is contextual:**
```
Adding child of root → "Add Division"
Adding child of division → "Add Department under [Division Name]"
Adding child of department → "Add Team under [Department Name]"
Adding sibling → "Add [same type] (same level as [Node Name])"
```

**After clicking [Add Node]:**
```
1. New node added to state.nodes
2. Flowchart re-renders immediately with new node and connector
3. Quick modal closes
4. Full node modal opens automatically for the new node
   (so admin can start populating it)
```

---

## 8. Node Modal (Full Configuration)

Opened by clicking [⚙ Open] on any node card, or automatically after adding a new node.

**Layout:**
```
Position: Fixed, centered on screen
Width: 780px
Max-height: 85vh
Overflow-y: auto
Background: white
Border-radius: 12px
Box-shadow: large, dramatic
Backdrop: semi-transparent dark overlay
z-index: 300
```

**Modal header:**
```
Left:  [Color dot] Node Name · Node Code · Node Type badge
Right: [✕ Close]
```

**Tab bar (below header):**
```
[People]   [Resources]   [Settings]

Active tab: bottom border accent color, label darkens
Inactive tab: muted label, no border
```

---

### 8.1 People Tab

#### List State

```
Search bar: [🔍 Search people...]     [+ Add Person]

──────────────────────────────────────────────────────
Person list (when people exist):

[Photo]  Full Name              Role Name         [Edit] [✕]
         Employee ID · Pay Type · Rate

──────────────────────────────────────────────────────
Empty state (no people yet):

  👤
  No people in [Node Name] yet.
  Add people to assign them to project activities.
  [+ Add Person]
```

#### Add / Edit Person Form

When [+ Add Person] is clicked, the modal body changes: left half shows the list (greyed out slightly), right half slides in the form. On mobile-width modals, form takes full width.

```
SECTION: Photo
  [Large circular upload area with camera icon]
  Click to upload image
  Accepts: JPG, PNG, max 2MB
  Preview shown immediately after selection
  [Remove photo] appears below if photo exists
  Optional — skipping shows initials avatar in list

FIELD: Full Name
  Type: text input
  Required: yes
  Placeholder: "Full name"

FIELD: Employee ID
  Type: text input
  Required: yes
  Unique across entire company (checked in state)
  Placeholder: e.g., EMP-001

FIELD: Email
  Type: email input
  Required: yes
  Validated as email format

FIELD: OBS Node
  Type: select dropdown
  Default: current node (the one whose modal is open)
  Options: all active nodes in the tree
  Required: yes
  Note: "Changing this moves the person to another division"

FIELD: Role
  Type: select dropdown
  Options: all roles from global role catalogue
  Required: yes
  Placeholder: "Select a role"
  After selection:
    → Pay Type field auto-fills from role's defaultPayType
    → If no rate set for this role in current node:
      Show inline hint: "No rate set for this role in [Node Name].
      Set it in the Settings tab → Roles & Rates."

FIELD: Pay Type
  Type: radio group (3 options) or select dropdown
  Options: Hourly | Salaried | Contract
  Required: yes
  Default: inherited from selected role, overridable

── CONDITIONAL FIELDS based on Pay Type ──

If Pay Type = HOURLY:
  FIELD: Standard Rate
    Type: number input with ₹ prefix
    Unit label: "/hr"
    Required: yes
    Min: 0.01

  FIELD: Overtime Rate
    Type: number input with ₹ prefix
    Unit label: "/hr"
    Optional
    Only shown if role's overtimeEligible = true

  FIELD: Overtime Pay
    Type: toggle switch
    Default: on (yes)
    Label: "Pay overtime premium"
    Note: "If off, overtime hours tracked but not costed"

If Pay Type = SALARIED:
  FIELD: Monthly Salary
    Type: number input with ₹ prefix
    Unit label: "/month"
    Required: yes
    Label marked: "HR Admin only"
    Small lock icon to indicate restricted visibility

  DISPLAY (read-only): Daily Allocation
    Value: auto-computed = Monthly Salary / 26
    Label: "Daily allocation (visible to PM)"
    Shown as a greyed read-only field below salary

  DISPLAY: Overtime Pay
    Shown as locked-off toggle
    Label: "No overtime pay for salaried employees"
    Cannot be toggled

If Pay Type = CONTRACT:
  FIELD: Contract Amount
    Type: number input with ₹ prefix
    Label: "Fixed fee for this contract"
    Required: yes

  FIELD: Contract Period
    Type: date range picker (From — To)
    Optional

FIELD: Employment Type
  Type: select dropdown
  Options: Full-time | Part-time | Contract | Consultant
  Required: yes

FIELD: Join Date
  Type: date picker
  Optional

ACTIONS:
  [Cancel] → clears form, returns to list view
  [Save Person] → validates all required fields, saves to state,
                   person appears in list immediately,
                   node card stats update (people count increments)
```

**Edit Person:**
```
Clicking [Edit] on a person in the list
→ right form pre-fills with that person's data
→ Save button becomes [Update Person]
→ On save: list item updates in place
```

**Remove Person:**
```
Clicking [✕] on a person in the list
→ Confirmation: "Remove [Name] from [Node Name]?
                 They can be re-added or moved later."
  [Cancel]  [Remove]
→ Person removed from state, list updates
→ Node card people count decrements
```

---

### 8.2 Resources Tab

Tab is split into two sections with a visible section header each.

#### Equipment Section

```
EQUIPMENT                              [+ Add Equipment]
──────────────────────────────────────────────────────────

Empty state:
  No equipment registered for [Node Name].
  [+ Add Equipment]

List state:
  [Name]         [Code]      [Category]   [Billing Type]  [Rate]   [Edit][✕]
  Ladder 6m      CIVIL-EQ-01  Machinery   Daily Rental    ₹500/day
```

**Add / Edit Equipment Form:**
```
FIELD: Equipment Name
  Type: text input
  Required: yes
  Placeholder: e.g., "Ladder — 6m Aluminium"

FIELD: Equipment Code
  Type: text input
  Required: yes
  Label: "Asset tag number"
  Unique across company
  Placeholder: e.g., CIVIL-EQ-001

FIELD: Category
  Type: select dropdown
  Required: yes
  Options: Safety | Power Tool | Hand Tool | Machinery | Vehicle | Other

FIELD: Ownership Type
  Type: select dropdown
  Required: yes
  Options: Owned | Rented | Leased

FIELD: Billing Type
  Type: select dropdown
  Required: yes
  Options:
    Daily Rental      → AC ticks every deployed day
    Hourly Rental     → AC ticks per active use hour
    Pay per Use       → AC ticks per output unit
    Owned (Internal)  → Internal depreciation per day
    Fixed Hire        → Single flat charge on deployment

  Note shown below: Explains when AC ticks for selected type:
    Daily Rental selected → "Cost accumulates every day this
    equipment is deployed, whether used or idle."

FIELD: Standard Rate
  Type: number input with ₹ prefix
  Required: yes
  Unit label changes based on billing type:
    Daily Rental / Owned  → "/day"
    Hourly Rental         → "/hr"
    Pay per Use           → "/unit"
    Fixed Hire            → "(flat fee)"

FIELD: Idle Rate
  Type: number input with ₹ prefix
  Unit label: "/day"
  Optional
  Only shown if Billing Type = Daily Rental or Owned
  Label: "Rate when deployed but not actively used"
  Hint: "Leave blank to use standard rate for idle time"

FIELD: Mobilization Cost
  Type: number input with ₹ prefix
  Optional
  Label: "One-time cost to bring to site"

── CONDITIONAL: If Ownership Type = Rented or Leased ──
FIELD: Rental Contract Start
  Type: date picker
  Optional

FIELD: Rental Contract End
  Type: date picker
  Optional
  Must be after start date

ACTIONS:
  [Cancel]
  [Save Equipment]
```

---

#### Materials Section

```
MATERIALS                              [+ Add Material]
──────────────────────────────────────────────────────────

Empty state:
  No materials in [Node Name] catalogue.
  [+ Add Material]

List state:
  [Name]          [SKU]         [UOM]   [Cost/Unit]  [Stock]  [Edit][✕]
  Paint White     SKU-PAI-001   Litre   ₹300         100L
```

**Add / Edit Material Form:**
```
FIELD: Material Name
  Type: text input
  Required: yes
  Placeholder: e.g., "Exterior Wall Paint — White"

FIELD: SKU
  Type: text input
  Required: yes
  Label: "Stock keeping unit — unique identifier"
  Unique across company

FIELD: Category
  Type: select dropdown
  Required: yes
  Options: Consumable | Raw Material | Component | Chemical

FIELD: Unit of Measure (UOM)
  Type: select dropdown
  Required: yes — BLOCK SAVE if empty
  Options: Litre | Kg | Bag | Piece | m² | m³ | Box | Roll | Set
  Note shown below: "Quantity without a unit is meaningless.
                     This cannot be changed after materials are consumed
                     against activities."

FIELD: Standard Cost per Unit
  Type: number input with ₹ prefix
  Required: yes
  Min: 0.01 — BLOCK SAVE if zero or empty
  Unit label: auto-fills from UOM selection
    e.g., if UOM = Litre → "/litre"

FIELD: Cost Basis
  Type: radio group or select
  Required: yes
  Options:
    Fixed         → cost is locked at this value
    Market Rate   → PM can override with current market price at assignment
    Contract Rate → locked to a contract-negotiated value
  Default: Fixed

FIELD: Wastage Standard %
  Type: number input with % suffix
  Optional
  Default: 0
  Min: 0, Max: 100
  Label: "Industry-standard wastage allowance"
  Note: "Planned quantity auto-increases by this % when assigned
         to an activity. e.g., paint often has 5–10% wastage."

FIELD: Lead Time (days)
  Type: number input
  Optional
  Label: "Days to procure from vendor"
  Note: "Used to raise alerts before stock runs out on active activities"

FIELD: Reorder Point Qty
  Type: number input
  Optional
  Label: "Minimum stock level before procurement alert"
  Unit label: same as UOM

ACTIONS:
  [Cancel]
  [Save Material]
```

---

### 8.3 Settings Tab

Uses accordion pattern inside the tab. One section open at a time. Clicking a section header toggles it open/closed.

```
▼ Node Head            ← open by default when modal first opens
▶ Calendar
▶ Roles & Rates
▶ Cost Centres
```

---

#### Accordion Section 1 — Node Head

```
▼ Node Head

Who leads this division and receives escalations.

NODE HEAD    [Select person ▾]
             Shows only people assigned to this node (from People tab)
             Required

── If no people in this node yet ──
  Greyed out dropdown with message:
  "Add people in the People tab first,
   then assign a node head here."

── After selecting ──
  Shows selected person's photo + name + role
  [Change] link to re-select
```

---

#### Accordion Section 2 — Calendar

```
▶ Calendar

Assign Calendar    [Select calendar ▾]
                   Shows all calendars from global Calendars panel
                   Required

── If no calendars created ──
  Dropdown disabled with message:
  "No calendars created yet."
  [Create a Calendar ↗] → opens Calendars global panel

── After selecting ──
  Preview card shown below dropdown:
  ┌─────────────────────────────────┐
  │  Standard 6-day Mon–Sat         │
  │  Working days: Mon Tue Wed      │
  │                Thu Fri Sat      │
  │  Hours per day: 8               │
  │  Public holidays: 12 dates      │
  └─────────────────────────────────┘
```

---

#### Accordion Section 3 — Roles & Rates

```
▶ Roles & Rates

Roles active in this division and their cost rates.
Note: "Rates are specific to this division.
       The same role can cost differently in other divisions."

── Assigned roles list ──
Senior Painter  PNTR-SR  ₹200/hr std · ₹300/hr OT   [Edit Rate][Remove]
Junior Painter  PNTR-JR  ₹150/hr std              [Edit Rate][Remove]

[+ Assign Role from Catalogue]

── No roles assigned yet ──
  "No roles assigned to this division.
   Assign roles so resources can be picked for activity planning."
  [+ Assign Role from Catalogue]
```

**Assign Role flow:**
```
Clicking [+ Assign Role from Catalogue]:

Step 1: Role picker dropdown
  [Select role ▾]
  Shows all roles from global catalogue
  Already-assigned roles are shown but disabled with "(already assigned)"

Step 2: After selecting a role, rate fields appear:

  Role: Senior Painter  (read-only, shows selected)

  FIELD: Standard Rate
    Type: number input
    Required: yes
    Unit: "/hr" if Hourly, "/month" if Salaried
    Placeholder: "Set rate for this division"

  FIELD: Overtime Rate
    Type: number input
    Optional
    Only shown if role.overtimeEligible = true
    Unit: "/hr"

  [Cancel]  [Assign Role]

After assigning:
  Role appears in list with rates shown
```

**Edit Rate inline:**
```
Clicking [Edit Rate] on an assigned role:
  Rate fields appear inline below that role row
  Pre-filled with current rates
  [Save Rate] [Cancel]
  On save: rates update in list
```

**Remove role from node:**
```
Clicking [Remove] on assigned role:
  Confirmation: "Remove Senior Painter from Civil Division?
                 People assigned this role will lose their
                 rate reference for this division."
  [Cancel]  [Remove]
```

---

#### Accordion Section 4 — Cost Centres

```
▶ Cost Centres

Map finance codes to each cost type.
Costs logged by people and resources in this division
are automatically tagged to these codes.

FIELD: Labour Cost Centre
  Type: select dropdown
  Options: all cost centre codes from global list
  Optional
  Placeholder: "Select cost centre"

FIELD: Equipment Cost Centre
  Type: select dropdown
  Same options
  Optional

FIELD: Material Cost Centre
  Type: select dropdown
  Same options
  Optional

FIELD: Overhead Cost Centre
  Type: select dropdown
  Same options
  Optional
  Label: "For LOE and support activities"

── If no cost centres created ──
  All dropdowns disabled with message:
  "No cost centres created yet."
  [Create Cost Centres ↗] → opens Cost Centres global panel

── After selecting ──
  Each dropdown shows the selected code and description
  e.g., "CC-CIVIL-001 — Civil Division Labour"
```

---

## 9. Canvas Empty State

When admin first arrives, only the root node exists. A hint is shown below it:

```
[Kishore Constructions Pvt Ltd]   ← root node card
        ROOT
        0 people · 0 roles
        [⚙ Open]  [+ Add Division]

Below node, centered text:
  "Start by adding your first division.
   Click [+ Add Division] above."

Pulsing animation on [+ Add Division] button (subtle pulse, 2s loop)
to draw attention to the first action.
```

After first division is added, hint text disappears.

---

## 10. Validation — Save & Continue

When admin clicks **[Save & Continue →]**:

Run these checks in order. Show first failing check as an error toast. Do not proceed until all pass.

```
CHECK 1: At least one division exists
  Condition: nodes has at least 2 entries (root + 1 child)
  Error: "Add at least one division before continuing.
          Click [+ Add Division] on your company node."

CHECK 2: At least one person exists anywhere
  Condition: Object.keys(state.people).length > 0
  Error: "Add at least one person to your organisation.
          Open any division → People tab → Add Person."

CHECK 3: Root node has a node head
  Condition: state.nodes["node-root"].nodeHeadPersonId != null
  Error: "Assign a node head to [Company Name].
          Open your company node → Settings → Node Head."

CHECK 4: Every node that has people has a calendar assigned
  Condition: for each node where peopleCount > 0,
             node.calendarId != null
  Error: "[Division Name] has [N] people but no calendar assigned.
          Open [Division Name] → Settings → Calendar."

CHECK 5: No node has a role assigned with a null rate
  Condition: for each node, all assignedRoles have standardRate > 0
  Error: "[Role Name] in [Division Name] has no rate set.
          Open [Division Name] → Settings → Roles & Rates → Edit Rate."
```

**If all checks pass:**
```
Show success overlay:

  ✓  Organisation setup complete

  [Company Name] is ready.

  3  Divisions
  8  People added
  11 Roles assigned
  2  Calendars configured

  [Go to OPUS Dashboard →]

Save to localStorage with key "opus_setup_complete: true"
```

---

## 11. Save Draft

When admin clicks **[Save Draft]**:

```
Serialize state to JSON
Save to localStorage with key "opus_setup_draft"
Save timestamp

Show toast notification (bottom center, 3 seconds):
  "Draft saved — you can continue anytime."

Next login:
  Check localStorage for "opus_setup_draft"
  If exists and "opus_setup_complete" is not true:
    Load draft state
    Restore flowchart from saved nodes
    Welcome screen shows [Continue Setup] instead of [Begin Setup]
    Clicking [Continue Setup] loads this screen with draft restored
```

---

## 12. Visual Design Specifications

### Node Type Colors

```
COMPANY_ROOT → accent blue  (--accent)
DIVISION     → teal         (--teal)
DEPARTMENT   → amber        (--amber)
TEAM         → coral        (--coral)
```

### Typography

```
Display headings:    DM Serif Display, serif
Body / UI:           DM Sans, sans-serif
Code / IDs:          DM Mono, monospace

Sizes:
  Page title:        24px, DM Serif Display
  Modal title:       18px, DM Sans 600
  Section label:     11px, DM Sans 700, uppercase, tracked
  Body text:         14px, DM Sans 400
  Small / muted:     12px, DM Sans 400
  Code / ID values:  12px, DM Mono 500
```

### Canvas Background

```css
.canvas {
  background-color: var(--canvas-bg);
  background-image: radial-gradient(
    circle,
    var(--canvas-dot) 1px,
    transparent 1px
  );
  background-size: 24px 24px;
}
```

### Animations

```
Node card entrance:    fadeIn + translateY(8px → 0) over 200ms
Modal open:            fadeIn + scale(0.97 → 1) over 180ms
Modal backdrop:        fadeIn opacity(0 → 0.5) over 180ms
Panel slide-in:        translateX(100% → 0) over 250ms ease-out
Toast notification:    slideUp + fadeIn, auto-dismiss at 3s
+ Add button pulse:    scale(1 → 1.04 → 1), 2s loop, ease-in-out
Connector lines:       drawn with SVG stroke-dashoffset animation on node add
```

---

## 13. Connector Line Rendering

Connectors are rendered in an SVG element that sits behind all node cards but inside the canvas container.

```javascript
function renderConnectors() {
  const svg = document.getElementById('connector-svg');
  svg.innerHTML = '';

  for (const [id, node] of Object.entries(state.nodes)) {
    for (const childId of node.children) {
      const child = state.nodes[childId];
      const parentEl = document.getElementById(`node-${id}`);
      const childEl = document.getElementById(`node-${childId}`);

      if (!parentEl || !childEl) continue;

      // Calculate connection points
      const parentRight = node.x + NODE_WIDTH;
      const parentMidY = node.y + NODE_HEIGHT / 2;
      const childLeft = child.x;
      const childMidY = child.y + NODE_HEIGHT / 2;

      // Draw cubic bezier curve
      const midX = (parentRight + childLeft) / 2;
      const path = `M ${parentRight} ${parentMidY}
                    C ${midX} ${parentMidY},
                      ${midX} ${childMidY},
                      ${childLeft} ${childMidY}`;

      const pathEl = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      pathEl.setAttribute('d', path);
      pathEl.setAttribute('fill', 'none');
      pathEl.setAttribute('stroke', '#d3d1c7');
      pathEl.setAttribute('stroke-width', '1.5');
      pathEl.setAttribute('stroke-linecap', 'round');
      svg.appendChild(pathEl);
    }
  }
}
```

---

## 14. What This Screen Does NOT Include

Explicitly exclude the following — they belong to later phases:

```
✗ Approval chain configuration (Phase 3 — project-level)
✗ Timesheet submission or approval (Phase 4)
✗ Activity planning or scheduling (Phase 3)
✗ EVM metrics or project dashboards (Phase 5)
✗ HRM integration sync settings (Phase 2 enhancement)
✗ Productivity rates (auto-built from execution history — Phase 4+)
✗ Material stock levels (inventory module — Phase 5+)
✗ Cross-project allocation view (Resource Pool module — after this screen)
```

---

## 15. Completion Criteria

The screen is considered complete when:

```
1. Flowchart canvas renders with root node and dot-grid background
2. Canvas supports pan and zoom with smooth performance
3. [+ Add Division/Department/Team] opens quick-add modal correctly
4. New nodes appear in flowchart immediately after creation
5. Connector lines render correctly between all parent-child nodes
6. [⚙ Open] opens node modal with three tabs
7. People tab: add/edit/remove person works including photo upload and
               conditional pay type fields
8. Resources tab: add/edit/remove equipment and material works with
                  all conditional fields
9. Settings tab: all four accordion sections work, node head picker
                 scoped to node's people, calendar picker from global
                 list, role assignment with rate-setting, cost centre
                 mapping
10. Calendars global panel: create/edit calendars with working days
                            and public holidays
11. Roles global panel: create/edit roles with all fields
12. Cost Centres global panel: create/edit cost centre codes
13. Save Draft saves to localStorage and restores on next visit
14. Save & Continue runs all 5 validation checks and shows errors
    clearly before allowing progression
15. Successful save shows completion summary overlay
```

---

*End of implementation prompt. This prompt is self-contained — no additional context document is needed to implement Screen 5.*