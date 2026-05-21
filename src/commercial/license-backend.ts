export type CommercialGateway = "paddle";
export type CommercialPlan = "pro" | "lifetime";
export type CommercialWebhookStatus = "paid" | "inactive";
export type CommercialWebhookResultStatus =
  | "license_issued"
  | "duplicate"
  | "ignored"
  | "rejected_invalid_signature"
  | "invalid_payload";
export type CommercialActivationResultStatus =
  | "activated"
  | "not_found"
  | "customer_mismatch"
  | "invalid_request";

export interface CommercialLicenseEntitlement {
  key: string;
  limit?: number | null;
  expires_at?: string | null;
}

export interface CommercialLicense {
  id: string;
  plan: CommercialPlan;
  customer_email_hash: string;
  issued_at: string;
  expires_at?: string | null;
  entitlements: CommercialLicenseEntitlement[];
  signature: string;
}

export interface CommercialWebhookEvent {
  gateway: CommercialGateway;
  gateway_event_id: string;
  gateway_event_type: string;
  gateway_object_id: string;
  gateway_customer_id: string;
  gateway_subscription_id?: string | null;
  occurred_at: string;
  status: CommercialWebhookStatus;
  plan: CommercialPlan;
  customer_email_hash: string;
  expires_at?: string | null;
}

export interface PaddleWebhookPayload {
  event_id?: unknown;
  event_type?: unknown;
  occurred_at?: unknown;
  data?: {
    id?: unknown;
    status?: unknown;
    customer_id?: unknown;
    subscription_id?: unknown;
    custom_data?: Record<string, unknown> | null;
  };
}

export interface WebhookSignatureVerifier {
  verify(rawBody: string, signatureHeader: string): boolean;
}

export interface CommercialLicenseSigner {
  sign(canonicalPayload: string): string;
}

export interface CommercialWebhookResult {
  status: CommercialWebhookResultStatus;
  event?: CommercialWebhookEvent;
  license?: CommercialLicense | null;
}

export interface CommercialActivationRequest {
  license_id?: string | null;
  gateway_object_id?: string | null;
  customer_email_hash?: string | null;
}

export interface CommercialActivationResult {
  status: CommercialActivationResultStatus;
  license?: CommercialLicense | null;
}

export type CommercialProcessedWebhookResultStatus = "license_issued" | "ignored";

export interface CommercialProcessedWebhookRecord {
  gateway: CommercialGateway;
  gateway_event_id: string;
  gateway_event_type: string;
  gateway_object_id: string;
  gateway_customer_id: string;
  gateway_subscription_id?: string | null;
  processed_at: string;
  result_status: CommercialProcessedWebhookResultStatus;
  license_id?: string | null;
}

export interface CommercialLicenseRepository {
  hasProcessedWebhook(eventId: string): boolean;
  findLicenseByGatewayObject(gatewayObjectId: string): CommercialLicense | null;
  findLicenseById(licenseId: string): CommercialLicense | null;
  saveProcessedWebhook(
    record: CommercialProcessedWebhookRecord,
    license?: CommercialLicense | null
  ): void;
  listLicenses(): CommercialLicense[];
  listProcessedWebhooks(): CommercialProcessedWebhookRecord[];
}

export class InMemoryCommercialLicenseRepository implements CommercialLicenseRepository {
  private readonly processedEventIds = new Set<string>();
  private readonly processedWebhookRecords = new Map<string, CommercialProcessedWebhookRecord>();
  private readonly licensesByObjectId = new Map<string, CommercialLicense>();
  private readonly objectIdsByLicenseId = new Map<string, string>();

  hasProcessedWebhook(eventId: string): boolean {
    return this.processedEventIds.has(eventId);
  }

  findLicenseByGatewayObject(gatewayObjectId: string): CommercialLicense | null {
    return this.licensesByObjectId.get(gatewayObjectId) ?? null;
  }

