import { Pool, type PoolConfig } from "pg";
import {
  commercialPostgresConnectionStringIsConfigured,
  type PostgresQueryExecutor,
  type PostgresQueryResult,
  type PostgresTransactionExecutor
} from "./license-postgres-repository";

export interface PgCommercialEnvironment {
  COMMERCIAL_DATABASE_URL?: string;
  DATABASE_URL?: string;
  COMMERCIAL_DATABASE_SSL?: string;
  COMMERCIAL_DATABASE_POOL_MAX?: string;
}

export interface PgCommercialPoolClient {
  query<Row = Record<string, unknown>>(
    sql: string,
    params?: readonly unknown[]
  ): Promise<PostgresQueryResult<Row>>;
  release(): void;
}

export interface PgCommercialPool {
  query<Row = Record<string, unknown>>(
    sql: string,
    params?: readonly unknown[]
  ): Promise<PostgresQueryResult<Row>>;
  connect(): Promise<PgCommercialPoolClient>;
  end(): Promise<void>;
}

export interface PgCommercialClientConfig {
  connectionString: string;
  ssl?: boolean | { rejectUnauthorized: boolean };
  max?: number;
}

export class PgCommercialClient implements PostgresTransactionExecutor {
  constructor(private readonly pool: PgCommercialPool) {}

  static fromConfig(config: PgCommercialClientConfig): PgCommercialClient {
    const poolConfig: PoolConfig = {
      connectionString: config.connectionString,
      ssl: config.ssl,
      max: config.max
    };

    return new PgCommercialClient(new Pool(poolConfig));
  }

  static fromEnvironment(environment: PgCommercialEnvironment): PgCommercialClient {
    return PgCommercialClient.fromConfig(pgCommercialClientConfigFromEnvironment(environment));
  }

  async query<Row = Record<string, unknown>>(
    sql: string,
    params: readonly unknown[] = []
  ): Promise<PostgresQueryResult<Row>> {
    return this.pool.query<Row>(sql, [...params]);
  }

  async transaction<Result>(
    callback: (client: PostgresQueryExecutor) => Promise<Result>
  ): Promise<Result> {
    const client = await this.pool.connect();

    try {
      await client.query("BEGIN");
      const result = await callback({
        query: (sql, params = []) => client.query(sql, [...params])
      });
      await client.query("COMMIT");

      return result;
    } catch (error) {
      await rollbackTransaction(client);
      throw error;
    } finally {
      client.release();
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}

export function pgCommercialClientConfigFromEnvironment(
  environment: PgCommercialEnvironment
): PgCommercialClientConfig {
  const connectionString =
    environment.COMMERCIAL_DATABASE_URL?.trim() || environment.DATABASE_URL?.trim();

  if (!connectionString || !commercialPostgresConnectionStringIsConfigured(connectionString)) {
    throw new Error(
      "COMMERCIAL_DATABASE_URL or DATABASE_URL must be a PostgreSQL connection string"
    );
  }

  return {
    connectionString,
    ssl: pgCommercialSslConfigFromEnvironment(environment.COMMERCIAL_DATABASE_SSL),
    max: optionalPositiveInteger(
      environment.COMMERCIAL_DATABASE_POOL_MAX,
      "COMMERCIAL_DATABASE_POOL_MAX"
    )
  };
}

export function pgCommercialSslConfigFromEnvironment(
  value?: string | null
): boolean | { rejectUnauthorized: boolean } | undefined {
  const normalized = value?.trim().toLowerCase();

  if (!normalized || ["0", "false", "off", "disable", "disabled"].includes(normalized)) {
    return undefined;
  }

  if (["no-verify", "allow-invalid", "insecure"].includes(normalized)) {
    return { rejectUnauthorized: false };
  }

  return { rejectUnauthorized: true };
}

async function rollbackTransaction(client: PgCommercialPoolClient): Promise<void> {
  try {
    await client.query("ROLLBACK");
  } catch {
    // Preserve the original transaction error. Rollback errors are secondary here.
  }
}

function optionalPositiveInteger(value: string | undefined, key: string): number | undefined {
  if (value === undefined || value.trim() === "") {
    return undefined;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${key} must be a positive integer`);
  }

  return parsed;
}
