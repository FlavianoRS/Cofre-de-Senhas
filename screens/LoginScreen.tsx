import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  ActivityIndicator,
  Button,
  Icon,
  SegmentedButtons,
  Surface,
  Text,
  TextInput,
} from 'react-native-paper';
import { useAuth } from '../contexts/AuthContext';
import KeyboardScreen from '../components/KeyboardScreen';
import { colors, radius } from '../theme';

type FormMode = 'login' | 'register';

const LoginScreen: React.FC = () => {
  const {
    login,
    register,
    hasAccounts,
    biometricAvailable,
    biometricUser,
    unlockWithBiometrics,
  } = useAuth();
  const [mode, setMode] = useState<FormMode>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    setMode(hasAccounts ? 'login' : 'register');
  }, [hasAccounts]);

  const changeMode = (nextMode: FormMode) => {
    setMode(nextMode);
    setError('');
    setPassword('');
    setConfirmation('');
    setShowPassword(false);
  };

  const validate = (): boolean => {
    if (!username.trim() || !password) {
      setError('Preencha o usuário e a senha mestre.');
      return false;
    }
    if (mode === 'register' && username.trim().length < 3) {
      setError('Use ao menos 3 caracteres no nome de usuário.');
      return false;
    }
    if (mode === 'register' && password.length < 8) {
      setError('A senha mestre precisa ter ao menos 8 caracteres.');
      return false;
    }
    if (mode === 'register' && password !== confirmation) {
      setError('A confirmação da senha mestre não confere.');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    setError('');
    if (!validate()) return;

    setLoading(true);
    try {
      if (mode === 'login') {
        if (!(await login(username, password))) {
          setError('Usuário ou senha mestre inválidos.');
        }
      } else if ((await register(username, password)) === 'username_taken') {
        setError('Esse nome de usuário já está cadastrado.');
      }
    } catch (err) {
      console.error('Erro de autenticação local:', err);
      setError('Não foi possível acessar o cofre. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleBiometricUnlock = async () => {
    setError('');
    setLoading(true);
    try {
      if (!(await unlockWithBiometrics())) {
        setError('Biometria não confirmada. Use sua senha mestre.');
      }
    } catch (err) {
      console.error('Erro no desbloqueio biométrico:', err);
      setError('Biometria indisponível. Use sua senha mestre.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardScreen
      centered
      keepBottomFieldsVisible
      edges={['top', 'bottom']}
      contentStyle={styles.screenContent}
    >
      <View style={styles.brand}>
        <View style={styles.logoOuter}>
          <View style={styles.logoInner}>
            <Icon source="shield-lock-outline" size={36} color={colors.white} />
          </View>
        </View>
        <Text variant="headlineMedium" style={styles.title}>
          Cofre pessoal
        </Text>
        <Text variant="bodyMedium" style={styles.description}>
          Suas credenciais protegidas, disponíveis apenas para você.
        </Text>
      </View>

      <Surface style={styles.formCard} elevation={2}>
        <SegmentedButtons
          value={mode}
          onValueChange={value => changeMode(value as FormMode)}
          buttons={[
            { value: 'login', label: 'Entrar', disabled: !hasAccounts },
            { value: 'register', label: 'Criar cofre' },
          ]}
          style={styles.segmented}
        />

        <Text variant="titleLarge" style={styles.formTitle}>
          {mode === 'login' ? 'Bem-vindo de volta' : 'Proteja seu primeiro cofre'}
        </Text>
        <Text variant="bodyMedium" style={styles.formSubtitle}>
          {mode === 'login'
            ? 'Informe suas credenciais locais para continuar.'
            : 'Crie uma senha mestre forte e que você consiga lembrar.'}
        </Text>

        <TextInput
          label="Nome de usuário"
          value={username}
          onChangeText={setUsername}
          mode="outlined"
          style={styles.input}
          left={<TextInput.Icon icon="account-outline" />}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="next"
        />
        <TextInput
          label="Senha mestre"
          value={password}
          onChangeText={setPassword}
          mode="outlined"
          secureTextEntry={!showPassword}
          style={styles.input}
          left={<TextInput.Icon icon="key-outline" />}
          right={
            <TextInput.Icon
              icon={showPassword ? 'eye-off-outline' : 'eye-outline'}
              onPress={() => setShowPassword(current => !current)}
            />
          }
          autoCapitalize="none"
          autoCorrect={false}
          onSubmitEditing={mode === 'login' ? handleSubmit : undefined}
        />
        {mode === 'register' ? (
          <TextInput
            label="Confirme a senha mestre"
            value={confirmation}
            onChangeText={setConfirmation}
            mode="outlined"
            secureTextEntry={!showPassword}
            style={styles.input}
            left={<TextInput.Icon icon="check-decagram-outline" />}
            autoCapitalize="none"
            autoCorrect={false}
            onSubmitEditing={handleSubmit}
          />
        ) : null}

        {mode === 'register' ? (
          <View style={styles.notice}>
            <Icon source="information-outline" size={19} color={colors.accent} />
            <Text variant="bodySmall" style={styles.noticeText}>
              Não armazenamos sua senha mestre e ela não pode ser recuperada.
            </Text>
          </View>
        ) : null}
        {error ? (
          <View style={styles.errorBox}>
            <Icon source="alert-circle-outline" size={18} color={colors.danger} />
            <Text variant="bodySmall" style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <Button
          mode="contained"
          onPress={handleSubmit}
          style={styles.primaryButton}
          contentStyle={styles.buttonContent}
          disabled={loading}
          icon={mode === 'login' ? 'lock-open-outline' : 'shield-plus-outline'}
        >
          {loading ? (
            <ActivityIndicator color={colors.white} size="small" />
          ) : mode === 'login' ? 'Desbloquear cofre' : 'Criar cofre seguro'}
        </Button>

        {mode === 'login' && biometricAvailable && biometricUser ? (
          <Button
            mode="outlined"
            icon="fingerprint"
            onPress={handleBiometricUnlock}
            style={styles.biometricButton}
            contentStyle={styles.buttonContent}
            disabled={loading}
          >
            Entrar com biometria
          </Button>
        ) : null}
      </Surface>

      <View style={styles.footer}>
        <Icon source="lock-check-outline" size={16} color={colors.textDim} />
        <Text variant="labelSmall" style={styles.footerText}>
          Criptografia local • sem acesso à internet
        </Text>
      </View>
    </KeyboardScreen>
  );
};

const styles = StyleSheet.create({
  screenContent: { paddingHorizontal: 18, paddingVertical: 32 },
  brand: { alignItems: 'center', marginBottom: 26 },
  logoOuter: {
    width: 80,
    height: 80,
    borderRadius: 28,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
    transform: [{ rotate: '8deg' }],
  },
  logoInner: {
    width: 60,
    height: 60,
    borderRadius: 21,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-8deg' }],
  },
  title: { color: colors.text, fontWeight: '800', letterSpacing: -0.5 },
  description: {
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 8,
    maxWidth: 330,
    lineHeight: 21,
  },
  formCard: {
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.large,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
  },
  segmented: { marginBottom: 24 },
  formTitle: { color: colors.text, fontWeight: '700', marginBottom: 5 },
  formSubtitle: { color: colors.textMuted, lineHeight: 20, marginBottom: 20 },
  input: { marginBottom: 14, backgroundColor: colors.backgroundSoft },
  notice: {
    flexDirection: 'row',
    backgroundColor: colors.accentSoft,
    borderRadius: radius.small,
    padding: 12,
    marginBottom: 14,
  },
  noticeText: { color: '#F4B18E', flex: 1, marginLeft: 9, lineHeight: 18 },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#35161B',
    borderRadius: radius.small,
    padding: 11,
    marginBottom: 14,
  },
  errorText: { color: '#FCA5A5', flex: 1, marginLeft: 8 },
  primaryButton: { borderRadius: radius.medium, marginTop: 2 },
  biometricButton: { borderRadius: radius.medium, marginTop: 12 },
  buttonContent: { height: 52 },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 22,
  },
  footerText: { color: colors.textDim, marginLeft: 7, letterSpacing: 0.2 },
});

export default LoginScreen;
