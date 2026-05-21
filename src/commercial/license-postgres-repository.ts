import type { AsyncCommercialLicenseRepository } from "./license-async-backend";
import type {
  CommercialGateway,
  CommercialLicense,
  CommercialProcessedWebhookRecord,
  CommercialProcessedWebhookResultStatus
} from "./license-backend";

export interface PostgresQueryResult<Row> {
  rows: Row[];
}

export interface PostgresQueryExecutor {
  query<Row = Record<string, unknown>>(
    sql: string,
    params?: readonly unknown[]
  ): Promise<PostgresQueryResult<Row>>;
}

export interface PostgresTransactionExecutor extends PostgresQueryExecutor {
  transaction<Result>(callback: (client: PostgresQueryExecutor) => Promise<Result>): Promise<Result>;
}

export const COMMERCIAL_POSTGRES_SCHEMA_SQL = [
  `CREATE TABLE IF NOT EXISTS commercial_licenses (
    id TEXT PRIMARY KEY,
    gateway TEXT NOT NULL,
    gateway_object_id TEXT NOT NULL UNIQUE,
    customer_email_hash TEXT NOT NULL,
    plan TEXT NOT NULL CHECK (plan IN ('pro', 'lifetime')),
    issued_at TIMESTAMPTZ NOT NULL,
    expires_at TIMESTAMPTZ,
    license_payload JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS commercial_processed_webhooks (
    gateway_event_id TEXT PRIMARY KEY,
    gateway TEXT NOT NULL,
    gateway_event_type TEXT NOT NULL,
    gateway_object_id TEXT NOT NULL,
    gateway_customer_id TEXT NOT NULL,
    gateway_subscription_id TEXT,
    processed_at TIMESTAMPTZ NOT NULL,
    result_status TEXT NOT NULL CHECK (result_status IN ('license_issued', 'ignored')),
    license_id TEXT REFERENCES commercial_licenses(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_commercial_licenses_gateway_object
    ON commercial_licenses (gateway, gateway_object_id)`,
  `CREATE INDEX IF NOT EXISTS idx_commercial_processed_webhooks_license
    ON commercial_processed_webhooks (license_id)`
];

interface LicensePayloadRow {
  license_payload: CommercialLicense | string;
}

interface ProcessedWebhookRow {
  gateway: CommercialGateway;
  gateway_event_id: string;
  gateway_event_type: string;
  gateway_object_id: string;
  gateway_customer_id: string;
  gateway_subscription_id: string | null;
  processed_at: string | Date;
  result_status: CommercialProcessedWebhookResultStatus;
  license_id: string | null;
}

export class PostgresCommercialLicenseRepository implements AsyncCommercialLicenseRepository {
  constructor(private readonly client: PostgresTransactionExecutor) {}

  async hasProcessedWebhook(eventId: string): Promise<boolean> {
    const result = await this.client.query<{ exists: number }>(
      `SELECT 1 AS exists
       FROM commercial_processed_webhooks
       WHERE gateway_event_id = $1
       LIMIT 1`,
      [eventId]
    );

    return result.rows.length > 0;
  }

  async findLicenseByGatewayObject(gatewayObjectId: string): Promise<CommercialLicense | null> {
    const result = await this.client.query<LicensePayloadRow>(
      `SELECT license_payload
       FROM commercial_licenses
       WHERE gateway_object_id = $1
       LIMIT 1`,
      [gatewayObjectId]
    );

    return rowToLicense(result.rows[0]);
  }

  async findLicenseById(licenseId: string): Promise<CommercialLicense | null> {
    const result = await this.client.query<LicensePayloadRow>(
      `SELECT license_payload
       FROM commercial_licenses
       WHERE id = $1
       LIMIT 1`,
      [licenseId]
    );

    return rowToLicense(result.rows[0]);
  }

  async saveProcessedWebhook(
    record: CommercialProcessedWebhookRecord,
    license?: CommercialLicense | null
  ): Promise<void> {
    await this.client.transaction(async (transaction) => {
      if (license) {
        await saveLicense(transaction, record, license);
      }

      await saveProcessedWebhook(transaction, record);
    });
  }

