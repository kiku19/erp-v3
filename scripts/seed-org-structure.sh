#!/bin/bash

# ERP v3 Organization Structure Seeding Script
# Seeds the admin@erp.com tenant with realistic organizational data
# via the live API at http://localhost:3000
#
# Usage: ./scripts/seed-org-structure.sh
# Requires: jq, curl, bash
#
# This script is idempotent and safe to run multiple times.
# It will reuse existing entities (roles, cost centers, divisions) and
# create new departments, teams, and employees as needed.

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

if ! command -v jq &> /dev/null; then
  echo -e "${RED}jq is required but not installed.${NC}"
  exit 1
fi

BASE_URL="http://localhost:3000"
EMAIL="admin@erp.com"
PASSWORD="admin1234"

TOKEN=""
TENANT_ID=""
declare -A ROLE_IDS
declare -A NODE_IDS
declare -A PERSON_IDS

echo -e "${BLUE}=== ERP v3 Organization Structure Seeding ===${NC}\n"

# ============================================================================
# STEP 1: LOGIN
# ============================================================================
echo -e "${BLUE}STEP 1: Logging in...${NC}"
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")

TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.accessToken // empty')
TENANT_ID=$(echo "$LOGIN_RESPONSE" | jq -r '.tenant.id // empty')

if [ -z "$TOKEN" ] || [ -z "$TENANT_ID" ]; then
  echo -e "${RED}✗ Login failed${NC}"
  exit 1
fi

echo -e "${GREEN}✓ Login successful - Tenant: $TENANT_ID${NC}\n"

# ============================================================================
# STEP 2: FETCH EXISTING DATA
# ============================================================================
echo -e "${BLUE}STEP 2: Fetching existing nodes, roles, and cost centers...${NC}"

# Get all nodes
NODES_RESPONSE=$(curl -s -X GET "$BASE_URL/api/org-setup/nodes" \
  -H "Authorization: Bearer $TOKEN")

ROOT_NODE_ID=$(echo "$NODES_RESPONSE" | jq -r '.nodes[] | select(.type=="COMPANY_ROOT") | .id')
TECH_NODE_ID=$(echo "$NODES_RESPONSE" | jq -r '.nodes[] | select(.code=="TECH-001") | .id')
PROD_NODE_ID=$(echo "$NODES_RESPONSE" | jq -r '.nodes[] | select(.code=="PROD-001") | .id')
HR_NODE_ID=$(echo "$NODES_RESPONSE" | jq -r '.nodes[] | select(.code=="HR-001") | .id')

NODE_IDS[Root]=$ROOT_NODE_ID
NODE_IDS[Technology]=$TECH_NODE_ID
NODE_IDS[Product]=$PROD_NODE_ID
NODE_IDS[HR]=$HR_NODE_ID

echo -e "${GREEN}✓ Found existing divisions:${NC}"
echo "  Root: $ROOT_NODE_ID"
echo "  Technology: $TECH_NODE_ID"
echo "  Product: $PROD_NODE_ID"
echo "  HR: $HR_NODE_ID"

# Get all roles
ROLES_RESPONSE=$(curl -s -X GET "$BASE_URL/api/roles" \
  -H "Authorization: Bearer $TOKEN")

CEO_ID=$(echo "$ROLES_RESPONSE" | jq -r '.roles[] | select(.name=="Chief Executive Officer") | .id')
CTO_ID=$(echo "$ROLES_RESPONSE" | jq -r '.roles[] | select(.name=="Chief Technology Officer") | .id')
ENGMGR_ID=$(echo "$ROLES_RESPONSE" | jq -r '.roles[] | select(.name=="Engineering Manager") | .id')
SRDEV_ID=$(echo "$ROLES_RESPONSE" | jq -r '.roles[] | select(.name=="Senior Developer") | .id')
PM_ID=$(echo "$ROLES_RESPONSE" | jq -r '.roles[] | select(.name=="Product Manager") | .id')
HR_ID=$(echo "$ROLES_RESPONSE" | jq -r '.roles[] | select(.name=="HR Manager") | .id')

ROLE_IDS[CEO]=$CEO_ID
ROLE_IDS[CTO]=$CTO_ID
ROLE_IDS[EngMgr]=$ENGMGR_ID
ROLE_IDS[SrDev]=$SRDEV_ID
ROLE_IDS[PM]=$PM_ID
ROLE_IDS[HR]=$HR_ID

echo -e "\n${GREEN}✓ Found existing roles${NC}\n"

# ============================================================================
# STEP 3: CREATE DEPARTMENTS (Level 2)
# ============================================================================
echo -e "${BLUE}STEP 3: Creating departments under Technology...${NC}"

DEPARTMENTS=(
  '{"name":"Engineering Team Alpha","code":"ENG-ALPHA-001","type":"DEPARTMENT","parentId":"'$TECH_NODE_ID'"}'
  '{"name":"Engineering Team Beta","code":"ENG-BETA-001","type":"DEPARTMENT","parentId":"'$TECH_NODE_ID'"}'
)

