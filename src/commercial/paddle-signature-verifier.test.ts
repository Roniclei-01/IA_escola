import { describe, expect, it } from "vitest";
import {
  createPaddleSignatureHeader,
  PaddleSignatureVerifier
} from "./paddle-signature-verifier";

const secretKey = "pdl_ntfset_test_secret";
const rawBody = JSON.stringify({
  event_id: "evt_01",
  data: {
    id: "txn_01"
  }
});

describe("Paddle signature verifier", () => {
  it("accepts a valid Paddle signature for the exact raw body", () => {
    const timestamp = 1_800_000_000;
    const verifier = new PaddleSignatureVerifier({
      secretKey,
      now: () => timestamp
    });

    expect(verifier.verify(rawBody, createPaddleSignatureHeader(rawBody, secretKey, timestamp))).toBe(
      true
    );
  });

  it("rejects a signature when the raw body changes", () => {
    const timestamp = 1_800_000_000;
    const verifier = new PaddleSignatureVerifier({
      secretKey,
      now: () => timestamp
    });

    expect(
      verifier.verify(`${rawBody}\n`, createPaddleSignatureHeader(rawBody, secretKey, timestamp))
    ).toBe(false);
  });

  it("rejects signatures outside the timestamp tolerance", () => {
    const timestamp = 1_800_000_000;
    const verifier = new PaddleSignatureVerifier({
      secretKey,
      toleranceSeconds: 5,
      now: () => timestamp + 6
    });

    expect(verifier.verify(rawBody, createPaddleSignatureHeader(rawBody, secretKey, timestamp))).toBe(
      false
    );
  });

  it("rejects malformed signature headers", () => {
    const verifier = new PaddleSignatureVerifier({
      secretKey,
      now: () => 1_800_000_000
    });

    expect(verifier.verify(rawBody, "h1=abc")).toBe(false);
  });
});
