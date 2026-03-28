/**
 * E2E Test Fixture Data: Organization Setup
 *
 * This file contains realistic sample data for testing the organization setup feature.
 * Data is structured as plain objects matching UI form field values, not Prisma models.
 *
 * Hierarchy:
 * - Acme Corporation (Root, CEO)
 *   - Technology (CTO)
 *     - Engineering Team Alpha (Engineering Manager)
 *       - Senior Developer 1
 *       - Senior Developer 2
 *     - Engineering Team Beta (Engineering Manager)
 *   - Product (Product Manager)
 *   - Human Resources (HR Manager)
 */

// ============================================================================
// ROLES
// ============================================================================

export const sampleRoles = [
  {
    name: "Chief Executive Officer",
    code: "CEO",
    level: "Principal",
    defaultPayType: "salaried",
    overtimeEligible: false,
    skillTags: ["leadership", "strategy", "finance"],
    costRateMin: 150000,
    costRateMax: 300000,
    costRateCurrency: "USD",
  },
  {
    name: "Chief Technology Officer",
    code: "CTO",
    level: "Principal",
    defaultPayType: "salaried",
    overtimeEligible: false,
    skillTags: ["technical-leadership", "architecture", "mentoring"],
    costRateMin: 120000,
    costRateMax: 250000,
    costRateCurrency: "USD",
  },
  {
    name: "Engineering Manager",
    code: "ENG-MGR",
    level: "Lead",
    defaultPayType: "salaried",
    overtimeEligible: false,
    skillTags: ["team-management", "technical", "planning"],
    costRateMin: 80000,
    costRateMax: 150000,
    costRateCurrency: "USD",
  },
  {
    name: "Senior Developer",
    code: "SR-DEV",
    level: "Senior",
    defaultPayType: "salaried",
    overtimeEligible: true,
    skillTags: ["backend", "frontend", "architecture"],
    costRateMin: 60000,
    costRateMax: 100000,
    costRateCurrency: "USD",
  },
  {
    name: "Product Manager",
    code: "PM",
    level: "Senior",
    defaultPayType: "salaried",
    overtimeEligible: false,
    skillTags: ["product-strategy", "customer-focus", "analytics"],
    costRateMin: 75000,
    costRateMax: 130000,
    costRateCurrency: "USD",
  },
  {
    name: "HR Manager",
    code: "HR-MGR",
    level: "Mid",
    defaultPayType: "salaried",
    overtimeEligible: false,
    skillTags: ["recruitment", "compliance", "culture"],
    costRateMin: 55000,
    costRateMax: 85000,
    costRateCurrency: "USD",
  },
];

// ============================================================================
// PEOPLE (EMPLOYEES)
// ============================================================================

