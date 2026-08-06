import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  Button,
  Icon,
  IconButton,
  Snackbar,
  Surface,
  Text,
  TextInput,
} from 'react-native-paper';
import {
  NavigationProp,
  RouteProp,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import * as Clipboard from 'expo-clipboard';
import KeyboardScreen, { KeyboardScreenHandle } from '../components/KeyboardScreen';
import { usePasswords } from '../contexts/PasswordContext';
import { RootStackParamList } from '../types';
import { colors, radius } from '../theme';

type PasswordRoute = RouteProp<RootStackParamList, 'ViewPassword'>;

const ViewPasswordScreen: React.FC = () => {
  const keyboardScreenRef = React.useRef<KeyboardScreenHandle>(null);
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const route = useRoute<PasswordRoute>();
  const { getPasswordById, updatePassword } = usePasswords();
  const passwordData = getPasswordById(route.params.passwordId);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (passwordData) setPassword(passwordData.password);
  }, [passwordData]);

  const handleCopy = async () => {
    try {
      await Clipboard.setStringAsync(password);
      setMessage('Senha copiada.');
    } catch (err) {
      console.error('Erro ao copiar senha:', err);
      setError('Não foi possível copiar a senha.');
    }
  };

  const handleSave = async () => {
    setError('');
    if (!password.trim()) {
      setError('A senha não pode ficar vazia.');
      return;
    }

    setSaving(true);
    try {
      await updatePassword(route.params.passwordId, { password: password.trim() });
      setMessage('Alterações protegidas no cofre.');
    } catch (err) {
      console.error('Erro ao atualizar senha:', err);
      setError('Não foi possível atualizar a credencial.');
    } finally {
      setSaving(false);
    }
  };

  if (!passwordData) {
    return (
      <KeyboardScreen centered>
        <View style={styles.notFound}>
          <View style={styles.notFoundIcon}>
            <Icon source="key-remove" size={40} color={colors.danger} />
          </View>
          <Text variant="headlineSmall" style={styles.notFoundTitle}>Credencial não encontrada</Text>
          <Text variant="bodyMedium" style={styles.notFoundText}>
            Ela pode ter sido removida ou o cofre ainda está carregando.
          </Text>
          <Button mode="contained" onPress={() => navigation.goBack()}>Voltar ao cofre</Button>
        </View>
      </KeyboardScreen>
    );
  }

  return (
    <KeyboardScreen ref={keyboardScreenRef}>
      <Surface style={styles.identityCard} elevation={1}>
        <View style={styles.identityIcon}>
          <Icon source="web" size={27} color={colors.accent} />
        </View>
        <View style={styles.identityText}>
          <Text variant="labelMedium" style={styles.identityLabel}>CREDENCIAL</Text>
          <Text variant="titleLarge" style={styles.identityTitle}>{passwordData.description}</Text>
        </View>
        <View style={styles.protectedBadge}>
          <Icon source="shield-check" size={16} color={colors.success} />
        </View>
      </Surface>

      <Surface style={styles.passwordCard} elevation={2}>
        <View style={styles.cardHeader}>
          <View>
            <Text variant="titleMedium" style={styles.cardTitle}>Senha armazenada</Text>
            <Text variant="bodySmall" style={styles.cardSubtitle}>
              Descriptografada somente durante esta sessão
            </Text>
          </View>
          <IconButton
            icon={showPassword ? 'eye-off-outline' : 'eye-outline'}
            iconColor={colors.text}
            containerColor={colors.surfaceRaised}
            onPress={() => setShowPassword(current => !current)}
            accessibilityLabel={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
          />
        </View>

        <TextInput
          label="Senha"
          value={password}
          onChangeText={setPassword}
          onFocus={event =>
            keyboardScreenRef.current?.scrollToInput(event.nativeEvent.target, 150)
          }
          mode="outlined"
          secureTextEntry={!showPassword}
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.passwordInput}
          contentStyle={styles.passwordInputContent}
          right={<TextInput.Icon icon="content-copy" onPress={handleCopy} />}
        />

        <View style={styles.passwordMeta}>
          <View style={styles.metaPill}>
            <Icon source="format-letter-case" size={15} color={colors.textMuted} />
            <Text variant="labelSmall" style={styles.metaText}>{password.length} caracteres</Text>
          </View>
          <View style={styles.metaPill}>
            <Icon source="lock-outline" size={15} color={colors.success} />
            <Text variant="labelSmall" style={styles.metaText}>Criptografada</Text>
          </View>
        </View>

        <Button
          mode="contained"
          icon="content-copy"
          onPress={handleCopy}
          style={styles.copyButton}
          contentStyle={styles.buttonContent}
          buttonColor={colors.accent}
        >
          Copiar para usar
        </Button>
      </Surface>

      <View style={styles.securityNotice}>
        <Icon source="information-outline" size={19} color={colors.primary} />
        <Text variant="bodySmall" style={styles.securityNoticeText}>
          A área de transferência é controlada pelo sistema. Cole a senha e limpe-a quando terminar.
        </Text>
      </View>

      {error ? (
        <View style={styles.errorBox}>
          <Icon source="alert-circle-outline" size={19} color={colors.danger} />
          <Text variant="bodySmall" style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <Button
        mode="outlined"
        icon="content-save-outline"
        onPress={handleSave}
        loading={saving}
        disabled={saving || password === passwordData.password}
        style={styles.saveButton}
        contentStyle={styles.buttonContent}
      >
        Salvar alteração
      </Button>

      <Snackbar visible={Boolean(message)} onDismiss={() => setMessage('')} duration={1800}>
        {message}
      </Snackbar>
    </KeyboardScreen>
  );
};

const styles = StyleSheet.create({
  identityCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface,
    borderRadius: radius.large, borderWidth: 1, borderColor: colors.border,
    padding: 16, marginBottom: 16,
  },
  identityIcon: {
    width: 52, height: 52, borderRadius: 17, backgroundColor: colors.accentSoft,
    alignItems: 'center', justifyContent: 'center', marginRight: 13,
  },
  identityText: { flex: 1 },
  identityLabel: { color: colors.textDim, letterSpacing: 1, fontWeight: '700' },
  identityTitle: { color: colors.text, fontWeight: '800', marginTop: 2 },
  protectedBadge: {
    width: 34, height: 34, borderRadius: 12, backgroundColor: '#10332B',
    alignItems: 'center', justifyContent: 'center',
  },
  passwordCard: {
    backgroundColor: colors.surface, borderRadius: radius.large,
    borderWidth: 1, borderColor: colors.border, padding: 18, marginBottom: 14,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 17 },
  cardTitle: { color: colors.text, fontWeight: '700' },
  cardSubtitle: { color: colors.textMuted, marginTop: 3 },
  passwordInput: { backgroundColor: colors.backgroundSoft },
  passwordInputContent: { fontSize: 18, letterSpacing: 0.6 },
  passwordMeta: { flexDirection: 'row', marginTop: 12, marginBottom: 20 },
  metaPill: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surfaceRaised,
    borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 6, marginRight: 8,
  },
  metaText: { color: colors.textMuted, marginLeft: 5 },
  copyButton: { borderRadius: radius.medium },
  buttonContent: { height: 50 },
  securityNotice: {
    flexDirection: 'row', alignItems: 'flex-start', backgroundColor: colors.primarySoft,
    borderRadius: radius.medium, padding: 13, marginBottom: 14,
  },
  securityNoticeText: { color: '#B8C8F4', flex: 1, marginLeft: 9, lineHeight: 18 },
  errorBox: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#35161B',
    borderRadius: radius.small, padding: 12, marginBottom: 14,
  },
  errorText: { color: '#FCA5A5', flex: 1, marginLeft: 8 },
  saveButton: { borderRadius: radius.medium, marginBottom: 8 },
  notFound: { alignItems: 'center', paddingHorizontal: 20 },
  notFoundIcon: {
    width: 82, height: 82, borderRadius: 28, backgroundColor: '#35161B',
    alignItems: 'center', justifyContent: 'center', marginBottom: 18,
  },
  notFoundTitle: { color: colors.text, fontWeight: '800', textAlign: 'center' },
  notFoundText: { color: colors.textMuted, textAlign: 'center', marginTop: 8, marginBottom: 22 },
});

export default ViewPasswordScreen;
