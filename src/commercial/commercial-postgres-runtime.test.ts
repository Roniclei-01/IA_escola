import { describe, expect, it } from "vitest";
import { createCommercialPostgresRuntimeFetchHandler } from "./commercial-postgres-runtime";
import type { CommercialLicense } from "./license-backend";
import { verifyCommercialEd25519LicenseSignature } from "./license-ed25519-signer";
import type {
  PostgresQueryExecutor,
  PostgresQueryResult,
  PostgresTransactionExecutor
} from "./license-postgres-repository";
import { createPaddleSignatureHeader } from "./paddle-signature-verifier";

const privateKeyPem = `-----BEGIN PRIVATE KEY-----
MC4CAQAwBQYDK2VwBCIEIJwzoyZr1e6ue8L7J4c3S9qkWzlkOv4NCCpcplkvrqRU
-----END PRIVATE KEY-----
`;

const publicKeyPem = `-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEAF+Ksfsj/yWaxljAtTozH/4a6W361PQOEDieKpres/TM=
-----END PUBLIC KEY-----
`;

class FakePostgresClient implements PostgresTransactionExecutor {
  private readonly licensesById = new Map<string, CommercialLicense>();
  private readonly licenseObjectIdsById = new Map<string, string>();
  private readonly processedWebhooks = new Set<string>();

  async transaction<Result>(callback: (client: PostgresQueryExecutor) => Promise<Result>): Promise<Result> {
    return callback(this);
  }

  async query<Row = Record<string, unknown>>(
    sql: string,
    params: readonly unknown[] = []
  ): Promise<PostgresQueryResult<Row>> {
    if (sql.includes("SELECT 1 AS exists")) {
      return rows(this.processedWebhooks.has(String(params[0])) ? [{ exists: 1 }] : []);
    }

    if (sql.includes("SELECT license_payload") && sql.includes("WHERE id")) {
      const license = this.licensesById.get(String(params[0]));
      return rows(license ? [{ license_payload: license }] : []);
    }

    if (sql.includes("SELECT license_payload") && sql.includes("WHERE gateway_object_id")) {
      const licenseId = [...this.licenseObjectIdsById.entries()].find(
        ([, objectId]) => objectId === String(params[0])
      )?.[0];
      const license = licenseId ? this.licensesById.get(licenseId) : null;

      return rows(license ? [{ license_payload: license }] : []);
    }

    if (sql.includes("INSERT INTO commercial_licenses")) {
      this.licensesById.set(String(params[0]), params[7] as CommercialLicense);
      this.licenseObjectIdsById.set(String(params[0]), String(params[2]));
    }

    if (sql.includes("INSERT INTO commercial_processed_webhooks")) {
      this.processedWebhooks.add(String(params[0]));
    }

    return rows([]);
  }
}

function rows<Row>(values: unknown[]): PostgresQueryResult<Row> {
  return { rows: values as Row[] };
}

describe("commercial PostgreSQL runtime", () => {
  it("issues and activates Ed25519 licenses with PostgreSQL storage", async () => {
    const timestamp = 1_800_000_000;
    const paddleSecret = "pdl_ntfset_postgres_runtime_secret";
    const rawBody = JSON.stringify({
      event_id: "evt_postgres_runtime_01",
      event_type: "transaction.completed",
      occurred_at: "2026-05-21T12:00:00Z",
      data: {
        id: "txn_postgres_runtime_01",
        status: "completed",
        customer_id: "ctm_postgres_runtime_01",
        subscription_id: "sub_postgres_runtime_01",
        custom_data: {
          plan: "pro",
          customer_email_hash: "email-hash-postgres-runtime",
          expires_at: "2026-06-21T12:00:00Z"
        }
      }
    });
    const handler = createCommercialPostgresRuntimeFetchHandler(
      {
        COMMERCIAL_LICENSE_PRIVATE_KEY_PEM: privateKeyPem,
        PADDLE_WEBHOOK_SECRET_KEY: paddleSecret
      },
      new FakePostgresClient(),
      { now: () => timestamp }
    );

    const webhookResponse = await handler(
      new Request("https://licenses.estudoialocal.com/webhooks/paddle", {
        method: "POST",
        headers: {
          "Paddle-Signature": createPaddleSignatureHeader(rawBody, paddleSecret, timestamp)
        },
        body: rawBody
      })
    );
    const activationResponse = await handler(
      new Request("https://licenses.estudoialocal.com/licenses/activate", {
        method: "POST",
        body: JSON.stringify({
          license_id: "license_paddle_txn_postgres_runtime_01",
          customer_email_hash: "email-hash-postgres-runtime"
        })
      })
    );
    const activationBody = (await activationResponse.json()) as {
      status: string;
      license: CommercialLicense;
    };

    expect(webhookResponse.status).toBe(200);
    expect(activationResponse.status).toBe(200);
    expect(activationBody.status).toBe("activated");
    expect(verifyCommercialEd25519LicenseSignature(activationBody.license, publicKeyPem)).toBe(true);
  });
});
