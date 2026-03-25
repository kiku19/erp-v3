# Calendar Modal UX Redesign — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Redesign the calendar settings modal to show an add-calendar form by default, add a Spotlight-style search (Ctrl+K), show an SVG empty state when no calendars exist, and add creation success animations.

**Architecture:** All changes are within the existing `calendar-settings-modal.tsx` component. New keyframes are added to `globals.css`. The CalendarSearchModal is replaced with a Spotlight-style overlay. The right panel gains a new "add form" view as the default state. No new files except keyframes in globals.css.

**Tech Stack:** React, TypeScript, Tailwind CSS v4, Lucide icons, design tokens from globals.css

---

## Task 1: Add new keyframes to globals.css

**Files:**
- Modify: `app/globals.css` (after line 332, before the base styles comment)

**Step 1: Add keyframes for list item glow, success checkmark, and spotlight**

Add these keyframes after the existing `toast-slide-up` keyframe:

```css
@keyframes list-item-enter {
  from { opacity: 0; transform: translateY(-8px); max-height: 0; }
  to { opacity: 1; transform: translateY(0); max-height: 80px; }
}

@keyframes border-glow {
  0% { box-shadow: 0 0 0 0 var(--primary); }
  40% { box-shadow: 0 0 8px 2px var(--primary); }
  100% { box-shadow: 0 0 0 0 var(--primary); }
}

@keyframes success-scale-in {
  0% { opacity: 0; transform: scale(0.5); }
  60% { opacity: 1; transform: scale(1.1); }
  100% { opacity: 1; transform: scale(1); }
}

@keyframes spotlight-in {
  from { opacity: 0; transform: translateY(-20px) scale(0.97); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

@keyframes spotlight-out {
  from { opacity: 1; transform: translateY(0) scale(1); }
  to { opacity: 0; transform: translateY(-20px) scale(0.97); }
}
```

**Step 2: Commit**

```bash
git add app/globals.css
git commit -m "feat: add keyframes for calendar modal animations (list-item-enter, border-glow, success-scale-in, spotlight)"
```

---

## Task 2: Update tests for new default behavior

The modal's default view is changing: instead of showing the first calendar's details, it now shows the "Add Calendar" form. Tests must be updated to reflect this.

**Files:**
- Modify: `app/(app)/project-management/[projectId]/planner/_components/calendar-settings-modal.test.tsx`

**Step 1: Update existing tests that expect work-week config to show by default**

The tests at lines 53-63 ("renders work week configuration", "renders day names", "renders exceptions section") expect these to appear on initial render because the first calendar was auto-selected. Now the default view is the add form, so:

- Remove `it("renders work week configuration")` — this showed because a calendar was selected by default
- Remove `it("renders day names")` — same reason
- Remove `it("renders exceptions section")` — same reason

**Step 2: Add new tests for the add-calendar form default view**

```typescript
it("shows add calendar form by default when calendars exist", () => {
  render(<CalendarSettingsModal {...defaultProps} />);
  expect(screen.getByText("Create New Calendar")).toBeDefined();
  expect(screen.getByPlaceholderText("Enter calendar name...")).toBeDefined();
});

it("shows add calendar form by default when no calendars", () => {
  render(<CalendarSettingsModal {...defaultProps} calendars={[]} />);
  expect(screen.getByText("Create New Calendar")).toBeDefined();
});

it("shows empty state SVG in left panel when no calendars", () => {
  render(<CalendarSettingsModal {...defaultProps} calendars={[]} />);
  expect(screen.getByTestId("empty-calendar-svg")).toBeDefined();
  expect(screen.getByText("No calendars added yet")).toBeDefined();
});
```

**Step 3: Add tests for the Plus button behavior**

```typescript
it("clicking Plus button shows add calendar form on right", () => {
  render(<CalendarSettingsModal {...defaultProps} />);
  // First select a calendar to navigate away from add form
  fireEvent.click(screen.getByText("Standard 5-Day"));
  expect(screen.getByText("Work Week Configuration")).toBeDefined();
  // Now click Plus to go back to add form
  fireEvent.click(screen.getByTestId("add-calendar-btn"));
  expect(screen.getByText("Create New Calendar")).toBeDefined();
});
```

**Step 4: Add tests for Spotlight search**

