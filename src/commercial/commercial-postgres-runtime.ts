import {
  createCommercialAsyncFetchHandler,
  type CommercialAsyncFetchHandler
} from "./license-async-fetch-adapter";
import { AsyncCommercialLicenseBackend } from "./license-async-backend";
import type { CommercialRuntimeEnvironment, CommercialRuntimeOptions } from "./commercial-runtime";
import { Ed25519CommercialLicenseSigner } from "./license-ed25519-signer";
import {
  PostgresCommercialLicenseRepository,
  type PostgresTransactionExecutor
} from "./license-postgres-repository";
import { PaddleSignatureVerifier } from "./paddle-signature-verifier";

export function createCommercialPostgresRuntimeFetchHandler(
  environment: CommercialRuntimeEnvironment,
  postgresClient: PostgresTransactionExecutor,
  options: CommercialRuntimeOptions = {}
): CommercialAsyncFetchHandler {
  return createCommercialAsyncFetchHandler(
    createCommercialPostgresRuntimeDependencies(environment, postgresClient, options)
  );
}

export function createCommercialPostgresRuntimeDependencies(
  environment: CommercialRuntimeEnvironment,
  postgresClient: PostgresTransactionExecutor,
  options: CommercialRuntimeOptions = {}
) {
  const privateKeyPem = requiredEnvironmentValue(
    environment,
    "COMMERCIAL_LICENSE_PRIVATE_KEY_PEM"
  );
  const paddleWebhookSecretKey = requiredEnvironmentValue(
    environment,
    "PADDLE_WEBHOOK_SECRET_KEY"
  );
  const signer = Ed25519CommercialLicenseSigner.fromPrivateKeyPem(privateKeyPem);
  const repository = new PostgresCommercialLicenseRepository(postgresClient);
  const paddleVerifier = new PaddleSignatureVerifier({
    secretKey: paddleWebhookSecretKey,
    toleranceSeconds: optionalPositiveInteger(
      environment.PADDLE_WEBHOOK_TOLERANCE_SECONDS,
      "PADDLE_WEBHOOK_TOLERANCE_SECONDS"
    ),
    now: options.now
  });

  return {
    backend: new AsyncCommercialLicenseBackend(repository, signer),
    paddleVerifier
  };
}

function requiredEnvironmentValue(
  environment: CommercialRuntimeEnvironment,
  key: keyof CommercialRuntimeEnvironment
): string {
  const value = environment[key]?.trim();

  if (!value) {
    throw new Error(`${key} is required for the commercial PostgreSQL runtime`);
  }

  return value;
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
