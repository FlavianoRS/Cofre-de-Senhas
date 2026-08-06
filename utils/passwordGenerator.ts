import { PasswordGenerationOptions } from '../types';
import * as Crypto from 'expo-crypto';

const secureRandomIndex = (maximum: number): number => {
  if (!Number.isInteger(maximum) || maximum < 1 || maximum > 256) {
    throw new Error('Intervalo aleatório inválido');
  }

  const upperLimit = 256 - (256 % maximum);
  let value = 256;
  while (value >= upperLimit) {
    value = Crypto.getRandomBytes(1)[0];
  }
  return value % maximum;
};

/**
 * Gera uma senha baseada nas opções fornecidas
 * TODO: Integrar com API para gerar senha no backend
 */
export const generatePassword = (options: PasswordGenerationOptions): string => {
  const { length, isRandom, isSyllabic, includeSpecialChars, includeNumbers } = options ?? {};

  // Caracteres disponíveis
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  const specialChars = '!@#$%^&*()_+-=[]{}|;:,.<>?';

  // Sílabas para senha silábica
  const syllables = [
    'ba', 'be', 'bi', 'bo', 'bu',
    'ca', 'ce', 'ci', 'co', 'cu',
    'da', 'de', 'di', 'do', 'du',
    'fa', 'fe', 'fi', 'fo', 'fu',
    'ga', 'ge', 'gi', 'go', 'gu',
    'la', 'le', 'li', 'lo', 'lu',
    'ma', 'me', 'mi', 'mo', 'mu',
    'na', 'ne', 'ni', 'no', 'nu',
    'pa', 'pe', 'pi', 'po', 'pu',
    'ra', 're', 'ri', 'ro', 'ru',
    'sa', 'se', 'si', 'so', 'su',
    'ta', 'te', 'ti', 'to', 'tu',
    'va', 've', 'vi', 'vo', 'vu',
  ];

  const safeLength = length ?? 12;

  if (isSyllabic) {
    // Gerar senha silábica
    let password = '';
    const syllableCount = Math.ceil(safeLength / 2);

    for (let i = 0; i < syllableCount; i++) {
      const randomSyllable = syllables[secureRandomIndex(syllables.length)] ?? 'ab';
      password += randomSyllable;
    }

    // Adicionar números se solicitado
    if (includeNumbers) {
      const numCount = Math.floor(safeLength * 0.2);
      for (let i = 0; i < numCount; i++) {
        const pos = secureRandomIndex(password.length);
        const num = numbers[secureRandomIndex(numbers.length)] ?? '0';
        password = password.slice(0, pos) + num + password.slice(pos + 1);
      }
    }

    // Adicionar caracteres especiais se solicitado
    if (includeSpecialChars) {
      const specialCount = Math.floor(safeLength * 0.15);
      for (let i = 0; i < specialCount; i++) {
        const pos = secureRandomIndex(password.length);
        const special = specialChars[secureRandomIndex(specialChars.length)] ?? '!';
        password = password.slice(0, pos) + special + password.slice(pos + 1);
      }
    }

    return password.slice(0, safeLength);
  }

  // Gerar senha aleatória
  let charSet = lowercase + uppercase;
  if (includeNumbers) {
    charSet += numbers;
  }
  if (includeSpecialChars) {
    charSet += specialChars;
  }

  let password = '';
  for (let i = 0; i < safeLength; i++) {
    const randomIndex = secureRandomIndex(charSet.length);
    password += charSet[randomIndex] ?? 'a';
  }

  return password;
};
