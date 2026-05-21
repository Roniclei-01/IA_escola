import { describe, expect, it } from "vitest";
import {
  COMMERCIAL_POSTGRES_SCHEMA_SQL,
  PostgresCommercialLicenseRepository,
  runCommercialPostgresMigrations,
  type PostgresQueryExecutor,
  type PostgresQueryResult,
  type PostgresTransactionExecutor
} from "./license-postgres-repository";
import type { CommercialLicense, CommercialProcessedWebhookRecord } from "./license-backend";

class FakePostgresClient implements PostgresTransactionExecutor {
  readonly statements: string[] = [];
  transactionCount = 0;
  private readonly licensesById = new Map<string, CommercialLicense>();
  private readonly licenseObjectIdsById = new Map<string, string>();
  private readonly processedWebhooks = new Map<string, CommercialProcessedWebhookRecord>();

  async transaction<Result>(callback: (client: PostgresQueryExecutor) => Promise<Result>): Promise<Result> {
    this.transactionCount += 1;
    return callback(this);
  }

  async query<Row = Record<string, unknown>>(
    sql: string,
    params: readonly unknown[] = []
  ): Promise<PostgresQueryResult<Row>> {
    this.statements.push(sql.trim());

    if (sql.includes("SELECT 1 AS exists")) {
      return rows(this.processedWebhooks.has(String(params[0])) ? [{ exists: 1 }] : []);
    }

    if (sql.includes("SELECT license_payload") && sql.includes("WHERE gateway_object_id")) {
      const objectId = String(params[0]);
      const license = [...this.licenseObjectIdsById.entries()].find(([, value]) => value === objectId);

      return rows(license ? [{ license_payload: this.licensesById.get(license[0])! }] : []);
    }

    if (sql.includes("SELECT license_payload") && sql.includes("WHERE id")) {
      const license = this.licensesById.get(String(params[0]));

      return rows(license ? [{ license_payload: license }] : []);
    }

    if (sql.includes("SELECT license_payload") && sql.includes("ORDER BY issued_at")) {
      return rows([...this.licensesById.values()].map((license) => ({ license_payload: license })));
    }

    if (sql.includes("FROM commercial_processed_webhooks") && sql.includes("ORDER BY processed_at")) {
      return rows([...this.processedWebhooks.values()]);
    }

    if (sql.includes("INSERT INTO commercial_licenses")) {
      const license = params[7] as CommercialLicense;
      this.licensesById.set(String(params[0]), license);
      this.licenseObjectIdsById.set(String(params[0]), String(params[2]));

      return rows([]);
    }

    if (sql.includes("INSERT INTO commercial_processed_webhooks")) {
      const record: CommercialProcessedWebhookRecord = {
        gateway_event_id: String(params[0]),
        gateway: "paddle",
        gateway_event_type: String(params[2]),
        gateway_object_id: String(params[3]),
        gateway_customer_id: String(params[4]),
        gateway_subscription_id: params[5] === null ? null : String(params[5]),
        processed_at: String(params[6]),
        result_status: params[7] as CommercialProcessedWebhookRecord["result_status"],
        license_id: params[8] === null ? null : String(params[8])
      };

      if (!this.processedWebhooks.has(record.gateway_event_id)) {
        this.processedWebhooks.set(record.gateway_event_id, record);
      }

      return rows([]);
    }

    return rows([]);
  }
}

function rows<Row>(values: unknown[]): PostgresQueryResult<Row> {
  return { rows: values as Row[] };
}

function license(): CommercialLicense {
  return {
    id: "license_paddle_txn_postgres_01",
    plan: "pro",
    customer_email_hash: "email-hash-postgres",
    issued_at: "2026-05-21T12:00:00Z",
    expires_at: "2026-06-21T12:00:00Z",
    entitlements: [],
    signature: "ed25519:test"
  };
}

function processedWebhookRecord(): CommercialProcessedWebhookRecord {
  return {
    gateway: "paddle",
    gateway_event_id: "evt_postgres_01",
    gateway_event_type: "transaction.completed",
    gateway_object_id: "txn_postgres_01",
    gateway_customer_id: "ctm_postgres_01",
    gateway_subscription_id: "sub_postgres_01",
    processed_at: "2026-05-21T12:00:01Z",
    result_status: "license_issued",
    license_id: "license_paddle_txn_postgres_01"
  };
}

describe("Postgres commercial license repository", () => {
  it("runs the commercial PostgreSQL schema migration statements", async () => {
    const client = new FakePostgresClient();

    await runCommercialPostgresMigrations(client);

    expect(client.statements).toHaveLength(COMMERCIAL_POSTGRES_SCHEMA_SQL.length);
    expect(client.statements[0]).toContain("CREATE TABLE IF NOT EXISTS commercial_licenses");
    expect(client.statements[1]).toContain("CREATE TABLE IF NOT EXISTS commercial_processed_webhooks");
  });

  it("persists issued licenses and processed webhooks transactionally", async () => {
    const client = new FakePostgresClient();
    const repository = new PostgresCommercialLicenseRepository(client);

    await repository.saveProcessedWebhook(processedWebhookRecord(), license());

    expect(client.transactionCount).toBe(1);
    expect(await repository.hasProcessedWebhook("evt_postgres_01")).toBe(true);
    expect(await repository.findLicenseById("license_paddle_txn_postgres_01")).toEqual(license());
    expect(await repository.findLicenseByGatewayObject("txn_postgres_01")).toEqual(license());
    expect(await repository.listLicenses()).toEqual([license()]);
    expect(await repository.listProcessedWebhooks()).toEqual([processedWebhookRecord()]);
  });

  it("stores ignored webhooks without creating a license", async () => {
    const client = new FakePostgresClient();
    const repository = new PostgresCommercialLicenseRepository(client);
    const ignoredRecord: CommercialProcessedWebhookRecord = {
      ...processedWebhookRecord(),
      gateway_event_id: "evt_postgres_ignored",
      gateway_object_id: "txn_postgres_ignored",
      result_status: "ignored",
      license_id: null
    };

    await repository.saveProcessedWebhook(ignoredRecord, null);

    expect(await repository.listLicenses()).toEqual([]);
    expect(await repository.listProcessedWebhooks()).toEqual([ignoredRecord]);
  });
});
