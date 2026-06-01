import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Modal,
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuthStore } from '../store/authStore';
import { COLORS, SPACING, ROUNDNESS, SHADOWS } from '../theme/theme';
import Text from '../components/ui/Text';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import ScreenContainer from '../components/ui/ScreenContainer';
import { RootStackParamList } from '../navigation/types';
import authApi from '../api/auth';
import { registerForPushNotificationsAsync } from '../utils/notifications';

type ProfileScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const ProfileScreen: React.FC = () => {
  const { user, logout, updateUser } = useAuthStore();
  const navigation = useNavigation<ProfileScreenNavigationProp>();

  // Edit Profile States
  const [editModalVisible, setEditModalVisible] = useState<boolean>(false);
  const [fullNameInput, setFullNameInput] = useState<string>('');
  const [phoneInput, setPhoneInput] = useState<string>('');
  const [isSubmittingProfile, setIsSubmittingProfile] = useState<boolean>(false);

  // Push Notifications States
  const [isPushEnabled, setIsPushEnabled] = useState<boolean>(!!user?.pushToken);
  const [isPushLoading, setIsPushLoading] = useState<boolean>(false);

  useEffect(() => {
    setIsPushEnabled(!!user?.pushToken);
  }, [user?.pushToken]);

  const handleOpenEditModal = () => {
    setFullNameInput(user?.fullName || '');
    setPhoneInput(user?.phone || '');
    setEditModalVisible(true);
  };

  const handleSaveProfile = async () => {
    if (fullNameInput.trim().length < 2) {
      Alert.alert('Validation Error', 'Full Name must be at least 2 characters.');
      return;
    }
    if (phoneInput.trim() && !/^\+?[0-9]{9,15}$/.test(phoneInput.trim())) {
      Alert.alert(
        'Validation Error',
        'Please enter a valid phone number (9–15 digits). Example: +251911234567'
      );
      return;
    }

    setIsSubmittingProfile(true);
    try {
      const res = await authApi.updateProfile({
        name: fullNameInput.trim(),
        phone: phoneInput.trim() || undefined,
      });

      if (res.success) {
        updateUser({
          fullName: res.data.user.name,
          phone: res.data.user.phone || undefined,
        });
        Alert.alert('Success', 'Profile updated successfully! ✅');
        setEditModalVisible(false);
      } else {
        Alert.alert('Error', res.message || 'Failed to update profile.');
      }
    } catch (err: any) {
      console.error('Update profile error:', err);
      Alert.alert('Error', 'Could not update profile.');
    } finally {
      setIsSubmittingProfile(false);
    }
  };

  const handlePushToggle = async (value: boolean) => {
    setIsPushLoading(true);
    try {
      if (value) {
        const token = await registerForPushNotificationsAsync();
        if (token) {
          setIsPushEnabled(true);
          Alert.alert('Notifications Enabled', 'Arrival alerts configured! 🔔');
        } else {
          setIsPushEnabled(false);
          Alert.alert('Permission Denied', 'Configure alerts inside your OS settings panel.');
        }
      } else {
        const res = await authApi.updatePushToken(null);
        if (res.success) {
          updateUser({ pushToken: undefined });
          setIsPushEnabled(false);
          Alert.alert('Notifications Disabled', 'Push notifications turned off.');
        } else {
          Alert.alert('Error', 'Failed to disable notifications.');
        }
      }
    } catch (err) {
      console.error('Toggle push error:', err);
    } finally {
      setIsPushLoading(false);
    }
  };

  return (
    <ScreenContainer safe={true} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Profile Header Card */}
        <View style={styles.profileHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>👤</Text>
          </View>
          <Text variant="h2" style={styles.name}>{user?.fullName || 'Addis Passenger'}</Text>
          <Text variant="caption" color={COLORS.textMuted}>{user?.email || 'commuter@addisbus.com'}</Text>
        </View>

        {/* Dynamic Passenger Statistics Grid */}
        <View style={styles.statsContainer}>
          <View style={styles.statBox}>
            <MaterialCommunityIcons name="bus-clock" size={24} color={COLORS.primary} />
            <Text variant="h2" style={styles.statCount}>24</Text>
            <Text variant="caption" color={COLORS.textMuted}>Trips Tracked</Text>
          </View>
          
          <View style={[styles.statBox, styles.statBoxMiddle]}>
            <MaterialCommunityIcons name="star" size={24} color={COLORS.accent} />
            <Text variant="h2" style={styles.statCount}>3</Text>
            <Text variant="caption" color={COLORS.textMuted}>Saved Routes</Text>
          </View>

          <View style={styles.statBox}>
            <MaterialCommunityIcons name="message-alert-outline" size={24} color={COLORS.danger} />
            <Text variant="h2" style={styles.statCount}>2</Text>
            <Text variant="caption" color={COLORS.textMuted}>Reports Filed</Text>
          </View>
        </View>

        {/* Favorite Routes Section */}
        <View style={styles.sectionCard}>
          <Text variant="bodySemibold" style={[styles.sectionTitle, { marginBottom: SPACING.md }]}>
            Saved / Favorite Routes
          </Text>
          <View style={styles.favoriteRow}>
            <View style={[styles.favBadge, { backgroundColor: COLORS.primary }]}>
              <Text variant="caption" color={COLORS.white} style={{ fontWeight: '700' }}>R-12</Text>
            </View>
            <Text variant="body" style={{ flex: 1, marginLeft: 12 }}>Megenagna ➔ Mexico Square</Text>
            <MaterialCommunityIcons name="star" size={20} color={COLORS.accent} />
          </View>

          <View style={[styles.favoriteRow, { borderBottomWidth: 0 }]}>
            <View style={[styles.favBadge, { backgroundColor: COLORS.accent }]}>
              <Text variant="caption" color={COLORS.white} style={{ fontWeight: '700' }}>R-04</Text>
            </View>
            <Text variant="body" style={{ flex: 1, marginLeft: 12 }}>Bole Medhanialem ➔ Piazza</Text>
            <MaterialCommunityIcons name="star" size={20} color={COLORS.accent} />
          </View>
        </View>

        {/* Account Details Card */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Text variant="bodySemibold" style={styles.sectionTitle}>Account Details</Text>
            <TouchableOpacity onPress={handleOpenEditModal} activeOpacity={0.6}>
              <Text variant="caption" color={COLORS.primary} style={styles.editLink}>
                Edit Profile
              </Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.infoRow}>
            <Text variant="body" color={COLORS.textMuted}>Phone Number</Text>
            <Text variant="bodySemibold">{user?.phone || 'Not provided'}</Text>
          </View>
          <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
            <Text variant="body" color={COLORS.textMuted}>Account Status</Text>
            <Text variant="bodySemibold" color={COLORS.success}>Verified Commuter ✓</Text>
          </View>
        </View>

        {/* Preferences & Support Card */}
        <View style={styles.sectionCard}>
          <Text variant="bodySemibold" style={[styles.sectionTitle, { marginBottom: SPACING.md }]}>
            Preferences & Support
          </Text>

          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <MaterialCommunityIcons name="bell-ring-outline" size={22} color={COLORS.primary} style={styles.settingIcon} />
              <View>
                <Text variant="bodySemibold">Push Notifications</Text>
                <Text variant="caption" color={COLORS.textMuted}>
                  Alerts on approaching buses
                </Text>
              </View>
            </View>
            {isPushLoading ? (
              <ActivityIndicator size="small" color={COLORS.primary} />
            ) : (
              <Switch
                value={isPushEnabled}
                onValueChange={handlePushToggle}
                trackColor={{ false: COLORS.borderDark, true: COLORS.primary }}
                thumbColor={Platform.OS === 'android' ? COLORS.white : undefined}
              />
            )}
          </View>

          <TouchableOpacity 
            style={[styles.settingRow, { borderBottomWidth: 0 }]} 
            onPress={() => navigation.navigate('Feedback')}
            activeOpacity={0.7}
          >
            <View style={styles.settingLeft}>
              <MaterialCommunityIcons name="message-draw" size={22} color={COLORS.primary} style={styles.settingIcon} />
              <View style={styles.settingTextCol}>
                <Text variant="bodySemibold">Feedback & Support</Text>
                <Text variant="caption" color={COLORS.textMuted}>
                  Report complaints or routes
                </Text>
              </View>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={22} color={COLORS.textLight} />
          </TouchableOpacity>
        </View>

        {/* Sign Out Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={logout} activeOpacity={0.8}>
          <Text variant="button" color={COLORS.white}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* EDIT PROFILE MODAL */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalDismissArea}
            activeOpacity={1}
            onPress={() => setEditModalVisible(false)}
          />
          <View style={styles.bottomSheet}>
            <View style={styles.sheetHandle} />
            
            <View style={styles.sheetTitleRow}>
              <Text variant="h3" style={styles.sheetTitle}>Edit Profile Info</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <MaterialCommunityIcons name="close" size={20} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.sheetContent}>
              <Input
                label="Full Name"
                placeholder="Abebe Girma"
                value={fullNameInput}
                onChangeText={setFullNameInput}
                icon="👤"
              />

              <Input
                label="Phone Number"
                placeholder="+251911234567"
                value={phoneInput}
                onChangeText={setPhoneInput}
                keyboardType="phone-pad"
                icon="📞"
              />
              <Text variant="caption" color={COLORS.textMuted} style={{ marginTop: -10, marginBottom: 16, paddingHorizontal: 4 }}>
                Format: +251911234567
              </Text>

              <View style={styles.modalActionsRow}>
                <TouchableOpacity 
                  style={[styles.modalBtn, styles.modalBtnCancel]} 
                  onPress={() => setEditModalVisible(false)}
                  disabled={isSubmittingProfile}
                >
                  <Text variant="bodySemibold" color={COLORS.textMuted}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.modalBtn, styles.modalBtnSave]} 
                  onPress={handleSaveProfile}
                  disabled={isSubmittingProfile}
                >
                  {isSubmittingProfile ? (
                    <ActivityIndicator color={COLORS.white} size="small" />
                  ) : (
                    <Text variant="bodySemibold" color={COLORS.white}>Save Details</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
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
    paddingTop: 16,
    paddingBottom: 40,
  },
  profileHeader: {
    alignItems: 'center',
    marginVertical: SPACING.lg,
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
    borderWidth: 1.5,
    borderColor: COLORS.primary + '20',
  },
  avatarText: {
    fontSize: 44,
  },
  name: {
    color: COLORS.secondary, // Navy
    marginBottom: 2,
    fontWeight: '700',
  },
  
  // Passenger statistics grid
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: ROUNDNESS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 14,
    marginBottom: SPACING.xl,
    ...SHADOWS.light,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statBoxMiddle: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: COLORS.borderDark,
  },
  statCount: {
    fontWeight: '800',
    fontSize: 20,
    marginVertical: 2,
    color: COLORS.secondary,
  },

  // Favorite Row style
  favoriteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  favBadge: {
    width: 44,
    height: 24,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Section Card Styling
  sectionCard: {
    backgroundColor: COLORS.surface,
    padding: SPACING.lg,
    borderRadius: ROUNDNESS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.xl,
    ...SHADOWS.light,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    color: COLORS.secondary, // Navy
  },
  editLink: {
    fontWeight: '600',
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },

  // Settings preferences rows
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingIcon: {
    marginRight: 14,
  },
  settingTextCol: {
    gap: 2,
  },

  // Sign out button
  logoutButton: {
    backgroundColor: COLORS.danger,
    height: 56,
    borderRadius: ROUNDNESS.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: SPACING.md,
    ...SHADOWS.light,
  },

  // Bottom sheet modal styling
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalDismissArea: {
    flex: 1,
  },
  bottomSheet: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: ROUNDNESS.xxl,
    borderTopRightRadius: ROUNDNESS.xxl,
    paddingTop: SPACING.md,
    maxHeight: '80%',
  },
  sheetHandle: {
    width: 40,
    height: 5,
    backgroundColor: COLORS.borderDark,
    borderRadius: 2.5,
    alignSelf: 'center',
    marginBottom: SPACING.md,
  },
  sheetTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  sheetTitle: {
    fontWeight: '700',
  },
  sheetContent: {
    padding: 24,
    paddingBottom: 40,
  },
  modalActionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: SPACING.xl,
  },
  modalBtn: {
    flex: 1,
    height: 52,
    borderRadius: ROUNDNESS.md,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  modalBtnCancel: {
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  modalBtnSave: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
});

export default ProfileScreen;