```typescript
it("opens spotlight search on Ctrl+K", () => {
  render(<CalendarSettingsModal {...defaultProps} />);
  fireEvent.keyDown(document, { key: "k", ctrlKey: true });
  expect(screen.getByTestId("spotlight-search-input")).toBeDefined();
});

it("closes spotlight search on Escape", async () => {
  render(<CalendarSettingsModal {...defaultProps} />);
  fireEvent.keyDown(document, { key: "k", ctrlKey: true });
  expect(screen.getByTestId("spotlight-search-input")).toBeDefined();
  fireEvent.keyDown(document, { key: "Escape" });
  await waitFor(() => {
    expect(screen.queryByTestId("spotlight-search-input")).toBeNull();
  });
});

it("spotlight shows no calendars message when list is empty", () => {
  render(<CalendarSettingsModal {...defaultProps} calendars={[]} />);
  fireEvent.keyDown(document, { key: "k", ctrlKey: true });
  expect(screen.getByText("No calendars have been added yet")).toBeDefined();
});

it("spotlight shows no results message when search has no matches", async () => {
  render(<CalendarSettingsModal {...defaultProps} />);
  fireEvent.keyDown(document, { key: "k", ctrlKey: true });
  const input = screen.getByTestId("spotlight-search-input");
  fireEvent.change(input, { target: { value: "zzzznonexistent" } });
  await waitFor(() => {
    expect(screen.getByText("No results found")).toBeDefined();
  });
});

it("selecting a calendar from spotlight navigates to its details", async () => {
  render(<CalendarSettingsModal {...defaultProps} />);
  fireEvent.keyDown(document, { key: "k", ctrlKey: true });
  fireEvent.click(screen.getByTestId("spotlight-item-cal-1"));
  await waitFor(() => {
    expect(screen.getByText("Work Week Configuration")).toBeDefined();
    expect(screen.queryByTestId("spotlight-search-input")).toBeNull();
  });
});
```

**Step 5: Update the old search modal tests**

Replace the `CalendarSearchModal (via search area)` describe block. Remove tests for "Select Calendar" text, "Assign" button, etc. Replace with:

```typescript
describe("Spotlight Search (via search trigger)", () => {
  afterEach(() => cleanup());

  it("opens spotlight when search trigger is clicked", () => {
    render(<CalendarSettingsModal {...defaultProps} />);
    fireEvent.click(screen.getByTestId("calendar-search-trigger"));
    expect(screen.getByTestId("spotlight-search-input")).toBeDefined();
  });

  it("shows calendar items in spotlight", () => {
    render(<CalendarSettingsModal {...defaultProps} />);
    fireEvent.click(screen.getByTestId("calendar-search-trigger"));
    expect(screen.getByTestId("spotlight-item-cal-1")).toBeDefined();
    expect(screen.getByTestId("spotlight-item-cal-2")).toBeDefined();
  });
});
```

**Step 6: Add test for calendar creation success animation**

```typescript
it("shows success state after creating a calendar", async () => {
  const onCreate = vi.fn();
  render(<CalendarSettingsModal {...defaultProps} onCreate={onCreate} />);
  const nameInput = screen.getByPlaceholderText("Enter calendar name...");
  fireEvent.change(nameInput, { target: { value: "My New Calendar" } });
  fireEvent.click(screen.getByTestId("create-calendar-btn"));
  expect(onCreate).toHaveBeenCalledWith(
    expect.objectContaining({ name: "My New Calendar" }),
  );
});
```

**Step 7: Run tests to confirm they fail**

Run: `npx vitest run app/\(app\)/project-management/\[projectId\]/planner/_components/calendar-settings-modal.test.tsx`
Expected: FAIL — new tests reference elements that don't exist yet

**Step 8: Commit**

```bash
git add app/\(app\)/project-management/\[projectId\]/planner/_components/calendar-settings-modal.test.tsx
git commit -m "test: update calendar modal tests for new default add-form view, spotlight search, and creation animations"
```

---

## Task 3: Implement the calendar-settings-modal.tsx changes

This is the main implementation task. All changes go in the single file `calendar-settings-modal.tsx`.

**Files:**
- Modify: `app/(app)/project-management/[projectId]/planner/_components/calendar-settings-modal.tsx`

### Changes overview:

**A) Remove `CalendarSearchModal` sub-component entirely** (lines 95-257)

**B) Add `SpotlightSearch` sub-component** — macOS Spotlight-style overlay with:
- Backdrop blur overlay
- Centered search input with icon
- Dropdown results list (filtered from `calendars` prop via local string match)
- Keyboard navigation (Arrow Up/Down, Enter to select, Escape to close)
- States: no calendars → "No calendars have been added yet", no results → "No results found"
- Animations: `spotlight-in` / `spotlight-out` keyframes
- On select: calls `onSelect(calId)` to navigate to that calendar

**C) Add `EmptyCalendarSvg` inline component** — minimal SVG illustration for the left panel:
- Calendar outline with dashed border and a "+" symbol
- Uses `var(--muted-foreground)` and `var(--border)` for colors
- Wrapped with "No calendars added yet" text

**D) Add `SuccessAnimation` inline component** — shown briefly after calendar creation:
- Calendar icon with animated checkmark (uses `success-scale-in` + `checkmark-draw` keyframes)
- "Calendar created!" text
- Auto-fades after 1.5s, then resets right panel to add form

**E) Modify `CalendarSettingsModal` main component:**