  async listLicenses(): Promise<CommercialLicense[]> {
    const result = await this.client.query<LicensePayloadRow>(
      `SELECT license_payload
       FROM commercial_licenses
       ORDER BY issued_at ASC, id ASC`
    );

    return result.rows.map(rowToLicense).filter((license): license is CommercialLicense => !!license);
  }

  async listProcessedWebhooks(): Promise<CommercialProcessedWebhookRecord[]> {
    const result = await this.client.query<ProcessedWebhookRow>(
      `SELECT gateway,
              gateway_event_id,
              gateway_event_type,
              gateway_object_id,
              gateway_customer_id,
              gateway_subscription_id,
              processed_at,
              result_status,
              license_id
       FROM commercial_processed_webhooks
       ORDER BY processed_at ASC, gateway_event_id ASC`
    );

    return result.rows.map(rowToProcessedWebhook);
  }
}

export async function runCommercialPostgresMigrations(client: PostgresQueryExecutor): Promise<void> {
  for (const statement of COMMERCIAL_POSTGRES_SCHEMA_SQL) {
    await client.query(statement);
  }
}

async function saveLicense(
  client: PostgresQueryExecutor,
  record: CommercialProcessedWebhookRecord,
  license: CommercialLicense
): Promise<void> {
  await client.query(
    `INSERT INTO commercial_licenses (
       id,
       gateway,
       gateway_object_id,
       customer_email_hash,
       plan,
       issued_at,
       expires_at,
       license_payload,
       updated_at
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, now())
     ON CONFLICT (id)
     DO UPDATE SET
       gateway = EXCLUDED.gateway,
       gateway_object_id = EXCLUDED.gateway_object_id,
       customer_email_hash = EXCLUDED.customer_email_hash,
       plan = EXCLUDED.plan,
       issued_at = EXCLUDED.issued_at,
       expires_at = EXCLUDED.expires_at,
       license_payload = EXCLUDED.license_payload,
       updated_at = now()`,
    [
      license.id,
      record.gateway,
      record.gateway_object_id,
      license.customer_email_hash,
      license.plan,
      license.issued_at,
      license.expires_at ?? null,
      license
    ]
  );
}

async function saveProcessedWebhook(
  client: PostgresQueryExecutor,
  record: CommercialProcessedWebhookRecord
): Promise<void> {
  await client.query(
    `INSERT INTO commercial_processed_webhooks (
       gateway_event_id,
       gateway,
       gateway_event_type,
       gateway_object_id,
       gateway_customer_id,
       gateway_subscription_id,
       processed_at,
       result_status,
       license_id
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     ON CONFLICT (gateway_event_id) DO NOTHING`,
    [
      record.gateway_event_id,
      record.gateway,
      record.gateway_event_type,
      record.gateway_object_id,
      record.gateway_customer_id,
      record.gateway_subscription_id ?? null,
      record.processed_at,
      record.result_status,
      record.license_id ?? null
    ]
  );
}

function rowToLicense(row: LicensePayloadRow | undefined): CommercialLicense | null {
  if (!row) {
    return null;
  }

  return typeof row.license_payload === "string"
    ? (JSON.parse(row.license_payload) as CommercialLicense)
    : row.license_payload;
}

function rowToProcessedWebhook(row: ProcessedWebhookRow): CommercialProcessedWebhookRecord {
  return {
    gateway: row.gateway,
    gateway_event_id: row.gateway_event_id,
    gateway_event_type: row.gateway_event_type,
    gateway_object_id: row.gateway_object_id,
    gateway_customer_id: row.gateway_customer_id,
    gateway_subscription_id: row.gateway_subscription_id,
    processed_at:
      row.processed_at instanceof Date ? row.processed_at.toISOString() : row.processed_at,
    result_status: row.result_status,
    license_id: row.license_id
  };
}

export function commercialPostgresConnectionStringIsConfigured(value?: string | null): boolean {
  return typeof value === "string" && value.trim().startsWith("postgres");
}
