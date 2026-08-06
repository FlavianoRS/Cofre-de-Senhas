/**
 * Tipos principais da aplicação
 */

export interface Password {
  id: string;
  description: string;
  password: string;
}

export interface PasswordGenerationOptions {
  length: number;
  isRandom: boolean;
  isSyllabic: boolean;
  includeSpecialChars: boolean;
  includeNumbers: boolean;
}

export interface User {
  id: string;
  name: string;
}

export type RootStackParamList = {
  Login: undefined;
  List: undefined;
  CreatePassword: undefined;
  ViewPassword: { passwordId: string };
};
