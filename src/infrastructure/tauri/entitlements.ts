import { invoke } from "@tauri-apps/api/core";
import type { LicensePlan } from "./license";

export const ENTITLEMENT_EXPORT_ANKI_APKG = "export.anki.apkg";
export const ENTITLEMENT_EXPORT_REPORT_PDF = "export.report.pdf";

export type EntitlementKey =
  | typeof ENTITLEMENT_EXPORT_ANKI_APKG
  | typeof ENTITLEMENT_EXPORT_REPORT_PDF
  | string;

export type EntitlementDecisionReason =
  | "free_feature"
  | "entitled"
  | "license_required"
  | "entitlement_missing"
  | "entitlement_expired";

export interface EntitlementDecision {
  key: string;
  allowed: boolean;
  plan: LicensePlan;
  reason: EntitlementDecisionReason;
  limit?: number | null;
}

export async function checkEntitlement(key: EntitlementKey): Promise<EntitlementDecision> {
  return invoke<EntitlementDecision>("check_entitlement", {
    request: {
      key
    }
  });
}
