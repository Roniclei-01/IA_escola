import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { handleCommercialApiRequest } from "./license-api";
import type { PaddleWebhookPayload } from "./license-backend";
import { verifyCommercialEd25519LicenseSignature } from "./license-ed25519-signer";
import { commercialRuntimeConfig, createCommercialRuntimeDependencies } from "./commercial-runtime";
import { createPaddleSignatureHeader } from "./paddle-signature-verifier";

const privateKeyPem = `-----BEGIN PRIVATE KEY-----
MC4CAQAwBQYDK2VwBCIEIJwzoyZr1e6ue8L7J4c3S9qkWzlkOv4NCCpcplkvrqRU
-----END PRIVATE KEY-----
`;

const publicKeyPem = `-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEAF+Ksfsj/yWaxljAtTozH/4a6W361PQOEDieKpres/TM=
-----END PUBLIC KEY-----
`;

const paddleSecret = "pdl_ntfset_runtime_secret";
const timestamp = 1_800_000_000;

const paddlePayload: PaddleWebhookPayload = {
  event_id: "evt_runtime_01",
  event_type: "transaction.completed",
  occurred_at: "2026-05-21T12:00:00Z",
  data: {
    id: "txn_runtime_01",
    status: "completed",
    customer_id: "ctm_runtime_01",
    subscription_id: "sub_runtime_01",
    custom_data: {
      plan: "pro",
      customer_email_hash: "email-hash-runtime",
      expires_at: "2026-06-21T12:00:00Z"
    }
  }
};

describe("commercial runtime", () => {
  it("requires the production commercial environment variables", () => {
    expect(() => commercialRuntimeConfig({})).toThrow(
      "COMMERCIAL_LICENSE_PRIVATE_KEY_PEM is required"
    );
  });

  it("rejects invalid webhook tolerance configuration", () => {
    expect(() =>
      commercialRuntimeConfig({
        COMMERCIAL_LICENSE_PRIVATE_KEY_PEM: privateKeyPem,
        COMMERCIAL_LICENSE_STORE_PATH: "/tmp/licenses.json",
        PADDLE_WEBHOOK_SECRET_KEY: paddleSecret,
        PADDLE_WEBHOOK_TOLERANCE_SECONDS: "0"
      })
    ).toThrow("PADDLE_WEBHOOK_TOLERANCE_SECONDS must be a positive integer");
  });

  it("issues Ed25519 licenses from verified Paddle webhooks and persists them", () => {
    const directory = mkdtempSync(join(tmpdir(), "estudo-ia-commercial-runtime-"));
    const storePath = join(directory, "licenses.json");
    const environment = {
      COMMERCIAL_LICENSE_PRIVATE_KEY_PEM: privateKeyPem,
      COMMERCIAL_LICENSE_STORE_PATH: storePath,
      PADDLE_WEBHOOK_SECRET_KEY: paddleSecret
    };
    const rawBody = JSON.stringify(paddlePayload);
    const signature = createPaddleSignatureHeader(rawBody, paddleSecret, timestamp);

    try {
      const firstDependencies = createCommercialRuntimeDependencies(environment, {
        now: () => timestamp
      });
      const webhookResponse = handleCommercialApiRequest(
        {
          method: "POST",
          path: "/webhooks/paddle",
          headers: {
            "Paddle-Signature": signature
          },
          body: rawBody
        },
        firstDependencies
      );
      const restartedDependencies = createCommercialRuntimeDependencies(environment, {
        now: () => timestamp
      });
      const activationResponse = handleCommercialApiRequest(
        {
          method: "POST",
          path: "/licenses/activate",
          body: JSON.stringify({
            license_id: "license_paddle_txn_runtime_01",
            customer_email_hash: "email-hash-runtime"
          })
        },
        restartedDependencies
      );
      const activationBody = JSON.parse(activationResponse.body) as {
        status: string;
        license: {
          id: string;
          signature: string;
          plan: "pro";
          customer_email_hash: string;
          issued_at: string;
          expires_at: string | null;
          entitlements: [];
        };
      };

      expect(webhookResponse.status).toBe(200);
      expect(activationResponse.status).toBe(200);
      expect(activationBody.status).toBe("activated");
      expect(activationBody.license.signature).toMatch(/^ed25519:/);
      expect(verifyCommercialEd25519LicenseSignature(activationBody.license, publicKeyPem)).toBe(
        true
      );
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
