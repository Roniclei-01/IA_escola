import { createHmac, timingSafeEqual } from "node:crypto";
import type { WebhookSignatureVerifier } from "./license-backend";

const DEFAULT_PADDLE_SIGNATURE_TOLERANCE_SECONDS = 5;

export interface PaddleSignatureVerifierOptions {
  secretKey: string;
  toleranceSeconds?: number;
  now?: () => number;
}

export class PaddleSignatureVerifier implements WebhookSignatureVerifier {
  private readonly secretKey: string;
  private readonly toleranceSeconds: number;
  private readonly now: () => number;

  constructor(options: PaddleSignatureVerifierOptions) {
    this.secretKey = options.secretKey.trim();
    this.toleranceSeconds =
      options.toleranceSeconds ?? DEFAULT_PADDLE_SIGNATURE_TOLERANCE_SECONDS;
    this.now = options.now ?? (() => Math.floor(Date.now() / 1000));
  }

  verify(rawBody: string, signatureHeader: string): boolean {
    if (!this.secretKey) {
      return false;
    }

    const parsed = parsePaddleSignatureHeader(signatureHeader);

    if (!parsed || timestampIsOutsideTolerance(parsed.timestamp, this.now(), this.toleranceSeconds)) {
      return false;
    }

    const expectedSignature = paddleSignatureHex(this.secretKey, parsed.timestamp, rawBody);

    return parsed.signatures.some((signature) => signatureMatches(signature, expectedSignature));
  }
}

export function createPaddleSignatureHeader(
  rawBody: string,
  secretKey: string,
  timestamp: number
): string {
  return `ts=${timestamp};h1=${paddleSignatureHex(secretKey, timestamp, rawBody)}`;
}

interface ParsedPaddleSignatureHeader {
  timestamp: number;
  signatures: string[];
}

function parsePaddleSignatureHeader(header: string): ParsedPaddleSignatureHeader | null {
  const entries = header
    .split(";")
    .map((part) => part.trim().split("="))
    .filter((part): part is [string, string] => part.length === 2);
  const timestamp = entries.find(([key]) => key === "ts")?.[1];
  const signatures = entries
    .filter(([key]) => key === "h1")
    .map(([, value]) => value.trim())
    .filter(Boolean);

  if (!timestamp || signatures.length === 0 || !/^\d+$/.test(timestamp)) {
    return null;
  }

  return {
    timestamp: Number(timestamp),
    signatures
  };
}

function timestampIsOutsideTolerance(
  timestamp: number,
  now: number,
  toleranceSeconds: number
): boolean {
  return Math.abs(now - timestamp) > toleranceSeconds;
}

function paddleSignatureHex(secretKey: string, timestamp: number, rawBody: string): string {
  return createHmac("sha256", secretKey)
    .update(`${timestamp}:${rawBody}`, "utf8")
    .digest("hex");
}

function signatureMatches(receivedSignature: string, expectedSignature: string): boolean {
  if (!/^[0-9a-f]+$/i.test(receivedSignature)) {
    return false;
  }

  const received = hexToBytes(receivedSignature);
  const expected = hexToBytes(expectedSignature);

  if (received.length !== expected.length) {
    return false;
  }

  return timingSafeEqual(received, expected);
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);

  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16);
  }

  return bytes;
}
