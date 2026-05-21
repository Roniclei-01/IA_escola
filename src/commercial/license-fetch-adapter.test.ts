import { describe, expect, it, vi } from "vitest";
import { createCommercialFetchHandler, handleCommercialFetchRequest } from "./license-fetch-adapter";
import {
  CommercialLicenseBackend,
  InMemoryCommercialLicenseRepository,
  type CommercialLicenseSigner,
  type PaddleWebhookPayload,
  type WebhookSignatureVerifier
} from "./license-backend";

const paddlePayload: PaddleWebhookPayload = {
  event_id: "evt_fetch_01",
  event_type: "transaction.completed",
  occurred_at: "2026-05-20T20:00:00Z",
  data: {
    id: "txn_fetch_01",
    status: "completed",
    customer_id: "ctm_fetch_01",
    subscription_id: "sub_fetch_01",
    custom_data: {
      plan: "pro",
      customer_email_hash: "email-hash-fetch",
      expires_at: "2026-06-20T20:00:00Z"
    }
  }
};

function createDependencies() {
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

async function responseBody<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

describe("commercial license fetch adapter", () => {
  it("adapts Paddle webhook requests to the pure API contract", async () => {
    const dependencies = createDependencies();

    const response = await handleCommercialFetchRequest(
      new Request("https://licenses.estudoialocal.com/webhooks/paddle?source=paddle", {
        method: "POST",
        headers: {
          "Paddle-Signature": "valid-signature"
        },
        body: JSON.stringify(paddlePayload)
      }),
      dependencies
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/json");
    expect(await responseBody<{ status: string; license_id: string }>(response)).toEqual({
      status: "license_issued",
      license_id: "license_paddle_txn_fetch_01"
    });
  });

  it("activates an issued license through the fetch handler factory", async () => {
    const handler = createCommercialFetchHandler(createDependencies());

    await handler(
      new Request("https://licenses.estudoialocal.com/webhooks/paddle", {
        method: "POST",
        headers: {
          "Paddle-Signature": "valid-signature"
        },
        body: JSON.stringify(paddlePayload)
      })
    );

    const response = await handler(
      new Request("https://licenses.estudoialocal.com/licenses/activate", {
        method: "POST",
        body: JSON.stringify({
          license_id: "license_paddle_txn_fetch_01",
          customer_email_hash: "email-hash-fetch"
        })
      })
    );

    const body = await responseBody<{
      status: string;
      license: { id: string; signature: string };
    }>(response);

    expect(response.status).toBe(200);
    expect(body.status).toBe("activated");
    expect(body.license.id).toBe("license_paddle_txn_fetch_01");
    expect(body.license.signature).toContain("test-signature:");
  });

  it("returns the same error status as the pure API contract", async () => {
    const response = await handleCommercialFetchRequest(
      new Request("https://licenses.estudoialocal.com/webhooks/paddle", {
        method: "POST",
        body: JSON.stringify(paddlePayload)
      }),
      createDependencies()
    );

    expect(response.status).toBe(401);
    expect(await responseBody<{ status: string }>(response)).toEqual({
      status: "missing_signature"
    });
  });

  it("keeps unknown routes isolated from the commercial API", async () => {
    const response = await handleCommercialFetchRequest(
      new Request("https://licenses.estudoialocal.com/unknown"),
      createDependencies()
    );

    expect(response.status).toBe(404);
    expect(await responseBody<{ status: string }>(response)).toEqual({
      status: "not_found"
    });
  });
});
