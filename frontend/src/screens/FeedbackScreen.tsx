import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  ActivityIndicator,
  Modal,
  ScrollView,
  RefreshControl,
  Animated,
  Alert,
  Platform,
  UIManager,
  Dimensions,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, SPACING, ROUNDNESS, SHADOWS } from '../theme/theme';
import Text from '../components/ui/Text';
import Button from '../components/ui/Button';
import ScreenContainer from '../components/ui/ScreenContainer';
import routesApi, { Route } from '../api/routes';
import feedbackApi, { FeedbackItem, FeedbackCategory } from '../api/feedback';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const FALLBACK_CATEGORIES: FeedbackCategory[] = [
  { value: 'OVERCROWDING', label: 'Overcrowding', icon: '👥' },
  { value: 'LATE_ARRIVAL', label: 'Late Arrival', icon: '⏰' },
  { value: 'RUDE_DRIVER', label: 'Rude Driver', icon: '😠' },
  { value: 'VEHICLE_CONDITION', label: 'Vehicle Condition', icon: '🔧' },
  { value: 'WRONG_ROUTE', label: 'Wrong Route', icon: '🗺️' },
  { value: 'OTHER', label: 'Other', icon: '📝' },
];

const formatDate = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch (error) {
    return 'Recently';
  }
};

const SkeletonCard: React.FC = () => {
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 800, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  return (
    <Animated.View style={[styles.skeletonCard, { opacity }]}>
      <View style={styles.skeletonLeft}>
        <View style={styles.skeletonIcon} />
        <View style={styles.skeletonTextCol}>
          <View style={styles.skeletonTitle} />
          <View style={styles.skeletonDate} />
        </View>
      </View>
      <View style={styles.skeletonStatus} />
    </Animated.View>
  );
};

