# Org Setup — Modal Standards

All modals in `components/org-setup/` follow the **two-panel master-detail** pattern established by the reference implementation at `@/components/shared/calendar-settings-modal/calendar-settings-modal.tsx`.

## Canonical Layout

```
┌──────────────────────────────────────────────────────┐
│  ModalHeader (title + description + actions + close) │
├──────────────┬───────────────────────────────────────┤
│  Left Panel  │  Right Panel                         │
│  (list)      │  (form / empty state)                │
│              │                                       │
│  bg-card     │  bg-background                       │
│  border-r    │                                       │
└──────────────┴───────────────────────────────────────┘
```

## Header

Always use `<ModalHeader>` from `@/components/ui/modal`. Never hand-build headers.

```tsx
<ModalHeader
  title="People"
  description="42 people across all nodes"
  onClose={onClose}
  actions={
    <>
      <Button variant="outline" size="icon" onClick={openSearch}><Search size={14} /></Button>
      <Button variant="outline" size="icon" onClick={openCreate}><Plus size={14} /></Button>
    </>
  }
/>
```

## Left Panel (List)

| Element               | Classes                                                      |
|-----------------------|--------------------------------------------------------------|
| Panel background      | `bg-card`, `border-r border-border`                          |
| List header title     | `text-body font-semibold text-foreground`                    |
| Badge count           | `<Badge variant="secondary">` with `text-caption`           |
| Add button            | `<Button variant="ghost" size="icon">`                       |
| Category group header | `text-caption font-semibold text-muted-foreground uppercase tracking-wider` |
| Item name             | `text-body-sm font-medium` — conditional on selected state   |
| Item meta             | `text-caption` — conditional on selected state               |
| Selected state        | `bg-primary-active text-primary-active-foreground`           |
| Hover state           | `hover:bg-muted-hover`                                       |
| Delete icon           | `opacity-0 group-hover:opacity-100`, `<Trash2 size={13} />` |

### Selected state conditional text colors

```tsx
<span className={cn(
  "text-body-sm font-medium truncate",
  isSelected ? "text-primary-active-foreground" : "text-foreground",
)}>
  {item.name}
</span>
<span className={cn(
  "text-caption",
  isSelected ? "text-primary-active-foreground/70" : "text-muted-foreground",
)}>
  {item.meta}
</span>
```

### Delete icon conditional colors

```tsx
<button className={cn(
  "... opacity-0 group-hover:opacity-100 ...",
  isSelected
    ? "text-primary-active-foreground/70 hover:text-primary-active-foreground hover:bg-primary-active-foreground/10"
    : "text-muted-foreground hover:text-destructive hover:bg-destructive/10",
)} />
```

## Right Panel (Form / Detail)

| Element            | Classes                                          |
|--------------------|--------------------------------------------------|
| Panel background   | `bg-background`                                  |
| Panel heading      | `text-subhead font-semibold text-foreground`     |
| Back button        | `<ArrowLeft size={16} />` in rounded-md container |
| Form labels        | `text-body font-medium text-foreground`          |
| Hint text          | `text-caption text-muted-foreground`             |
| Error text         | `text-body-sm text-error-foreground`             |
| Empty state        | Centered icon (32–40px) + `text-body-sm text-muted-foreground` |
| Form footer        | `border-t border-border px-6 py-4`, Cancel + Save buttons |

## Delete Confirmation Modals

Always use `ModalHeader` + `ModalFooter`. Never hand-build.

```tsx
<Modal open={open} onClose={onCancel} width={400}>
  <ModalHeader
    title="Delete Role"
    description={`Are you sure you want to delete "${name}"? This action cannot be undone.`}
    onClose={onCancel}
  />
  <ModalFooter>
    <Button variant="outline" onClick={onCancel}>Cancel</Button>
    <Button variant="destructive" onClick={onConfirm}>Delete</Button>
  </ModalFooter>
</Modal>
```

## Font Sizes — Design Tokens Only

| Token          | Size  | Usage                                                  |
|----------------|-------|--------------------------------------------------------|
| `text-micro`   | 10px  | Badges on list items, pay type labels                  |
| `text-caption`  | 11px  | Badge counts, category headers, item meta, hint text   |
| `text-detail`  | 12px  | Pagination text, email, secondary data                 |
| `text-body-sm` | 13px  | List item names, button labels, descriptions, errors   |
| `text-body`    | 14px  | Form labels, section titles, list header title          |
| `text-subhead` | 16px  | Right-panel headings, form titles                      |

Never use `text-sm`, `text-xs`, `text-lg`, `text-base`, or `text-[Npx]`.

## Font Weights

| Weight           | Class           | Usage                                                  |
|------------------|-----------------|---------------------------------------------------------|
| **600 (semi)**   | `font-semibold` | Modal title (via ModalHeader), panel headings, section headings, list header title |
| **500 (medium)** | `font-medium`   | List item names, form labels, emphasis in descriptions  |
| **400 (normal)** | _(default)_     | Descriptions, meta lines, hint text, empty state text   |

## Rules

1. **Use `ModalHeader`** for all modal headers — never hand-build `<h2>` + `<p>` headers.
2. **Use `ModalFooter`** for delete confirmation button rows.
3. **Design token font sizes only** — never `text-sm`, `text-xs`, or `text-[12px]`.
4. **Design token colors only** — never raw hex/rgb.
5. **Left panel uses `bg-card`** — never `bg-muted` or plain `bg-background`.
6. **Selected state uses `bg-primary-active`** with `text-primary-active-foreground` — never `bg-background`.
7. **Hover state uses `hover:bg-muted-hover`** — never `hover:bg-background/50`.
