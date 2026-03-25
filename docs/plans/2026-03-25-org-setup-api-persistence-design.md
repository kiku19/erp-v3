# Org Setup — API Persistence & Event-Driven Architecture

**Date:** 2026-03-25
**Status:** Approved
**Goal:** Replace localStorage-based org setup with full API persistence, event-driven backend, and inline validation warnings.

---

## Summary

Remove all localStorage dependencies from the organization setup screen. Every mutation persists to PostgreSQL via API routes. An in-process event bus emits domain events after each write, structured so WebSocket push and cross-service consumers can be added later without changing API handlers.

### Key Decisions

- **No "Save & Continue" button** — data is always persisted, org setup is always accessible from sidebar
- **No localStorage** — React state (in-memory) + API is the only data flow
- **Calendar stays on Node** (not Person) — teams share a work schedule
- **Cost centres removed** — stripped from schema, context, and UI entirely
- **Event-driven** — every mutation emits a domain event; handlers are fire-and-forget (non-blocking)
- **Loader on page load** — single `GET /api/org-setup` fetches all entities, show spinner while resolving

---

## Database Schema

### New Models

```prisma
model OBSNode {
  id                String   @id @default(cuid())
  tenantId          String
  parentId          String?
  name              String
  code              String
  type              String   @default("DIVISION")
  nodeHeadPersonId  String?
  calendarId        String?
  assignedRoles     Json     @default("[]")
  isActive          Boolean  @default(true)
  sortOrder         Int      @default(0)
  isDeleted         Boolean  @default(false)
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  parentNode  OBSNode?  @relation("OBSNodeTree", fields: [parentId], references: [id])
  childNodes  OBSNode[] @relation("OBSNodeTree")
  people      OBSPerson[]
  equipment   OBSEquipment[]
  materials   OBSMaterial[]

  @@unique([tenantId, code])
  @@index([tenantId, isDeleted])
  @@index([tenantId, parentId, isDeleted])
}

model OBSPerson {
  id              String    @id @default(cuid())
  tenantId        String
  nodeId          String
  name            String
  employeeId      String
  email           String
  roleId          String?
  payType         String    @default("hourly")
  standardRate    Float?
  overtimeRate    Float?
  overtimePay     Boolean   @default(false)
  monthlySalary   Float?
  dailyAllocation Float?
  contractAmount  Float?
  employmentType  String    @default("full-time")
  joinDate        DateTime?
  photoUrl        String?
  isDeleted       Boolean   @default(false)
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  node OBSNode @relation(fields: [nodeId], references: [id])

  @@unique([tenantId, employeeId])
  @@index([tenantId, isDeleted])
  @@index([tenantId, nodeId, isDeleted])
}

model OBSEquipment {
  id               String    @id @default(cuid())
  tenantId         String
  nodeId           String
  name             String
  code             String
  category         String    @default("other")
  ownershipType    String    @default("owned")
  billingType      String    @default("owned-internal")
  standardRate     Float     @default(0)
  idleRate         Float?
  mobilizationCost Float?
  rentalStart      DateTime?
  rentalEnd        DateTime?
  isDeleted        Boolean   @default(false)
  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt

  node OBSNode @relation(fields: [nodeId], references: [id])

  @@unique([tenantId, code])
  @@index([tenantId, isDeleted])
  @@index([tenantId, nodeId, isDeleted])
}

model OBSMaterial {
  id                  String   @id @default(cuid())
  tenantId            String
  nodeId              String
  name                String
  sku                 String
  category            String   @default("consumable")
  uom                 String   @default("piece")
  standardCostPerUnit Float    @default(0)
  costBasis           String   @default("fixed")
  wastageStandardPct  Float    @default(0)
  leadTimeDays        Int?
  reorderPointQty     Int?
  isDeleted           Boolean  @default(false)
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  node OBSNode @relation(fields: [nodeId], references: [id])

  @@unique([tenantId, sku])
  @@index([tenantId, isDeleted])
  @@index([tenantId, nodeId, isDeleted])
}
```

### Existing Models (reused as-is)

- **Role** — already has CRUD at `/api/roles`
- **Calendar** + **CalendarException** — already in schema; org-level calendars use `projectId: null, category: "global"`

---

## API Routes

### Aggregate Fetch

```
GET /api/org-setup
→ Returns { nodes, people, equipment, materials, calendars, roles }
→ Single call on page load; calendars filtered to category: "global"
```

### Per-Entity CRUD

| Entity | Create | Update | Delete |
|--------|--------|--------|--------|
| Node | `POST /api/org-setup/nodes` | `PATCH /api/org-setup/nodes/[id]` | `DELETE /api/org-setup/nodes/[id]` |
| Person | `POST /api/org-setup/people` | `PATCH /api/org-setup/people/[id]` | `DELETE /api/org-setup/people/[id]` |
| Equipment | `POST /api/org-setup/equipment` | `PATCH /api/org-setup/equipment/[id]` | `DELETE /api/org-setup/equipment/[id]` |
| Material | `POST /api/org-setup/materials` | `PATCH /api/org-setup/materials/[id]` | `DELETE /api/org-setup/materials/[id]` |
| Role | Existing `/api/roles` | Existing `/api/roles/[id]` | Existing `/api/roles/[id]` |
| Calendar | Existing or new `/api/calendars` | Existing or new `/api/calendars/[id]` | Existing or new `/api/calendars/[id]` |

