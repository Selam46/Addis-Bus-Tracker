import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Modal,
  ActivityIndicator,
  TextInput,
  ScrollView,
  Dimensions,
  SafeAreaView,
  Alert,
  Animated,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { COLORS, SPACING, ROUNDNESS, SHADOWS, TYPOGRAPHY } from '../theme/theme';
import Text from '../components/ui/Text';
import Button from '../components/ui/Button';
import routesApi, { Route, RouteDetail } from '../api/routes';
import stopsApi, { Stop, StopDetail } from '../api/stops';
import { MainTabParamList } from '../navigation/types';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

type NavigationProp = BottomTabNavigationProp<MainTabParamList, 'Routes'>;

/* ─── Animated Skeleton Card ─── */
const RoutesSkeletonCard: React.FC<{ delay?: number }> = ({ delay = 0 }) => {
  const pulseAnim = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          delay,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.4,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulseAnim, delay]);

  return (
    <Animated.View style={[styles.skeletonCard, { opacity: pulseAnim }]}>
      <View style={styles.skeletonBadge} />
      <View style={styles.skeletonTitle} />
      <View style={styles.skeletonText} />
    </Animated.View>
  );
};

export const RoutesScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();

  // State Management
  const [activeTab, setActiveTab] = useState<'routes' | 'stops'>('routes');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  const [routesList, setRoutesList] = useState<Route[]>([]);
  const [stopsList, setStopsList] = useState<Stop[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Detail Modals State
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [selectedRoute, setSelectedRoute] = useState<RouteDetail | null>(null);
  const [routeModalVisible, setRouteModalVisible] = useState(false);

  const [selectedStopId, setSelectedStopId] = useState<string | null>(null);
  const [selectedStop, setSelectedStop] = useState<StopDetail | null>(null);
  const [stopModalVisible, setStopModalVisible] = useState(false);

  const [isDetailLoading, setIsDetailLoading] = useState(false);

  // 1. Debounce Search Input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);

    return () => {
      clearTimeout(handler);
    };
  }, [searchQuery]);

  // 2. Fetch Routes/Stops based on search query and active tab
  useEffect(() => {
    let active = true;
    const fetchData = async () => {
      setIsLoading(true);
      try {
        if (activeTab === 'routes') {
          const res = await routesApi.getAll(debouncedQuery);
          if (active && res.success) {
            setRoutesList(res.data.routes);
          }
        } else {
          const res = await stopsApi.getAll(debouncedQuery);
          if (active && res.success) {
            setStopsList(res.data.stops);
          }
        }
      } catch (err) {
        console.error('Error fetching search results:', err);
        if (active) {
          Alert.alert('Error', 'Failed to load search results. Please check your connection.');
        }
      } finally {
        if (active) setIsLoading(false);
      }
    };

    fetchData();

    return () => {
      active = false;
    };
  }, [debouncedQuery, activeTab]);

  // 3. Fetch Route Detail on tap
  const handleSelectRoute = async (routeId: string) => {
    setSelectedRouteId(routeId);
    setSelectedRoute(null);
    setRouteModalVisible(true);
    setIsDetailLoading(true);

    try {
      const res = await routesApi.getById(routeId);
      if (res.success) {
        setSelectedRoute(res.data.route);
      } else {
        Alert.alert('Error', 'Could not fetch route details.');
        setRouteModalVisible(false);
      }
    } catch (err) {
      console.error('Error fetching route details:', err);
      Alert.alert('Error', 'Failed to fetch route details.');
      setRouteModalVisible(false);
    } finally {
      setIsDetailLoading(false);
    }
  };

  // 4. Fetch Stop Detail on tap
  const handleSelectStop = async (stopId: string) => {
    setSelectedStopId(stopId);
    setSelectedStop(null);
    setStopModalVisible(true);
    setIsDetailLoading(true);

    try {
      const res = await stopsApi.getById(stopId);
      if (res.success) {
        setSelectedStop(res.data.stop);
      } else {
        Alert.alert('Error', 'Could not fetch stop details.');
        setStopModalVisible(false);
      }
    } catch (err) {
      console.error('Error fetching stop details:', err);
      Alert.alert('Error', 'Failed to fetch stop details.');
      setStopModalVisible(false);
    } finally {
      setIsDetailLoading(false);
    }
  };

  // Navigate stop coordinates to Live Tracker Home Screen
  const handleViewStopOnMap = (stop: StopDetail) => {
    setStopModalVisible(false);
    navigation.navigate('Home', {
      latitude: stop.latitude,
      longitude: stop.longitude,
      selectedStopId: stop.id,
    });
  };

  // Loading Skeletons — animated pulsing cards
  const renderSkeletons = () => (
    <View style={styles.skeletonContainer}>
      {[0, 1, 2, 3].map((i) => (
        <RoutesSkeletonCard key={i} delay={i * 120} />
      ))}
    </View>
  );

  // Empty State View
  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>{activeTab === 'routes' ? '🚍' : '🚏'}</Text>
      <Text variant="h3" style={styles.emptyTitle}>
        No {activeTab === 'routes' ? 'Routes' : 'Stops'} Found
      </Text>
      {searchQuery ? (
        <>
          <Text variant="body" color={COLORS.textMuted} style={styles.emptyText}>
            We couldn't find any results matching "{searchQuery}".
          </Text>
          <TouchableOpacity
            style={styles.clearSearchBtn}
            onPress={() => setSearchQuery('')}
          >
            <Text variant="bodySemibold" color={COLORS.primary}>
              Clear Search Query
            </Text>
          </TouchableOpacity>
        </>
      ) : (
        <Text variant="body" color={COLORS.textMuted} style={styles.emptyText}>
          There are no active {activeTab === 'routes' ? 'routes' : 'stops'} available right now.
        </Text>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Search Header */}
      <View style={styles.searchHeader}>
        <View style={styles.searchContainer}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder={
              activeTab === 'routes'
                ? 'Search routes (e.g. LID-009, Merkato)...'
                : 'Search stops (e.g. Bole, Megenagna)...'
            }
            placeholderTextColor={COLORS.textLight}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCorrect={false}
          />
          {searchQuery !== '' && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
              <Text style={styles.clearIcon}>❌</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Tab Segment Controls */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'routes' && styles.activeTab]}
            onPress={() => {
              setActiveTab('routes');
              setSearchQuery('');
            }}
          >
            <Text
              variant="bodySemibold"
              color={activeTab === 'routes' ? COLORS.primary : COLORS.textMuted}
            >
              Routes ({routesList.length})
            </Text>
            {activeTab === 'routes' && <View style={styles.activeIndicator} />}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'stops' && styles.activeTab]}
            onPress={() => {
              setActiveTab('stops');
              setSearchQuery('');
            }}
          >
            <Text
              variant="bodySemibold"
              color={activeTab === 'stops' ? COLORS.primary : COLORS.textMuted}
            >
              Stops ({stopsList.length})
            </Text>
            {activeTab === 'stops' && <View style={styles.activeIndicator} />}
          </TouchableOpacity>
        </View>
      </View>

      {/* Main List */}
      {isLoading ? (
        renderSkeletons()
      ) : activeTab === 'routes' ? (
        routesList.length === 0 ? (
          renderEmptyState()
        ) : (
          <FlatList
            data={routesList}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listPadding}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.card}
                onPress={() => handleSelectRoute(item.id)}
                activeOpacity={0.7}
              >
                <View style={styles.cardHeader}>
                  <View style={[styles.routeBadge, { backgroundColor: item.color || COLORS.primary }]}>
                    <Text variant="caption" color={COLORS.white} style={styles.routeBadgeText}>
                      {item.routeNumber}
                    </Text>
                  </View>
                  <Text variant="caption" color={COLORS.textMuted} style={styles.stopsCount}>
                    📏 {item.totalStops} Stops
                  </Text>
                </View>
                <Text variant="bodySemibold" style={styles.cardTitle}>
                  {item.name}
                </Text>
                <Text variant="caption" color={COLORS.textMuted}>
                  {item.description}
                </Text>
              </TouchableOpacity>
            )}
          />
        )
      ) : stopsList.length === 0 ? (
        renderEmptyState()
      ) : (
        <FlatList
          data={stopsList}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listPadding}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => handleSelectStop(item.id)}
              activeOpacity={0.7}
            >
              <View style={styles.stopCardHeader}>
                <View style={styles.stopIconCircle}>
                  <Text style={styles.stopEmoji}>🚏</Text>
                </View>
                <View style={styles.stopCardTextContainer}>
                  <Text variant="bodySemibold">{item.name}</Text>
                  {item.nameAm && (
                    <Text variant="caption" color={COLORS.textMuted} style={styles.amharicText}>
                      {item.nameAm}
                    </Text>
                  )}
                </View>
              </View>
              {item.routes && item.routes.length > 0 && (
                <View style={styles.stopBadgeContainer}>
                  {item.routes.map((r) => (
                    <View
                      key={r.id}
                      style={[styles.smallRouteBadge, { backgroundColor: r.color || COLORS.primary }]}
                    >
                      <Text variant="caption" color={COLORS.white} style={styles.smallBadgeText}>
                        {r.routeNumber}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </TouchableOpacity>
          )}
        />
      )}

      {/* ========================================================
          ROUTE DETAIL MODAL (Timeline bottom sheet style)
          ======================================================== */}
      <Modal
        visible={routeModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setRouteModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalDismissArea}
            activeOpacity={1}
            onPress={() => setRouteModalVisible(false)}
          />
          <View style={styles.bottomSheet}>
            <View style={styles.sheetHandle} />

            <View style={styles.modalHeader}>
              <Text variant="h2" style={styles.modalHeaderTitle}>Route Details</Text>
              <TouchableOpacity
                style={styles.closeModalButton}
                onPress={() => setRouteModalVisible(false)}
              >
                <Text style={styles.closeModalText}>❌</Text>
              </TouchableOpacity>
            </View>

            {isDetailLoading ? (
              <View style={styles.modalLoadingContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text variant="body" style={styles.modalLoadingText}>
                  Fetching route stop timeline...
                </Text>
              </View>
            ) : selectedRoute ? (
              <View style={styles.sheetContent}>
                {/* Route Header Info Card */}
                <View style={styles.routeDetailInfoCard}>
                  <View style={styles.routeDetailTitleRow}>
                    <View style={[styles.routeBadgeLarge, { backgroundColor: selectedRoute.color || COLORS.primary }]}>
                      <Text variant="bodySemibold" color={COLORS.white}>
                        {selectedRoute.routeNumber}
                      </Text>
                    </View>
                    <View style={styles.routeDetailStats}>
                      <Text variant="caption" color={COLORS.textMuted}>
                        🚌 {selectedRoute.totalBuses} Active Buses
                      </Text>
                      <Text variant="caption" color={COLORS.textMuted}>
                        🕒 {selectedRoute.totalSchedules} Daily Runs
                      </Text>
                    </View>
                  </View>
                  <Text variant="bodySemibold" style={styles.routeDetailName}>
                    {selectedRoute.name}
                  </Text>
                  <Text variant="caption" color={COLORS.textMuted} style={styles.routeDetailDesc}>
                    {selectedRoute.description}
                  </Text>
                </View>

                {/* Timeline Header */}
                <Text variant="bodySemibold" style={styles.timelineHeaderTitle}>
                  Stations Timeline ({selectedRoute.stops.length})
                </Text>

                {/* Vertical Scroll Timeline */}
                <ScrollView contentContainerStyle={styles.timelineContainer}>
                  {selectedRoute.stops.map((stopItem, idx) => {
                    const isLast = idx === selectedRoute.stops.length - 1;
                    const stopColor = selectedRoute.color || COLORS.primary;

                    return (
                      <View key={stopItem.stop.id} style={styles.timelineItem}>
                        {/* Left timeline line and dot */}
                        <View style={styles.timelineLineContainer}>
                          <View style={[styles.timelineDot, { borderColor: stopColor }]} />
                          {!isLast && <View style={[styles.timelineVerticalLine, { backgroundColor: stopColor }]} />}
                        </View>

                        {/* Right content */}
                        <View style={styles.timelineContent}>
                          <View style={styles.timelineTextRow}>
                            <Text variant="bodySemibold" style={styles.timelineStopName}>
                              {stopItem.stop.name}
                            </Text>
                            <Text variant="caption" color={COLORS.primary}>
                              {idx === 0 ? 'START' : isLast ? 'END' : `${stopItem.distanceFromStartKm.toFixed(1)} km`}
                            </Text>
                          </View>
                          {stopItem.stop.nameAm && (
                            <Text variant="caption" color={COLORS.textMuted} style={styles.timelineStopNameAm}>
                              {stopItem.stop.nameAm}
                            </Text>
                          )}
                          <Text variant="caption" color={COLORS.textLight}>
                            Stop Order: #{stopItem.order}
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                </ScrollView>
              </View>
            ) : (
              <View style={styles.modalErrorContainer}>
                <Text variant="body" color={COLORS.danger}>
                  Failed to load route detail.
                </Text>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* ========================================================
          STOP DETAIL MODAL (View on Map bottom sheet style)
          ======================================================== */}
      <Modal
        visible={stopModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setStopModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalDismissArea}
            activeOpacity={1}
            onPress={() => setStopModalVisible(false)}
          />
          <View style={[styles.bottomSheet, { height: SCREEN_HEIGHT * 0.45 }]}>
            <View style={styles.sheetHandle} />

            <View style={styles.modalHeader}>
              <Text variant="h2" style={styles.modalHeaderTitle}>Stop Information</Text>
              <TouchableOpacity
                style={styles.closeModalButton}
                onPress={() => setStopModalVisible(false)}
              >
                <Text style={styles.closeModalText}>❌</Text>
              </TouchableOpacity>
            </View>

            {isDetailLoading ? (
              <View style={styles.modalLoadingContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text variant="body" style={styles.modalLoadingText}>
                  Fetching stop routes and info...
                </Text>
              </View>
            ) : selectedStop ? (
              <View style={styles.sheetContent}>
                <View style={styles.stopDetailHeaderRow}>
                  <View style={styles.bigStopIconCircle}>
                    <Text style={styles.bigStopEmoji}>🚏</Text>
                  </View>
                  <View style={styles.stopDetailHeaderTexts}>
                    <Text variant="h3">{selectedStop.name}</Text>
                    {selectedStop.nameAm && (
                      <Text variant="body" color={COLORS.textMuted} style={styles.stopDetailAmharic}>
                        {selectedStop.nameAm}
                      </Text>
                    )}
                  </View>
                </View>

                {selectedStop.description && (
                  <Text variant="caption" color={COLORS.textMuted} style={styles.stopDetailDescText}>
                    📝 {selectedStop.description}
                  </Text>
                )}

                {/* Passing Routes */}
                <Text variant="bodySemibold" style={styles.passingRoutesTitle}>
                  Available Routes Passing Here:
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.horizontalBadgesScroll}
                >
                  {selectedStop.routes.map((routeItem) => (
                    <View
                      key={routeItem.id}
                      style={[styles.mediumRouteBadge, { backgroundColor: routeItem.color || COLORS.primary }]}
                    >
                      <Text variant="bodySemibold" color={COLORS.white}>
                        {routeItem.routeNumber}
                      </Text>
                      <Text variant="caption" color={COLORS.white} style={styles.mediumBadgeLabel}>
                        {routeItem.name.split('->')[0].trim()}
                      </Text>
                    </View>
                  ))}
                </ScrollView>

                {/* Action Buttons */}
                <View style={styles.actionButtonContainer}>
                  <Button
                    title="📍 View on Live Map"
                    onPress={() => handleViewStopOnMap(selectedStop)}
                    style={styles.mapActionBtn}
                  />
                  <Button
                    title="Close"
                    variant="outline"
                    onPress={() => setStopModalVisible(false)}
                    style={styles.closeActionBtn}
                  />
                </View>
              </View>
            ) : (
              <View style={styles.modalErrorContainer}>
                <Text variant="body" color={COLORS.danger}>
                  Failed to load stop details.
                </Text>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  searchHeader: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 50,
    borderRadius: ROUNDNESS.md,
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    color: COLORS.text,
    fontSize: 15,
  },
  clearButton: {
    padding: SPACING.xs,
  },
  clearIcon: {
    fontSize: 12,
  },
  tabContainer: {
    flexDirection: 'row',
    marginTop: SPACING.md,
  },
  tabButton: {
    flex: 1,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    position: 'relative',
  },
  activeTab: {
    // Underline will draw visually
  },
  activeIndicator: {
    position: 'absolute',
    bottom: 0,
    left: '20%',
    right: '20%',
    height: 3,
    backgroundColor: COLORS.primary,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },
  listPadding: {
    padding: SPACING.lg,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: ROUNDNESS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.light,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  routeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: ROUNDNESS.sm,
  },
  routeBadgeText: {
    fontWeight: 'bold',
    fontSize: 11,
  },
  stopsCount: {
    fontWeight: '500',
  },
  cardTitle: {
    marginBottom: SPACING.xs,
    color: COLORS.text,
  },
  stopCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stopIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  stopEmoji: {
    fontSize: 20,
  },
  stopCardTextContainer: {
    flex: 1,
  },
  amharicText: {
    marginTop: 2,
  },
  stopBadgeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: SPACING.md,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  smallRouteBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  smallBadgeText: {
    fontSize: 9,
    fontWeight: 'bold',
  },
  // Skeletons
  skeletonContainer: {
    padding: SPACING.lg,
  },
  skeletonCard: {
    height: 100,
    backgroundColor: COLORS.surface,
    borderRadius: ROUNDNESS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  skeletonBadge: {
    width: 60,
    height: 20,
    borderRadius: 4,
    backgroundColor: '#E2E8F0',
    marginBottom: 12,
  },
  skeletonTitle: {
    width: 180,
    height: 16,
    borderRadius: 4,
    backgroundColor: '#E2E8F0',
    marginBottom: 8,
  },
  skeletonText: {
    width: '80%',
    height: 12,
    borderRadius: 4,
    backgroundColor: '#E2E8F0',
  },
  // Empty states
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    paddingTop: 80,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: SPACING.md,
    opacity: 0.3,
  },
  emptyTitle: {
    marginBottom: SPACING.xs,
    color: COLORS.text,
  },
  emptyText: {
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: SPACING.lg,
  },
  clearSearchBtn: {
    padding: SPACING.md,
  },
  // Modals / Bottom Sheets
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)', // Overlay shade matching text
    justifyContent: 'flex-end',
  },
  modalDismissArea: {
    flex: 1,
  },
  bottomSheet: {
    height: SCREEN_HEIGHT * 0.75,
    backgroundColor: COLORS.background,
    borderTopLeftRadius: ROUNDNESS.xxl,
    borderTopRightRadius: ROUNDNESS.xxl,
    paddingBottom: 24,
    ...SHADOWS.dark,
  },
  sheetHandle: {
    width: 40,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: COLORS.border,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 4,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalHeaderTitle: {
    color: COLORS.primary,
  },
  closeModalButton: {
    padding: SPACING.sm,
  },
  closeModalText: {
    fontSize: 14,
  },
  modalLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  modalLoadingText: {
    marginTop: SPACING.md,
    color: COLORS.textMuted,
  },
  modalErrorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sheetContent: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
  },
  // Route Detail styles
  routeDetailInfoCard: {
    backgroundColor: COLORS.surface,
    padding: SPACING.lg,
    borderRadius: ROUNDNESS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.lg,
  },
  routeDetailTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  routeBadgeLarge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: ROUNDNESS.md,
  },
  routeDetailStats: {
    alignItems: 'flex-end',
  },
  routeDetailName: {
    color: COLORS.text,
    fontSize: 17,
    marginBottom: 6,
  },
  routeDetailDesc: {
    lineHeight: 18,
  },
  timelineHeaderTitle: {
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  timelineContainer: {
    paddingBottom: 40,
  },
  timelineItem: {
    flexDirection: 'row',
    minHeight: 80,
  },
  timelineLineContainer: {
    width: 24,
    alignItems: 'center',
    position: 'relative',
  },
  timelineDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 3,
    backgroundColor: COLORS.background,
    marginTop: 4,
    zIndex: 2,
  },
  timelineVerticalLine: {
    width: 2.5,
    position: 'absolute',
    top: 14,
    bottom: -14,
    left: 11,
    zIndex: 1,
  },
  timelineContent: {
    flex: 1,
    paddingLeft: SPACING.md,
    paddingBottom: SPACING.lg,
  },
  timelineTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  timelineStopName: {
    flex: 1,
    color: COLORS.text,
    fontSize: 15,
  },
  timelineStopNameAm: {
    marginTop: 1,
  },
  // Stop Detail styles
  stopDetailHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  bigStopIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.lg,
  },
  bigStopEmoji: {
    fontSize: 32,
  },
  stopDetailHeaderTexts: {
    flex: 1,
  },
  stopDetailAmharic: {
    marginTop: 2,
  },
  stopDetailDescText: {
    lineHeight: 18,
    marginBottom: SPACING.lg,
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: ROUNDNESS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  passingRoutesTitle: {
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  horizontalBadgesScroll: {
    paddingBottom: SPACING.lg,
  },
  mediumRouteBadge: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: ROUNDNESS.md,
    marginRight: SPACING.sm,
    alignItems: 'center',
    minWidth: 80,
  },
  mediumBadgeLabel: {
    fontSize: 9,
    marginTop: 2,
    opacity: 0.9,
  },
  actionButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: SPACING.md,
  },
  mapActionBtn: {
    flex: 1.3,
    marginRight: SPACING.md,
  },
  closeActionBtn: {
    flex: 0.7,
  },
});

export default RoutesScreen;
