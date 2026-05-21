declare module "node:crypto" {
  export interface KeyObject {}

  export function createPrivateKey(key: string): KeyObject;
  export function createPublicKey(key: string): KeyObject;

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
}