All routes follow existing patterns:
- `authenticateRequest()` for auth
- `tenantId` isolation on every query
- Soft-delete only (`isDeleted: true`)
- Zod validation on request body
- `@swagger` JSDoc on every handler
- Return created/updated entity in response

### Node Delete Cascade

`DELETE /api/org-setup/nodes/[id]` soft-deletes the node and all descendants, plus their people, equipment, and materials. Done in a single Prisma transaction.

---

## Event System

### Event Bus (`lib/events/event-bus.ts`)

In-process `EventEmitter` wrapper. Typed domain events. Fire-and-forget (handlers don't block API response).

```ts
interface DomainEvent {
  type: string;
  tenantId: string;
  entityId: string;
  payload: Record<string, unknown>;
  timestamp: Date;
}
```

### Event Types (`lib/events/org-events.ts`)

```
obs.node.created      → payload: { node }
obs.node.updated      → payload: { node, changes }
obs.node.deleted      → payload: { nodeId, cascadedIds }

obs.person.created    → payload: { person }
obs.person.updated    → payload: { person, changes }
obs.person.deleted    → payload: { personId }

obs.equipment.created → payload: { equipment }
obs.equipment.updated → payload: { equipment, changes }
obs.equipment.deleted → payload: { equipmentId }

obs.material.created  → payload: { material }
obs.material.updated  → payload: { material, changes }
obs.material.deleted  → payload: { materialId }
```

### Future Consumers (not built now, just designed for)

- **Rate cascade** — `obs.person.updated` with rate change → update associated project resource costs
- **Socket push** — emit to WebSocket channel for real-time UI updates
- **Audit log** — persist event to an audit table

---

## Client-Side Architecture

### Data Flow

```
Page load → GET /api/org-setup → Show loader → Hydrate context
                                                    │
User action → dispatch(action) → Optimistic update ─┤
                                                    │
           → fetch(POST/PATCH/DELETE) ──────────────┤
                                                    │
           → Success: update context with server ID │
           → Error: rollback context, show toast    │
```

### Context Changes

**Removed:**
- `LOAD_DRAFT` action
- `saveDraft()` method
- All `localStorage` reads/writes

**Added:**
- `isLoading: boolean` to state — true during initial fetch
- `isSaving: Record<string, boolean>` — per-entity saving indicators
- `fetchOrgSetup()` — called on mount, populates state from API
- Each dispatch action that mutates data also triggers the corresponding API call

### Hook: `use-org-api.ts`

Encapsulates all API calls with:
- Optimistic state updates
- Error rollback
- Toast notifications on failure
- Loading state management

---

## Files Removed

| File | Reason |
|------|--------|
| `components/org-setup/use-org-autosave.ts` | localStorage auto-save replaced by API |
| `components/org-setup/validation.ts` | Inline warnings on node-card replace modal validation |
| `components/org-setup/completion-overlay.tsx` | No "Save & Continue" flow |
| `components/org-setup/cost-centres-modal.tsx` | Cost centres removed |

## Files Modified

| File | Changes |
|------|---------|
| `prisma/schema.prisma` | Add OBSNode, OBSPerson, OBSEquipment, OBSMaterial models; remove cost centre references |
| `components/org-setup/context.tsx` | Remove localStorage, add isLoading, add API fetch on mount, remove costCentre actions |
| `components/org-setup/types.ts` | Remove CostCentre types, add loading states |
| `components/org-setup/org-setup-screen.tsx` | Remove autosave hook, completion overlay, save button |
| `components/org-setup/header.tsx` | Remove save button + autosave indicator, remove cost centres button |
| `components/org-setup/node-card.tsx` | Add inline validation warnings (no head, no calendar, no rates) |
| `components/org-setup/settings-tab.tsx` | Remove cost centre section |
| `components/org-setup/node-modal.tsx` | Remove cost centres from settings tab |

## Files Created

| File | Purpose |
|------|---------|
| `lib/events/event-bus.ts` | In-process domain event emitter |
| `lib/events/org-events.ts` | OBS domain event type definitions |
| `lib/validations/org-setup.ts` | Zod schemas for node, person, equipment, material |
| `hooks/use-org-api.ts` | API call hook with optimistic updates |
| `app/api/org-setup/route.ts` | GET aggregate endpoint |
| `app/api/org-setup/nodes/route.ts` | POST node |
| `app/api/org-setup/nodes/[id]/route.ts` | PATCH, DELETE node |
| `app/api/org-setup/people/route.ts` | POST person |
| `app/api/org-setup/people/[id]/route.ts` | PATCH, DELETE person |
| `app/api/org-setup/equipment/route.ts` | POST equipment |
| `app/api/org-setup/equipment/[id]/route.ts` | PATCH, DELETE equipment |
| `app/api/org-setup/materials/route.ts` | POST material |
| `app/api/org-setup/materials/[id]/route.ts` | PATCH, DELETE material |
