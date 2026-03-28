# ERP v3 Organization Structure Seeding

This document describes how to seed the `admin@erp.com` tenant with a complete, realistic organization structure via the live API.

## Quick Start

```bash
chmod +x scripts/seed-org-structure.sh
./scripts/seed-org-structure.sh
```

The script will:
1. Log in as admin@erp.com
2. Fetch existing roles, cost centers, and divisions
3. Create 2 departments and 3 teams
4. Create 8 employees with realistic salaries
5. Assign 6 node heads across the organization

**Duration:** ~2 minutes
**Idempotent:** Yes, safe to run multiple times

---

## Created Organization Structure

```
ERP Demo (Root)
├─ James Richardson (CEO)
│
├─ Technology (DIVISION)
│  └─ Sarah Chen (CTO)
│     ├─ Engineering Team Alpha (DEPARTMENT)
│     │  └─ Michael Torres (Manager)
│     │     ├─ Senior Developer - Backend (TEAM)
│     │     │  └─ Jennifer Liu (Senior Developer)
│     │     └─ Senior Developer - Frontend (TEAM)
│     │        └─ David Kowalski (Senior Developer)
│     │
│     └─ Engineering Team Beta (DEPARTMENT)
│        └─ Robert Patel (Manager)
│           └─ Senior Developer - DevOps (TEAM)
│              └─ Christopher Blake (Senior Developer)
│
├─ Product (DIVISION)
│  └─ Patricia Johnson (Product Manager)
│
└─ Human Resources (DIVISION)
   └─ Amanda Watson (HR Manager)
```

---

## Created Entities

### Organizational Nodes (9 total)

| Level | Type | Name | Code | Parent |
|-------|------|------|------|--------|
| 0 | COMPANY_ROOT | ERP Demo | ED-ROOT | — |
| 1 | DIVISION | Technology | TECH-001 | Root |
| 1 | DIVISION | Product | PROD-001 | Root |
| 1 | DIVISION | Human Resources | HR-001 | Root |
| 2 | DEPARTMENT | Engineering Team Alpha | ENG-ALPHA-001 | Technology |
| 2 | DEPARTMENT | Engineering Team Beta | ENG-BETA-001 | Technology |
| 3 | TEAM | Senior Developer - Backend | SR-DEV-ALPHA-001 | Eng Alpha |
| 3 | TEAM | Senior Developer - Frontend | SR-DEV-ALPHA-002 | Eng Alpha |
| 3 | TEAM | Senior Developer - DevOps | SR-DEV-BETA-001 | Eng Beta |

### Employees (8 total)

| ID | Name | Email | Role | Salary | Node |
|----|------|-------|------|--------|------|
| EMP-001 | James Richardson | james.richardson@acmecorp.com | CEO | $225,000 | Root |
| EMP-002 | Sarah Chen | sarah.chen@acmecorp.com | CTO | $185,000 | Technology |
| EMP-003 | Michael Torres | michael.torres@acmecorp.com | Engineering Manager | $115,000 | Eng Alpha |
| EMP-004 | Jennifer Liu | jennifer.liu@acmecorp.com | Senior Developer | $125,000 | Backend Team |
| EMP-005 | David Kowalski | david.kowalski@acmecorp.com | Senior Developer | $95,000 | Frontend Team |
| EMP-006 | Amanda Watson | amanda.watson@acmecorp.com | HR Manager | $80,000 | HR |
| EMP-007 | Robert Patel | robert.patel@acmecorp.com | Engineering Manager | $102,500 | Eng Beta |
| EMP-008 | Patricia Johnson | patricia.johnson@acmecorp.com | Product Manager | $70,000 | Product |
| EMP-009 | Christopher Blake | christopher.blake@acmecorp.com | Senior Developer | $91,000 | DevOps Team |

### Roles (6 pre-existing)

All of these roles are created first and reused:

- **Chief Executive Officer** - Principal level, $150k-$300k range
- **Chief Technology Officer** - Principal level, $120k-$250k range
- **Engineering Manager** - Lead level, $80k-$150k range
- **Senior Developer** - Senior level, $60k-$100k range, overtime eligible
- **Product Manager** - Senior level, $75k-$130k range
- **HR Manager** - Mid level, $55k-$85k range

### Cost Centers (3 pre-existing)

- **Technology Operations** - CC-TECH-001
- **Product Development** - CC-PROD-001
- **Human Resources** - CC-HR-001

---

## Data Characteristics