  findLicenseById(licenseId: string): CommercialLicense | null {
    const objectId = this.objectIdsByLicenseId.get(licenseId);

    if (!objectId) {
      return null;
    }

    return this.findLicenseByGatewayObject(objectId);
  }

  saveProcessedWebhook(
    record: CommercialProcessedWebhookRecord,
    license?: CommercialLicense | null
  ): void {
    if (this.hasProcessedWebhook(record.gateway_event_id)) {
      return;
    }

    this.processedEventIds.add(record.gateway_event_id);
    this.processedWebhookRecords.set(record.gateway_event_id, record);

    if (license) {
      this.saveLicense(record.gateway_object_id, license);
    }
  }

  listLicenses(): CommercialLicense[] {
    return [...this.licensesByObjectId.values()];
  }

  listProcessedWebhooks(): CommercialProcessedWebhookRecord[] {
    return [...this.processedWebhookRecords.values()];
  }

  private saveLicense(gatewayObjectId: string, license: CommercialLicense): void {
    this.licensesByObjectId.set(gatewayObjectId, license);
    this.objectIdsByLicenseId.set(license.id, gatewayObjectId);
  }
}

export class CommercialLicenseBackend {
  constructor(
    private readonly repository: CommercialLicenseRepository,
    private readonly signer: CommercialLicenseSigner
  ) {}

  processWebhook(event: CommercialWebhookEvent): CommercialWebhookResult {
    if (this.repository.hasProcessedWebhook(event.gateway_event_id)) {
      return {
        status: "duplicate",
        event,
        license: this.repository.findLicenseByGatewayObject(event.gateway_object_id)
      };
    }

    if (event.status !== "paid") {
      this.repository.saveProcessedWebhook(buildProcessedWebhookRecord(event, "ignored", null));

      return {
        status: "ignored",
        event,
        license: null
      };
    }

    const unsignedLicense = buildCommercialLicense(event);
    const signature = this.signer.sign(canonicalLicensePayload(unsignedLicense));
    const license = {
      ...unsignedLicense,
      signature
    };

    this.repository.saveProcessedWebhook(
      buildProcessedWebhookRecord(event, "license_issued", license.id),
      license
    );

    return {
      status: "license_issued",
      event,
      license
    };
  }

