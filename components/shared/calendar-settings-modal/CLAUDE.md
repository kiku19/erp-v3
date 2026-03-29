# Calendar Settings Modal

Shared modal for managing work calendars, work-week configuration, and calendar exceptions. Used across **project-management planner** and **org-setup**.

## Usage

```tsx
import { CalendarSettingsModal } from "@/components/shared/calendar-settings-modal/calendar-settings-modal";

<CalendarSettingsModal
  open={open}
  onClose={() => setOpen(false)}
  calendars={calendars}
  categories={["global", "project"]}
  onCreate={handleCreate}
  onUpdate={handleUpdate}
  onDelete={handleDelete}
  onDeleteException={handleDeleteException}
  onCreateException={handleCreateException}
  onRefresh={handleRefresh}
/>
```

## Layout Structure

The modal is `1280px` wide, `90vh` tall (max `900px`). It has a **header → two-panel body** layout:

```
┌──────────────────────────────────────────────────────────────┐
│  [CalendarCog]  Calendar Settings                  [Search] [X] │  ← Header (h-16)
│                 Manage work calendars...                        │
├────────────────┬─────────────────────────────────────────────┤
│  Calendars [3] │  (Right panel — varies by state)            │
│  [+]           │                                             │
│────────────────│  State A: "Create New Calendar" form        │
│  GLOBAL        │  State B: Selected calendar detail          │
│  ▸ Standard    │  State C: Exception editor (with ← back)   │
│  ▸ Extended    │  State D: Success animation                 │
│                │                                             │
│  PROJECT       │                                             │
│  ▸ Custom      │                                             │
└────────────────┴─────────────────────────────────────────────┘
```

### Header (h-16, border-b)
- **Left:** `CalendarCog` icon (22px) + title/description stacked
  - Title: `text-base font-semibold text-foreground` → "Calendar Settings"
  - Description: `text-body-sm text-muted-foreground` → "Manage work calendars and scheduling rules"
- **Right:** Search button (outline) + Close button (ghost, icon)

### Left Panel (w-[300px], bg-card, border-r)

**List Header** (h-12, border-b):
- Label: `text-body font-semibold text-foreground` → "Calendars"
- Count badge: `text-caption` via `<Badge variant="secondary">`
- Add button: `<Button variant="ghost" size="icon">` with `<Plus size={14} />`

**Category Group Headers:**
- `text-caption font-semibold text-muted-foreground uppercase tracking-wider` → "GLOBAL CALENDARS"

**List Items** (py-2.5, px-4):
- Calendar name: `text-body-sm font-medium text-foreground` (truncated)
- Meta line: `text-caption text-muted-foreground` → "8h/day · 5 days/wk"
- Selected state: `bg-primary-active text-primary-active-foreground`
- Hover state: `bg-muted-hover`
- Delete icon: hidden by default, `opacity-0 group-hover:opacity-100`, `<Trash2 size={13} />`
- New item animation: `list-item-enter` + `border-glow`

### Right Panel (flex-1, bg-background)

The right panel renders one of **4 states**:

#### State A — Create New Calendar Form (default)
- **Panel header** (h-14, border-b): `text-subhead font-semibold text-foreground` → "Create New Calendar"
- **Form body** (p-6, gap-6, scrollable):
  - Form label: `text-body font-medium text-foreground` → "Calendar Name"
  - `<Input>` for name
  - Section heading: `text-body font-semibold text-foreground` → "Work Week Configuration"
  - Summary text: `text-body-sm text-muted-foreground` → "Total: 40 hrs/wk · 5 days/wk"
  - Work day table (see table structure below)
  - Exceptions list (see exceptions structure below)
  - `<Button>` → "Create Calendar" (disabled when name empty)

#### State B — Selected Calendar Detail
- **Panel header** (h-14, border-b):
  - Left: `text-subhead font-semibold text-foreground` → calendar name + `<Badge variant="warning">` for category
  - Right: Duplicate button + Delete button (`text-body-sm`)
- **Detail body** (p-6, gap-6, scrollable):
  - Same work-week table and exceptions list as the create form
  - "Fill Down" button in work week header

#### State C — Exception Editor (inline, with back navigation)
- **Panel header** (h-14, border-b):
  - `<ArrowLeft>` back button (h-8 w-8, rounded-md)
  - `text-subhead font-semibold text-foreground` → "Exceptions & Holidays — {name}"
- Renders `<ExceptionEditorContent>` below

