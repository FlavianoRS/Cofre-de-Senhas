import React, { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Icon, Surface, Text } from 'react-native-paper';
import { colors, radius } from '../theme';

type SectionCardProps = {
  title: string;
  subtitle?: string;
  icon: string;
  children: ReactNode;
};

const SectionCard: React.FC<SectionCardProps> = ({
  title,
  subtitle,
  icon,
  children,
}) => (
  <Surface style={styles.card} elevation={1}>
    <View style={styles.header}>
      <View style={styles.iconContainer}>
        <Icon source={icon} size={21} color={colors.text} />
      </View>
      <View style={styles.headerText}>
        <Text variant="titleMedium" style={styles.title}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="bodySmall" style={styles.subtitle}>
            {subtitle}
          </Text>
        ) : null}
      </View>
    </View>
    {children}
  </Surface>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.large,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
    marginBottom: 16,
  },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  iconContainer: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
    marginRight: 12,
  },
  headerText: { flex: 1 },
  title: { color: colors.text, fontWeight: '700' },
  subtitle: { color: colors.textMuted, marginTop: 2 },
});

export default SectionCard;
