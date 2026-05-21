import type {
  CommercialLicense,
  CommercialLicenseRepository,
  CommercialProcessedWebhookRecord
} from "./license-backend";

export interface CommercialLicenseRepositorySnapshot {
  processed_webhooks: CommercialProcessedWebhookRecord[];
  licenses: Array<{
    gateway_object_id: string;
    license: CommercialLicense;
  }>;
}

export interface CommercialLicenseRepositorySnapshotStore {
  load(): CommercialLicenseRepositorySnapshot | null;
  save(snapshot: CommercialLicenseRepositorySnapshot): void;
}

export class PersistentCommercialLicenseRepository implements CommercialLicenseRepository {
  private readonly processedWebhookRecords = new Map<string, CommercialProcessedWebhookRecord>();
  private readonly licensesByObjectId = new Map<string, CommercialLicense>();
  private readonly objectIdsByLicenseId = new Map<string, string>();

  constructor(private readonly store: CommercialLicenseRepositorySnapshotStore) {
    const snapshot = store.load();

    if (!snapshot) {
      return;
    }

    for (const record of snapshot.processed_webhooks) {
      this.processedWebhookRecords.set(record.gateway_event_id, record);
    }

    for (const entry of snapshot.licenses) {
      this.licensesByObjectId.set(entry.gateway_object_id, entry.license);
      this.objectIdsByLicenseId.set(entry.license.id, entry.gateway_object_id);
    }
  }

  hasProcessedWebhook(eventId: string): boolean {
    return this.processedWebhookRecords.has(eventId);
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

    this.processedWebhookRecords.set(record.gateway_event_id, record);

    if (license) {
      this.licensesByObjectId.set(record.gateway_object_id, license);
      this.objectIdsByLicenseId.set(license.id, record.gateway_object_id);
    }

    this.persist();
  }

  listLicenses(): CommercialLicense[] {
    return [...this.licensesByObjectId.values()];
  }

  listProcessedWebhooks(): CommercialProcessedWebhookRecord[] {
    return [...this.processedWebhookRecords.values()];
  }

  private persist(): void {
    this.store.save({
      processed_webhooks: this.listProcessedWebhooks(),
      licenses: [...this.licensesByObjectId.entries()].map(([gatewayObjectId, license]) => ({
        gateway_object_id: gatewayObjectId,
        license
      }))
    });
  }
}
