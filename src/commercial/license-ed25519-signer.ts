import { createPrivateKey, createPublicKey, sign, verify, type KeyObject } from "node:crypto";
import {
  canonicalLicensePayload,
  type CommercialLicense,
  type CommercialLicenseSigner
} from "./license-backend";

export const COMMERCIAL_LICENSE_SIGNATURE_PREFIX = "ed25519:";

export class Ed25519CommercialLicenseSigner implements CommercialLicenseSigner {
  constructor(private readonly privateKey: KeyObject) {}

  static fromPrivateKeyPem(privateKeyPem: string): Ed25519CommercialLicenseSigner {
    return new Ed25519CommercialLicenseSigner(createPrivateKey(privateKeyPem));
  }

  sign(canonicalPayload: string): string {
    const signature = sign(null, new TextEncoder().encode(canonicalPayload), this.privateKey);

    return `${COMMERCIAL_LICENSE_SIGNATURE_PREFIX}${signature.toString("base64")}`;
  }
}

export function verifyCommercialEd25519LicenseSignature(
  license: CommercialLicense,
  publicKeyPem: string
): boolean {
  const signature = license.signature.trim();

  if (!signature.startsWith(COMMERCIAL_LICENSE_SIGNATURE_PREFIX)) {
    return false;
  }

  const signatureBytes = base64ToBytes(signature.slice(COMMERCIAL_LICENSE_SIGNATURE_PREFIX.length));
  const { signature: _signature, ...unsignedLicense } = license;
  const payload = canonicalLicensePayload(unsignedLicense);

  return verify(
    null,
    new TextEncoder().encode(payload),
    createPublicKey(publicKeyPem),
    signatureBytes
  );
}

function base64ToBytes(value: string): Uint8Array {
  const binary = globalThis.atob(value);

  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}
