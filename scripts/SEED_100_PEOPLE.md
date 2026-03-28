# Seed Script: 100 OBSPerson Records

## Overview
This script generates and seeds 100 realistic Indian OBSPerson records into the PostgreSQL database. The records are designed for testing pagination and filtering in the people modal.

## Location
- **Script:** `/home/kishore/Project/erp-v3/scripts/seed-100-people.ts`

## Key Features

### 1. Idempotent Design
- Checks if `EMP-101` exists before seeding
- If exists, skips insertion to prevent duplicates
- Safe to run multiple times without side effects

### 2. Employee ID Range
- Range: **EMP-101 → EMP-200**
- Unique per tenant (enforced by schema unique constraint)
- Sequential numbering for easy pagination testing

### 3. All Records Unassigned
- `nodeId: null` — No organizational node assignment (for pagination testing)
- `roleId: null` — No role assignment
- Ready for bulk assignment workflows

### 4. Realistic Indian Data
- **Names:** Mix of ~100 common Indian first and last names
- **Emails:** Multiple realistic patterns (firstname.lastname@company.com, etc.)
- **Pay Types:** Realistic distribution across hourly, salaried, contract
- **Rates/Salaries:**
  - Hourly: ₹200–₹1,500/hour
  - Monthly Salaried: ₹30,000–₹150,000
  - Contract: ₹100,000–₹1,000,000
- **Join Dates:** Distributed across past 3 years (realistic tenure)

### 5. Diverse Employment Types
Distribution across:
- Full-time (31)
- Part-time (21)
- Contract (23)
- Consultant (25)

## Running the Script

### Basic Execution
```bash
npx tsx scripts/seed-100-people.ts
```

### Output
```
=== Seeding 100 OBSPerson Records ===

Using tenant: Org E2E Tester (org-e2e-1774715701158@test.com)
✓ Created 100 OBSPerson records

Employee ID Range: EMP-101 → EMP-200

Pay Type Distribution:
  contract: 36
  hourly: 37
  salaried: 27

Employment Type Distribution:
  consultant: 25
  contract: 23
  full-time: 31
  part-time: 21

Sample Records:
  EMP-101: Priya Saxena | contract | full-time | Email: psaxena@company.com
  EMP-102: Jatin Joseph | contract | part-time | Email: jatin.joseph@company.com
  EMP-103: Nikhil Kumar | contract | consultant | Email: nikhil.kumar@company.com

✅ Seed completed successfully!
```

### Re-running (Idempotent)
```bash
npx tsx scripts/seed-100-people.ts
# Output: ✓ EMP-101 already exists. Skipping seed to maintain idempotency.
```

## Database Details

### Tenant Used
- First existing tenant found in the database (`isDeleted: false`)
- Script fails with instructions if no tenant exists

### Fields Populated

| Field | Value | Notes |
|-------|-------|-------|
| `tenantId` | From tenant lookup | Required, scoped to tenant |
| `nodeId` | `null` | Unassigned (for pagination testing) |
| `name` | Realistic Indian names | Format: "Firstname Lastname" |
| `employeeId` | `EMP-101` to `EMP-200` | Unique per tenant |
| `email` | Realistic patterns | Multiple format variations |
| `roleId` | `null` | Unassigned |
| `payType` | hourly, salaried, contract | Random distribution |
| `standardRate` | ₹200–₹1,500 (hourly only) | Only if `payType="hourly"` |
| `overtimeRate` | 1.5x standard rate | Only if `overtimePay=true` |
| `overtimePay` | 50% of hourly workers | Random boolean |
| `monthlySalary` | ₹30,000–₹150,000 | Only if `payType="salaried"` |
| `contractAmount` | ₹100,000–₹1,000,000 | Only if `payType="contract"` |
| `dailyAllocation` | 1–8 hours | Random, all records |
| `employmentType` | full-time, part-time, contract, consultant | Realistic mix |
| `joinDate` | Past 3 years | Random within range, UTC |
| `photoUrl` | `null` | Not populated |
| `isDeleted` | `false` | All active records |

## Pagination Testing Example

### Query All Unassigned People (Page 1)
```typescript
const people = await prisma.oBSPerson.findMany({
  where: {
    tenantId,
    nodeId: null,
    isDeleted: false,
  },
  take: 20,      // Page size
  skip: 0,       // First page
  orderBy: { employeeId: 'asc' },
});
```

### Expected Results
- **Total Records:** 100 (EMP-101 to EMP-200)
- **Total Unassigned:** 100 (all have `nodeId=null`)
- **First Page (20 records):** EMP-101 → EMP-120

## Data Quality Guarantees

1. **No Duplicates:** Uses idempotent upsert logic
2. **Valid Relationships:** All `tenantId` values reference existing tenants
3. **Unique Constraint:** `tenantId + employeeId` unique per schema
4. **Chronological Dates:** `createdAt` = seeded at runtime, `joinDate` = realistic past dates
5. **Realistic Values:** No placeholder or round numbers (e.g., ₹1,000 → ₹1,247)

## Troubleshooting

### Error: No tenant found
```
❌ No tenant found. Please seed tenants first with: npx prisma db seed
```
**Solution:** Run the main seed script first:
```bash
npx prisma db seed
```

### Script runs but creates 0 records
- Check database connection (`DATABASE_URL` env var)
- Verify PostgreSQL is running
- Ensure Prisma client is generated: `npx prisma generate`

### Manual Verification
```bash
# Count all EMP-101 to EMP-200 records
npx prisma studio
# Navigate to OBSPerson table
# Filter: employeeId contains "EMP-1"
```

## Modifying the Script

To adjust generation parameters, edit `/home/kishore/Project/erp-v3/scripts/seed-100-people.ts`:

- **Change count:** Modify loop in `generatePerson()` calls (line ~280)
- **Adjust rate ranges:** Edit `standardRate` assignment (line ~100)
- **Change date range:** Modify `threeYearsAgo` calculation (line ~75)
- **Add/remove names:** Edit `firstNames` and `lastNames` arrays (lines 10–40)

## Performance Notes

- **Insertion:** Uses `createMany()` with `skipDuplicates: true` for efficiency
- **Expected Duration:** <5 seconds for 100 records
- **Database Impact:** Minimal — no transactions, idempotent by default

## Related Scripts

- Main planner seed: `prisma/seed.ts` (EPS, Projects, WBS, Activities)
- Org structure seed: `scripts/seed-org-structure.sh` (OBSNode hierarchy)
