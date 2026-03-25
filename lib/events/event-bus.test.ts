// @vitest-environment node
import { describe, it, expect, vi } from "vitest";
import { eventBus, type DomainEvent } from "./event-bus";

describe("EventBus", () => {
  it("emits events to registered handlers", async () => {
    const handler = vi.fn();
    eventBus.on("test.event", handler);

    const event: DomainEvent = {
      type: "test.event",
      tenantId: "t1",
      entityId: "e1",
      payload: { foo: "bar" },
      timestamp: new Date(),
    };

    eventBus.emit(event);

    expect(handler).toHaveBeenCalledWith(event);

    eventBus.off("test.event", handler);
  });

  it("does not call unregistered handlers", () => {
    const handler = vi.fn();
    eventBus.on("test.event2", handler);
    eventBus.off("test.event2", handler);

    eventBus.emit({
      type: "test.event2",
      tenantId: "t1",
      entityId: "e1",
      payload: {},
      timestamp: new Date(),
    });

    expect(handler).not.toHaveBeenCalled();
  });

  it("catches handler errors without throwing", () => {
    const badHandler = vi.fn(() => { throw new Error("handler error"); });
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    eventBus.on("test.error", badHandler);

    expect(() => {
      eventBus.emit({
        type: "test.error",
        tenantId: "t1",
        entityId: "e1",
        payload: {},
        timestamp: new Date(),
      });
    }).not.toThrow();

    expect(consoleError).toHaveBeenCalled();
    eventBus.off("test.error", badHandler);
    consoleError.mockRestore();
  });
});
