import { describe, expect, it } from "vitest";
import {
  CommercialLicenseBackend,
  handlePaddleWebhook,
  type CommercialLicenseSigner,
  type PaddleWebhookPayload,
  type WebhookSignatureVerifier
} from "./license-backend";
import {
  PersistentCommercialLicenseRepository,
  type CommercialLicenseRepositorySnapshot,
  type CommercialLicenseRepositorySnapshotStore
} from "./license-persistent-repository";

const basePaddlePayload: PaddleWebhookPayload = {
  event_id: "evt_persistent_01",
  event_type: "transaction.completed",
  occurred_at: "2026-05-20T20:00:00Z",
  data: {
    id: "txn_persistent_01",
    status: "completed",
    customer_id: "ctm_persistent_01",
    subscription_id: "sub_persistent_01",
    custom_data: {
      plan: "pro",
      customer_email_hash: "email-hash-persistent",
      expires_at: "2026-06-20T20:00:00Z"
    }
  }
};

class MemoryCommercialSnapshotStore implements CommercialLicenseRepositorySnapshotStore {
  private snapshot: CommercialLicenseRepositorySnapshot | null = null;

  load(): CommercialLicenseRepositorySnapshot | null {
    return this.snapshot ? structuredClone(this.snapshot) : null;
  }

  save(snapshot: CommercialLicenseRepositorySnapshot): void {
    this.snapshot = structuredClone(snapshot);
  }
}

function testSigner(): CommercialLicenseSigner {
  return {
    sign: (payload) => `test-signature:${payload}`
  };
}

function acceptingVerifier(): WebhookSignatureVerifier {
  return {
    verify: () => true
  };
}

function createBackend(store: CommercialLicenseRepositorySnapshotStore) {
  const repository = new PersistentCommercialLicenseRepository(store);

  return {
    repository,
    backend: new CommercialLicenseBackend(repository, testSigner())
  };
}

describe("persistent commercial license repository", () => {
  it("keeps an issued license available after recreating the repository", () => {
    const store = new MemoryCommercialSnapshotStore();
    const first = createBackend(store);

    const webhookResult = handlePaddleWebhook(
      JSON.stringify(basePaddlePayload),
      "valid-signature",
      acceptingVerifier(),
      first.backend
    );

    expect(webhookResult.status).toBe("license_issued");
    expect(first.repository.listLicenses()).toHaveLength(1);

    const restarted = createBackend(store);
    const activation = restarted.backend.activateLicense({
      license_id: "license_paddle_txn_persistent_01",
      customer_email_hash: "email-hash-persistent"
    });

    expect(activation.status).toBe("activated");
    expect(activation.license?.id).toBe("license_paddle_txn_persistent_01");
  });

  it("keeps webhook idempotency after recreating the repository", () => {
    const store = new MemoryCommercialSnapshotStore();
    const first = createBackend(store);
    const rawBody = JSON.stringify(basePaddlePayload);

    const firstWebhook = handlePaddleWebhook(
      rawBody,
      "valid-signature",
      acceptingVerifier(),
      first.backend
    );
    const restarted = createBackend(store);
    const duplicateWebhook = handlePaddleWebhook(
      rawBody,
      "valid-signature",
      acceptingVerifier(),
      restarted.backend
    );

    expect(firstWebhook.status).toBe("license_issued");
    expect(duplicateWebhook.status).toBe("duplicate");
    expect(restarted.repository.listLicenses()).toHaveLength(1);
    expect(restarted.repository.listProcessedWebhooks()).toHaveLength(1);
  });

  it("persists ignored webhook records without issuing a license", () => {
    const store = new MemoryCommercialSnapshotStore();
    const first = createBackend(store);
    const inactivePayload: PaddleWebhookPayload = {
      ...basePaddlePayload,
      event_id: "evt_persistent_inactive",
      event_type: "transaction.payment_failed",
      data: {
        ...basePaddlePayload.data,
        id: "txn_persistent_inactive",
        status: "past_due"
      }
    };

    const result = handlePaddleWebhook(
      JSON.stringify(inactivePayload),
      "valid-signature",
      acceptingVerifier(),
      first.backend
    );
    const restarted = createBackend(store);

    expect(result.status).toBe("ignored");
    expect(restarted.repository.listLicenses()).toHaveLength(0);
    expect(restarted.repository.listProcessedWebhooks()).toMatchObject([
      {
        gateway_event_id: "evt_persistent_inactive",
        gateway_object_id: "txn_persistent_inactive",
        result_status: "ignored",
        license_id: null
      }
    ]);
  });
});
