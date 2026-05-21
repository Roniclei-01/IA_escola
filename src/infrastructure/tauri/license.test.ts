import { invoke } from "@tauri-apps/api/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { activateLicense, loadLicenseStatus, type LicenseStatus } from "./license";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn()
}));

const invokeMock = vi.mocked(invoke);

describe("license", () => {
  beforeEach(() => {
    invokeMock.mockReset();
  });

  it("loads the local license status from Tauri", async () => {
    const status: LicenseStatus = {
      active: false,
      plan: "free",
      reason: "free",
      license_id: null,
      expires_at: null,
      entitlements: []
    };
    invokeMock.mockResolvedValue(status);

    const result = await loadLicenseStatus();

    expect(invokeMock).toHaveBeenCalledWith("load_license_status");
    expect(result).toEqual(status);
  });

  it("activates a license through Tauri", async () => {
    const status: LicenseStatus = {
      active: true,
      plan: "pro",
      reason: "valid",
      license_id: "license-1",
      expires_at: "2099-01-01T00:00:00Z",
      entitlements: [
        {
          key: "cards.generate.multiple_choice",
          limit: 200
        }
      ]
    };
    invokeMock.mockResolvedValue(status);

    const result = await activateLicense("signed-license");

    expect(invokeMock).toHaveBeenCalledWith("activate_license", {
      request: {
        license: "signed-license"
      }
    });
    expect(result).toEqual(status);
  });
});
