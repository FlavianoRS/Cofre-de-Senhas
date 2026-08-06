import { xchacha20poly1305 } from '@noble/ciphers/chacha.js';
import {
  bytesToHex,
  bytesToUtf8,
  hexToBytes,
  utf8ToBytes,
} from '@noble/ciphers/utils.js';
import { scryptAsync } from '@noble/hashes/scrypt.js';
import * as Crypto from 'expo-crypto';

const ENCRYPTION_VERSION = 'v1';
const KEY_SIZE = 32;
const NONCE_SIZE = 24;

export const randomBytes = (length: number): Uint8Array =>
  Crypto.getRandomBytes(length);

export const createSecureId = (): string => Crypto.randomUUID();

export const encodeHex = (value: Uint8Array): string => bytesToHex(value);

export const decodeHex = (value: string): Uint8Array => hexToBytes(value);

export const constantTimeEqual = (
  first: Uint8Array,
  second: Uint8Array
): boolean => {
  if (first.length !== second.length) {
    return false;
  }

  let difference = 0;
  for (let index = 0; index < first.length; index += 1) {
    difference |= first[index] ^ second[index];
  }
  return difference === 0;
};
export const deriveLoginMaterial = async (
  password: string,
  salt: Uint8Array
): Promise<Uint8Array> =>
  scryptAsync(password, salt, {
    N: 2 ** 15,
    r: 8,
    p: 1,
    dkLen: 64,
    // Preserve the same scrypt cost and derived bytes while reducing the
    // scheduling overhead on mobile JavaScript runtimes.
    asyncTick: 50,
  });

export const encryptBytes = (
  value: Uint8Array,
  key: Uint8Array
): string => {
  if (key.length !== KEY_SIZE) {
    throw new Error('Chave de criptografia inválida');
  }

  const nonce = randomBytes(NONCE_SIZE);
  const encrypted = xchacha20poly1305(key, nonce).encrypt(value);
  return `${ENCRYPTION_VERSION}:${encodeHex(nonce)}:${encodeHex(encrypted)}`;
};

export const decryptBytes = (
  payload: string,
  key: Uint8Array
): Uint8Array => {
  const [version, nonceHex, encryptedHex, ...extra] = payload.split(':');
  if (
    version !== ENCRYPTION_VERSION ||
    !nonceHex ||
    !encryptedHex ||
    extra.length > 0
  ) {
    throw new Error('Formato de dado criptografado inválido');
  }

  return xchacha20poly1305(key, decodeHex(nonceHex)).decrypt(
    decodeHex(encryptedHex)
  );
};

export const encryptText = (value: string, key: Uint8Array): string =>
  encryptBytes(utf8ToBytes(value), key);

export const decryptText = (value: string, key: Uint8Array): string =>
  bytesToUtf8(decryptBytes(value, key));

export const clearSensitiveBytes = (value: Uint8Array | null): void => {
  value?.fill(0);
};
