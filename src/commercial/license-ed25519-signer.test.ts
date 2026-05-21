import { describe, expect, it } from "vitest";
import { canonicalLicensePayload, type CommercialLicense } from "./license-backend";
import {
  COMMERCIAL_LICENSE_SIGNATURE_PREFIX,
  Ed25519CommercialLicenseSigner,
  verifyCommercialEd25519LicenseSignature
} from "./license-ed25519-signer";

const testPrivateKeyPem = `-----BEGIN PRIVATE KEY-----
MC4CAQAwBQYDK2VwBCIEIJwzoyZr1e6ue8L7J4c3S9qkWzlkOv4NCCpcplkvrqRU
-----END PRIVATE KEY-----
`;

const testPublicKeyPem = `-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEAF+Ksfsj/yWaxljAtTozH/4a6W361PQOEDieKpres/TM=
-----END PUBLIC KEY-----
`;

function unsignedLicense(): Omit<CommercialLicense, "signature"> {
  return {
    id: "license-1",
    plan: "pro",
    customer_email_hash: "email-hash",
    issued_at: "2026-05-20T00:00:00Z",
    expires_at: "2099-01-01T00:00:00Z",
    entitlements: [
      {
        key: "cards.generate.multiple_choice",
        limit: 200,
        expires_at: null
      }
    ]
  };
}

describe("Ed25519 commercial license signer", () => {
  it("signs licenses with a real asymmetric Ed25519 signature", () => {
    const signer = Ed25519CommercialLicenseSigner.fromPrivateKeyPem(testPrivateKeyPem);
    const license = unsignedLicense();
    const signature = signer.sign(canonicalLicensePayload(license));

    expect(signature).toMatch(new RegExp(`^${COMMERCIAL_LICENSE_SIGNATURE_PREFIX}`));
    expect(
      verifyCommercialEd25519LicenseSignature(
        {
          ...license,
          signature
        },
        testPublicKeyPem
      )
    ).toBe(true);
  });

  it("rejects a signature when the signed payload is changed", () => {
    const signer = Ed25519CommercialLicenseSigner.fromPrivateKeyPem(testPrivateKeyPem);
    const license = unsignedLicense();
    const signature = signer.sign(canonicalLicensePayload(license));

    expect(
      verifyCommercialEd25519LicenseSignature(
        {
          ...license,
          customer_email_hash: "other-email-hash",
          signature
        },
        testPublicKeyPem
      )
    ).toBe(false);
  });
});
