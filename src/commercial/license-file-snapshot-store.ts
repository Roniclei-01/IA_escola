import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type {
  CommercialLicenseRepositorySnapshot,
  CommercialLicenseRepositorySnapshotStore
} from "./license-persistent-repository";

export class JsonFileCommercialSnapshotStore implements CommercialLicenseRepositorySnapshotStore {
  constructor(private readonly filePath: string) {}

  load(): CommercialLicenseRepositorySnapshot | null {
    if (!existsSync(this.filePath)) {
      return null;
    }

    const rawSnapshot = readFileSync(this.filePath, "utf8").trim();

    if (!rawSnapshot) {
      return null;
    }

    return parseSnapshot(rawSnapshot);
  }

  save(snapshot: CommercialLicenseRepositorySnapshot): void {
    mkdirSync(dirname(this.filePath), { recursive: true });

    const temporaryPath = `${this.filePath}.tmp`;
    writeFileSync(temporaryPath, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
    renameSync(temporaryPath, this.filePath);
  }
}

function parseSnapshot(rawSnapshot: string): CommercialLicenseRepositorySnapshot {
  const parsed = JSON.parse(rawSnapshot) as CommercialLicenseRepositorySnapshot;

  if (!Array.isArray(parsed.processed_webhooks) || !Array.isArray(parsed.licenses)) {
    throw new Error("commercial license snapshot is invalid");
  }

  return parsed;
}
