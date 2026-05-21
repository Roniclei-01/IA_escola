import { describe, expect, it, vi } from "vitest";
import { handleCommercialApiRequest } from "./license-api";
import {
  CommercialLicenseBackend,
  InMemoryCommercialLicenseRepository,
  type CommercialLicenseSigner,
  type PaddleWebhookPayload,
  type WebhookSignatureVerifier
} from "./license-backend";

const paddlePayload: PaddleWebhookPayload = {
  event_id: "evt_api_01",
  event_type: "transaction.completed",
  occurred_at: "2026-05-20T20:00:00Z",
  data: {
    id: "txn_api_01",
    status: "completed",
    customer_id: "ctm_api_01",
    subscription_id: "sub_api_01",
    custom_data: {
      plan: "pro",
      customer_email_hash: "email-hash-api",
      expires_at: "2026-06-20T20:00:00Z"
    }
  }
};

function createBackend() {
  const repository = new InMemoryCommercialLicenseRepository();
  const signer: CommercialLicenseSigner = {
    sign: (payload) => `test-signature:${payload}`
  };
  const paddleVerifier: WebhookSignatureVerifier = {
    verify: vi.fn().mockReturnValue(true)
  };

  return {
    backend: new CommercialLicenseBackend(repository, signer),
    paddleVerifier
  };
}

function parseBody<T>(body: string): T {
  return JSON.parse(body) as T;
}

describe("commercial license API", () => {
  it("handles Paddle webhook requests and returns the issued license id", () => {
    const dependencies = createBackend();

    const response = handleCommercialApiRequest(
      {
        method: "POST",
        path: "/webhooks/paddle",
        headers: {
          "Paddle-Signature": "valid-signature"
        },
        body: JSON.stringify(paddlePayload)
      },
      dependencies
    );

    expect(response.status).toBe(200);
    expect(parseBody<{ status: string; license_id: string }>(response.body)).toEqual({
      status: "license_issued",
      license_id: "license_paddle_txn_api_01"
    });
  });

  it("rejects Paddle webhook requests without signature", () => {
    const dependencies = createBackend();

    const response = handleCommercialApiRequest(
      {
        method: "POST",
        path: "/webhooks/paddle",
        body: JSON.stringify(paddlePayload)
      },
      dependencies
    );

    expect(response.status).toBe(401);
    expect(parseBody<{ status: string }>(response.body).status).toBe("missing_signature");
  });

  it("activates an issued license by license id", () => {
    const dependencies = createBackend();
    handleCommercialApiRequest(
      {
        method: "POST",
        path: "/webhooks/paddle",
        headers: {
          "paddle-signature": "valid-signature"
        },
        body: JSON.stringify(paddlePayload)
      },
      dependencies
    );

    const response = handleCommercialApiRequest(
      {
        method: "POST",
        path: "/licenses/activate",
        body: JSON.stringify({
          license_id: "license_paddle_txn_api_01",
          customer_email_hash: "email-hash-api"
        })
      },
      dependencies
    );

    const body = parseBody<{
      status: string;
      license: { id: string; signature: string };
    }>(response.body);

    expect(response.status).toBe(200);
    expect(body.status).toBe("activated");
    expect(body.license.id).toBe("license_paddle_txn_api_01");
    expect(body.license.signature).toContain("test-signature:");
  });

  it("rejects activation when the customer hash does not match", () => {
    const dependencies = createBackend();
    handleCommercialApiRequest(
      {
        method: "POST",
        path: "/webhooks/paddle",
        headers: {
          "paddle-signature": "valid-signature"
        },
        body: JSON.stringify(paddlePayload)
      },
      dependencies
    );

    const response = handleCommercialApiRequest(
      {
        method: "POST",
        path: "/licenses/activate",
        body: JSON.stringify({
          license_id: "license_paddle_txn_api_01",
          customer_email_hash: "other-email-hash"
        })
      },
      dependencies
    );

    expect(response.status).toBe(403);
    expect(parseBody<{ status: string }>(response.body).status).toBe("customer_mismatch");
  });

  it("returns 404 when activation cannot find a license", () => {
    const dependencies = createBackend();

    const response = handleCommercialApiRequest(
      {
        method: "POST",
        path: "/licenses/activate",
        body: JSON.stringify({
          license_id: "missing-license"
        })
      },
      dependencies
    );

    expect(response.status).toBe(404);
    expect(parseBody<{ status: string }>(response.body).status).toBe("not_found");
  });

  it("returns 404 for unknown routes", () => {
    const dependencies = createBackend();

    const response = handleCommercialApiRequest(
      {
        method: "GET",
        path: "/unknown"
      },
      dependencies
    );

    expect(response.status).toBe(404);
    expect(parseBody<{ status: string }>(response.body).status).toBe("not_found");
  });
});