export const samplePeople = [
  {
    name: "James Richardson",
    employeeId: "EMP-001",
    email: "james.richardson@acmecorp.com",
    payType: "salaried",
    standardRate: 225000,
    overtimeRate: null,
    overtimePay: false,
    monthlySalary: 18750,
    dailyAllocation: 100,
    contractAmount: null,
    employmentType: "full-time",
    joinDate: "2020-01-15T00:00:00Z",
    photoUrl: null,
  },
  {
    name: "Sarah Chen",
    employeeId: "EMP-002",
    email: "sarah.chen@acmecorp.com",
    payType: "salaried",
    standardRate: 185000,
    overtimeRate: null,
    overtimePay: false,
    monthlySalary: 15416.67,
    dailyAllocation: 100,
    contractAmount: null,
    employmentType: "full-time",
    joinDate: "2019-06-10T00:00:00Z",
    photoUrl: null,
  },
  {
    name: "Michael Torres",
    employeeId: "EMP-003",
    email: "michael.torres@acmecorp.com",
    payType: "salaried",
    standardRate: 115000,
    overtimeRate: 17.25,
    overtimePay: true,
    monthlySalary: 9583.33,
    dailyAllocation: 100,
    contractAmount: null,
    employmentType: "full-time",
    joinDate: "2021-03-22T00:00:00Z",
    photoUrl: null,
  },
  {
    name: "Jennifer Liu",
    employeeId: "EMP-004",
    email: "jennifer.liu@acmecorp.com",
    payType: "salaried",
    standardRate: 125000,
    overtimeRate: 18.75,
    overtimePay: true,
    monthlySalary: 10416.67,
    dailyAllocation: 100,
    contractAmount: null,
    employmentType: "full-time",
    joinDate: "2020-11-08T00:00:00Z",
    photoUrl: null,
  },
  {
    name: "David Kowalski",
    employeeId: "EMP-005",
    email: "david.kowalski@acmecorp.com",
    payType: "salaried",
    standardRate: 95000,
    overtimeRate: 14.25,
    overtimePay: true,
    monthlySalary: 7916.67,
    dailyAllocation: 100,
    contractAmount: null,
    employmentType: "full-time",
    joinDate: "2022-01-30T00:00:00Z",
    photoUrl: null,
  },
  {
    name: "Amanda Watson",
    employeeId: "EMP-006",
    email: "amanda.watson@acmecorp.com",
    payType: "salaried",
    standardRate: 80000,
    overtimeRate: 12.0,
    overtimePay: true,
    monthlySalary: 6666.67,
    dailyAllocation: 100,
    contractAmount: null,
    employmentType: "full-time",
    joinDate: "2021-07-19T00:00:00Z",
    photoUrl: null,
  },
  {
    name: "Robert Patel",
    employeeId: "EMP-007",
    email: "robert.patel@acmecorp.com",
    payType: "salaried",
    standardRate: 102500,
    overtimeRate: 15.375,
    overtimePay: true,
    monthlySalary: 8541.67,
    dailyAllocation: 100,
    contractAmount: null,
    employmentType: "full-time",
    joinDate: "2020-09-05T00:00:00Z",
    photoUrl: null,
  },
  {
    name: "Patricia Johnson",
    employeeId: "EMP-008",
    email: "patricia.johnson@acmecorp.com",
    payType: "salaried",
    standardRate: 70000,
    overtimeRate: null,
    overtimePay: false,
    monthlySalary: 5833.33,
    dailyAllocation: 100,
    contractAmount: null,
    employmentType: "full-time",
    joinDate: "2023-02-20T00:00:00Z",
    photoUrl: null,
  },
  {
    name: "Christopher Blake",
    employeeId: "EMP-009",
    email: "christopher.blake@acmecorp.com",
    payType: "salaried",
    standardRate: 91000,
    overtimeRate: 13.65,
    overtimePay: true,
    monthlySalary: 7583.33,
    dailyAllocation: 100,
    contractAmount: null,
    employmentType: "full-time",
    joinDate: "2021-05-12T00:00:00Z",
    photoUrl: null,
  },
];

// ============================================================================
// COST CENTERS
// ============================================================================

export const sampleCostCenters = [
  {
    name: "Technology Operations",
    code: "CC-TECH-001",
    description: "Engineering and infrastructure costs",
  },
  {
    name: "Product Development",
    code: "CC-PROD-001",
    description: "Product management and research",
  },
  {
    name: "Human Resources",
    code: "CC-HR-001",
    description: "HR operations and recruitment",
  },
  {
    name: "General Operations",
    code: "CC-GENERAL",
    description: "General corporate operations and overhead",
  },
];

// ============================================================================
// ORGANIZATION NODES (Hierarchical Structure)
// ============================================================================

/**
 * Root node representing the entire organization.
 * This is the parent of all top-level departments.
 */
export const rootOrgNode = {
  name: "Acme Corporation",
  code: "ORG-ROOT",
  type: "ORGANIZATION",
  nodeHeadPersonName: "James Richardson", // CEO
  costCenterCode: "CC-GENERAL",
  assignedRoles: ["CEO"],
  isActive: true,
};

/**
 * Level 1: Top-level departments reporting to CEO
 */
export const technologyDepartment = {
  name: "Technology",
  code: "TECH-001",
  type: "DEPARTMENT",
  nodeHeadPersonName: "Sarah Chen", // CTO
  costCenterCode: "CC-TECH-001",
  assignedRoles: ["CTO"],
  isActive: true,
};

