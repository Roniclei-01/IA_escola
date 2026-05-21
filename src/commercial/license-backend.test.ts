import { describe, expect, it, vi } from "vitest";
import {
  canonicalLicensePayload,
  CommercialLicenseBackend,
  handlePaddleWebhook,
  InMemoryCommercialLicenseRepository,
  normalizePaddleWebhookPayload,
  type CommercialLicenseSigner,
  type PaddleWebhookPayload,
  type WebhookSignatureVerifier
} from "./license-backend";

const basePaddlePayload: PaddleWebhookPayload = {
  event_id: "evt_01",
  event_type: "transaction.completed",
  occurred_at: "2026-05-20T20:00:00Z",
  data: {
    id: "txn_01",
    status: "completed",
    customer_id: "ctm_01",
    subscription_id: "sub_01",
    custom_data: {
      plan: "pro",
      customer_email_hash: "email-hash-1",
      expires_at: "2026-06-20T20:00:00Z"
    }
  }
};

function testSigner(): CommercialLicenseSigner {
  return {
    sign: (payload) => `test-signature:${payload}`
  };
}

function acceptingVerifier(): WebhookSignatureVerifier {
  return {
    verify: vi.fn().mockReturnValue(true)
  };
}

describe("commercial license backend", () => {
  it("normalizes a paid Paddle transaction webhook into a commercial event", () => {
    const event = normalizePaddleWebhookPayload(basePaddlePayload);

    expect(event).toEqual({
      gateway: "paddle",
      gateway_event_id: "evt_01",
      gateway_event_type: "transaction.completed",
      gateway_object_id: "txn_01",
      gateway_customer_id: "ctm_01",
      gateway_subscription_id: "sub_01",
      occurred_at: "2026-05-20T20:00:00Z",
      status: "paid",
      plan: "pro",
      customer_email_hash: "email-hash-1",
      expires_at: "2026-06-20T20:00:00Z"
    });
  });

  it("rejects webhook requests when the gateway signature is invalid", () => {
    const repository = new InMemoryCommercialLicenseRepository();
    const backend = new CommercialLicenseBackend(repository, testSigner());
    const verifier = {
      verify: vi.fn().mockReturnValue(false)
    };

    const result = handlePaddleWebhook(
      JSON.stringify(basePaddlePayload),
      "invalid-signature",
      verifier,
      backend
    );

    expect(result.status).toBe("rejected_invalid_signature");
    expect(repository.listLicenses()).toHaveLength(0);
  });

  it("issues a signed license from a verified paid webhook", () => {
    const repository = new InMemoryCommercialLicenseRepository();
    const backend = new CommercialLicenseBackend(repository, testSigner());

    const result = handlePaddleWebhook(
      JSON.stringify(basePaddlePayload),
      "valid-signature",
      acceptingVerifier(),
      backend
    );

    expect(result.status).toBe("license_issued");
    expect(result.license).toMatchObject({
      id: "license_paddle_txn_01",
      plan: "pro",
      customer_email_hash: "email-hash-1",
      issued_at: "2026-05-20T20:00:00Z",
      expires_at: "2026-06-20T20:00:00Z"
    });
    expect(result.license?.entitlements.map((entitlement) => entitlement.key)).toEqual([
      "cards.generate.multiple_choice",
      "export.anki.apkg",
      "export.report.pdf"
    ]);
    const { signature, ...unsignedLicense } = result.license!;
    expect(signature).toBe(`test-signature:${canonicalLicensePayload(unsignedLicense)}`);
  });

  it("keeps webhook processing idempotent for duplicate event ids", () => {
    const repository = new InMemoryCommercialLicenseRepository();
    const backend = new CommercialLicenseBackend(repository, testSigner());
    const rawBody = JSON.stringify(basePaddlePayload);

    const first = handlePaddleWebhook(rawBody, "valid-signature", acceptingVerifier(), backend);
    const second = handlePaddleWebhook(rawBody, "valid-signature", acceptingVerifier(), backend);

    expect(first.status).toBe("license_issued");
    expect(second.status).toBe("duplicate");
    expect(repository.listLicenses()).toHaveLength(1);
  });

  it("does not issue a license for failed or inactive payment events", () => {
    const repository = new InMemoryCommercialLicenseRepository();
    const backend = new CommercialLicenseBackend(repository, testSigner());
    const payload: PaddleWebhookPayload = {
      ...basePaddlePayload,
      event_id: "evt_failed",
      event_type: "transaction.payment_failed",
      data: {
        ...basePaddlePayload.data,
        id: "txn_failed",
        status: "past_due"
      }
    };

    const result = handlePaddleWebhook(
      JSON.stringify(payload),
      "valid-signature",
      acceptingVerifier(),
      backend
    );

    expect(result.status).toBe("ignored");
    expect(result.license).toBeNull();
    expect(repository.listLicenses()).toHaveLength(0);
  });
});
