import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useEmailVerificationPolling } from "./use-email-verification-polling";

describe("useEmailVerificationPolling", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("does not poll when enabled is false", async () => {
    renderHook(() =>
      useEmailVerificationPolling({ email: "a@b.com", enabled: false }),
    );
    await act(() => vi.advanceTimersByTimeAsync(6000));
    expect(fetch).not.toHaveBeenCalled();
  });

  it("polls immediately when enabled", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ verified: false }),
    });
    renderHook(() =>
      useEmailVerificationPolling({ email: "a@b.com", enabled: true }),
    );
    await act(() => vi.advanceTimersByTimeAsync(0));
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith(
      "/api/auth/check-verification-status?email=a%40b.com",
    );
  });

  it("polls again after 2 seconds", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ verified: false }),
    });
    renderHook(() =>
      useEmailVerificationPolling({ email: "a@b.com", enabled: true }),
    );
    await act(() => vi.advanceTimersByTimeAsync(4000));
    expect(fetch).toHaveBeenCalledTimes(3); // 0s, 2s, 4s
  });

  it("returns isVerified: false initially", () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ verified: false }),
    });
    const { result } = renderHook(() =>
      useEmailVerificationPolling({ email: "a@b.com", enabled: true }),
    );
    expect(result.current.isVerified).toBe(false);
    expect(result.current.tenantId).toBeNull();
  });

  it("sets isVerified: true and tenantId when API returns verified", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ verified: true, tenantId: "t-xyz" }),
    });
    const { result } = renderHook(() =>
      useEmailVerificationPolling({ email: "a@b.com", enabled: true }),
    );
    await act(() => vi.advanceTimersByTimeAsync(0));
    expect(result.current.isVerified).toBe(true);
    expect(result.current.tenantId).toBe("t-xyz");
  });

  it("stops polling after verification", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ verified: true, tenantId: "t-xyz" }),
    });
    renderHook(() =>
      useEmailVerificationPolling({ email: "a@b.com", enabled: true }),
    );
    await act(() => vi.advanceTimersByTimeAsync(0));
    const callsAfterVerify = (fetch as ReturnType<typeof vi.fn>).mock.calls.length;
    await act(() => vi.advanceTimersByTimeAsync(6000));
    expect((fetch as ReturnType<typeof vi.fn>).mock.calls.length).toBe(callsAfterVerify);
  });

  it("stops polling when enabled switches to false", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ verified: false }),
    });
    const { rerender } = renderHook(
      ({ enabled }) =>
        useEmailVerificationPolling({ email: "a@b.com", enabled }),
      { initialProps: { enabled: true } },
    );
    await act(() => vi.advanceTimersByTimeAsync(2000));
    rerender({ enabled: false });
    const callCount = (fetch as ReturnType<typeof vi.fn>).mock.calls.length;
    await act(() => vi.advanceTimersByTimeAsync(6000));
    expect((fetch as ReturnType<typeof vi.fn>).mock.calls.length).toBe(callCount);
  });
});
