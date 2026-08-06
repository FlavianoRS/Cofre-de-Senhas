import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';
import { User } from '../types';
import {
  authenticateLocalUser,
  deleteLocalUser,
  hasRegisteredUsers,
  registerLocalUser,
} from '../database/authRepository';
import { clearSensitiveBytes } from '../utils/crypto';
import {
  getBiometricUser,
  isBiometricUnlockAvailable,
  loadBiometricUnlock,
  removeBiometricUnlock,
  saveBiometricUnlock,
  forgetBiometricUnlock,
} from '../database/biometricRepository';
import { deleteVaultDatabase } from '../database/passwordRepository';

type RegistrationStatus = 'success' | 'username_taken';
type DeleteProfileStatus = 'success' | 'invalid_password' | 'error';

interface AuthContextType {
  user: User | null;
  vaultKey: Uint8Array | null;
  initializing: boolean;
  hasAccounts: boolean;
  biometricAvailable: boolean;
  biometricUser: User | null;
  biometricEnabled: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  register: (username: string, password: string) => Promise<RegistrationStatus>;
  unlockWithBiometrics: () => Promise<boolean>;
  enableBiometrics: () => Promise<boolean>;
  disableBiometrics: () => Promise<void>;
  deleteCurrentProfile: (password: string) => Promise<DeleteProfileStatus>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [vaultKey, setVaultKey] = useState<Uint8Array | null>(null);
  const [hasAccounts, setHasAccounts] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricUser, setBiometricUser] = useState<User | null>(null);

  useEffect(() => {
    Promise.all([
      hasRegisteredUsers(),
      isBiometricUnlockAvailable(),
      getBiometricUser(),
    ])
      .then(([registeredUsers, biometricsAvailable, storedBiometricUser]) => {
        setHasAccounts(registeredUsers);
        setBiometricAvailable(biometricsAvailable);
        setBiometricUser(storedBiometricUser);
      })
      .catch(error => console.error('Erro ao iniciar autenticação local:', error))
      .finally(() => setInitializing(false));
  }, []);

  const openSession = (session: { user: User; vaultKey: Uint8Array }) => {
    clearSensitiveBytes(vaultKey);
    setUser(session.user);
    setVaultKey(session.vaultKey);
  };

  const login = async (username: string, password: string): Promise<boolean> => {
    const session = await authenticateLocalUser(username, password);
    if (!session) {
      return false;
    }

    openSession(session);
    return true;
  };

  const register = async (
    username: string,
    password: string
  ): Promise<RegistrationStatus> => {
    const result = await registerLocalUser(username, password);
    if (result.status !== 'success') {
      return result.status;
    }

    setHasAccounts(true);
    openSession(result.session);
    return 'success';
  };

  const unlockWithBiometrics = async (): Promise<boolean> => {
    const session = await loadBiometricUnlock();
    if (!session) {
      return false;
    }

    openSession(session);
    return true;
  };

  const enableBiometrics = async (): Promise<boolean> => {
    if (!user || !vaultKey || !biometricAvailable) {
      return false;
    }

    await saveBiometricUnlock(user, vaultKey);
    setBiometricUser(user);
    return true;
  };

  const disableBiometrics = async (): Promise<void> => {
    if (!user) {
      return;
    }

    await removeBiometricUnlock(user.id);
    if (biometricUser?.id === user.id) {
      setBiometricUser(null);
    }
  };

  const deleteCurrentProfile = async (
    password: string
  ): Promise<DeleteProfileStatus> => {
    if (!user || !vaultKey) {
      return 'error';
    }

    const authenticated = await authenticateLocalUser(user.name, password);
    if (!authenticated || authenticated.user.id !== user.id) {
      clearSensitiveBytes(authenticated?.vaultKey ?? null);
      return 'invalid_password';
    }
    clearSensitiveBytes(authenticated.vaultKey);

    const deletedUserId = user.id;
    try {
      await deleteLocalUser(deletedUserId);

      const [registeredUsers, biometricCleanup, vaultCleanup] = await Promise.all([
        hasRegisteredUsers(),
        forgetBiometricUnlock(deletedUserId).then(
          () => null,
          error => error
        ),
        deleteVaultDatabase(deletedUserId).then(
          () => null,
          error => error
        ),
      ]);

      if (biometricCleanup) {
        console.error('Perfil removido, mas houve falha ao limpar a biometria:', biometricCleanup);
      }
      if (vaultCleanup) {
        console.error('Perfil removido, mas houve falha ao limpar o arquivo do cofre:', vaultCleanup);
      }

      clearSensitiveBytes(vaultKey);
      setVaultKey(null);
      setUser(null);
      setBiometricUser(null);
      setHasAccounts(registeredUsers);
      return 'success';
    } catch (error) {
      console.error('Erro ao excluir perfil local:', error);
      return 'error';
    }
  };

  const logout = () => {
    clearSensitiveBytes(vaultKey);
    setVaultKey(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        vaultKey,
        initializing,
        hasAccounts,
        biometricAvailable,
        biometricUser,
        biometricEnabled: Boolean(user && biometricUser?.id === user.id),
        login,
        register,
        unlockWithBiometrics,
        enableBiometrics,
        disableBiometrics,
        deleteCurrentProfile,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
