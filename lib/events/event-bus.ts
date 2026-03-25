/* ─────────────────────── Types ────────────────────────────────── */

interface DomainEvent {
  type: string;
  tenantId: string;
  entityId: string;
  payload: Record<string, unknown>;
  timestamp: Date;
}

type EventHandler = (event: DomainEvent) => void | Promise<void>;

/* ─────────────────────── EventBus ─────────────────────────────── */

class EventBus {
  private handlers = new Map<string, Set<EventHandler>>();

  on(eventType: string, handler: EventHandler): void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }
    this.handlers.get(eventType)!.add(handler);
  }

  off(eventType: string, handler: EventHandler): void {
    this.handlers.get(eventType)?.delete(handler);
  }

  emit(event: DomainEvent): void {
    const handlers = this.handlers.get(event.type);
    if (!handlers) return;

    for (const handler of handlers) {
      try {
        handler(event);
      } catch (error) {
        console.error(`[EventBus] Handler error for ${event.type}:`, error);
      }
    }
  }
}

/* ─────────────────────── Singleton ─────────────────────────────── */

const globalForEvents = globalThis as unknown as { eventBus: EventBus | undefined };
const eventBus = globalForEvents.eventBus ?? new EventBus();
if (typeof globalThis !== "undefined") globalForEvents.eventBus = eventBus;

export { eventBus, EventBus, type DomainEvent, type EventHandler };
