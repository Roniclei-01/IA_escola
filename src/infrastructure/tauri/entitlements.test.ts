import { beforeEach, describe, expect, it, vi } from "vitest";
import { checkEntitlement, ENTITLEMENT_EXPORT_ANKI_APKG } from "./entitlements";

const invokeMock = vi.hoisted(() => vi.fn());

vi.mock("@tauri-apps/api/core", () => ({
  invoke: invokeMock
}));

describe("entitlements", () => {
  beforeEach(() => {
    invokeMock.mockReset();
  });

  it("checks a feature gate through Tauri", async () => {
    invokeMock.mockResolvedValue({
      key: ENTITLEMENT_EXPORT_ANKI_APKG,
      allowed: false,
      plan: "free",
      reason: "license_required",
      limit: null
    });

    const decision = await checkEntitlement(ENTITLEMENT_EXPORT_ANKI_APKG);

    expect(invokeMock).toHaveBeenCalledWith("check_entitlement", {
      request: {
        key: ENTITLEMENT_EXPORT_ANKI_APKG
      }
    });
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toBe("license_required");
  });
});