#### State D — Success Animation
- Centered `<Calendar>` icon (48px) with green checkmark badge
- Fades out after 1.2s via `success-fade-out` animation

### Work Day Table Structure

```
┌────────────┬──────────┬────────────┬────────────┬─────────┬────────┐
│ Day        │ Workday  │ Start Time │ End Time   │ Hrs/Day │ Active │  ← header row (h-9, bg-muted)
├────────────┼──────────┼────────────┼────────────┼─────────┼────────┤
│ Monday     │ [✓]      │ [09:00]    │ [17:00]    │ 8h      │ [✓]   │  ← data row (h-10)
│ Tuesday    │ [✓]      │ [09:00]    │ [17:00]    │ 8h      │ [✓]   │
│ ...        │          │            │            │         │        │
└────────────┴──────────┴────────────┴────────────┴─────────┴────────┘
```
- Table header: `text-detail font-semibold text-muted-foreground`
- Table cells: `text-body-sm text-foreground`
- Day name: `font-medium`
- Time inputs: `h-7 text-detail w-[100px]`
- Non-working days show "—" in `text-muted-foreground`

### Exceptions List
- Section heading: `text-body font-semibold text-foreground` → "Exceptions & Holidays"
- "Add Exception" button: `<Button variant="outline" size="sm">` with `text-body-sm`
- Each exception row:
  - Color dot: `w-2 h-2 rounded-full` (mapped via `DOT_CLASS_MAP`)
  - Name: `text-body-sm font-medium text-foreground`
  - Date + type: `text-detail text-muted-foreground`
  - Delete icon: `<Trash2 size={14} />`
- Empty state: `text-body-sm text-muted-foreground` → "No exceptions configured"

## Font Sizes — Use Design Tokens, Not Hardcoded Pixels

This modal currently uses hardcoded `text-[Npx]` values. When modifying or extending, **always use the design token classes** defined in `app/globals.css`:

| Hardcoded (avoid)  | Design Token (use) | Size  | Usage in this modal                              |
|--------------------|--------------------|-------|--------------------------------------------------|
| `text-[10px]`      | `text-caption`     | 10px  | Badge counts, category headers, item meta lines  |
| `text-[11px]`      | `text-detail`      | 11px  | Table column headers, time inputs, exception dates|
| `text-[12px]`      | `text-body-sm`     | 12px  | List item names, button labels, form descriptions |
| `text-[13px]`      | `text-body`        | 13px  | Section headings, form labels, list panel title   |
| `text-[14px]`      | `text-subhead`     | 15px  | Right-panel headings (note: subhead = 15px)       |
| `text-base` (16px) | `text-subhead`     | 15px  | Modal title (via `ModalHeader`)                   |

## Font Weights

| Weight         | Tailwind class  | Usage in this modal                                              |
|----------------|-----------------|------------------------------------------------------------------|
| **600 (semi)** | `font-semibold` | Modal title, panel headings, section headings, table headers, category group labels |
| **500 (med)**  | `font-medium`   | List item names, table day names, form labels, exception names   |
| **400 (normal)**| _(default)_    | Descriptions, meta lines, table cell values, empty state text    |

## Sub-Modals

### DuplicateCalendarModal (width: 420px)
Uses `ModalHeader` + `ModalFooter`. Simple name input with Save/Cancel.

### Delete Confirmation (width: 400px)
Uses `ModalHeader` + `ModalFooter`. Destructive confirmation with Cancel/Delete.

## Components Used
- `Modal`, `ModalHeader`, `ModalFooter` from `@/components/ui/modal`
- `Button`, `Input`, `Checkbox`, `Badge` from `@/components/ui/`
- `SpotlightSearch` from `@/components/ui/spotlight-search`
- `ExceptionEditorContent` from `@/components/shared/calendar-exception-modal/`

## Rules

1. Always use `ModalHeader` from `@/components/ui/modal` for modal headers — never hand-build `<h2>` + `<p>` headers.
2. Always use `ModalFooter` for action button rows at the bottom of modals.
3. Use design token font size classes (`text-body-sm`, `text-detail`, etc.) — never `text-[12px]` or similar hardcoded pixel values.
4. Use design token colors (`text-foreground`, `text-muted-foreground`, `bg-border`) — never raw hex/rgb.
5. Font weight hierarchy: `font-semibold` for headings/titles, `font-medium` for item names/labels, default weight for body text/meta.
