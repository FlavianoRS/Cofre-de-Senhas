import { Platform } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { User } from '../types';
import { decodeHex, encodeHex } from '../utils/crypto';

const BIOMETRIC_USER_KEY = 'vault.biometric.user';
const BIOMETRIC_VAULT_PREFIX = 'vault.biometric.key.';

const protectedOptions: SecureStore.SecureStoreOptions = {
  requireAuthentication: true,
  authenticationPrompt: 'Confirme sua biometria para acessar o cofre',
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

const vaultKeyName = (userId: string): string =>
  `${BIOMETRIC_VAULT_PREFIX}${userId}`;

export const getBiometricUser = async (): Promise<User | null> => {
  if (Platform.OS === 'web' || !(await SecureStore.isAvailableAsync())) {
    return null;
  }

  const serializedUser = await SecureStore.getItemAsync(BIOMETRIC_USER_KEY);
  if (!serializedUser) {
    return null;
  }

  try {
    const user = JSON.parse(serializedUser) as Partial<User>;
    return typeof user.id === 'string' && typeof user.name === 'string'
      ? { id: user.id, name: user.name }
      : null;
  } catch {
    await SecureStore.deleteItemAsync(BIOMETRIC_USER_KEY);
    return null;
  }
};

export const isBiometricUnlockAvailable = async (): Promise<boolean> => {
  if (Platform.OS === 'web' || !(await SecureStore.isAvailableAsync())) {
    return false;
  }

  const [hasHardware, isEnrolled] = await Promise.all([
    LocalAuthentication.hasHardwareAsync(),
    LocalAuthentication.isEnrolledAsync(),
  ]);

  return hasHardware && isEnrolled && SecureStore.canUseBiometricAuthentication();
};

export const saveBiometricUnlock = async (
  user: User,
  vaultKey: Uint8Array
): Promise<void> => {
  if (!(await isBiometricUnlockAvailable())) {
    throw new Error('Biometria forte não disponível ou não cadastrada');
  }

  await SecureStore.setItemAsync(
    vaultKeyName(user.id),
    encodeHex(vaultKey),
    protectedOptions
  );
  await SecureStore.setItemAsync(BIOMETRIC_USER_KEY, JSON.stringify(user), {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
};

export const loadBiometricUnlock = async (): Promise<{
  user: User;
  vaultKey: Uint8Array;
} | null> => {
  const user = await getBiometricUser();
  if (!user || !(await isBiometricUnlockAvailable())) {
    return null;
  }

  try {
    const storedKey = await SecureStore.getItemAsync(
      vaultKeyName(user.id),
      protectedOptions
    );
    if (!storedKey) {
      await SecureStore.deleteItemAsync(BIOMETRIC_USER_KEY);
      return null;
    }
    return { user, vaultKey: decodeHex(storedKey) };
  } catch {
    return null;
  }
};

export const removeBiometricUnlock = async (
  userId: string
): Promise<void> => {
  await SecureStore.deleteItemAsync(vaultKeyName(userId), protectedOptions);
  const storedUser = await getBiometricUser();
  if (storedUser?.id === userId) {
    await SecureStore.deleteItemAsync(BIOMETRIC_USER_KEY);
  }
};

export const forgetBiometricUnlock = async (userId: string): Promise<void> => {
  const storedUser = await getBiometricUser();
  if (storedUser?.id === userId) {
    await SecureStore.deleteItemAsync(BIOMETRIC_USER_KEY);
  }

  await SecureStore.deleteItemAsync(vaultKeyName(userId), protectedOptions).catch(
    () => undefined
  );
};
