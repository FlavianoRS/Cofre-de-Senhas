import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';
import { Password } from '../types';
import {
  insertPassword,
  listPasswords,
  updateStoredPassword,
  deleteStoredPasswords,
  VaultAccess,
} from '../database/passwordRepository';
import { useAuth } from './AuthContext';

interface PasswordContextType {
  passwords: Password[];
  loading: boolean;
  addPassword: (password: Omit<Password, 'id'>) => Promise<void>;
  updatePassword: (id: string, updatedPassword: Partial<Password>) => Promise<void>;
  deletePasswords: (ids: string[]) => Promise<void>;
  getPasswordById: (id: string) => Password | undefined;
}

const PasswordContext = createContext<PasswordContextType | undefined>(undefined);

export const PasswordProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user, vaultKey } = useAuth();
  const [passwords, setPasswords] = useState<Password[]>([]);
  const [loading, setLoading] = useState(false);

  const getAccess = (): VaultAccess => {
    if (!user || !vaultKey) {
      throw new Error('O cofre está bloqueado');
    }
    return { userId: user.id, key: vaultKey };
  };

  useEffect(() => {
    let isMounted = true;

    if (!user || !vaultKey) {
      setPasswords([]);
      setLoading(false);
      return () => {
        isMounted = false;
      };
    }

    setLoading(true);
    const access = { userId: user.id, key: vaultKey };
    const loadPasswords = async () => {
      try {
        const storedPasswords = await listPasswords(access);
        if (isMounted) {
          setPasswords(storedPasswords);
        }
      } catch (error) {
        console.error('Erro ao carregar senhas do banco local:', error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadPasswords();

    return () => {
      isMounted = false;
    };
  }, [user, vaultKey]);

  const addPassword = async (password: Omit<Password, 'id'>) => {
    const newPassword = await insertPassword(getAccess(), password);
    setPasswords(prev => [...prev, newPassword]);
  };

  const updatePassword = async (id: string, updatedPassword: Partial<Password>) => {
    await updateStoredPassword(getAccess(), id, updatedPassword);
    setPasswords(prev =>
      prev?.map?.(p => (p?.id === id ? { ...p, ...updatedPassword } : p)) ?? []
    );
  };

  const getPasswordById = (id: string): Password | undefined => {
    return passwords?.find?.(p => p?.id === id);
  };

  const deletePasswords = async (ids: string[]) => {
    const uniqueIds = [...new Set(ids)];
    await deleteStoredPasswords(getAccess(), uniqueIds);
    const deletedIds = new Set(uniqueIds);
    setPasswords(previous => previous.filter(item => !deletedIds.has(item.id)));
  };

  return (
    <PasswordContext.Provider
      value={{
        passwords,
        loading,
        addPassword,
        updatePassword,
        deletePasswords,
        getPasswordById,
      }}
    >
      {children}
    </PasswordContext.Provider>
  );
};

export const usePasswords = (): PasswordContextType => {
  const context = useContext(PasswordContext);
  if (!context) {
    throw new Error('usePasswords must be used within a PasswordProvider');
  }
  return context;
};
