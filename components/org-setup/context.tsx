"use client";

import {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import { useOrgApi } from "@/hooks/use-org-api";
import {
  type OrgSetupState,
  type OBSNode,
  type OBSNodeType,
  type Person,
  type Equipment,
  type Material,
  type Calendar,
  type CalendarExceptionData,
  type Role,
  type GlobalPanelType,
  type AssignedRole,
  NODE_TYPE_BY_DEPTH,
  MAX_DEPTH,
} from "./types";

/* ─────────────────────── Actions ────────────────────────────────── */

type Action =
  | { type: "ADD_NODE"; parentId: string; name: string; code: string; asChild: boolean }
  | { type: "UPDATE_NODE"; nodeId: string; updates: Partial<Pick<OBSNode, "name" | "code" | "nodeHeadPersonId" | "calendarId">> }
  | { type: "REMOVE_NODE"; nodeId: string }
  | { type: "ADD_PERSON"; person: Person }
  | { type: "UPDATE_PERSON"; personId: string; updates: Partial<Person> }
  | { type: "REMOVE_PERSON"; personId: string }
  | { type: "ADD_EQUIPMENT"; equipment: Equipment }
  | { type: "UPDATE_EQUIPMENT"; equipmentId: string; updates: Partial<Equipment> }
  | { type: "REMOVE_EQUIPMENT"; equipmentId: string }
  | { type: "ADD_MATERIAL"; material: Material }
  | { type: "UPDATE_MATERIAL"; materialId: string; updates: Partial<Material> }
  | { type: "REMOVE_MATERIAL"; materialId: string }
  | { type: "ADD_CALENDAR"; calendar: Calendar }
  | { type: "UPDATE_CALENDAR"; calendarId: string; updates: Partial<Calendar> }
  | { type: "REMOVE_CALENDAR"; calendarId: string }
  | { type: "ADD_CALENDAR_EXCEPTION"; calendarId: string; exception: CalendarExceptionData }
  | { type: "REMOVE_CALENDAR_EXCEPTION"; calendarId: string; exceptionId: string }
  | { type: "ADD_ROLE"; role: Role }
  | { type: "UPDATE_ROLE"; roleId: string; updates: Partial<Role> }
  | { type: "REMOVE_ROLE"; roleId: string }
  | { type: "ASSIGN_ROLE_TO_NODE"; nodeId: string; assignedRole: AssignedRole }
  | { type: "UPDATE_NODE_ROLE_RATE"; nodeId: string; roleId: string; standardRate: number | null; overtimeRate: number | null }
  | { type: "REMOVE_ROLE_FROM_NODE"; nodeId: string; roleId: string }
  | { type: "SET_SELECTED_NODE"; nodeId: string | null }
  | { type: "OPEN_NODE_MODAL"; nodeId: string }
  | { type: "CLOSE_NODE_MODAL" }
  | { type: "SET_MODAL_TAB"; tab: "people" | "resources" | "settings" }
  | { type: "SET_ADD_NODE_TARGET"; target: { parentId: string; type: "child" | "sibling" } | null }
  | { type: "SET_GLOBAL_PANEL"; panel: GlobalPanelType }
  | { type: "SET_ZOOM"; zoom: number }
  | { type: "SET_PAN"; panX: number; panY: number }
  | { type: "SET_LOADING"; isLoading: boolean }
  | { type: "HYDRATE_FROM_API"; data: { nodes: any[]; people: any[]; equipment: any[]; materials: any[]; calendars: any[]; roles: any[] } };

/* ─────────────────────── Helpers ────────────────────────────────── */

function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function getNodeDepth(nodeId: string, nodes: Record<string, OBSNode>): number {
  let depth = 0;
  let current = nodes[nodeId];
  while (current?.parentId) {
    depth++;
    current = nodes[current.parentId];
  }
  return depth;
}

/* ─────────────────────── Reducer ────────────────────────────────── */

function reducer(state: OrgSetupState, action: Action): OrgSetupState {
  switch (action.type) {
    case "ADD_NODE": {
      const parent = state.nodes[action.parentId];
      if (!parent) return state;

      let targetParentId: string;
      let depth: number;

      if (action.asChild) {
        targetParentId = action.parentId;
        depth = getNodeDepth(action.parentId, state.nodes) + 1;
      } else {
        // Sibling — add under the same parent
        if (!parent.parentId) return state; // Can't add sibling to root
        targetParentId = parent.parentId;
        depth = getNodeDepth(action.parentId, state.nodes);
      }

      if (depth > MAX_DEPTH) return state;

      const nodeType: OBSNodeType = NODE_TYPE_BY_DEPTH[depth] ?? "TEAM";
      const newId = generateId("node");

      const newNode: OBSNode = {
        id: newId,
        name: action.name,
        code: action.code,
        type: nodeType,
        parentId: targetParentId,
        children: [],
        nodeHeadPersonId: null,
        calendarId: null,
        assignedRoles: [],
        isActive: true,
      };

      const updatedParent = {
        ...state.nodes[targetParentId],
        children: [...state.nodes[targetParentId].children, newId],
      };

      return {
        ...state,
        nodes: {
          ...state.nodes,
          [newId]: newNode,
          [targetParentId]: updatedParent,
        },
      };
    }

    case "UPDATE_NODE": {
      const node = state.nodes[action.nodeId];
      if (!node) return state;
      return {
        ...state,
        nodes: {
          ...state.nodes,
          [action.nodeId]: { ...node, ...action.updates },
        },
      };
    }

    case "REMOVE_NODE": {
      const node = state.nodes[action.nodeId];
      if (!node || node.type === "COMPANY_ROOT") return state;

      // Collect all descendant IDs
      const toRemove = new Set<string>();
      const queue = [action.nodeId];
      while (queue.length > 0) {
        const id = queue.pop()!;
        toRemove.add(id);
        const n = state.nodes[id];
        if (n) queue.push(...n.children);
      }

      // Remove from parent's children
      const newNodes = { ...state.nodes };
      if (node.parentId && newNodes[node.parentId]) {
        newNodes[node.parentId] = {
          ...newNodes[node.parentId],
          children: newNodes[node.parentId].children.filter((c) => c !== action.nodeId),
        };
      }
      for (const id of toRemove) delete newNodes[id];

      // Remove people/equipment/materials belonging to removed nodes
      const newPeople = { ...state.people };
      const newEquipment = { ...state.equipment };
      const newMaterials = { ...state.materials };
      for (const [id, p] of Object.entries(newPeople)) {
        if (toRemove.has(p.nodeId)) delete newPeople[id];
      }
      for (const [id, e] of Object.entries(newEquipment)) {
        if (toRemove.has(e.nodeId)) delete newEquipment[id];
      }
      for (const [id, m] of Object.entries(newMaterials)) {
        if (toRemove.has(m.nodeId)) delete newMaterials[id];
      }

      return {
        ...state,
        nodes: newNodes,
        people: newPeople,
        equipment: newEquipment,
        materials: newMaterials,
        ui: {
          ...state.ui,
          selectedNodeId: toRemove.has(state.ui.selectedNodeId ?? "") ? null : state.ui.selectedNodeId,
          openNodeModalId: toRemove.has(state.ui.openNodeModalId ?? "") ? null : state.ui.openNodeModalId,
        },
      };
    }

    case "ADD_PERSON":
      return { ...state, people: { ...state.people, [action.person.id]: action.person } };

    case "UPDATE_PERSON": {
      const person = state.people[action.personId];
      if (!person) return state;
      return {
        ...state,
        people: { ...state.people, [action.personId]: { ...person, ...action.updates } },
      };
    }

    case "REMOVE_PERSON": {
      const newPeople = { ...state.people };
      delete newPeople[action.personId];
      // Clear nodeHead ref if this person was a head
      const newNodes = { ...state.nodes };
      for (const [nid, node] of Object.entries(newNodes)) {
        if (node.nodeHeadPersonId === action.personId) {
          newNodes[nid] = { ...node, nodeHeadPersonId: null };
        }
      }
      return { ...state, people: newPeople, nodes: newNodes };
    }

    case "ADD_EQUIPMENT":
      return { ...state, equipment: { ...state.equipment, [action.equipment.id]: action.equipment } };

    case "UPDATE_EQUIPMENT": {
      const eq = state.equipment[action.equipmentId];
      if (!eq) return state;
      return {
        ...state,
        equipment: { ...state.equipment, [action.equipmentId]: { ...eq, ...action.updates } },
      };
    }

    case "REMOVE_EQUIPMENT": {
      const newEq = { ...state.equipment };
      delete newEq[action.equipmentId];
      return { ...state, equipment: newEq };
    }

    case "ADD_MATERIAL":
      return { ...state, materials: { ...state.materials, [action.material.id]: action.material } };

    case "UPDATE_MATERIAL": {
      const mat = state.materials[action.materialId];
      if (!mat) return state;
      return {
        ...state,
        materials: { ...state.materials, [action.materialId]: { ...mat, ...action.updates } },
      };
    }

    case "REMOVE_MATERIAL": {
      const newMat = { ...state.materials };
      delete newMat[action.materialId];
      return { ...state, materials: newMat };
    }

    case "ADD_CALENDAR":
      return { ...state, calendars: { ...state.calendars, [action.calendar.id]: action.calendar } };

    case "UPDATE_CALENDAR": {
      const cal = state.calendars[action.calendarId];
      if (!cal) return state;
      return {
        ...state,
        calendars: { ...state.calendars, [action.calendarId]: { ...cal, ...action.updates } },
      };
    }

    case "REMOVE_CALENDAR": {
      const newCals = { ...state.calendars };
      delete newCals[action.calendarId];
      // Clear calendarId on any nodes that referenced this calendar
      const updatedNodes = { ...state.nodes };
      for (const [nid, node] of Object.entries(updatedNodes)) {
        if (node.calendarId === action.calendarId) {
          updatedNodes[nid] = { ...node, calendarId: null };
        }
      }
      return { ...state, calendars: newCals, nodes: updatedNodes };
    }

    case "ADD_CALENDAR_EXCEPTION": {
      const cal = state.calendars[action.calendarId];
      if (!cal) return state;
      return {
        ...state,
        calendars: {
          ...state.calendars,
          [action.calendarId]: {
            ...cal,
            exceptions: [...cal.exceptions, action.exception],
          },
        },
      };
    }

    case "REMOVE_CALENDAR_EXCEPTION": {
      const cal = state.calendars[action.calendarId];
      if (!cal) return state;
      return {
        ...state,
        calendars: {
          ...state.calendars,
          [action.calendarId]: {
            ...cal,
            exceptions: cal.exceptions.filter((e) => e.id !== action.exceptionId),
          },
        },
      };
    }

    case "ADD_ROLE":
      return { ...state, roles: { ...state.roles, [action.role.id]: action.role } };

    case "UPDATE_ROLE": {
      const role = state.roles[action.roleId];
      if (!role) return state;
      return {
        ...state,
        roles: { ...state.roles, [action.roleId]: { ...role, ...action.updates } },
      };
    }

    case "REMOVE_ROLE": {
      const newRoles = { ...state.roles };
      delete newRoles[action.roleId];
      // Remove role assignments from all nodes
      const updatedNodes = { ...state.nodes };
      for (const [nid, node] of Object.entries(updatedNodes)) {
        const filtered = node.assignedRoles.filter((r) => r.roleId !== action.roleId);
        if (filtered.length !== node.assignedRoles.length) {
          updatedNodes[nid] = { ...node, assignedRoles: filtered };
        }
      }
      return { ...state, roles: newRoles, nodes: updatedNodes };
    }

    case "ASSIGN_ROLE_TO_NODE": {
      const node = state.nodes[action.nodeId];
      if (!node) return state;
      const exists = node.assignedRoles.some((r) => r.roleId === action.assignedRole.roleId);
      if (exists) return state;
      return {
        ...state,
        nodes: {
          ...state.nodes,
          [action.nodeId]: {
            ...node,
            assignedRoles: [...node.assignedRoles, action.assignedRole],
          },
        },
      };
    }

    case "UPDATE_NODE_ROLE_RATE": {
      const node = state.nodes[action.nodeId];
      if (!node) return state;
      return {
        ...state,
        nodes: {
          ...state.nodes,
          [action.nodeId]: {
            ...node,
            assignedRoles: node.assignedRoles.map((r) =>
              r.roleId === action.roleId
                ? { ...r, standardRate: action.standardRate, overtimeRate: action.overtimeRate }
                : r,
            ),
          },
        },
      };
    }

    case "REMOVE_ROLE_FROM_NODE": {
      const node = state.nodes[action.nodeId];
      if (!node) return state;
      return {
        ...state,
        nodes: {
          ...state.nodes,
          [action.nodeId]: {
            ...node,
            assignedRoles: node.assignedRoles.filter((r) => r.roleId !== action.roleId),
          },
        },
      };
    }

    case "SET_SELECTED_NODE":
      return { ...state, ui: { ...state.ui, selectedNodeId: action.nodeId } };

    case "OPEN_NODE_MODAL":
      return { ...state, ui: { ...state.ui, openNodeModalId: action.nodeId, activeModalTab: "people" } };

    case "CLOSE_NODE_MODAL":
      return { ...state, ui: { ...state.ui, openNodeModalId: null } };

    case "SET_MODAL_TAB":
      return { ...state, ui: { ...state.ui, activeModalTab: action.tab } };

    case "SET_ADD_NODE_TARGET":
      return { ...state, ui: { ...state.ui, addNodeTarget: action.target } };

    case "SET_GLOBAL_PANEL":
      return { ...state, ui: { ...state.ui, globalPanelOpen: action.panel } };

    case "SET_ZOOM":
      return { ...state, ui: { ...state.ui, zoom: Math.max(0.5, Math.min(1.5, action.zoom)) } };

    case "SET_PAN":
      return { ...state, ui: { ...state.ui, panX: action.panX, panY: action.panY } };

    case "SET_LOADING":
      return { ...state, ui: { ...state.ui, isLoading: action.isLoading } };

    case "HYDRATE_FROM_API": {
      const { data } = action;
      const nodesMap: Record<string, OBSNode> = {};
      for (const n of data.nodes) {
        nodesMap[n.id] = {
          id: n.id,
          name: n.name,
          code: n.code,
          type: n.type,
          parentId: n.parentId,
          children: [],
          nodeHeadPersonId: n.nodeHeadPersonId,
          calendarId: n.calendarId,
          assignedRoles: Array.isArray(n.assignedRoles) ? n.assignedRoles : [],
          isActive: n.isActive,
        };
      }
      // Build children arrays from parentId
      for (const node of Object.values(nodesMap)) {
        if (node.parentId && nodesMap[node.parentId]) {
          nodesMap[node.parentId].children.push(node.id);
        }
      }

      const peopleMap: Record<string, Person> = {};
      for (const p of data.people) {
        peopleMap[p.id] = { ...p, nodeId: p.nodeId };
      }

      const equipmentMap: Record<string, Equipment> = {};
      for (const e of data.equipment) {
        equipmentMap[e.id] = { ...e, nodeId: e.nodeId };
      }

      const materialsMap: Record<string, Material> = {};
      for (const m of data.materials) {
        materialsMap[m.id] = { ...m, nodeId: m.nodeId };
      }

      const calendarsMap: Record<string, Calendar> = {};
      for (const c of data.calendars) {
        calendarsMap[c.id] = {
          id: c.id,
          name: c.name,
          category: c.category ?? "global",
          hoursPerDay: c.hoursPerDay,
          workDays: c.workDays,
          exceptions: c.exceptions ?? [],
        };
      }

      const rolesMap: Record<string, Role> = {};
      for (const r of data.roles) {
        rolesMap[r.id] = {
          id: r.id,
          name: r.name,
          code: r.code,
          level: r.level,
          defaultPayType: r.defaultPayType,
          overtimeEligible: r.overtimeEligible,
          skillTags: r.skillTags ?? [],
        };
      }

      // Find root node
      const rootNode = Object.values(nodesMap).find(n => n.type === "COMPANY_ROOT");
      const rootNodeId = rootNode?.id ?? state.company.rootNodeId;

      return {
        ...state,
        company: { ...state.company, rootNodeId },
        nodes: nodesMap,
        people: peopleMap,
        equipment: equipmentMap,
        materials: materialsMap,
        calendars: calendarsMap,
        roles: rolesMap,
        ui: { ...state.ui, isLoading: false },
      };
    }

    default:
      return state;
  }
}

/* ─────────────────────── Initial State ──────────────────────────── */

function createInitialState(companyName: string): OrgSetupState {
  const rootId = "node-root";
  const rootCode = companyName
    .split(" ")
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("")
    .slice(0, 4) + "-ROOT";

  return {
    company: { name: companyName, rootNodeId: rootId },
    nodes: {
      [rootId]: {
        id: rootId,
        name: companyName,
        code: rootCode,
        type: "COMPANY_ROOT",
        parentId: null,
        children: [],
        nodeHeadPersonId: null,
        calendarId: null,
        assignedRoles: [],
        isActive: true,
      },
    },
    people: {},
    equipment: {},
    materials: {},
    calendars: {},
    roles: {},
    ui: {
      selectedNodeId: null,
      openNodeModalId: null,
      activeModalTab: "people",
      zoom: 1,
      panX: 0,
      panY: 0,
      addNodeTarget: null,
      globalPanelOpen: null,
      isLoading: true,
    },
  };
}

/* ─────────────────────── Context ────────────────────────────────── */

interface OrgSetupContextValue {
  state: OrgSetupState;
  dispatch: React.Dispatch<Action>;
  getNodePeopleCount: (nodeId: string) => number;
  getNodeRolesCount: (nodeId: string) => number;
  getNodeDepth: (nodeId: string) => number;
}

const OrgSetupContext = createContext<OrgSetupContextValue | null>(null);

function useOrgSetup(): OrgSetupContextValue {
  const ctx = useContext(OrgSetupContext);
  if (!ctx) throw new Error("useOrgSetup must be used within OrgSetupProvider");
  return ctx;
}

/* ─────────────────────── Provider ───────────────────────────────── */

interface OrgSetupProviderProps {
  companyName: string;
  children: ReactNode;
}

function OrgSetupProvider({ companyName, children }: OrgSetupProviderProps) {
  const [state, dispatch] = useReducer(reducer, companyName, createInitialState);
  const { fetchOrgSetup, createNode: apiCreateNode } = useOrgApi();

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const data = await fetchOrgSetup();
        if (cancelled) return;

        if (data.nodes.length === 0) {
          // First time — create root node via API
          const rootCode = companyName
            .split(" ")
            .map((w: string) => w[0]?.toUpperCase() ?? "")
            .join("")
            .slice(0, 4) + "-ROOT";

          const { node } = await apiCreateNode({
            name: companyName,
            code: rootCode,
            type: "COMPANY_ROOT",
            parentId: null,
          });

          if (!cancelled) {
            dispatch({
              type: "HYDRATE_FROM_API",
              data: {
                nodes: [node],
                people: [],
                equipment: [],
                materials: [],
                calendars: data.calendars,
                roles: data.roles,
              },
            });
          }
        } else {
          if (!cancelled) {
            dispatch({ type: "HYDRATE_FROM_API", data });
          }
        }
      } catch (error) {
        console.error("Failed to load org setup:", error);
        if (!cancelled) {
          dispatch({ type: "SET_LOADING", isLoading: false });
        }
      }
    }

    load();
    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const getNodePeopleCount = useCallback(
    (nodeId: string) =>
      Object.values(state.people).filter((p) => p.nodeId === nodeId).length,
    [state.people],
  );

  const getNodeRolesCount = useCallback(
    (nodeId: string) => state.nodes[nodeId]?.assignedRoles.length ?? 0,
    [state.nodes],
  );

  const getNodeDepthFn = useCallback(
    (nodeId: string) => getNodeDepth(nodeId, state.nodes),
    [state.nodes],
  );

  return (
    <OrgSetupContext.Provider
      value={{
        state,
        dispatch,
        getNodePeopleCount,
        getNodeRolesCount,
        getNodeDepth: getNodeDepthFn,
      }}
    >
      {children}
    </OrgSetupContext.Provider>
  );
}

export {
  OrgSetupProvider,
  useOrgSetup,
  generateId,
  createInitialState,
  reducer,
  type Action,
};
