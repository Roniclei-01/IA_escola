import { describe, expect, it } from "vitest";
import {
  PgCommercialClient,
  pgCommercialClientConfigFromEnvironment,
  pgCommercialSslConfigFromEnvironment,
  type PgCommercialPool,
  type PgCommercialPoolClient
} from "./pg-commercial-client";
import type { PostgresQueryResult } from "./license-postgres-repository";

class FakePgPool implements PgCommercialPool {
  readonly directQueries: Array<{ sql: string; params: readonly unknown[] }> = [];
  readonly client = new FakePgPoolClient();
  closed = false;

  async query<Row = Record<string, unknown>>(
    sql: string,
    params: readonly unknown[] = []
  ): Promise<PostgresQueryResult<Row>> {
    this.directQueries.push({ sql, params });
    return { rows: [{ ok: true }] as Row[] };
  }

  async connect(): Promise<PgCommercialPoolClient> {
    return this.client;
  }

  async end(): Promise<void> {
    this.closed = true;
  }
}

class FakePgPoolClient implements PgCommercialPoolClient {
  readonly queries: Array<{ sql: string; params: readonly unknown[] }> = [];
  released = false;

  async query<Row = Record<string, unknown>>(
    sql: string,
    params: readonly unknown[] = []
  ): Promise<PostgresQueryResult<Row>> {
    this.queries.push({ sql, params });
    return { rows: [] as Row[] };
  }

  release(): void {
    this.released = true;
  }
}

describe("PgCommercialClient", () => {
  it("delegates direct queries to the pg pool", async () => {
    const pool = new FakePgPool();
    const client = new PgCommercialClient(pool);

    await expect(client.query("SELECT $1", ["value"])).resolves.toEqual({
      rows: [{ ok: true }]
    });

    expect(pool.directQueries).toEqual([{ sql: "SELECT $1", params: ["value"] }]);
  });

  it("runs callbacks inside a BEGIN/COMMIT transaction", async () => {
    const pool = new FakePgPool();
    const client = new PgCommercialClient(pool);

    await expect(
      client.transaction(async (transaction) => {
        await transaction.query("INSERT INTO commercial_licenses VALUES ($1)", ["license_01"]);
        return "done";
      })
    ).resolves.toBe("done");

    expect(pool.client.queries).toEqual([
      { sql: "BEGIN", params: [] },
      { sql: "INSERT INTO commercial_licenses VALUES ($1)", params: ["license_01"] },
      { sql: "COMMIT", params: [] }
    ]);
    expect(pool.client.released).toBe(true);
  });

  it("rolls back and releases the client when the transaction fails", async () => {
    const pool = new FakePgPool();
    const client = new PgCommercialClient(pool);

    await expect(
      client.transaction(async () => {
        throw new Error("boom");
      })
    ).rejects.toThrow("boom");

    expect(pool.client.queries).toEqual([
      { sql: "BEGIN", params: [] },
      { sql: "ROLLBACK", params: [] }
    ]);
    expect(pool.client.released).toBe(true);
  });

  it("closes the underlying pg pool", async () => {
    const pool = new FakePgPool();
    const client = new PgCommercialClient(pool);

    await client.close();

    expect(pool.closed).toBe(true);
  });
});

describe("pg commercial environment config", () => {
  it("uses COMMERCIAL_DATABASE_URL before DATABASE_URL", () => {
    expect(
      pgCommercialClientConfigFromEnvironment({
        COMMERCIAL_DATABASE_URL: "postgres://commercial",
        DATABASE_URL: "postgres://fallback"
      }).connectionString
    ).toBe("postgres://commercial");
  });

  it("falls back to DATABASE_URL", () => {
    expect(
      pgCommercialClientConfigFromEnvironment({
        DATABASE_URL: "postgres://fallback"
      }).connectionString
    ).toBe("postgres://fallback");
  });

  it("parses SSL and pool size options", () => {
    expect(
      pgCommercialClientConfigFromEnvironment({
        COMMERCIAL_DATABASE_URL: "postgres://commercial",
        COMMERCIAL_DATABASE_SSL: "no-verify",
        COMMERCIAL_DATABASE_POOL_MAX: "4"
      })
    ).toEqual({
      connectionString: "postgres://commercial",
      ssl: { rejectUnauthorized: false },
      max: 4
    });
  });

  it("rejects missing or invalid connection strings", () => {
    expect(() => pgCommercialClientConfigFromEnvironment({})).toThrow(
      "COMMERCIAL_DATABASE_URL or DATABASE_URL must be a PostgreSQL connection string"
    );
    expect(() =>
      pgCommercialClientConfigFromEnvironment({ COMMERCIAL_DATABASE_URL: "sqlite://local" })
    ).toThrow("COMMERCIAL_DATABASE_URL or DATABASE_URL must be a PostgreSQL connection string");
  });

  it("maps SSL modes for hosted PostgreSQL providers", () => {
    expect(pgCommercialSslConfigFromEnvironment()).toBeUndefined();
    expect(pgCommercialSslConfigFromEnvironment("false")).toBeUndefined();
    expect(pgCommercialSslConfigFromEnvironment("true")).toEqual({
      rejectUnauthorized: true
    });
    expect(pgCommercialSslConfigFromEnvironment("insecure")).toEqual({
      rejectUnauthorized: false
    });
  });
});
