import { type OrgSetupState } from "./types";

interface ValidationError {
  message: string;
}

/**
 * Runs the 5 validation checks for Save & Continue.
 * Returns the first failing check, or null if all pass.
 */
function validateOrgSetup(state: OrgSetupState): ValidationError | null {
  // CHECK 1: At least one division exists
  const nodeCount = Object.keys(state.nodes).length;
  if (nodeCount < 2) {
    return {
      message:
        "Add at least one division before continuing. Click [+ Add Division] on your company node.",
    };
  }

  // CHECK 2: At least one person exists
  const peopleCount = Object.keys(state.people).length;
  if (peopleCount === 0) {
    return {
      message:
        "Add at least one person to your organisation. Open any division → People tab → Add Person.",
    };
  }

  // CHECK 3: Root node has a node head
  const root = state.nodes[state.company.rootNodeId];
  if (!root?.nodeHeadPersonId) {
    return {
      message: `Assign a node head to ${state.company.name}. Open your company node → Settings → Node Head.`,
    };
  }

  // CHECK 4: Every node with people has a calendar
  for (const node of Object.values(state.nodes)) {
    const nodePeopleCount = Object.values(state.people).filter(
      (p) => p.nodeId === node.id,
    ).length;
    if (nodePeopleCount > 0 && !node.calendarId) {
      return {
        message: `${node.name} has ${nodePeopleCount} people but no calendar assigned. Open ${node.name} → Settings → Calendar.`,
      };
    }
  }

  // CHECK 5: No node has a role with null rate
  for (const node of Object.values(state.nodes)) {
    for (const ar of node.assignedRoles) {
      if (ar.standardRate === null || ar.standardRate <= 0) {
        const role = state.roles[ar.roleId];
        const roleName = role?.name ?? ar.roleId;
        return {
          message: `${roleName} in ${node.name} has no rate set. Open ${node.name} → Settings → Roles & Rates → Edit Rate.`,
        };
      }
    }
  }

  return null;
}

export { validateOrgSetup, type ValidationError };
