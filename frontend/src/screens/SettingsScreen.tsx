import React from 'react';
import { View, StyleSheet, TouchableOpacity, Switch, Platform, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, SPACING, ROUNDNESS, SHADOWS } from '../theme/theme';
import Text from '../components/ui/Text';
import ScreenContainer from '../components/ui/ScreenContainer';
import usePreferenceStore, { ThemeMode, LanguageMode } from '../store/preferenceStore';
import useTranslation from '../utils/i18n';

export const SettingsScreen: React.FC = () => {
  const navigation = useNavigation();
  const { t } = useTranslation();

  const {
    theme,
    setTheme,
    language,
    setLanguage,
    busAlerts,
    setBusAlerts,
    etaAlerts,
    setEtaAlerts,
    appUpdates,
    setAppUpdates
  } = usePreferenceStore();

  return (
    <ScreenContainer safe={true} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Appearance Options */}
        <Text variant="bodySemibold" style={styles.sectionHeader}>{t('appearance')}</Text>
        <View style={styles.sectionCard}>
          <View style={styles.themeSelectorRow}>
            {(['light', 'dark', 'system'] as ThemeMode[]).map((mode) => {
              const isActive = theme === mode;
              const label = t(mode as any);
              let icon: keyof typeof MaterialCommunityIcons.glyphMap = 'weather-sunny';
              if (mode === 'dark') icon = 'weather-night';
              if (mode === 'system') icon = 'cellphone-cog';

              return (
                <TouchableOpacity
                  key={mode}
                  style={[
                    styles.themeChip,
                    isActive && styles.themeChipActive,
                  ]}
                  onPress={() => setTheme(mode)}
                  activeOpacity={0.7}
                >
                  <MaterialCommunityIcons 
                    name={icon} 
                    size={20} 
                    color={isActive ? COLORS.white : COLORS.textLight} 
                  />
                  <Text 
                    variant="caption" 
                    color={isActive ? COLORS.white : COLORS.text} 
                    style={[styles.themeChipLabel, isActive && styles.themeChipLabelActive]}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Language Options */}
        <Text variant="bodySemibold" style={styles.sectionHeader}>{t('language')}</Text>
        <View style={styles.sectionCard}>
          <TouchableOpacity 
            style={[styles.row, language === 'en' && styles.rowSelected]} 
            onPress={() => setLanguage('en')}
            activeOpacity={0.7}
          >
            <View style={styles.rowLeft}>
              <MaterialCommunityIcons name="translate" size={22} color={COLORS.primary} style={styles.rowIcon} />
              <View>
                <Text variant="bodySemibold">English</Text>
                <Text variant="caption" color={COLORS.textMuted}>{t('default_lang')}</Text>
              </View>
            </View>
            {language === 'en' && (
              <MaterialCommunityIcons name="check-circle" size={22} color={COLORS.primary} />
            )}
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.row, { borderBottomWidth: 0 }, language === 'am' && styles.rowSelected]} 
            onPress={() => setLanguage('am')}
            activeOpacity={0.7}
          >
            <View style={styles.rowLeft}>
              <MaterialCommunityIcons name="translate" size={22} color={COLORS.accent} style={styles.rowIcon} />
              <View>
                <Text variant="bodySemibold">አማርኛ (Amharic)</Text>
                <Text variant="caption" color={COLORS.textMuted}>የአማርኛ ቋንቋ መምረጫ</Text>
              </View>
            </View>
            {language === 'am' && (
              <MaterialCommunityIcons name="check-circle" size={22} color={COLORS.accent} />
            )}
          </TouchableOpacity>
        </View>

        {/* Notifications Config */}
        <Text variant="bodySemibold" style={styles.sectionHeader}>{t('notifications')}</Text>
        <View style={styles.sectionCard}>
          <View style={styles.switchRow}>
            <View style={styles.rowLeft}>
              <MaterialCommunityIcons name="bus-alert" size={22} color={COLORS.primary} style={styles.rowIcon} />
              <View style={styles.switchTextContainer}>
                <Text variant="bodySemibold">{t('bus_alerts')}</Text>
                <Text variant="caption" color={COLORS.textMuted}>{t('bus_alerts_desc')}</Text>
              </View>
            </View>
            <Switch
              value={busAlerts}
              onValueChange={setBusAlerts}
              trackColor={{ false: COLORS.borderDark, true: COLORS.primary }}
              thumbColor={Platform.OS === 'android' ? COLORS.white : undefined}
            />
          </View>

          <View style={styles.switchRow}>
            <View style={styles.rowLeft}>
              <MaterialCommunityIcons name="clock-alert-outline" size={22} color={COLORS.primary} style={styles.rowIcon} />
              <View style={styles.switchTextContainer}>
                <Text variant="bodySemibold">{t('eta_alerts')}</Text>
                <Text variant="caption" color={COLORS.textMuted}>{t('eta_alerts_desc')}</Text>
              </View>
            </View>
            <Switch
              value={etaAlerts}
              onValueChange={setEtaAlerts}
              trackColor={{ false: COLORS.borderDark, true: COLORS.primary }}
              thumbColor={Platform.OS === 'android' ? COLORS.white : undefined}
            />
          </View>

          <View style={[styles.switchRow, { borderBottomWidth: 0 }]}>
            <View style={styles.rowLeft}>
              <MaterialCommunityIcons name="cellphone-arrow-down" size={22} color={COLORS.primary} style={styles.rowIcon} />
              <View style={styles.switchTextContainer}>
                <Text variant="bodySemibold">{t('app_updates')}</Text>
                <Text variant="caption" color={COLORS.textMuted}>{t('app_updates_desc')}</Text>
              </View>
            </View>
            <Switch
              value={appUpdates}
              onValueChange={setAppUpdates}
              trackColor={{ false: COLORS.borderDark, true: COLORS.primary }}
              thumbColor={Platform.OS === 'android' ? COLORS.white : undefined}
            />
          </View>
        </View>

        {/* Info card */}
        <View style={styles.infoCard}>
          <MaterialCommunityIcons name="information-outline" size={20} color={COLORS.textMuted} />
          <Text variant="caption" color={COLORS.textMuted} style={styles.infoCardText}>
            {t('info_version')}
          </Text>
        </View>

      </ScrollView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 40,
  },
  sectionHeader: {
    color: COLORS.secondary, // Navy
    fontSize: 15,
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
    paddingHorizontal: 4,
  },
  sectionCard: {
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: ROUNDNESS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.sm,
    ...SHADOWS.light,
  },
  themeSelectorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  themeChip: {
    flex: 1,
    height: 48,
    borderRadius: ROUNDNESS.md,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  themeChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  themeChipLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  themeChipLabelActive: {
    fontWeight: '700',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingHorizontal: 4,
  },
  rowSelected: {
    backgroundColor: COLORS.primaryLight + '25',
    borderRadius: ROUNDNESS.md,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  rowIcon: {
    marginRight: 14,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingHorizontal: 4,
  },
  switchTextContainer: {
    flex: 1,
    marginRight: 8,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: ROUNDNESS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    marginTop: SPACING.xl,
    alignItems: 'center',
    gap: 8,
  },
  infoCardText: {
    flex: 1,
    lineHeight: 16,
  },
});

export default SettingsScreen;
