import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  FlatList,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  View,
} from 'react-native';
import {
  ActivityIndicator,
  Button,
  Dialog,
  FAB,
  Icon,
  IconButton,
  Menu,
  Portal,
  Surface,
  Text,
  TextInput,
} from 'react-native-paper';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { usePasswords } from '../contexts/PasswordContext';
import { useAuth } from '../contexts/AuthContext';
import { Password, RootStackParamList } from '../types';
import { colors, radius } from '../theme';

const PasswordItem: React.FC<{
  item: Password;
  index: number;
  onPress: () => void;
  onLongPress: () => void;
  selectionMode: boolean;
  selected: boolean;
}> = ({ item, index, onPress, onLongPress, selectionMode, selected }) => {
  const progress = useRef(new Animated.Value(0)).current;
  const longPressTriggered = useRef(false);

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration: 280,
      delay: Math.min(index * 45, 270),
      useNativeDriver: true,
    }).start();
  }, [index, progress]);

  return (
    <Animated.View
      style={{
        opacity: progress,
        transform: [
          {
            translateY: progress.interpolate({
              inputRange: [0, 1],
              outputRange: [10, 0],
            }),
          },
        ],
      }}
    >
      <Pressable
        onPress={() => {
          if (longPressTriggered.current) {
            longPressTriggered.current = false;
            return;
          }
          onPress();
        }}
        onLongPress={() => {
          longPressTriggered.current = true;
          onLongPress();
        }}
        style={({ pressed }) => [styles.itemPressable, pressed && styles.itemPressed]}
        accessibilityRole="button"
        accessibilityLabel={selectionMode
          ? `${selected ? 'Desmarcar' : 'Selecionar'} credencial ${item.description}`
          : `Abrir credencial ${item.description}`}
      >
        <Surface style={[styles.itemCard, selected && styles.itemCardSelected]} elevation={1}>
          <View style={[styles.itemIcon, selected && styles.itemIconSelected]}>
            <Icon
              source={selected ? 'check' : 'key-variant'}
              size={22}
              color={selected ? colors.white : colors.accent}
            />
          </View>
          <View style={styles.itemText}>
            <Text variant="titleMedium" numberOfLines={1} style={styles.itemTitle}>
              {item.description || 'Sem descrição'}
            </Text>
            <Text variant="bodySmall" style={styles.itemSubtitle}>
              {'•'.repeat(Math.min(item.password.length, 14))} · {item.password.length} caracteres
            </Text>
          </View>
          <View style={[styles.chevron, selected && styles.selectedIndicator]}>
            <Icon
              source={selectionMode ? (selected ? 'checkbox-marked-circle' : 'checkbox-blank-circle-outline') : 'chevron-right'}
              size={21}
              color={selected ? colors.primary : colors.textMuted}
            />
          </View>
        </Surface>
      </Pressable>
    </Animated.View>
  );
};

const ListScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { passwords, loading, deletePasswords } = usePasswords();
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmDeleteVisible, setConfirmDeleteVisible] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [profileMenuVisible, setProfileMenuVisible] = useState(false);
  const [deleteProfileVisible, setDeleteProfileVisible] = useState(false);
  const [profilePassword, setProfilePassword] = useState('');
  const [profileDeleteError, setProfileDeleteError] = useState('');
  const [deletingProfile, setDeletingProfile] = useState(false);
  const [showProfilePassword, setShowProfilePassword] = useState(false);
  const {
    logout,
    deleteCurrentProfile,
    user,
    biometricAvailable,
    biometricEnabled,
    enableBiometrics,
    disableBiometrics,
  } = useAuth();

  const showMessage = (title: string, message: string) => {
    if (Platform.OS === 'web') alert(`${title}\n\n${message}`);
    else Alert.alert(title, message);
  };

  const handleBiometrics = async () => {
    try {
      if (biometricEnabled) {
        await disableBiometrics();
        showMessage('Biometria desativada', 'A senha mestre será exigida no próximo acesso.');
        return;
      }

      const enabled = await enableBiometrics();
      showMessage(
        enabled ? 'Biometria ativada' : 'Biometria indisponível',
        enabled
          ? 'O cofre agora pode ser desbloqueado pela biometria do aparelho.'
          : 'Cadastre uma biometria forte no aparelho e tente novamente.'
      );
    } catch (error) {
      console.error('Erro ao configurar biometria:', error);
      showMessage('Não foi possível alterar a biometria', 'Continue usando sua senha mestre.');
    }
  };

  const toggleSelection = (id: string) => {
    setSelectionMode(true);
    setSelectedIds(current => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const cancelSelection = () => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  };

  const selectAll = () => {
    setSelectedIds(new Set(passwords.map(item => item.id)));
  };

  const confirmDeletion = async () => {
    if (selectedIds.size === 0) return;
    setDeleting(true);
    try {
      await deletePasswords([...selectedIds]);
      setConfirmDeleteVisible(false);
      cancelSelection();
    } catch (error) {
      console.error('Erro ao excluir credenciais:', error);
      setConfirmDeleteVisible(false);
      showMessage('Não foi possível excluir', 'As credenciais foram mantidas. Tente novamente.');
    } finally {
      setDeleting(false);
    }
  };

  const openDeleteProfileDialog = () => {
    setProfileMenuVisible(false);
    setProfilePassword('');
    setProfileDeleteError('');
    setShowProfilePassword(false);
    setDeleteProfileVisible(true);
  };

  const handleDeleteProfile = async () => {
    if (!profilePassword) {
      setProfileDeleteError('Informe sua senha mestre para confirmar.');
      return;
    }

    setDeletingProfile(true);
    setProfileDeleteError('');
    const status = await deleteCurrentProfile(profilePassword);
    if (status === 'invalid_password') {
      setProfileDeleteError('Senha mestre incorreta. O perfil não foi excluído.');
    } else if (status === 'error') {
      setProfileDeleteError('Não foi possível excluir o perfil. Tente novamente.');
    }
    setDeletingProfile(false);
  };

  const listHeader = (
    <>
      <View style={styles.topBar}>
        <View style={styles.brandRow}>
          <View style={styles.smallLogo}>
            <Icon source="shield-lock-outline" size={23} color={colors.white} />
          </View>
          <View>
            <Text variant="labelMedium" style={styles.eyebrow}>COFRE PESSOAL</Text>
            <Text variant="headlineSmall" style={styles.greeting}>
              Olá, {user?.name ?? 'usuário'}
            </Text>
          </View>
        </View>
        <Menu
          visible={profileMenuVisible}
          onDismiss={() => setProfileMenuVisible(false)}
          contentStyle={styles.menuContent}
          anchor={
            <IconButton
              icon="dots-vertical"
              iconColor={colors.textMuted}
              size={22}
              onPress={() => setProfileMenuVisible(true)}
              style={styles.logoutButton}
              accessibilityLabel="Abrir opções do perfil"
            />
          }
        >
          <Menu.Item
            leadingIcon="logout-variant"
            title="Sair e bloquear"
            onPress={() => {
              setProfileMenuVisible(false);
              logout();
            }}
          />
          <Menu.Item
            leadingIcon="account-remove-outline"
            title="Excluir perfil"
            titleStyle={styles.deleteMenuText}
            onPress={openDeleteProfileDialog}
          />
        </Menu>
      </View>

      <Surface style={styles.summaryCard} elevation={2}>
        <View style={styles.summaryGlow} />
        <View style={styles.summaryTop}>
          <View>
            <Text variant="labelLarge" style={styles.summaryLabel}>CREDENCIAIS PROTEGIDAS</Text>
            <Text style={styles.summaryNumber}>{passwords.length}</Text>
          </View>
          <View style={styles.summaryIcon}>
            <Icon source="shield-check-outline" size={31} color={colors.success} />
          </View>
        </View>
        <View style={styles.summaryFooter}>
          <View style={styles.statusDot} />
          <Text variant="bodySmall" style={styles.summaryStatus}>
            Cofre criptografado e armazenado localmente
          </Text>
        </View>
      </Surface>

      {biometricAvailable ? (
        <Surface style={styles.securityCard} elevation={0}>
          <View style={[styles.securityIcon, biometricEnabled && styles.securityIconEnabled]}>
            <Icon
              source="fingerprint"
              size={25}
              color={biometricEnabled ? colors.success : colors.textMuted}
            />
          </View>
          <View style={styles.securityText}>
            <Text variant="titleSmall" style={styles.securityTitle}>
              {biometricEnabled ? 'Biometria ativada' : 'Acesso mais rápido'}
            </Text>
            <Text variant="bodySmall" style={styles.securitySubtitle}>
              {biometricEnabled
                ? 'Seu cofre está vinculado a este aparelho.'
                : 'Use digital ou reconhecimento facial.'}
            </Text>
          </View>
          <Button
            mode={biometricEnabled ? 'text' : 'contained-tonal'}
            compact
            onPress={handleBiometrics}
            textColor={biometricEnabled ? colors.textMuted : undefined}
          >
            {biometricEnabled ? 'Desativar' : 'Ativar'}
          </Button>
        </Surface>
      ) : null}

      <View style={styles.sectionHeader}>
        <View>
          <Text variant="titleLarge" style={styles.sectionTitle}>
            {selectionMode ? `${selectedIds.size} selecionada${selectedIds.size === 1 ? '' : 's'}` : 'Suas credenciais'}
          </Text>
          <Text variant="bodySmall" style={styles.sectionSubtitle}>
            {selectionMode ? 'Escolha os itens que deseja excluir' : 'Toque para abrir ou segure para selecionar'}
          </Text>
        </View>
        {passwords.length > 0 ? (
          <View style={styles.selectionActions}>
            {selectionMode ? (
              <>
                <Button compact mode="text" onPress={selectAll}>Todos</Button>
                <IconButton
                  icon="close"
                  size={20}
                  onPress={cancelSelection}
                  accessibilityLabel="Cancelar seleção"
                />
              </>
            ) : (
              <Button compact mode="text" icon="checkbox-multiple-marked-outline" onPress={() => setSelectionMode(true)}>
                Selecionar
              </Button>
            )}
          </View>
        ) : null}
      </View>
    </>
  );

  const emptyState = (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIcon}>
        <Icon source="key-plus" size={38} color={colors.primary} />
      </View>
      <Text variant="titleMedium" style={styles.emptyTitle}>Seu cofre está vazio</Text>
      <Text variant="bodyMedium" style={styles.emptyDescription}>
        Adicione sua primeira credencial para começar.
      </Text>
      <Button
        mode="contained"
        icon="plus"
        onPress={() => navigation.navigate('CreatePassword')}
        style={styles.emptyButton}
      >
        Nova credencial
      </Button>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />
      <View pointerEvents="none" style={styles.backgroundGlow} />
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={colors.accent} size="large" />
          <Text variant="bodyMedium" style={styles.loadingText}>Desbloqueando o cofre…</Text>
        </View>
      ) : (
        <FlatList
          data={passwords}
          renderItem={({ item, index }) => (
            <PasswordItem
              item={item}
              index={index}
              selectionMode={selectionMode}
              selected={selectedIds.has(item.id)}
              onPress={() => selectionMode
                ? toggleSelection(item.id)
                : navigation.navigate('ViewPassword', { passwordId: item.id })}
              onLongPress={() => toggleSelection(item.id)}
            />
          )}
          keyExtractor={item => item.id}
          ListHeaderComponent={listHeader}
          ListEmptyComponent={emptyState}
          contentContainerStyle={[styles.listContent, passwords.length === 0 && styles.emptyList]}
          showsVerticalScrollIndicator={false}
        />
      )}
      {!loading && passwords.length > 0 && !selectionMode ? (
        <FAB
          icon="plus"
          label="Nova"
          color={colors.white}
          style={styles.fab}
          onPress={() => navigation.navigate('CreatePassword')}
        />
      ) : null}
      {!loading && selectionMode ? (
        <FAB
          icon="delete-outline"
          label={`Excluir (${selectedIds.size})`}
          color={colors.white}
          style={[styles.fab, styles.deleteFab]}
          disabled={selectedIds.size === 0}
          onPress={() => setConfirmDeleteVisible(true)}
        />
      ) : null}

      <Portal>
        <Dialog
          visible={confirmDeleteVisible}
          onDismiss={() => !deleting && setConfirmDeleteVisible(false)}
          style={styles.dialog}
        >
          <Dialog.Icon icon="alert-outline" color={colors.danger} />
          <Dialog.Title style={styles.dialogTitle}>Excluir credenciais?</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium" style={styles.dialogText}>
              {selectedIds.size === 1
                ? 'Esta credencial será removida permanentemente do cofre.'
                : `As ${selectedIds.size} credenciais selecionadas serão removidas permanentemente do cofre.`}
            </Text>
            <Text variant="bodySmall" style={styles.dialogWarning}>Esta ação não pode ser desfeita.</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setConfirmDeleteVisible(false)} disabled={deleting}>Cancelar</Button>
            <Button
              mode="contained"
              buttonColor={colors.danger}
              onPress={confirmDeletion}
              loading={deleting}
              disabled={deleting}
            >
              Excluir
            </Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog
          visible={deleteProfileVisible}
          onDismiss={() => !deletingProfile && setDeleteProfileVisible(false)}
          style={styles.dialog}
        >
          <Dialog.Icon icon="account-remove-outline" color={colors.danger} />
          <Dialog.Title style={styles.dialogTitle}>
            Excluir perfil {user?.name}?
          </Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium" style={styles.dialogText}>
              Este perfil e todas as suas credenciais serão apagados permanentemente deste aparelho.
              Os outros perfis não serão alterados.
            </Text>
            <TextInput
              label="Senha mestre"
              value={profilePassword}
              onChangeText={value => {
                setProfilePassword(value);
                setProfileDeleteError('');
              }}
              mode="outlined"
              secureTextEntry={!showProfilePassword}
              autoCapitalize="none"
              autoCorrect={false}
              disabled={deletingProfile}
              style={styles.profilePasswordInput}
              left={<TextInput.Icon icon="lock-outline" />}
              right={
                <TextInput.Icon
                  icon={showProfilePassword ? 'eye-off-outline' : 'eye-outline'}
                  onPress={() => setShowProfilePassword(current => !current)}
                />
              }
            />
            {profileDeleteError ? (
              <Text variant="bodySmall" style={styles.profileDeleteError}>
                {profileDeleteError}
              </Text>
            ) : null}
            <Text variant="bodySmall" style={styles.dialogWarning}>
              Esta ação não pode ser desfeita.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button
              onPress={() => setDeleteProfileVisible(false)}
              disabled={deletingProfile}
            >
              Cancelar
            </Button>
            <Button
              mode="contained"
              buttonColor={colors.danger}
              onPress={handleDeleteProfile}
              loading={deletingProfile}
              disabled={deletingProfile}
            >
              Excluir perfil
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  backgroundGlow: {
    position: 'absolute', width: 300, height: 300, borderRadius: 150,
    backgroundColor: colors.primarySoft, opacity: 0.3, top: -190, right: -90,
  },
  listContent: { paddingHorizontal: 18, paddingBottom: 110 },
  emptyList: { flexGrow: 1 },
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 12, paddingBottom: 22,
  },
  brandRow: { flexDirection: 'row', alignItems: 'center' },
  smallLogo: {
    width: 46, height: 46, borderRadius: 16, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  eyebrow: { color: colors.textDim, letterSpacing: 1.25, fontWeight: '700' },
  greeting: { color: colors.text, fontWeight: '800', marginTop: 1 },
  logoutButton: { backgroundColor: colors.surface },
  menuContent: { backgroundColor: colors.surfaceRaised },
  deleteMenuText: { color: colors.danger },
  summaryCard: {
    overflow: 'hidden', backgroundColor: colors.primaryDeep, borderRadius: radius.large,
    padding: 20, marginBottom: 14,
  },
  summaryGlow: {
    position: 'absolute', width: 180, height: 180, borderRadius: 90,
    backgroundColor: colors.primary, opacity: 0.48, right: -70, top: -90,
  },
  summaryTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  summaryLabel: { color: '#B8C8F4', letterSpacing: 0.8, fontWeight: '700' },
  summaryNumber: { color: colors.white, fontSize: 48, lineHeight: 58, fontWeight: '800' },
  summaryIcon: {
    width: 54, height: 54, borderRadius: 19, backgroundColor: 'rgba(7,10,15,0.28)',
    alignItems: 'center', justifyContent: 'center',
  },
  summaryFooter: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  statusDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.success, marginRight: 8 },
  summaryStatus: { color: '#C7D3F2' },
  securityCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface,
    borderRadius: radius.medium, borderWidth: 1, borderColor: colors.border,
    padding: 12, marginBottom: 26,
  },
  securityIcon: {
    width: 42, height: 42, borderRadius: 14, backgroundColor: colors.surfaceRaised,
    alignItems: 'center', justifyContent: 'center', marginRight: 11,
  },
  securityIconEnabled: { backgroundColor: '#10332B' },
  securityText: { flex: 1, paddingRight: 6 },
  securityTitle: { color: colors.text, fontWeight: '700' },
  securitySubtitle: { color: colors.textMuted, marginTop: 2 },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 14,
  },
  selectionActions: { flexDirection: 'row', alignItems: 'center' },
  sectionTitle: { color: colors.text, fontWeight: '800' },
  sectionSubtitle: { color: colors.textMuted, marginTop: 3 },
  itemPressable: { marginBottom: 11 },
  itemPressed: { opacity: 0.72, transform: [{ scale: 0.99 }] },
  itemCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface,
    borderRadius: radius.medium, borderWidth: 1, borderColor: colors.border, padding: 13,
  },
  itemCardSelected: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  itemIcon: {
    width: 46, height: 46, borderRadius: 15, backgroundColor: colors.accentSoft,
    alignItems: 'center', justifyContent: 'center', marginRight: 13,
  },
  itemIconSelected: { backgroundColor: colors.primary },
  itemText: { flex: 1 },
  itemTitle: { color: colors.text, fontWeight: '700' },
  itemSubtitle: { color: colors.textDim, marginTop: 4, letterSpacing: 0.3 },
  chevron: {
    width: 34, height: 34, borderRadius: 12, backgroundColor: colors.surfaceRaised,
    alignItems: 'center', justifyContent: 'center', marginLeft: 8,
  },
  selectedIndicator: { backgroundColor: colors.text },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 44, paddingHorizontal: 24 },
  emptyIcon: {
    width: 78, height: 78, borderRadius: 27, backgroundColor: colors.primarySoft,
    alignItems: 'center', justifyContent: 'center', marginBottom: 18,
  },
  emptyTitle: { color: colors.text, fontWeight: '700' },
  emptyDescription: { color: colors.textMuted, textAlign: 'center', marginTop: 7, marginBottom: 20 },
  emptyButton: { borderRadius: radius.medium },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: colors.textMuted, marginTop: 14 },
  fab: { position: 'absolute', right: 18, bottom: 20, backgroundColor: colors.accent, borderRadius: radius.medium },
  deleteFab: { backgroundColor: colors.danger },
  dialog: { backgroundColor: colors.surface, borderRadius: radius.large },
  dialogTitle: { color: colors.text, textAlign: 'center', fontWeight: '700' },
  dialogText: { color: colors.textMuted, textAlign: 'center', lineHeight: 21 },
  dialogWarning: { color: colors.danger, textAlign: 'center', marginTop: 10, fontWeight: '700' },
  profilePasswordInput: { backgroundColor: colors.backgroundSoft, marginTop: 18 },
  profileDeleteError: { color: '#FCA5A5', marginTop: 8 },
});

export default ListScreen;
