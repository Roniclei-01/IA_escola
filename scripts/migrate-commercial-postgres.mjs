import { Pool } from "pg";

const schemaStatements = [
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

const connectionString = process.env.COMMERCIAL_DATABASE_URL || process.env.DATABASE_URL;

if (!connectionString?.trim().startsWith("postgres")) {
  console.error("[fail] Configure COMMERCIAL_DATABASE_URL ou DATABASE_URL com PostgreSQL.");
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: sslConfigFromEnvironment(process.env.COMMERCIAL_DATABASE_SSL),
  max: positiveIntegerFromEnvironment(process.env.COMMERCIAL_DATABASE_POOL_MAX)
});

try {
  for (const statement of schemaStatements) {
    await pool.query(statement);
  }

  console.log("[ok] Schema comercial PostgreSQL aplicado.");
} finally {
  await pool.end();
}

function sslConfigFromEnvironment(value) {
  const normalized = value?.trim().toLowerCase();

  if (!normalized || ["0", "false", "off", "disable", "disabled"].includes(normalized)) {
    return undefined;
  }

  if (["no-verify", "allow-invalid", "insecure"].includes(normalized)) {
    return { rejectUnauthorized: false };
  }

  return { rejectUnauthorized: true };
}

function positiveIntegerFromEnvironment(value) {
  if (value === undefined || value.trim() === "") {
    return undefined;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    console.error("[fail] COMMERCIAL_DATABASE_POOL_MAX deve ser um inteiro positivo.");
    process.exit(1);
  }

  return parsed;
}