export const productDepartment = {
  name: "Product",
  code: "PROD-001",
  type: "DEPARTMENT",
  nodeHeadPersonName: "Patricia Johnson", // PM
  costCenterCode: "CC-PROD-001",
  assignedRoles: ["PM"],
  isActive: true,
};

export const hrDepartment = {
  name: "Human Resources",
  code: "HR-001",
  type: "DEPARTMENT",
  nodeHeadPersonName: "Amanda Watson", // HR Manager
  costCenterCode: "CC-HR-001",
  assignedRoles: ["HR-MGR"],
  isActive: true,
};

/**
 * Level 2: Teams under Technology Department
 */
export const engineeringTeamAlpha = {
  name: "Engineering Team Alpha",
  code: "ENG-ALPHA-001",
  type: "TEAM",
  nodeHeadPersonName: "Michael Torres", // Engineering Manager
  costCenterCode: "CC-TECH-001",
  assignedRoles: ["ENG-MGR"],
  isActive: true,
};

export const engineeringTeamBeta = {
  name: "Engineering Team Beta",
  code: "ENG-BETA-001",
  type: "TEAM",
  nodeHeadPersonName: "Robert Patel", // Engineering Manager
  costCenterCode: "CC-TECH-001",
  assignedRoles: ["ENG-MGR"],
  isActive: true,
};

/**
 * Level 3: Individual contributor positions under Engineering Team Alpha
 */
export const seniorDeveloperOne = {
  name: "Senior Developer - Backend",
  code: "SR-DEV-ALPHA-001",
  type: "POSITION",
  nodeHeadPersonName: "Jennifer Liu", // Senior Developer
  costCenterCode: "CC-TECH-001",
  assignedRoles: ["SR-DEV"],
  isActive: true,
};

export const seniorDeveloperTwo = {
  name: "Senior Developer - Frontend",
  code: "SR-DEV-ALPHA-002",
  type: "POSITION",
  nodeHeadPersonName: "David Kowalski", // Senior Developer
  costCenterCode: "CC-TECH-001",
  assignedRoles: ["SR-DEV"],
  isActive: true,
};

/**
 * Level 3: Individual contributor position under Engineering Team Beta
 */
export const seniorDeveloperThree = {
  name: "Senior Developer - DevOps",
  code: "SR-DEV-BETA-001",
  type: "POSITION",
  nodeHeadPersonName: "Christopher Blake", // Senior Developer
  costCenterCode: "CC-TECH-001",
  assignedRoles: ["SR-DEV"],
  isActive: true,
};

// ============================================================================
// ORGANIZATION STRUCTURE (Hierarchical relationships)
// ============================================================================

/**
 * Complete organizational hierarchy for reference.
 * Each entry shows parent → children relationships.
 */
export const orgHierarchy = {
  "Acme Corporation": {
    code: "ORG-ROOT",
    children: [
      "Technology",
      "Product",
      "Human Resources",
    ],
  },
  Technology: {
    code: "TECH-001",
    parent: "Acme Corporation",
    children: [
      "Engineering Team Alpha",
      "Engineering Team Beta",
    ],
  },
  "Engineering Team Alpha": {
    code: "ENG-ALPHA-001",
    parent: "Technology",
    children: [
      "Senior Developer - Backend",
      "Senior Developer - Frontend",
    ],
  },
  "Engineering Team Beta": {
    code: "ENG-BETA-001",
    parent: "Technology",
    children: [
      "Senior Developer - DevOps",
    ],
  },
  Product: {
    code: "PROD-001",
    parent: "Acme Corporation",
    children: [],
  },
  "Human Resources": {
    code: "HR-001",
    parent: "Acme Corporation",
    children: [],
  },
};

// ============================================================================
// CONVENIENCE EXPORTS: Grouped by entity type
// ============================================================================

export const orgSetupFixtures = {
  roles: sampleRoles,
  people: samplePeople,
  costCenters: sampleCostCenters,
  nodes: {
    root: rootOrgNode,
    departments: [technologyDepartment, productDepartment, hrDepartment],
    teams: [engineeringTeamAlpha, engineeringTeamBeta],
    positions: [seniorDeveloperOne, seniorDeveloperTwo, seniorDeveloperThree],
  },
  hierarchy: orgHierarchy,
};
