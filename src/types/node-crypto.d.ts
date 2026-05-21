declare module "node:crypto" {
  export interface KeyObject {}
  export interface Hmac {
    update(data: string, inputEncoding?: "utf8"): Hmac;
    digest(encoding: "hex"): string;
  }

  export function createPrivateKey(key: string): KeyObject;
  export function createPublicKey(key: string): KeyObject;
  export function createHmac(algorithm: "sha256", key: string): Hmac;

  export function sign(
    algorithm: null,
    data: Uint8Array,
    key: KeyObject
  ): {
    toString(encoding: "base64"): string;
  };

  export function verify(
    algorithm: null,
    data: Uint8Array,
    key: KeyObject,
    signature: Uint8Array
  ): boolean;

  export function timingSafeEqual(left: Uint8Array, right: Uint8Array): boolean;
}

declare module "node:fs" {
  export function existsSync(path: string): boolean;
  export function mkdtempSync(prefix: string): string;
  export function mkdirSync(path: string, options?: { recursive?: boolean }): void;
  export function readFileSync(path: string, encoding: "utf8"): string;
  export function renameSync(oldPath: string, newPath: string): void;
  export function rmSync(path: string, options?: { recursive?: boolean; force?: boolean }): void;
  export function writeFileSync(path: string, data: string, encoding: "utf8"): void;
}

declare module "node:os" {
  export function tmpdir(): string;
}

declare module "node:path" {
  export function dirname(path: string): string;
  export function join(...paths: string[]): string;
}
