import { invoke } from "@tauri-apps/api/core";

export type LicensePlan = "free" | "pro" | "lifetime";

export type LicenseStatusReason =
  | "free"
  | "valid"
  | "expired"
  | "invalid_payload"
  | "invalid_signature";

export interface LicenseEntitlement {
  key: string;
  limit?: number | null;
  expires_at?: string | null;
}

export interface LicenseStatus {
  active: boolean;
  plan: LicensePlan;
  reason: LicenseStatusReason;
  license_id?: string | null;
  expires_at?: string | null;
  entitlements: LicenseEntitlement[];
}

export async function loadLicenseStatus(): Promise<LicenseStatus> {
  return invoke<LicenseStatus>("load_license_status");
}

export async function activateLicense(license: string): Promise<LicenseStatus> {
  return invoke<LicenseStatus>("activate_license", {
    request: {
      license
    }
  });
}
