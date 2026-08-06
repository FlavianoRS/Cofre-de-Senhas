import * as SQLite from 'expo-sqlite';
import { User } from '../types';
import {
  clearSensitiveBytes,
  constantTimeEqual,
  createSecureId,
  decodeHex,
  decryptBytes,
  deriveLoginMaterial,
  encodeHex,
  encryptBytes,
  randomBytes,
} from '../utils/crypto';

const AUTH_DATABASE_NAME = 'authentication.db';
const SALT_SIZE = 16;
const VAULT_KEY_SIZE = 32;

type UserRow = {
  id: string;
  username: string;
  display_name: string;
  password_salt: string;
  password_verifier: string;
  encrypted_vault_key: string;
};
export type AuthenticatedUser = {
  user: User;
  vaultKey: Uint8Array;
};

export type RegisterResult =
  | { status: 'success'; session: AuthenticatedUser }
  | { status: 'username_taken' };

let database: SQLite.SQLiteDatabase | null = null;

const normalizeUsername = (username: string): string =>
  username.trim().toLocaleLowerCase('pt-BR');

const getDatabase = async (): Promise<SQLite.SQLiteDatabase> => {
  if (!database) {
    database = await SQLite.openDatabaseAsync(AUTH_DATABASE_NAME);
    await database.execAsync(`
      PRAGMA journal_mode = WAL;

      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY NOT NULL,
        username TEXT NOT NULL UNIQUE,
        display_name TEXT NOT NULL,
        password_salt TEXT NOT NULL,
        password_verifier TEXT NOT NULL,
        encrypted_vault_key TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );
    `);
  }

  return database;
};

export const hasRegisteredUsers = async (): Promise<boolean> => {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) AS count FROM users'
  );
  return (row?.count ?? 0) > 0;
};

export const registerLocalUser = async (
  username: string,
  password: string
): Promise<RegisterResult> => {
  const db = await getDatabase();
  const normalizedUsername = normalizeUsername(username);
  const existing = await db.getFirstAsync<{ id: string }>(
    'SELECT id FROM users WHERE username = ?',
    normalizedUsername
  );

  if (existing) {
    return { status: 'username_taken' };
  }

  const salt = randomBytes(SALT_SIZE);
  const loginMaterial = await deriveLoginMaterial(password, salt);
  const verifier = loginMaterial.slice(0, 32);
  const wrappingKey = loginMaterial.slice(32, 64);
  const vaultKey = randomBytes(VAULT_KEY_SIZE);
  const id = createSecureId();

  try {
    await db.runAsync(
      `INSERT INTO users (
        id, username, display_name, password_salt, password_verifier,
        encrypted_vault_key, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      id,
      normalizedUsername,
      username.trim(),
      encodeHex(salt),
      encodeHex(verifier),
      encryptBytes(vaultKey, wrappingKey),
      Date.now()
    );

    return {
      status: 'success',
      session: {
        user: { id, name: username.trim() },
        vaultKey,
      },
    };
  } finally {
    clearSensitiveBytes(loginMaterial);
    clearSensitiveBytes(verifier);
    clearSensitiveBytes(wrappingKey);
  }
};

export const authenticateLocalUser = async (
  username: string,
  password: string
): Promise<AuthenticatedUser | null> => {
  const db = await getDatabase();
  const row = await db.getFirstAsync<UserRow>(
    `SELECT id, username, display_name, password_salt, password_verifier,
      encrypted_vault_key
     FROM users WHERE username = ?`,
    normalizeUsername(username)
  );

  if (!row) {
    return null;
  }

  const loginMaterial = await deriveLoginMaterial(
    password,
    decodeHex(row.password_salt)
  );
  const verifier = loginMaterial.slice(0, 32);
  const wrappingKey = loginMaterial.slice(32, 64);

  try {
    if (!constantTimeEqual(verifier, decodeHex(row.password_verifier))) {
      return null;
    }

    return {
      user: { id: row.id, name: row.display_name },
      vaultKey: decryptBytes(row.encrypted_vault_key, wrappingKey),
    };
  } finally {
    clearSensitiveBytes(loginMaterial);
    clearSensitiveBytes(verifier);
    clearSensitiveBytes(wrappingKey);
  }
};

export const deleteLocalUser = async (userId: string): Promise<void> => {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM users WHERE id = ?', userId);
};
