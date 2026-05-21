import { createCommercialFetchHandler, type CommercialFetchHandler } from "./license-fetch-adapter";
import { CommercialLicenseBackend } from "./license-backend";
import { Ed25519CommercialLicenseSigner } from "./license-ed25519-signer";
import { JsonFileCommercialSnapshotStore } from "./license-file-snapshot-store";
import { PersistentCommercialLicenseRepository } from "./license-persistent-repository";
import { PaddleSignatureVerifier } from "./paddle-signature-verifier";

export interface CommercialRuntimeEnvironment {
  COMMERCIAL_LICENSE_PRIVATE_KEY_PEM?: string;
  COMMERCIAL_LICENSE_STORE_PATH?: string;
  PADDLE_WEBHOOK_SECRET_KEY?: string;
  PADDLE_WEBHOOK_TOLERANCE_SECONDS?: string;
}

export interface CommercialRuntimeOptions {
  now?: () => number;
}

export function createCommercialRuntimeFetchHandler(
  environment: CommercialRuntimeEnvironment,
  options: CommercialRuntimeOptions = {}
): CommercialFetchHandler {
  return createCommercialFetchHandler(createCommercialRuntimeDependencies(environment, options));
}

export function createCommercialRuntimeDependencies(
  environment: CommercialRuntimeEnvironment,
  options: CommercialRuntimeOptions = {}
) {
  const config = commercialRuntimeConfig(environment);
  const store = new JsonFileCommercialSnapshotStore(config.storePath);
  const repository = new PersistentCommercialLicenseRepository(store);
  const signer = Ed25519CommercialLicenseSigner.fromPrivateKeyPem(config.privateKeyPem);
  const paddleVerifier = new PaddleSignatureVerifier({
    secretKey: config.paddleWebhookSecretKey,
    toleranceSeconds: config.paddleWebhookToleranceSeconds,
    now: options.now
  });

  return {
    backend: new CommercialLicenseBackend(repository, signer),
    paddleVerifier
  };
}

export function commercialRuntimeConfig(environment: CommercialRuntimeEnvironment) {
  const privateKeyPem = requiredEnvironmentValue(
    environment,
    "COMMERCIAL_LICENSE_PRIVATE_KEY_PEM"
  );
  const storePath = requiredEnvironmentValue(environment, "COMMERCIAL_LICENSE_STORE_PATH");
  const paddleWebhookSecretKey = requiredEnvironmentValue(
    environment,
    "PADDLE_WEBHOOK_SECRET_KEY"
  );

  return {
    privateKeyPem,
    storePath,
    paddleWebhookSecretKey,
    paddleWebhookToleranceSeconds: optionalPositiveInteger(
      environment.PADDLE_WEBHOOK_TOLERANCE_SECONDS,
      "PADDLE_WEBHOOK_TOLERANCE_SECONDS"
    )
  };
}

function requiredEnvironmentValue(
  environment: CommercialRuntimeEnvironment,
  key: keyof CommercialRuntimeEnvironment
): string {
  const value = environment[key]?.trim();

  if (!value) {
    throw new Error(`${key} is required for the commercial runtime`);
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
