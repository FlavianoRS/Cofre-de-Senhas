import * as SQLite from 'expo-sqlite';
import { Password } from '../types';
import { createSecureId, decryptText, encryptText } from '../utils/crypto';

const LEGACY_DATABASE_NAME = 'password_manager.db';

type PasswordRow = {
  id: string;
  description: string;
  login: string | null;
  password: string;
};
export type VaultAccess = {
  userId: string;
  key: Uint8Array;
};

const databases = new Map<string, SQLite.SQLiteDatabase>();
const migratedVaults = new Set<string>();

const vaultDatabaseName = (userId: string): string => {
  if (!/^[a-f0-9-]{36}$/i.test(userId)) {
    throw new Error('Identificador de usuário inválido');
  }
  return `vault_${userId}.db`;
};

const getDatabase = async (userId: string): Promise<SQLite.SQLiteDatabase> => {
  const existing = databases.get(userId);
  if (existing) {
    return existing;
  }

  const database = await SQLite.openDatabaseAsync(vaultDatabaseName(userId));
  await database.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS passwords (
      id TEXT PRIMARY KEY NOT NULL,
      description TEXT NOT NULL,
      password TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);

  const columns = await database.getAllAsync<{ name: string }>(
    'PRAGMA table_info(passwords)'
  );
  if (!columns.some(column => column.name === 'login')) {
    await database.execAsync('ALTER TABLE passwords ADD COLUMN login TEXT;');
  }

  databases.set(userId, database);
  return database;
};

const migrateLegacyPasswords = async (access: VaultAccess): Promise<void> => {
  if (migratedVaults.has(access.userId)) {
    return;
  }

  const legacyDatabase = await SQLite.openDatabaseAsync(LEGACY_DATABASE_NAME);
  const legacyTable = await legacyDatabase.getFirstAsync<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'passwords'"
  );

  if (!legacyTable) {
    migratedVaults.add(access.userId);
    return;
  }

  const legacyRows = await legacyDatabase.getAllAsync<PasswordRow>(
    'SELECT id, description, password FROM passwords'
  );

  if (legacyRows.length > 0) {
    const vaultDatabase = await getDatabase(access.userId);
    await vaultDatabase.withTransactionAsync(async () => {
      for (const row of legacyRows) {
        const now = Date.now();
        await vaultDatabase.runAsync(
          `INSERT OR IGNORE INTO passwords
            (id, description, password, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?)`,
          row.id,
          encryptText(row.description, access.key),
          encryptText(row.password, access.key),
          now,
          now
        );
      }
    });

    await legacyDatabase.runAsync('DELETE FROM passwords');
  }

  migratedVaults.add(access.userId);
};

export const listPasswords = async (
  access: VaultAccess
): Promise<Password[]> => {
  await migrateLegacyPasswords(access);
  const database = await getDatabase(access.userId);
  const rows = await database.getAllAsync<PasswordRow>(
    'SELECT id, description, login, password FROM passwords'
  );

  return rows
    .map(row => ({
      id: row.id,
      description: decryptText(row.description, access.key),
      login: row.login ? decryptText(row.login, access.key) : '',
      password: decryptText(row.password, access.key),
    }))
    .sort((first, second) =>
      first.description.localeCompare(second.description, 'pt-BR', {
        sensitivity: 'base',
      })
    );
};

export const insertPassword = async (
  access: VaultAccess,
  password: Omit<Password, 'id'>
): Promise<Password> => {
  const database = await getDatabase(access.userId);
  const now = Date.now();
  const newPassword: Password = {
    ...password,
    id: createSecureId(),
  };

  await database.runAsync(
    `INSERT INTO passwords
      (id, description, login, password, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    newPassword.id,
    encryptText(newPassword.description, access.key),
    encryptText(newPassword.login, access.key),
    encryptText(newPassword.password, access.key),
    now,
    now
  );

  return newPassword;
};

export const updateStoredPassword = async (
  access: VaultAccess,
  id: string,
  updatedPassword: Partial<Password>
): Promise<void> => {
  const database = await getDatabase(access.userId);
  const fields: string[] = [];
  const values: (string | number)[] = [];

  if (updatedPassword.description !== undefined) {
    fields.push('description = ?');
    values.push(encryptText(updatedPassword.description, access.key));
  }

  if (updatedPassword.login !== undefined) {
    fields.push('login = ?');
    values.push(encryptText(updatedPassword.login, access.key));
  }

  if (updatedPassword.password !== undefined) {
    fields.push('password = ?');
    values.push(encryptText(updatedPassword.password, access.key));
  }

  if (fields.length === 0) {
    return;
  }

  fields.push('updated_at = ?');
  values.push(Date.now(), id);

  await database.runAsync(
    `UPDATE passwords SET ${fields.join(', ')} WHERE id = ?`,
    ...values
  );
};

export const deleteStoredPasswords = async (
  access: VaultAccess,
  ids: string[]
): Promise<void> => {
  const uniqueIds = [...new Set(ids)].filter(Boolean);
  if (uniqueIds.length === 0) {
    return;
  }

  const database = await getDatabase(access.userId);
  const placeholders = uniqueIds.map(() => '?').join(', ');
  await database.runAsync(
    `DELETE FROM passwords WHERE id IN (${placeholders})`,
    ...uniqueIds
  );
};

export const deleteVaultDatabase = async (userId: string): Promise<void> => {
  const openDatabase = databases.get(userId);
  if (openDatabase) {
    await openDatabase.closeAsync();
    databases.delete(userId);
  }

  migratedVaults.delete(userId);
  await SQLite.deleteDatabaseAsync(vaultDatabaseName(userId));
};