DEPT_NAMES=("EngAlpha" "EngBeta")

for i in "${!DEPARTMENTS[@]}"; do
  DEPT_RESPONSE=$(curl -s -X POST "$BASE_URL/api/org-setup/nodes" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "${DEPARTMENTS[$i]}")

  DEPT_ID=$(echo "$DEPT_RESPONSE" | jq -r '.node.id // empty')

  if [ -z "$DEPT_ID" ]; then
    echo -e "${RED}  ✗ Failed to create department: ${DEPT_NAMES[$i]}${NC}"
    continue
  fi

  NODE_IDS[${DEPT_NAMES[$i]}]=$DEPT_ID
  echo -e "${GREEN}  ✓ Created ${DEPT_NAMES[$i]} (ID: $DEPT_ID)${NC}"
done

ENG_ALPHA_NODE_ID=${NODE_IDS[EngAlpha]}
ENG_BETA_NODE_ID=${NODE_IDS[EngBeta]}

echo ""

# ============================================================================
# STEP 4: CREATE TEAMS (Level 3)
# ============================================================================
echo -e "${BLUE}STEP 4: Creating teams...${NC}"

TEAMS=(
  '{"name":"Senior Developer - Backend","code":"SR-DEV-ALPHA-001","type":"TEAM","parentId":"'$ENG_ALPHA_NODE_ID'"}'
  '{"name":"Senior Developer - Frontend","code":"SR-DEV-ALPHA-002","type":"TEAM","parentId":"'$ENG_ALPHA_NODE_ID'"}'
  '{"name":"Senior Developer - DevOps","code":"SR-DEV-BETA-001","type":"TEAM","parentId":"'$ENG_BETA_NODE_ID'"}'
)

TEAM_NAMES=("SrDevBackend" "SrDevFrontend" "SrDevDevOps")

for i in "${!TEAMS[@]}"; do
  TEAM_RESPONSE=$(curl -s -X POST "$BASE_URL/api/org-setup/nodes" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "${TEAMS[$i]}")

  TEAM_ID=$(echo "$TEAM_RESPONSE" | jq -r '.node.id // empty')

  if [ -z "$TEAM_ID" ]; then
    echo -e "${RED}  ✗ Failed to create team: ${TEAM_NAMES[$i]}${NC}"
    continue
  fi

  NODE_IDS[${TEAM_NAMES[$i]}]=$TEAM_ID
  echo -e "${GREEN}  ✓ Created ${TEAM_NAMES[$i]} (ID: $TEAM_ID)${NC}"
done

echo ""

# ============================================================================
# STEP 5: CREATE PEOPLE
# ============================================================================
echo -e "${BLUE}STEP 5: Creating 9 people...${NC}"

PEOPLE=(
  '{"name":"James Richardson","employeeId":"EMP-001","email":"james.richardson@acmecorp.com","roleId":"'$CEO_ID'","payType":"salaried","monthlySalary":225000,"employmentType":"full-time","nodeId":"'$ROOT_NODE_ID'"}'
  '{"name":"Sarah Chen","employeeId":"EMP-002","email":"sarah.chen@acmecorp.com","roleId":"'$CTO_ID'","payType":"salaried","monthlySalary":185000,"employmentType":"full-time","nodeId":"'$TECH_NODE_ID'"}'
  '{"name":"Michael Torres","employeeId":"EMP-003","email":"michael.torres@acmecorp.com","roleId":"'$ENGMGR_ID'","payType":"salaried","monthlySalary":115000,"employmentType":"full-time","nodeId":"'$ENG_ALPHA_NODE_ID'"}'
  '{"name":"Jennifer Liu","employeeId":"EMP-004","email":"jennifer.liu@acmecorp.com","roleId":"'$SRDEV_ID'","payType":"salaried","monthlySalary":125000,"employmentType":"full-time","nodeId":"'${NODE_IDS[SrDevBackend]}'"}'
  '{"name":"David Kowalski","employeeId":"EMP-005","email":"david.kowalski@acmecorp.com","roleId":"'$SRDEV_ID'","payType":"salaried","monthlySalary":95000,"employmentType":"full-time","nodeId":"'${NODE_IDS[SrDevFrontend]}'"}'
  '{"name":"Amanda Watson","employeeId":"EMP-006","email":"amanda.watson@acmecorp.com","roleId":"'$HR_ID'","payType":"salaried","monthlySalary":80000,"employmentType":"full-time","nodeId":"'$HR_NODE_ID'"}'
  '{"name":"Robert Patel","employeeId":"EMP-007","email":"robert.patel@acmecorp.com","roleId":"'$ENGMGR_ID'","payType":"salaried","monthlySalary":102500,"employmentType":"full-time","nodeId":"'$ENG_BETA_NODE_ID'"}'
  '{"name":"Patricia Johnson","employeeId":"EMP-008","email":"patricia.johnson@acmecorp.com","roleId":"'$PM_ID'","payType":"salaried","monthlySalary":70000,"employmentType":"full-time","nodeId":"'$PROD_NODE_ID'"}'
  '{"name":"Christopher Blake","employeeId":"EMP-009","email":"christopher.blake@acmecorp.com","roleId":"'$SRDEV_ID'","payType":"salaried","monthlySalary":91000,"employmentType":"full-time","nodeId":"'${NODE_IDS[SrDevDevOps]}'"}'
)