1. **Default state:** `selectedCalId` starts as `null` (not first calendar)
2. **Add `showAddForm` state** (default `true`) — controls right panel view
3. **Add `successAnim` state** — briefly true after creation, triggers success animation
4. **Add `newlyCreatedId` state** — tracks which calendar item should glow in left panel
5. **Remove inline input** from left panel (lines 407-416)
6. **Plus button:** sets `selectedCalId = null`, `showAddForm = true`
7. **Left panel empty state:** when `calendars.length === 0`, show `EmptyCalendarSvg`
8. **Left panel calendar items:** when `cal.id === newlyCreatedId`, apply `list-item-enter` + `border-glow` animations
9. **Right panel logic:**
   - If `successAnim` → show `SuccessAnimation`
   - Else if `showAddForm` (or `selectedCalId === null` and no exception editor) → show Add Calendar form
   - Else if `selectedCal && exceptionModalOpen` → show exception editor (existing)
   - Else if `selectedCal` → show calendar details (existing)
10. **Add Calendar form** (right panel):
    - Title: "Create New Calendar"
    - Calendar name input (`placeholder="Enter calendar name..."`)
    - Work Week Configuration table (same as detail view, using local `newWorkDays` state initialized to `DEFAULT_WORK_DAYS`)
    - "Create Calendar" button (`data-testid="create-calendar-btn"`)
11. **handleCreate updated:**
    - Calls `onCreate(...)` with the form data
    - Sets `successAnim = true`
    - Sets `newlyCreatedId` to trigger glow on the new item
    - After 1.5s timeout: sets `successAnim = false`, resets form
    - Clears `newlyCreatedId` after 2s (glow animation completes)
12. **Ctrl+K handler:** Add `useEffect` for keydown listener on `document`, opens spotlight when `Ctrl+K` pressed while modal is open
13. **Search trigger button:** now opens spotlight instead of the old search modal
14. **Clicking a calendar in left panel:** sets `selectedCalId`, sets `showAddForm = false`

### Step 1: Implement all changes

Replace the entire `calendar-settings-modal.tsx` with the updated implementation following the architecture above. Key details:

- The SpotlightSearch filters calendars locally with `cal.name.toLowerCase().includes(query)` — no API call needed for local filtering
- Arrow key navigation uses a `highlightedIndex` state, Enter selects
- The add form reuses the same work week table markup from the detail view
- Success animation uses existing `checkmark-draw` + new `success-scale-in` keyframes
- The glow effect on new list items uses `border-glow` keyframe with `animation-duration: 1.5s`
- All colors use design tokens, no hardcoded values

### Step 2: Run tests

Run: `npx vitest run app/\(app\)/project-management/\[projectId\]/planner/_components/calendar-settings-modal.test.tsx`
Expected: ALL PASS

### Step 3: Commit

```bash
git add app/\(app\)/project-management/\[projectId\]/planner/_components/calendar-settings-modal.tsx
git commit -m "feat: redesign calendar modal with add-form default view, spotlight search, empty state SVG, and creation animations"
```

---

## Task 4: Update stories for the new behavior

**Files:**
- Modify: `app/(app)/project-management/[projectId]/planner/_components/calendar-settings-modal.stories.tsx`

**Step 1: Update the Interactive story**

The existing `Interactive` story needs these changes:
- `onCreate` handler should add the new calendar to the **beginning** of the array (not end) so it appears at top of list
- Add an `EmptyState` story variant that renders with `calendars={[]}` to showcase the SVG empty state
- Remove the mock fetch for calendar search API (spotlight uses local filtering now)

**Step 2: Add new story variants**

```typescript
export const EmptyState: Story = {
  render: () => <InteractiveEmpty />,
};
```

Where `InteractiveEmpty` is a copy of `Interactive` but starts with `calendars={[]}`.

**Step 3: Commit**

```bash
git add app/\(app\)/project-management/\[projectId\]/planner/_components/calendar-settings-modal.stories.tsx
git commit -m "feat: update calendar modal stories for new default view and empty state"
```

---

## Task 5: Update the org-setup calendars-modal wrapper

**Files:**
- Modify: `components/org-setup/calendars-modal.tsx`

**Step 1: Check if the wrapper passes any search-specific props**

The wrapper dispatches `ADD_CALENDAR` actions. Since we changed `onCreate` to add to the beginning, verify the wrapper's `onCreate` handler works correctly — it should still dispatch the same action, the ordering is handled by the parent state.

No code changes expected unless the wrapper was passing props to `CalendarSearchModal` that no longer exist.

**Step 2: Run full test suite**

Run: `npx vitest run`
Expected: ALL PASS

**Step 3: Commit (if changes needed)**

---

## Task 6: Final verification

**Step 1: Start dev server and test in browser**

Run: `npx next dev --port 3005`

Verify:
- Modal opens with add-calendar form on right by default
- Plus button navigates to add form
- Creating a calendar shows success animation, then resets form
- New calendar appears at top of left panel with glow animation
- Empty left panel shows SVG illustration
- Ctrl+K opens spotlight search centered on screen
- Spotlight filters calendars, shows "No calendars" / "No results" messages
- Selecting from spotlight navigates to that calendar
- Escape closes spotlight, then modal
- All existing functionality (duplicate, delete, exceptions) still works

**Step 2: Final commit if any fixes needed**