  activateLicense(request: CommercialActivationRequest): CommercialActivationResult {
    const license =
      optionalString(request.license_id) !== null
        ? this.repository.findLicenseById(optionalString(request.license_id)!)
        : optionalString(request.gateway_object_id) !== null
          ? this.repository.findLicenseByGatewayObject(optionalString(request.gateway_object_id)!)
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

export function handlePaddleWebhook(
  rawBody: string,
  signatureHeader: string,
  verifier: WebhookSignatureVerifier,
  backend: CommercialLicenseBackend
): CommercialWebhookResult {
  if (!verifier.verify(rawBody, signatureHeader)) {
    return {
      status: "rejected_invalid_signature",
      license: null
    };
  }

  try {
    const payload = JSON.parse(rawBody) as PaddleWebhookPayload;
    return backend.processWebhook(normalizePaddleWebhookPayload(payload));
  } catch {
    return {
      status: "invalid_payload",
      license: null
    };
  }
}

export function normalizePaddleWebhookPayload(
  payload: PaddleWebhookPayload
): CommercialWebhookEvent {
  const eventId = requiredString(payload.event_id, "event_id");
  const eventType = requiredString(payload.event_type, "event_type");
  const occurredAt = requiredString(payload.occurred_at, "occurred_at");
  const data = payload.data ?? {};
  const objectId = requiredString(data.id, "data.id");
  const customData = data.custom_data ?? {};
  const plan = parseCommercialPlan(customData.plan);
  const customerEmailHash = requiredString(
    customData.customer_email_hash,
    "data.custom_data.customer_email_hash"
  );
  const customerId = optionalString(data.customer_id) ?? customerEmailHash;
  const subscriptionId = optionalString(data.subscription_id);

  return {
    gateway: "paddle",
    gateway_event_id: eventId,
    gateway_event_type: eventType,
    gateway_object_id: objectId,
    gateway_customer_id: customerId,
    gateway_subscription_id: subscriptionId,
    occurred_at: occurredAt,
    status: paddleEventIsPaid(eventType, optionalString(data.status)) ? "paid" : "inactive",
    plan,
    customer_email_hash: customerEmailHash,
    expires_at: optionalString(customData.expires_at)
  };
}

export function canonicalLicensePayload(license: Omit<CommercialLicense, "signature">): string {
  const entitlements = [...license.entitlements]
    .sort((left, right) => {
      const leftKey = `${left.key}:${left.limit ?? ""}:${left.expires_at ?? ""}`;
      const rightKey = `${right.key}:${right.limit ?? ""}:${right.expires_at ?? ""}`;

      if (leftKey < rightKey) {
        return -1;
      }
      if (leftKey > rightKey) {
        return 1;
      }

      return 0;
    })
    .map(
      (entitlement) =>
        `${entitlement.key.trim()}:${entitlement.limit ?? ""}:${entitlement.expires_at ?? ""}`
    )
    .join(",");

  return [
    license.id.trim(),
    license.plan,
    license.customer_email_hash.trim(),
    license.issued_at.trim(),
    license.expires_at ?? "",
    entitlements
  ].join("|");
}

export function buildCommercialLicense(
  event: CommercialWebhookEvent
): Omit<CommercialLicense, "signature"> {
  return {
    id: `license_${event.gateway}_${event.gateway_object_id}`,
    plan: event.plan,
    customer_email_hash: event.customer_email_hash,
    issued_at: event.occurred_at,
    expires_at: event.plan === "lifetime" ? null : event.expires_at ?? null,
    entitlements: entitlementsForPlan(event.plan, event.expires_at)
  };
}

export function buildProcessedWebhookRecord(
  event: CommercialWebhookEvent,
  resultStatus: CommercialProcessedWebhookResultStatus,
  licenseId: string | null
): CommercialProcessedWebhookRecord {
  return {
    gateway: event.gateway,
    gateway_event_id: event.gateway_event_id,
    gateway_event_type: event.gateway_event_type,
    gateway_object_id: event.gateway_object_id,
    gateway_customer_id: event.gateway_customer_id,
    gateway_subscription_id: event.gateway_subscription_id ?? null,
    processed_at: new Date().toISOString(),
    result_status: resultStatus,
    license_id: licenseId
  };
}

function entitlementsForPlan(
  plan: CommercialPlan,
  expiresAt?: string | null
): CommercialLicenseEntitlement[] {
  const entitlementExpiresAt = plan === "lifetime" ? null : expiresAt ?? null;

  return [
    {
      key: "cards.generate.multiple_choice",
      limit: plan === "lifetime" ? null : 500,
      expires_at: entitlementExpiresAt
    },
    {
      key: "export.anki.apkg",
      limit: null,
      expires_at: entitlementExpiresAt
    },
    {
      key: "export.report.pdf",
      limit: null,
      expires_at: entitlementExpiresAt
    }
  ];
}

function paddleEventIsPaid(eventType: string, status?: string | null): boolean {
  if (eventType === "transaction.completed") {
    return status === null || status === undefined || status === "completed";
  }

  if (eventType === "transaction.paid") {
    return status === null || status === undefined || status === "paid";
  }

  if (eventType === "subscription.activated" || eventType === "subscription.resumed") {
    return status === null || status === undefined || status === "active";
  }

  return false;
}

function parseCommercialPlan(value: unknown): CommercialPlan {
  if (value === "pro" || value === "lifetime") {
    return value;
  }

  throw new Error("invalid commercial plan");
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${field} is required`);
  }

  return value.trim();
}

function optionalString(value: unknown): string | null {
  if (typeof value !== "string" || value.trim().length === 0) {
    return null;
  }

  return value.trim();
}