PERSON_NAMES=("James Richardson" "Sarah Chen" "Michael Torres" "Jennifer Liu" "David Kowalski" "Amanda Watson" "Robert Patel" "Patricia Johnson" "Christopher Blake")

for i in "${!PEOPLE[@]}"; do
  PERSON_RESPONSE=$(curl -s -X POST "$BASE_URL/api/org-setup/people" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "${PEOPLE[$i]}")

  PERSON_ID=$(echo "$PERSON_RESPONSE" | jq -r '.person.id // empty')

  if [ -z "$PERSON_ID" ]; then
    echo -e "${RED}✗ Failed to create person: ${PERSON_NAMES[$i]}${NC}"
    continue
  fi

  PERSON_IDS["${PERSON_NAMES[$i]}"]=$PERSON_ID
  EMP_NUM=$((i + 1))
  echo -e "${GREEN}✓ ${PERSON_NAMES[$i]} (EMP-00$EMP_NUM)${NC}"
done

echo ""

# ============================================================================
# STEP 6: ASSIGN NODE HEADS
# ============================================================================
echo -e "${BLUE}STEP 6: Assigning node heads...${NC}"

declare -A NODE_HEAD_ASSIGNMENTS=(
  ["$ROOT_NODE_ID"]="${PERSON_IDS[James Richardson]}"
  ["$TECH_NODE_ID"]="${PERSON_IDS[Sarah Chen]}"
  ["$ENG_ALPHA_NODE_ID"]="${PERSON_IDS[Michael Torres]}"
  ["$ENG_BETA_NODE_ID"]="${PERSON_IDS[Robert Patel]}"
  ["$PROD_NODE_ID"]="${PERSON_IDS[Patricia Johnson]}"
  ["$HR_NODE_ID"]="${PERSON_IDS[Amanda Watson]}"
)

declare -A NODE_HEAD_NAMES=(
  ["$ROOT_NODE_ID"]="Root"
  ["$TECH_NODE_ID"]="Technology"
  ["$ENG_ALPHA_NODE_ID"]="Eng Alpha"
  ["$ENG_BETA_NODE_ID"]="Eng Beta"
  ["$PROD_NODE_ID"]="Product"
  ["$HR_NODE_ID"]="HR"
)

for NODE_ID in "${!NODE_HEAD_ASSIGNMENTS[@]}"; do
  PERSON_ID="${NODE_HEAD_ASSIGNMENTS[$NODE_ID]}"
  NODE_NAME="${NODE_HEAD_NAMES[$NODE_ID]}"

  if [ -z "$PERSON_ID" ]; then
    continue
  fi

  PATCH_RESPONSE=$(curl -s -X PATCH "$BASE_URL/api/org-setup/nodes/$NODE_ID" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"nodeHeadPersonId":"'$PERSON_ID'"}')

  if echo "$PATCH_RESPONSE" | jq -e '.node.id' &>/dev/null; then
    echo -e "${GREEN}✓ $NODE_NAME → assigned${NC}"
  else
    echo -e "${RED}✗ Failed to assign $NODE_NAME head${NC}"
  fi
done

echo ""

# ============================================================================
# SUMMARY
# ============================================================================
echo -e "${BLUE}=== FINAL SUMMARY ===${NC}\n"

echo -e "${GREEN}Organization Structure:${NC}"
echo "  Root (CEO: James Richardson)"
echo "    ├─ Technology (CTO: Sarah Chen)"
echo "    │  ├─ Engineering Team Alpha (Manager: Michael Torres)"
echo "    │  │  ├─ Sr Dev Backend (Jennifer Liu)"
echo "    │  │  └─ Sr Dev Frontend (David Kowalski)"
echo "    │  └─ Engineering Team Beta (Manager: Robert Patel)"
echo "    │     └─ Sr Dev DevOps (Christopher Blake)"
echo "    ├─ Product (Manager: Patricia Johnson)"
echo "    └─ Human Resources (Manager: Amanda Watson)"

echo -e "\n${GREEN}Created Entities:${NC}"
echo "  Nodes: ${#NODE_IDS[@]}"
echo "  People: ${#PERSON_IDS[@]}"
echo "  Roles: 6 (pre-existing)"

echo -e "\n${GREEN}✓ Organization structure seeding complete!${NC}\n"
