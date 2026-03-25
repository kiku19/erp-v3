import { eventBus, type DomainEvent } from "./event-bus";

/* ─────────────────────── Event Types ──────────────────────────── */

const OBS_EVENTS = {
  NODE_CREATED: "obs.node.created",
  NODE_UPDATED: "obs.node.updated",
  NODE_DELETED: "obs.node.deleted",

  PERSON_CREATED: "obs.person.created",
  PERSON_UPDATED: "obs.person.updated",
  PERSON_DELETED: "obs.person.deleted",

  EQUIPMENT_CREATED: "obs.equipment.created",
  EQUIPMENT_UPDATED: "obs.equipment.updated",
  EQUIPMENT_DELETED: "obs.equipment.deleted",

  MATERIAL_CREATED: "obs.material.created",
  MATERIAL_UPDATED: "obs.material.updated",
  MATERIAL_DELETED: "obs.material.deleted",
} as const;

/* ─────────────────────── Emit Helper ──────────────────────────── */

function emitOBSEvent(
  type: (typeof OBS_EVENTS)[keyof typeof OBS_EVENTS],
  tenantId: string,
  entityId: string,
  payload: Record<string, unknown>,
): void {
  const event: DomainEvent = {
    type,
    tenantId,
    entityId,
    payload,
    timestamp: new Date(),
  };
  eventBus.emit(event);
}

export { OBS_EVENTS, emitOBSEvent };
