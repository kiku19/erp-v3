# API Rules

## 1. Tenant Isolation

Every DB operation MUST include `tenantId`. No exceptions.

- **Reads** → `where: { tenantId, isDeleted: false, ... }`
- **Creates** → `data: { tenantId, ... }`
- **Updates** → `where: { id, tenantId }, data: { ... }`

## 2. Soft Delete Only

`delete()` and `deleteMany()` are **BANNED**. Always soft-delete:

```ts
prisma.order.update({ where: { id, tenantId }, data: { isDeleted: true } });
```

## 3. UTC Dates

All dates stored in UTC. Use `new Date()`. Never store local timezone.
- Schema: `createdAt DateTime @default(now())` · `updatedAt DateTime @updatedAt`
- Timezone conversion = frontend only, never in API routes

## 4. Required Schema Fields

Every model must have:
```prisma
tenantId  String
isDeleted Boolean  @default(false)
createdAt DateTime @default(now())
updatedAt DateTime @updatedAt
```

## Quick Reference

| Op | `tenantId` | `isDeleted: false` | Hard delete |
|----|------------|--------------------|-------------|
| find* / count / aggregate | where | where | — |
| create / createMany | data | — | — |
| update / updateMany | where | — | — |
| delete / deleteMany | **BANNED** | — | **BANNED** |

## Examples

```ts
// ✅ Read
prisma.user.findMany({ where: { tenantId, isDeleted: false } });

// ✅ Create
prisma.order.create({ data: { tenantId, name: 'Order #1' } });

// ✅ Update
prisma.order.update({ where: { id, tenantId }, data: { status: 'SHIPPED' } });

// ✅ Soft delete
prisma.order.update({ where: { id, tenantId }, data: { isDeleted: true } });

// ❌ Missing tenantId
prisma.order.findMany({ where: { status: 'ACTIVE' } });

// ❌ Missing isDeleted filter
prisma.order.findMany({ where: { tenantId } });

// ❌ Hard delete
prisma.order.delete({ where: { id } });
prisma.order.deleteMany({ where: { id } });

```