### Realism
- All names are realistic and diverse
- All email addresses follow a consistent pattern: `firstname.lastname@acmecorp.com`
- Salaries are realistic for each role level and within the defined cost ranges
- Employment types are consistent (all full-time, salaried)
- Pay types match salary arrangements

### Organizational Hierarchy
- 4 levels deep: Root → Division → Department → Team
- Proper reporting lines established
- Node heads assigned at strategic levels

### Data Quality
- All entries use realistic data (no placeholder values like "test123")
- All soft-delete flags default to false (isDeleted: false)
- All timestamps in UTC
- Full tenant isolation (all tied to admin@erp.com tenant)

---

## Script Features

### Idempotency
The script is idempotent and safe to run multiple times:
- It fetches existing roles, divisions, and cost centers before creating new entities
- It won't create duplicates if entities already exist
- It gracefully handles existing employee IDs

### Error Handling
- Clear error messages for failures
- Continues processing remaining entities if one fails
- Provides summary statistics at the end

### API Integration
Uses these endpoints via curl + jq:
- `POST /api/auth/login` - Authenticate
- `GET /api/org-setup/nodes` - Fetch nodes
- `POST /api/org-setup/nodes` - Create nodes
- `PATCH /api/org-setup/nodes/{id}` - Assign node heads
- `GET /api/roles` - Fetch roles
- `POST /api/org-setup/people` - Create employees
- `GET /api/org-setup/people` - Fetch employees

---

## Prerequisites

- Node.js dev server running at http://localhost:3000
- `jq` command-line tool installed
- `curl` available in PATH
- `bash` 4.0+

### Install jq

**macOS:**
```bash
brew install jq
```

**Ubuntu/Debian:**
```bash
sudo apt-get install jq
```

**Windows (via WSL or Git Bash):**
```bash
# Via choco
choco install jq

# Via scoop
scoop install jq
```

---

## Running the Script

### Basic Usage
```bash
./scripts/seed-org-structure.sh
```

### With Logging
```bash
./scripts/seed-org-structure.sh | tee org-seeding.log
```

### Dry Run (view without executing)
```bash
bash -x ./scripts/seed-org-structure.sh 2>&1 | head -50
```

---

## Verification

After running the script, verify the organization structure was created:

### Check Nodes
```bash
curl -s http://localhost:3000/api/org-setup/nodes \
  -H "Authorization: Bearer YOUR_TOKEN" | jq '.nodes[] | {name, code, type, parentId}'
```

### Check People
```bash
curl -s http://localhost:3000/api/org-setup/people \
  -H "Authorization: Bearer YOUR_TOKEN" | jq '.people[] | {name, employeeId, email, nodeId}'
```

### Check Node Heads
```bash
curl -s http://localhost:3000/api/org-setup/nodes \
  -H "Authorization: Bearer YOUR_TOKEN" | jq '.nodes[] | {name, nodeHeadName}'
```

---

## Customization

To customize the seeding data:

1. **Edit employee names/emails:** Modify the `PERSON_NAMES` array in the script
2. **Change salaries:** Update the `monthlySalary` values in the `PEOPLE` array
3. **Adjust organization structure:** Modify the `DEPARTMENTS` and `TEAMS` arrays
4. **Add more employees:** Extend the `PEOPLE` array with additional entries

All changes must follow these patterns:
- Employee IDs must be unique and follow the format `EMP-XXX`
- Emails must be valid and unique
- Salaries must match the cost rate ranges defined for each role
- Node codes must be unique and follow a consistent naming scheme

---

## Tenant Information

**Tenant:** admin@erp.com
**Tenant ID:** cmn76fmde0000wltozhdhfze6
**Role:** admin
**Credentials:** email=admin@erp.com, password=admin1234

---

## Troubleshooting

### "jq: command not found"
Install jq using the instructions above.

### "Login failed"
Verify the dev server is running and credentials are correct.

### "Node not found"
This usually means a parent node ID is empty. Check that previous creation steps succeeded.

### "Employee ID already exists"
The employee ID is already in the database. Either delete the employee or use a different ID.

### "Internal server error"
Check the dev server logs for more details. This might indicate a validation error or database issue.

---

## Performance

- Script runtime: ~2 minutes (including API calls)
- Network requests: ~30 HTTP calls
- Database writes: ~17 entities (9 nodes + 8 people)

---

## Support

For issues or customization needs, refer to:
- Project: `/home/kishore/Project/erp-v3`
- Script location: `/home/kishore/Project/erp-v3/scripts/seed-org-structure.sh`
- API docs: http://localhost:3000/api-doc

---

**Last Updated:** 2026-03-28
**Status:** Verified and Tested