export const FeedbackScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'submit' | 'history'>('submit');

  // Submit states
  const [categories, setCategories] = useState<FeedbackCategory[]>(FALLBACK_CATEGORIES);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [message, setMessage] = useState<string>('');
  const [allRoutes, setAllRoutes] = useState<Route[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);
  const [routeModalVisible, setRouteModalVisible] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isCategoriesLoading, setIsCategoriesLoading] = useState<boolean>(false);

  // History states
  const [history, setHistory] = useState<FeedbackItem[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [selectedDetailItem, setSelectedDetailItem] = useState<FeedbackItem | null>(null);

  useEffect(() => {
    const loadFormData = async () => {
      setIsCategoriesLoading(true);
      try {
        const [catRes, routesRes] = await Promise.all([
          feedbackApi.getCategories().catch(() => null),
          routesApi.getAll().catch(() => null),
        ]);
        if (catRes && catRes.success) setCategories(catRes.data.categories);
        if (routesRes && routesRes.success) setAllRoutes(routesRes.data.routes);
      } catch (err) {
        console.error('Error loading feedback categories:', err);
      } finally {
        setIsCategoriesLoading(false);
      }
    };
    loadFormData();
  }, []);

  const fetchHistory = async (showLoader = true) => {
    if (showLoader) setIsHistoryLoading(true);
    try {
      const res = await feedbackApi.getMyFeedback();
      if (res.success) setHistory(res.data.feedback);
    } catch (err) {
      console.error('Failed to load feedback history:', err);
    } finally {
      setIsHistoryLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'history') fetchHistory();
  }, [activeTab]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchHistory(false);
  };

  const handleFormSubmit = async () => {
    if (!selectedCategory) {
      Alert.alert('Error', 'Please choose a feedback category.');
      return;
    }
    if (message.trim().length < 10) {
      Alert.alert('Error', 'Please describe the incident in at least 10 characters.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await feedbackApi.submit({
        category: selectedCategory,
        message: message.trim(),
        routeId: selectedRoute?.id,
      });

      if (res.success) {
        Alert.alert(
          'Report Submitted',
          'Thank you for your report! Addis Ababa Transit operators will review this incident shortly.'
        );
        setSelectedCategory(null);
        setSelectedRoute(null);
        setMessage('');
        setActiveTab('history');
      } else {
        Alert.alert('Submission Error', res.message || 'Failed to submit report.');
      }
    } catch (err: any) {
      console.error('Submit report error:', err);
      Alert.alert('Network Error', 'Could not send feedback. Please check your internet connection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderHistoryItem = ({ item }: { item: FeedbackItem }) => {
    return (
      <TouchableOpacity
        style={styles.historyCard}
        onPress={() => setSelectedDetailItem(item)}
        activeOpacity={0.75}
      >
        <View style={styles.historyCardHeader}>
          <View style={styles.categoryInfo}>
            <View style={styles.historyIconCircle}>
              <Text style={{ fontSize: 18 }}>{item.categoryIcon || '📝'}</Text>
            </View>
            <View style={{ marginLeft: SPACING.md, flex: 1 }}>
              <Text variant="bodySemibold">{item.categoryLabel}</Text>
              <Text variant="caption" color={COLORS.textLight}>
                {formatDate(item.createdAt)}
              </Text>
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: (item.statusColor || '#ccc') + '15' }]}>
            <Text 
              variant="caption" 
              style={[styles.statusBadgeText, { color: item.statusColor || '#666' }]}
            >
              {item.statusLabel}
            </Text>
          </View>
        </View>

        <Text variant="body" color={COLORS.textMuted} numberOfLines={2} style={styles.historyMessageSnippet}>
          {item.message}
        </Text>

        {item.route && (
          <View style={styles.historyRoutePill}>
            <View style={[styles.routeDot, { backgroundColor: item.route.color }]} />
            <Text variant="caption" color={COLORS.textMuted}>
              Route {item.route.routeNumber} • {item.route.name}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <ScreenContainer safe={true} style={styles.container}>
      {/* SEGMENT TAB SWITCHER PILLS */}
      <View style={styles.tabOuterContainer}>
        <View style={styles.tabPillContainer}>
          <TouchableOpacity
            style={[styles.tabPill, activeTab === 'submit' && styles.tabPillActive]}
            onPress={() => setActiveTab('submit')}
            activeOpacity={0.8}
          >
            <Text 
              variant="bodySemibold" 
              color={activeTab === 'submit' ? COLORS.white : COLORS.textMuted}
            >
              Submit Report
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabPill, activeTab === 'history' && styles.tabPillActive]}
            onPress={() => setActiveTab('history')}
            activeOpacity={0.8}
          >
            <Text 
              variant="bodySemibold" 
              color={activeTab === 'history' ? COLORS.white : COLORS.textMuted}
            >
              My History
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* SUBMIT FORM TAB */}
      {activeTab === 'submit' && (
        <ScrollView 
          contentContainerStyle={styles.scrollContent} 
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text variant="h2" color={COLORS.secondary} style={styles.sectionTitle}>
            How can we improve?
          </Text>
          <Text variant="body" color={COLORS.textMuted} style={styles.sectionSubtitle}>
            Your feedback helps us make Addis Ababa public transit safer, cleaner, and more reliable for everyone.
          </Text>

          {/* Category selection */}
          <Text variant="bodySemibold" style={styles.inputLabel}>
            Select Category
          </Text>
          {isCategoriesLoading ? (
            <ActivityIndicator color={COLORS.primary} style={{ marginVertical: SPACING.md }} />
          ) : (
            <View style={styles.gridContainer}>
              {categories.map((cat) => {
                const isSelected = selectedCategory === cat.value;
                return (
                  <TouchableOpacity
                    key={cat.value}
                    style={[
                      styles.categoryCard,
                      isSelected && styles.categoryCardSelected,
                    ]}
                    onPress={() => setSelectedCategory(cat.value)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.categoryIcon}>{cat.icon}</Text>
                    <Text 
                      variant="caption" 
                      color={isSelected ? COLORS.primary : COLORS.text} 
                      style={[styles.categoryLabel, isSelected && styles.categoryLabelSelected]}
                    >
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* Route link */}
          <Text variant="bodySemibold" style={styles.inputLabel}>
            Associated Route (Optional)
          </Text>
          <TouchableOpacity
            style={styles.routeSelector}
            onPress={() => setRouteModalVisible(true)}
            activeOpacity={0.75}
          >
            {selectedRoute ? (
              <View style={styles.routeInfoSelected}>
                <View style={[styles.routeColorBadge, { backgroundColor: selectedRoute.color || COLORS.primary }]}>
                  <Text variant="caption" color={COLORS.white} style={{ fontWeight: '700' }}>
                    {selectedRoute.routeNumber}
                  </Text>
                </View>
                <Text variant="body" style={{ flex: 1, marginLeft: SPACING.md }}>
                  {selectedRoute.name}
                </Text>
                <TouchableOpacity onPress={() => setSelectedRoute(null)}>
                  <MaterialCommunityIcons name="close-circle" size={18} color={COLORS.textLight} />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.routePlaceholder}>
                <MaterialCommunityIcons name="bus-side" size={20} color={COLORS.textLight} style={{ marginRight: 8 }} />
                <Text variant="body" color={COLORS.textLight}>Select route this occurred on...</Text>
                <MaterialCommunityIcons name="chevron-down" size={16} color={COLORS.textLight} style={{ marginLeft: 'auto' }} />
              </View>
            )}
          </TouchableOpacity>

          {/* Description Textarea */}
          <Text variant="bodySemibold" style={styles.inputLabel}>
            Description
          </Text>
          <View style={styles.textAreaContainer}>
            <TextInput
              style={styles.textArea}
              placeholder="Describe what happened. Include stops, times, or bus plates if helpful..."
              placeholderTextColor={COLORS.textLight}
              multiline
              maxLength={1000}
              value={message}
              onChangeText={setMessage}
              textAlignVertical="top"
            />
            <View style={styles.textCounterRow}>
              <Text 
                variant="caption" 
                color={message.length < 10 && message.length > 0 ? COLORS.danger : COLORS.textLight}
              >
                {message.length < 10 && message.length > 0 
                  ? `Min 10 characters (${10 - message.length} left)` 
                  : `${message.length}/1000 characters`
                }
              </Text>
            </View>
          </View>

          {/* Submit Button */}
          <Button
            title="Submit Report"
            onPress={handleFormSubmit}
            loading={isSubmitting}
            disabled={!selectedCategory || message.trim().length < 10 || isSubmitting}
            style={styles.submitBtn}
          />
        </ScrollView>
      )}

      {/* HISTORY TAB */}
      {activeTab === 'history' && (
        <View style={{ flex: 1 }}>
          {isHistoryLoading ? (
            <FlatList
              data={[1, 2, 3]}
              keyExtractor={(item) => item.toString()}
              contentContainerStyle={styles.historyList}
              renderItem={() => <SkeletonCard />}
            />
          ) : (
            <FlatList
              data={history}
              keyExtractor={(item) => item.id}
              renderItem={renderHistoryItem}
              contentContainerStyle={styles.historyList}
              refreshControl={
                <RefreshControl
                  refreshing={isRefreshing}
                  onRefresh={handleRefresh}
                  colors={[COLORS.primary]}
                  tintColor={COLORS.primary}
                />
              }
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <View style={styles.emptyIconCircle}>
                    <MaterialCommunityIcons name="message-text-clock-outline" size={40} color={COLORS.textLight} />
                  </View>
                  <Text variant="h3" style={styles.emptyTitle}>No Submissions</Text>
                  <Text variant="body" color={COLORS.textMuted} style={styles.emptyText}>
                    You haven't filed any feedback reports yet. If you encounter issues, file a ticket under the Submit tab.
                  </Text>
                  <Button
                    title="Write a Complaint"
                    onPress={() => setActiveTab('submit')}
                    style={styles.emptyButton}
                  />
                </View>
              }
            />
          )}
        </View>
      )}

      {/* ROUTE PICKER MODAL */}
      <Modal
        visible={routeModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setRouteModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalDismissArea}
            activeOpacity={1}
            onPress={() => setRouteModalVisible(false)}
          />
          <View style={[styles.bottomSheet, { height: SCREEN_HEIGHT * 0.65 }]}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetTitleRow}>
              <Text variant="h3" style={styles.sheetTitle}>Select Affected Route</Text>
              <TouchableOpacity onPress={() => setRouteModalVisible(false)}>
                <MaterialCommunityIcons name="close" size={20} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            <FlatList
              data={allRoutes}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ paddingHorizontal: SPACING.lg, paddingBottom: 40 }}
              renderItem={({ item }) => {
                const isSelected = item.id === selectedRoute?.id;
                return (
                  <TouchableOpacity
                    style={[
                      styles.routePickerCard,
                      isSelected && { borderColor: item.color || COLORS.primary, borderWidth: 1.5 },
                    ]}
                    onPress={() => {
                      setSelectedRoute(item);
                      setRouteModalVisible(false);
                    }}
                    activeOpacity={0.75}
                  >
                    <View style={[styles.routePickerBadge, { backgroundColor: item.color || COLORS.primary }]}>
                      <Text variant="caption" color={COLORS.white} style={{ fontWeight: '700', fontSize: 10 }}>
                        {item.routeNumber}
                      </Text>
                    </View>
                    <View style={{ flex: 1, marginLeft: SPACING.md }}>
                      <Text variant="bodySemibold" numberOfLines={1}>{item.name}</Text>
                    </View>
                    {isSelected && <MaterialCommunityIcons name="check" size={18} color={item.color || COLORS.primary} />}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </View>
      </Modal>

      {/* DETAIL MODAL */}
      <Modal
        visible={!!selectedDetailItem}
        animationType="fade"
        transparent
        onRequestClose={() => setSelectedDetailItem(null)}
      >
        <View style={styles.modalOverlayCenter}>
          <View style={styles.detailModalCard}>
            {selectedDetailItem && (
              <>
                <View style={styles.detailHeader}>
                  <View style={styles.detailCategory}>
                    <Text style={{ fontSize: 24, marginRight: 8 }}>
                      {selectedDetailItem.categoryIcon || '📝'}
                    </Text>
                    <Text variant="h3">{selectedDetailItem.categoryLabel}</Text>
                  </View>
                  <TouchableOpacity onPress={() => setSelectedDetailItem(null)}>
                    <MaterialCommunityIcons name="close" size={20} color={COLORS.textMuted} />
                  </TouchableOpacity>
                </View>

                <View style={styles.detailDivider} />

                <ScrollView style={styles.detailScroll} showsVerticalScrollIndicator={false}>
                  <View style={styles.detailRow}>
                    <Text variant="caption" color={COLORS.textLight}>Status</Text>
                    <View style={[styles.detailStatusPill, { backgroundColor: selectedDetailItem.statusColor + '22' }]}>
                      <View style={{ backgroundColor: selectedDetailItem.statusColor, width: 8, height: 8, borderRadius: 4 }} />
                      <Text variant="bodySemibold" style={{ color: selectedDetailItem.statusColor, marginLeft: 6 }}>
                        {selectedDetailItem.statusLabel}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.detailRow}>
                    <Text variant="caption" color={COLORS.textLight}>Submitted</Text>
                    <Text variant="body" color={COLORS.text}>{formatDate(selectedDetailItem.createdAt)}</Text>
                  </View>

                  {selectedDetailItem.route && (
                    <View style={styles.detailRow}>
                      <Text variant="caption" color={COLORS.textLight}>Affected Route</Text>
                      <View style={styles.detailRouteInfo}>
                        <View style={[styles.routePickerBadge, { backgroundColor: selectedDetailItem.route.color }]}>
                          <Text variant="caption" color={COLORS.white} style={{ fontWeight: '700', fontSize: 10 }}>
                            {selectedDetailItem.route.routeNumber}
                          </Text>
                        </View>
                        <Text variant="body" style={{ marginLeft: 8, flex: 1 }}>{selectedDetailItem.route.name}</Text>
                      </View>
                    </View>
                  )}

                  <View style={styles.detailMessageContainer}>
                    <Text variant="bodySemibold" style={{ marginBottom: 4 }}>Report Description:</Text>
                    <Text variant="body" color={COLORS.textMuted} style={styles.detailMessageText}>
                      {selectedDetailItem.message}
                    </Text>
                  </View>
                </ScrollView>

                <Button
                  title="Close Detail"
                  onPress={() => setSelectedDetailItem(null)}
                  style={styles.detailCloseBtn}
                />
              </>
            )}
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
  tabOuterContainer: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tabPillContainer: {
    flexDirection: 'row',
    height: 48,
    borderRadius: ROUNDNESS.md,
    backgroundColor: COLORS.surface,
    padding: 4,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
  },
  tabPill: {
    flex: 1,
    borderRadius: ROUNDNESS.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabPillActive: {
    backgroundColor: COLORS.primary, // Teal Active
    ...SHADOWS.light,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 40,
  },
  sectionTitle: {
    marginBottom: 6,
    fontWeight: 'bold',
  },
  sectionSubtitle: {
    marginBottom: SPACING.xl,
    lineHeight: 20,
  },
  inputLabel: {
    color: COLORS.secondary,
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: SPACING.sm,
  },
  categoryCard: {
    width: '31%',
    backgroundColor: COLORS.surface,
    borderRadius: ROUNDNESS.md,
    paddingVertical: 14,
    paddingHorizontal: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  categoryCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },
  categoryIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  categoryLabel: {
    textAlign: 'center',
    fontSize: 10,
  },
  categoryLabelSelected: {
    fontWeight: '700',
  },
  routeSelector: {
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: ROUNDNESS.md,
    marginBottom: SPACING.sm,
  },
  routePlaceholder: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  routeInfoSelected: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  routeColorBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  textAreaContainer: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: ROUNDNESS.md,
    backgroundColor: COLORS.surface,
    padding: SPACING.sm,
    marginBottom: SPACING.xl,
  },
  textArea: {
    minHeight: 110,
    maxHeight: 160,
    color: COLORS.text,
    fontSize: 15,
  },
  textCounterRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  submitBtn: {
    marginTop: SPACING.sm,
  },
  historyList: {
    padding: 24,
    paddingBottom: 40,
  },
  historyCard: {
    backgroundColor: COLORS.white,
    borderRadius: ROUNDNESS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.light,
  },
  historyCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  categoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  historyIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: ROUNDNESS.full,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  historyMessageSnippet: {
    lineHeight: 20,
    marginBottom: SPACING.sm,
  },
  historyRoutePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: ROUNDNESS.sm,
    alignSelf: 'flex-start',
  },
  routeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emptyTitle: {
    marginBottom: SPACING.xs,
    color: COLORS.secondary,
  },
  emptyText: {
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: SPACING.lg,
  },
  emptyButton: {
    width: 180,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  modalDismissArea: { flex: 1 },
  bottomSheet: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: ROUNDNESS.xxl,
    borderTopRightRadius: ROUNDNESS.xxl,
    paddingBottom: 24,
    ...SHADOWS.dark,
  },
  sheetHandle: {
    width: 40,
    height: 5,
    backgroundColor: COLORS.borderDark,
    borderRadius: 2.5,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 16,
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
  routePickerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: ROUNDNESS.md,
    padding: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  routePickerBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: ROUNDNESS.sm,
  },
  modalOverlayCenter: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailModalCard: {
    width: '88%',
    maxHeight: '75%',
    backgroundColor: COLORS.white,
    borderRadius: ROUNDNESS.lg,
    padding: 20,
    ...SHADOWS.dark,
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailCategory: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 14,
  },
  detailScroll: {
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  detailStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: ROUNDNESS.full,
  },
  detailRouteInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: '70%',
  },
  detailMessageContainer: {
    marginTop: 14,
  },
  detailMessageText: {
    lineHeight: 22,
    marginTop: 4,
  },
  detailCloseBtn: {
    height: 48,
  },

  // Skeletons
  skeletonCard: {
    flexDirection: 'row',
    borderRadius: ROUNDNESS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  skeletonLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  skeletonIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.borderDark,
    marginRight: SPACING.md,
  },
  skeletonTextCol: {
    gap: 4,
  },
  skeletonTitle: {
    width: 120,
    height: 14,
    backgroundColor: COLORS.borderDark,
    borderRadius: 4,
  },
  skeletonDate: {
    width: 80,
    height: 10,
    backgroundColor: COLORS.borderDark,
    borderRadius: 4,
  },
  skeletonStatus: {
    width: 70,
    height: 22,
    borderRadius: ROUNDNESS.full,
    backgroundColor: COLORS.borderDark,
  },
});

export default FeedbackScreen;
