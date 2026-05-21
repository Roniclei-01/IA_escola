import {
  buildCommercialLicense,
  buildProcessedWebhookRecord,
  canonicalLicensePayload,
  normalizePaddleWebhookPayload,
  type CommercialActivationRequest,
  type CommercialActivationResult,
  type CommercialLicense,
  type CommercialLicenseSigner,
  type CommercialProcessedWebhookRecord,
  type CommercialWebhookEvent,
  type CommercialWebhookResult,
  type WebhookSignatureVerifier
} from "./license-backend";

export interface AsyncCommercialLicenseRepository {
  hasProcessedWebhook(eventId: string): Promise<boolean>;
  findLicenseByGatewayObject(gatewayObjectId: string): Promise<CommercialLicense | null>;
  findLicenseById(licenseId: string): Promise<CommercialLicense | null>;
  saveProcessedWebhook(
    record: CommercialProcessedWebhookRecord,
    license?: CommercialLicense | null
  ): Promise<void>;
  listLicenses(): Promise<CommercialLicense[]>;
  listProcessedWebhooks(): Promise<CommercialProcessedWebhookRecord[]>;
}

export class AsyncCommercialLicenseBackend {
  constructor(
    private readonly repository: AsyncCommercialLicenseRepository,
    private readonly signer: CommercialLicenseSigner
  ) {}

  async processWebhook(event: CommercialWebhookEvent): Promise<CommercialWebhookResult> {
    if (await this.repository.hasProcessedWebhook(event.gateway_event_id)) {
      return {
        status: "duplicate",
        event,
        license: await this.repository.findLicenseByGatewayObject(event.gateway_object_id)
      };
    }

    if (event.status !== "paid") {
      await this.repository.saveProcessedWebhook(buildProcessedWebhookRecord(event, "ignored", null));

      return {
        status: "ignored",
        event,
        license: null
      };
    }

    const unsignedLicense = buildCommercialLicense(event);
    const license = {
      ...unsignedLicense,
      signature: this.signer.sign(canonicalLicensePayload(unsignedLicense))
    };

    await this.repository.saveProcessedWebhook(
      buildProcessedWebhookRecord(event, "license_issued", license.id),
      license
    );

    return {
      status: "license_issued",
      event,
      license
    };
  }

  async activateLicense(request: CommercialActivationRequest): Promise<CommercialActivationResult> {
    const licenseId = optionalString(request.license_id);
    const gatewayObjectId = optionalString(request.gateway_object_id);
    const license =
      licenseId !== null
        ? await this.repository.findLicenseById(licenseId)
        : gatewayObjectId !== null
          ? await this.repository.findLicenseByGatewayObject(gatewayObjectId)
          : null;

    if (!license) {
      return {
        status: "not_found",
        license: null
      };
    }

    const customerEmailHash = optionalString(request.customer_email_hash);
    if (customerEmailHash && customerEmailHash !== license.customer_email_hash) {
      return {
        status: "customer_mismatch",
        license: null
      };
    }

    return {
      status: "activated",
      license
    };
  }
}

export async function handlePaddleWebhookAsync(
  rawBody: string,
  signatureHeader: string,
  verifier: WebhookSignatureVerifier,
  backend: AsyncCommercialLicenseBackend
): Promise<CommercialWebhookResult> {
  if (!verifier.verify(rawBody, signatureHeader)) {
    return {
      status: "rejected_invalid_signature",
      license: null
    };
  }

  try {
    return await backend.processWebhook(normalizePaddleWebhookPayload(JSON.parse(rawBody)));
  } catch {
    return {
      status: "invalid_payload",
      license: null
    };
  }
}

function optionalString(value: unknown): string | null {
  if (typeof value !== "string" || value.trim().length === 0) {
    return null;
  }

  return value.trim();
}
