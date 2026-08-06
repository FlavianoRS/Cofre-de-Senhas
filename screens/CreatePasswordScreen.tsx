import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  Button,
  Icon,
  IconButton,
  SegmentedButtons,
  Snackbar,
  Switch,
  Text,
  TextInput,
} from 'react-native-paper';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import * as Clipboard from 'expo-clipboard';
import KeyboardScreen, { KeyboardScreenHandle } from '../components/KeyboardScreen';
import SectionCard from '../components/SectionCard';
import { usePasswords } from '../contexts/PasswordContext';
import { RootStackParamList } from '../types';
import { generatePassword } from '../utils/passwordGenerator';
import { colors, radius } from '../theme';

type GenerationMode = 'random' | 'syllabic';
type PasswordEntryMode = 'manual' | 'generator';

const OptionRow: React.FC<{
  icon: string;
  title: string;
  description: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}> = ({ icon, title, description, value, onValueChange }) => (
  <View style={styles.optionRow}>
    <View style={styles.optionIcon}>
      <Icon source={icon} size={20} color={colors.textMuted} />
    </View>
    <View style={styles.optionText}>
      <Text variant="titleSmall" style={styles.optionTitle}>{title}</Text>
      <Text variant="bodySmall" style={styles.optionDescription}>{description}</Text>
    </View>
    <Switch value={value} onValueChange={onValueChange} color={colors.primary} />
  </View>
);

const CreatePasswordScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const keyboardScreenRef = React.useRef<KeyboardScreenHandle>(null);
  const { addPassword } = usePasswords();
  const [description, setDescription] = useState('');
  const [passwordLength, setPasswordLength] = useState('16');
  const [entryMode, setEntryMode] = useState<PasswordEntryMode>('manual');
  const [generationMode, setGenerationMode] = useState<GenerationMode>('random');
  const [includeSpecialChars, setIncludeSpecialChars] = useState(true);
  const [includeNumbers, setIncludeNumbers] = useState(true);
  const [credentialPassword, setCredentialPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleGeneratePassword = () => {
    setError('');
    const length = Number.parseInt(passwordLength || '16', 10);
    if (Number.isNaN(length) || length < 4 || length > 64) {
      setError('Escolha um tamanho entre 4 e 64 caracteres.');
      return;
    }

    setCredentialPassword(generatePassword({
      length,
      isRandom: generationMode === 'random',
      isSyllabic: generationMode === 'syllabic',
      includeSpecialChars,
      includeNumbers,
    }));
  };

  const handleCopy = async () => {
    if (!credentialPassword) return;
    await Clipboard.setStringAsync(credentialPassword);
    setCopied(true);
  };

  const handleSave = async () => {
    setError('');
    if (!description.trim()) {
      setError('Informe onde essa credencial será utilizada.');
      return;
    }
    if (!credentialPassword.trim()) {
      setError('Digite ou gere uma senha antes de salvar.');
      return;
    }

    setSaving(true);
    try {
      await addPassword({
        description: description.trim(),
        password: credentialPassword,
      });
      navigation.goBack();
    } catch (err) {
      console.error('Erro ao salvar credencial:', err);
      setError('Não foi possível salvar a credencial no cofre.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardScreen ref={keyboardScreenRef}>
      <View style={styles.intro}>
        <Text variant="headlineSmall" style={styles.title}>Nova credencial</Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          Digite uma senha existente ou gere uma nova antes de salvar no cofre.
        </Text>
      </View>

      <SectionCard title="Identificação" subtitle="Como você reconhecerá esta conta" icon="tag-outline">
        <TextInput
          label="Descrição"
          placeholder="Ex.: E-mail pessoal, banco, trabalho"
          value={description}
          onChangeText={setDescription}
          mode="outlined"
          style={styles.input}
          left={<TextInput.Icon icon="text-box-outline" />}
          returnKeyType="next"
        />
      </SectionCard>

      <SectionCard title="Como definir a senha" subtitle="Escolha entre digitar ou gerar automaticamente" icon="key-outline">
        <SegmentedButtons
          value={entryMode}
          onValueChange={value => {
            setEntryMode(value as PasswordEntryMode);
            setError('');
          }}
          buttons={[
            { value: 'manual', label: 'Digitar', icon: 'keyboard-outline' },
            { value: 'generator', label: 'Gerar', icon: 'auto-fix' },
          ]}
        />
      </SectionCard>

      {entryMode === 'generator' ? (
      <SectionCard title="Configuração" subtitle="Personalize a geração segura" icon="tune-variant">
        <Text variant="labelLarge" style={styles.fieldLabel}>Tipo da senha</Text>
        <SegmentedButtons
          value={generationMode}
          onValueChange={value => setGenerationMode(value as GenerationMode)}
          buttons={[
            { value: 'random', label: 'Aleatória', icon: 'shuffle-variant' },
            { value: 'syllabic', label: 'Memorizável', icon: 'alphabetical-variant' },
          ]}
          style={styles.segmented}
        />

        <TextInput
          label="Quantidade de caracteres"
          value={passwordLength}
          onChangeText={setPasswordLength}
          mode="outlined"
          keyboardType="number-pad"
          style={styles.input}
          left={<TextInput.Icon icon="format-letter-case" />}
          maxLength={2}
        />

        <OptionRow
          icon="numeric"
          title="Incluir números"
          description="Adiciona algarismos de 0 a 9"
          value={includeNumbers}
          onValueChange={setIncludeNumbers}
        />
        <OptionRow
          icon="code-tags"
          title="Caracteres especiais"
          description="Adiciona símbolos e pontuação"
          value={includeSpecialChars}
          onValueChange={setIncludeSpecialChars}
        />

        <Button
          mode="contained-tonal"
          icon="auto-fix"
          onPress={handleGeneratePassword}
          style={styles.generateButton}
          contentStyle={styles.buttonContent}
        >
          {credentialPassword ? 'Gerar outra senha' : 'Gerar senha segura'}
        </Button>
      </SectionCard>
      ) : null}

      {entryMode === 'manual' || credentialPassword ? (
        <SectionCard
          title="Senha da credencial"
          subtitle={entryMode === 'generator' ? 'Revise ou edite a senha gerada' : 'Informe a senha que deseja guardar'}
          icon={entryMode === 'generator' ? 'pencil-lock-outline' : 'form-textbox-password'}
        >
          <TextInput
            label="Senha"
            value={credentialPassword}
            onChangeText={setCredentialPassword}
            onFocus={event =>
              keyboardScreenRef.current?.scrollToInput(event.nativeEvent.target, 150)
            }
            mode="outlined"
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.input}
            contentStyle={styles.passwordInputContent}
            left={<TextInput.Icon icon="lock-outline" />}
            right={
              <TextInput.Icon
                icon={showPassword ? 'eye-off-outline' : 'eye-outline'}
                onPress={() => setShowPassword(current => !current)}
              />
            }
          />
          <View style={styles.passwordActions}>
            <View style={styles.passwordMeta}>
              <Icon source="pencil-outline" size={16} color={colors.textMuted} />
              <Text variant="bodySmall" style={styles.passwordMetaText}>
                Editável • {credentialPassword.length} caracteres
              </Text>
            </View>
            <IconButton
              icon="content-copy"
              iconColor={colors.text}
              containerColor={colors.surfaceRaised}
              onPress={handleCopy}
              disabled={!credentialPassword}
              accessibilityLabel="Copiar senha"
            />
          </View>
        </SectionCard>
      ) : null}

      {error ? (
        <View style={styles.errorBox}>
          <Icon source="alert-circle-outline" size={19} color={colors.danger} />
          <Text variant="bodySmall" style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <Button
        mode="contained"
        icon="shield-check-outline"
        onPress={handleSave}
        disabled={saving}
        loading={saving}
        style={styles.saveButton}
        contentStyle={styles.saveContent}
        buttonColor={colors.accent}
      >
        Salvar no cofre
      </Button>

      <Snackbar visible={copied} onDismiss={() => setCopied(false)} duration={1800}>
        Senha copiada com segurança.
      </Snackbar>
    </KeyboardScreen>
  );
};

const styles = StyleSheet.create({
  intro: { marginBottom: 22 },
  title: { color: colors.text, fontWeight: '800' },
  subtitle: { color: colors.textMuted, lineHeight: 21, marginTop: 6 },
  fieldLabel: { color: colors.textMuted, marginBottom: 9 },
  segmented: { marginBottom: 18 },
  input: { backgroundColor: colors.backgroundSoft },
  optionRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border,
  },
  optionIcon: {
    width: 36, height: 36, borderRadius: 12, backgroundColor: colors.surfaceRaised,
    alignItems: 'center', justifyContent: 'center', marginRight: 11,
  },
  optionText: { flex: 1 },
  optionTitle: { color: colors.text, fontWeight: '600' },
  optionDescription: { color: colors.textDim, marginTop: 2 },
  generateButton: { marginTop: 18, borderRadius: radius.medium },
  buttonContent: { height: 48 },
  passwordInputContent: { fontSize: 17, letterSpacing: 0.5 },
  passwordActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  passwordMeta: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  passwordMetaText: { color: colors.textMuted, marginLeft: 7 },
  errorBox: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#35161B',
    borderRadius: radius.small, padding: 12, marginBottom: 14,
  },
  errorText: { color: '#FCA5A5', flex: 1, marginLeft: 8 },
  saveButton: { borderRadius: radius.medium, marginBottom: 10 },
  saveContent: { height: 54 },
});

export default CreatePasswordScreen;
