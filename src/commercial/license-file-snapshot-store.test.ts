import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { JsonFileCommercialSnapshotStore } from "./license-file-snapshot-store";
import type { CommercialLicenseRepositorySnapshot } from "./license-persistent-repository";

function snapshot(): CommercialLicenseRepositorySnapshot {
  return {
    processed_webhooks: [
      {
        gateway: "paddle",
        gateway_event_id: "evt_file_01",
        gateway_event_type: "transaction.completed",
        gateway_object_id: "txn_file_01",
        gateway_customer_id: "ctm_file_01",
        gateway_subscription_id: null,
        processed_at: "2026-05-21T12:00:00Z",
        result_status: "license_issued",
        license_id: "license_paddle_txn_file_01"
      }
    ],
    licenses: [
      {
        gateway_object_id: "txn_file_01",
        license: {
          id: "license_paddle_txn_file_01",
          plan: "pro",
          customer_email_hash: "email-hash-file",
          issued_at: "2026-05-21T12:00:00Z",
          expires_at: "2026-06-21T12:00:00Z",
          entitlements: [],
          signature: "ed25519:test"
        }
      }
    ]
  };
}

describe("JSON file commercial snapshot store", () => {
  it("persists and loads a commercial repository snapshot", () => {
    const directory = mkdtempSync(join(tmpdir(), "estudo-ia-commercial-"));
    const store = new JsonFileCommercialSnapshotStore(join(directory, "licenses.json"));

    try {
      store.save(snapshot());

      expect(store.load()).toEqual(snapshot());
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it("returns null when the snapshot file does not exist", () => {
    const directory = mkdtempSync(join(tmpdir(), "estudo-ia-commercial-"));
    const store = new JsonFileCommercialSnapshotStore(join(directory, "missing.json"));

    try {
      expect(store.load()).toBeNull();
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
