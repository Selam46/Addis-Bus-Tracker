import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Modal,
  ActivityIndicator,
  ScrollView,
  Dimensions,
  SafeAreaView,
  Alert,
  Animated,
  Easing,
} from 'react-native';
import { COLORS, SPACING, ROUNDNESS, SHADOWS } from '../theme/theme';
import Text from '../components/ui/Text';
import Button from '../components/ui/Button';
import routesApi, { Route } from '../api/routes';
import schedulesApi, {
  DayOfWeek,
  ScheduleEntry,
  RouteScheduleResponse,
  ETAResponse,
  ETAArrival,
} from '../api/schedules';
import stopsApi, { Stop } from '../api/stops';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// ─── Constants ───────────────────────────────────────────────────────────────

const DAYS: { label: string; value: DayOfWeek }[] = [
  { label: 'Mon', value: 'MON' },
  { label: 'Tue', value: 'TUE' },
  { label: 'Wed', value: 'WED' },
  { label: 'Thu', value: 'THU' },
  { label: 'Fri', value: 'FRI' },
  { label: 'Sat', value: 'SAT' },
  { label: 'Sun', value: 'SUN' },
];

const getTodayDayOfWeek = (): DayOfWeek => {
  const days: DayOfWeek[] = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  return days[new Date().getDay()];
};

// ─── Status helpers ───────────────────────────────────────────────────────────

const getStatusStyle = (status: string) => {
  switch (status) {
    case 'SOON':
    case 'ARRIVING_SOON':
      return { bg: '#FEF3C7', text: '#92400E', label: '⚡ Soon' };
    case 'UPCOMING':
    case 'COMING':
      return { bg: '#DCFCE7', text: '#166534', label: '🟢 Coming' };
    case 'SCHEDULED':
      return { bg: COLORS.primaryLight, text: COLORS.primaryDark, label: '🕒 Scheduled' };
    case 'DEPARTED':
      return { bg: '#F1F5F9', text: COLORS.textLight, label: '✓ Departed' };
    default:
      return { bg: COLORS.surface, text: COLORS.textMuted, label: status };
  }
};

const getETAStatusStyle = (status: string) => {
  switch (status) {
    case 'ARRIVING_SOON':
      return { color: COLORS.danger, icon: '🚨', label: 'Arriving Soon!' };
    case 'COMING':
      return { color: COLORS.warning, icon: '🟡', label: 'On the way' };
    case 'SCHEDULED':
      return { color: COLORS.primary, icon: '🕒', label: 'Scheduled' };
    default:
      return { color: COLORS.textLight, icon: '✓', label: 'Departed' };
  }
};

// ─── Live Countdown component ─────────────────────────────────────────────────
interface CountdownProps {
  minutesUntilArrival: number;
  status: string;
}

const LiveCountdown: React.FC<CountdownProps> = ({ minutesUntilArrival, status }) => {
  const [secondsLeft, setSecondsLeft] = useState(minutesUntilArrival * 60);
  const { color, icon } = getETAStatusStyle(status);

  useEffect(() => {
    setSecondsLeft(minutesUntilArrival * 60);
  }, [minutesUntilArrival]);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const interval = setInterval(() => {
      setSecondsLeft((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [secondsLeft]);

  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;

  return (
    <View style={[countdownStyles.container, { borderColor: color }]}>
      <Text style={[countdownStyles.icon]}>{icon}</Text>
      <View style={countdownStyles.timeRow}>
        <Text style={[countdownStyles.digits, { color }]}>
          {String(mins).padStart(2, '0')}
        </Text>
        <Text style={[countdownStyles.colon, { color }]}>:</Text>
        <Text style={[countdownStyles.digits, { color }]}>
          {String(secs).padStart(2, '0')}
        </Text>
      </View>
      <Text variant="caption" color={COLORS.textMuted} style={countdownStyles.label}>
        min : sec
      </Text>
    </View>
  );
};

const countdownStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
    padding: SPACING.xl,
    borderRadius: ROUNDNESS.xl,
    borderWidth: 2,
    marginBottom: SPACING.lg,
    backgroundColor: COLORS.surface,
  },
  icon: { fontSize: 32, marginBottom: SPACING.sm },
  timeRow: { flexDirection: 'row', alignItems: 'center' },
  digits: { fontSize: 52, fontWeight: '700', letterSpacing: 2 },
  colon: { fontSize: 40, fontWeight: '700', marginHorizontal: 4, marginBottom: 4 },
  label: { marginTop: 4, letterSpacing: 1 },
});

// ─── Skeleton Card ────────────────────────────────────────────────────────────
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
    <Animated.View style={[skeletonStyles.card, { opacity }]}>
      <View style={skeletonStyles.row}>
        <View style={skeletonStyles.badge} />
        <View style={skeletonStyles.pill} />
      </View>
      <View style={skeletonStyles.line} />
      <View style={skeletonStyles.lineShort} />
    </Animated.View>
  );
};

const skeletonStyles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: ROUNDNESS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  badge: { width: 56, height: 22, borderRadius: 4, backgroundColor: COLORS.border },
  pill: { width: 80, height: 22, borderRadius: 11, backgroundColor: COLORS.border },
  line: { width: '75%', height: 14, borderRadius: 4, backgroundColor: COLORS.border, marginBottom: 8 },
  lineShort: { width: '50%', height: 12, borderRadius: 4, backgroundColor: COLORS.border },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export const SchedulesScreen: React.FC = () => {
  // Route picker state
  const [allRoutes, setAllRoutes] = useState<Route[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);
  const [routePickerVisible, setRoutePickerVisible] = useState(false);
  const [isRoutesLoading, setIsRoutesLoading] = useState(false);

  // Timetable state
  const [selectedDay, setSelectedDay] = useState<DayOfWeek>(getTodayDayOfWeek());
  const [timetable, setTimetable] = useState<RouteScheduleResponse | null>(null);
  const [isTimetableLoading, setIsTimetableLoading] = useState(false);

  // ETA modal state
  const [etaModalVisible, setEtaModalVisible] = useState(false);
  const [routeStops, setRouteStops] = useState<Stop[]>([]);
  const [selectedStop, setSelectedStop] = useState<Stop | null>(null);
  const [isStopsLoading, setIsStopsLoading] = useState(false);
  const [etaData, setEtaData] = useState<ETAResponse | null>(null);
  const [isEtaLoading, setIsEtaLoading] = useState(false);

  // ── Load all routes on mount (for picker) ──────────────────────────────────
  useEffect(() => {
    const fetchRoutes = async () => {
      setIsRoutesLoading(true);
      try {
        const res = await routesApi.getAll();
        if (res.success) setAllRoutes(res.data.routes);
      } catch (err) {
        console.error('Failed to load routes:', err);
      } finally {
        setIsRoutesLoading(false);
      }
    };
    fetchRoutes();
  }, []);

  // ── Load timetable when route or day changes ───────────────────────────────
  useEffect(() => {
    if (!selectedRoute) return;
    let active = true;

    const fetchTimetable = async () => {
      setIsTimetableLoading(true);
      setTimetable(null);
      try {
        const res = await schedulesApi.getByRoute(selectedRoute.id, selectedDay);
        if (active && res.success) setTimetable(res.data);
      } catch (err) {
        console.error('Timetable fetch error:', err);
        Alert.alert('Error', 'Could not load timetable. Please check your connection.');
      } finally {
        if (active) setIsTimetableLoading(false);
      }
    };

    fetchTimetable();
    return () => { active = false; };
  }, [selectedRoute, selectedDay]);

  // ── Load stops for selected route (for ETA modal) ─────────────────────────
  useEffect(() => {
    if (!selectedRoute || !etaModalVisible) return;
    let active = true;

    const fetchStops = async () => {
      setIsStopsLoading(true);
      setRouteStops([]);
      setSelectedStop(null);
      setEtaData(null);
      try {
        const res = await routesApi.getById(selectedRoute.id);
        if (active && res.success) {
          // Map the RouteDetail stops to Stop shape
          const stops: Stop[] = res.data.route.stops.map((rs) => ({
            id: rs.stop.id,
            name: rs.stop.name,
            nameAm: rs.stop.nameAm,
            latitude: rs.stop.latitude,
            longitude: rs.stop.longitude,
            description: rs.stop.description,
            routes: [],
          }));
          setRouteStops(stops);
        }
      } catch (err) {
        console.error('Route stops fetch error:', err);
      } finally {
        if (active) setIsStopsLoading(false);
      }
    };

    fetchStops();
    return () => { active = false; };
  }, [selectedRoute, etaModalVisible]);

  // ── Fetch ETA when stop is selected ──────────────────────────────────────
  useEffect(() => {
    if (!selectedRoute || !selectedStop) return;
    let active = true;

    const fetchETA = async () => {
      setIsEtaLoading(true);
      setEtaData(null);
      try {
        const res = await schedulesApi.getETA(selectedRoute.id, selectedStop.id, 5);
        if (active && res.success) setEtaData(res.data);
      } catch (err: any) {
        console.error('ETA fetch error:', err);
        if (err?.response?.status === 404) {
          Alert.alert('Not Found', 'This stop may not be on the selected route.');
        } else {
          Alert.alert('Error', 'Could not calculate ETA. Try again.');
        }
      } finally {
        if (active) setIsEtaLoading(false);
      }
    };

    fetchETA();
    return () => { active = false; };
  }, [selectedStop]);

  // ── Render timetable entry card ────────────────────────────────────────────
  const renderScheduleCard = ({ item }: { item: ScheduleEntry }) => {
    const { bg, text, label } = getStatusStyle(item.status);
    const isDeparted = item.status === 'DEPARTED';

    return (
      <View style={[styles.scheduleCard, isDeparted && styles.scheduleCardDeparted]}>
        {/* Left — time column */}
        <View style={styles.scheduleTimeColumn}>
          <Text
            variant="h3"
            style={[styles.scheduleTime, isDeparted && styles.departedText]}
          >
            {item.departureTime}
          </Text>
          <Text variant="caption" color={COLORS.textLight}>
            departure
          </Text>
        </View>

        {/* Divider line */}
        <View style={[styles.scheduleDivider, isDeparted && styles.departedDivider]} />

        {/* Right — info column */}
        <View style={styles.scheduleInfoColumn}>
          <View style={[styles.statusPill, { backgroundColor: bg }]}>
            <Text style={[styles.statusText, { color: text }]}>{label}</Text>
          </View>
          {item.minutesFromNow !== null && (
            <Text variant="caption" color={COLORS.textMuted} style={styles.minutesText}>
              in {item.minutesFromNow} min
            </Text>
          )}
        </View>
      </View>
    );
  };

  // ── Render "no route selected" placeholder ────────────────────────────────
  const renderRoutePlaceholder = () => (
    <View style={styles.placeholderContainer}>
      <Text style={styles.placeholderIcon}>🚍</Text>
      <Text variant="h3" style={styles.placeholderTitle}>
        Select a Route
      </Text>
      <Text variant="body" color={COLORS.textMuted} style={styles.placeholderText}>
        Choose a bus route to view its full daily timetable and calculate arrival times at any stop.
      </Text>
      <Button
        title="Browse Routes"
        onPress={() => setRoutePickerVisible(true)}
        style={styles.browseBtn}
      />
    </View>
  );

  const routeColor = selectedRoute?.color || COLORS.primary;

  return (
    <SafeAreaView style={styles.container}>

      {/* ══ ROUTE SELECTOR HEADER ═══════════════════════════════════════════ */}
      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.routeSelectorBtn, { borderColor: routeColor }]}
          onPress={() => setRoutePickerVisible(true)}
          activeOpacity={0.75}
        >
          {selectedRoute ? (
            <View style={styles.selectedRouteInner}>
              <View style={[styles.routeColorDot, { backgroundColor: routeColor }]} />
              <View style={styles.selectedRouteTexts}>
                <Text variant="bodySemibold" color={COLORS.text} numberOfLines={1}>
                  {selectedRoute.name}
                </Text>
                <Text variant="caption" color={COLORS.textMuted}>
                  Route {selectedRoute.routeNumber} · Tap to change
                </Text>
              </View>
              <Text style={styles.chevron}>▾</Text>
            </View>
          ) : (
            <View style={styles.selectedRouteInner}>
              <Text style={styles.routeSelectorIcon}>🚍</Text>
              <Text variant="body" color={COLORS.textMuted} style={{ flex: 1 }}>
                Select a route...
              </Text>
              <Text style={styles.chevron}>▾</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Day-of-week pill strip */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.dayPillRow}
        >
          {DAYS.map((d) => {
            const isActive = d.value === selectedDay;
            const isToday = d.value === getTodayDayOfWeek();
            return (
              <TouchableOpacity
                key={d.value}
                style={[styles.dayPill, isActive && { backgroundColor: routeColor }]}
                onPress={() => setSelectedDay(d.value)}
                activeOpacity={0.75}
              >
                <Text
                  variant="caption"
                  color={isActive ? COLORS.white : isToday ? routeColor : COLORS.textMuted}
                  style={[styles.dayPillText, isActive && styles.dayPillTextActive]}
                >
                  {d.label}
                </Text>
                {isToday && !isActive && <View style={[styles.todayDot, { backgroundColor: routeColor }]} />}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ══ MAIN CONTENT ════════════════════════════════════════════════════ */}
      {!selectedRoute ? (
        renderRoutePlaceholder()
      ) : isTimetableLoading ? (
        <ScrollView contentContainerStyle={styles.listPadding}>
          {[1, 2, 3, 4, 5].map((i) => <SkeletonCard key={i} />)}
        </ScrollView>
      ) : !timetable ? null : (
        <>
          {/* Next departure banner */}
          {timetable.nextDeparture ? (
            <View style={[styles.nextDepartureBanner, { backgroundColor: routeColor }]}>
              <View style={styles.nextDepartureLeft}>
                <Text variant="caption" color="rgba(255,255,255,0.75)">
                  Next departure
                </Text>
                <Text style={styles.nextDepartureTime}>
                  {timetable.nextDeparture.departureTime}
                </Text>
              </View>
              <View style={styles.nextDepartureRight}>
                <Text variant="caption" color="rgba(255,255,255,0.75)">
                  in
                </Text>
                <Text style={styles.nextDepartureMinutes}>
                  {timetable.nextDeparture.minutesFromNow}
                </Text>
                <Text variant="caption" color="rgba(255,255,255,0.75)">
                  min
                </Text>
              </View>
              <TouchableOpacity
                style={styles.etaQuickBtn}
                onPress={() => setEtaModalVisible(true)}
                activeOpacity={0.85}
              >
                <Text style={styles.etaQuickBtnText}>📍 My ETA</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.noMoreBanner}>
              <Text variant="bodySemibold" color={COLORS.textMuted}>
                🌙 No more departures today for this route
              </Text>
            </View>
          )}

          {/* Stats row */}
          <View style={styles.statsRow}>
            <View style={styles.statChip}>
              <Text variant="caption" color={COLORS.textMuted}>Total</Text>
              <Text variant="bodySemibold" color={COLORS.text}>{timetable.totalDepartures}</Text>
            </View>
            <View style={styles.statChip}>
              <Text variant="caption" color={COLORS.textMuted}>Upcoming</Text>
              <Text variant="bodySemibold" color={COLORS.success}>{timetable.upcomingCount}</Text>
            </View>
            <View style={styles.statChip}>
              <Text variant="caption" color={COLORS.textMuted}>Current time</Text>
              <Text variant="bodySemibold" color={COLORS.primary}>{timetable.currentTime}</Text>
            </View>
            <View style={styles.statChip}>
              <Text variant="caption" color={COLORS.textMuted}>Day</Text>
              <Text variant="bodySemibold" color={COLORS.text}>{timetable.queryDay}</Text>
            </View>
          </View>

          {/* Timetable list */}
          <FlatList
            data={timetable.schedules}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listPadding}
            renderItem={renderScheduleCard}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyIcon}>🚌</Text>
                <Text variant="h3" style={styles.emptyTitle}>No Departures</Text>
                <Text variant="body" color={COLORS.textMuted} style={styles.emptyText}>
                  Route {selectedRoute.routeNumber} does not run on {selectedDay}.
                </Text>
              </View>
            }
          />
        </>
      )}

      {/* ══ ROUTE PICKER MODAL ══════════════════════════════════════════════ */}
      <Modal
        visible={routePickerVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setRoutePickerVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalDismissArea}
            activeOpacity={1}
            onPress={() => setRoutePickerVisible(false)}
          />
          <View style={[styles.bottomSheet, { height: SCREEN_HEIGHT * 0.72 }]}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetTitleRow}>
              <Text variant="h3" style={styles.sheetTitle}>Choose a Route</Text>
              <TouchableOpacity onPress={() => setRoutePickerVisible(false)}>
                <Text style={styles.closeIcon}>✕</Text>
              </TouchableOpacity>
            </View>

            {isRoutesLoading ? (
              <View style={styles.sheetLoading}>
                <ActivityIndicator size="large" color={COLORS.primary} />
              </View>
            ) : (
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
                        isSelected && { borderColor: item.color || COLORS.primary, borderWidth: 2 },
                      ]}
                      onPress={() => {
                        setSelectedRoute(item);
                        setRoutePickerVisible(false);
                      }}
                      activeOpacity={0.75}
                    >
                      <View style={[styles.routePickerBadge, { backgroundColor: item.color || COLORS.primary }]}>
                        <Text variant="caption" color={COLORS.white} style={{ fontWeight: '700', fontSize: 10 }}>
                          {item.routeNumber}
                        </Text>
                      </View>
                      <View style={styles.routePickerTexts}>
                        <Text variant="bodySemibold" numberOfLines={1}>{item.name}</Text>
                        <Text variant="caption" color={COLORS.textMuted}>
                          {item.totalStops} stops
                        </Text>
                      </View>
                      {isSelected && <Text style={{ fontSize: 18, color: item.color || COLORS.primary }}>✓</Text>}
                    </TouchableOpacity>
                  );
                }}
              />
            )}
          </View>
        </View>
      </Modal>

      {/* ══ ETA MODAL ═══════════════════════════════════════════════════════ */}
      <Modal
        visible={etaModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => { setEtaModalVisible(false); setSelectedStop(null); setEtaData(null); }}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalDismissArea}
            activeOpacity={1}
            onPress={() => { setEtaModalVisible(false); setSelectedStop(null); setEtaData(null); }}
          />
          <View style={[styles.bottomSheet, { height: SCREEN_HEIGHT * 0.82 }]}>
            <View style={styles.sheetHandle} />

            {/* ETA Header */}
            <View style={[styles.etaHeader, { borderBottomColor: routeColor }]}>
              <View>
                <Text variant="h3" style={[styles.sheetTitle, { color: routeColor }]}>
                  📍 Arrival Estimator
                </Text>
                {selectedRoute && (
                  <Text variant="caption" color={COLORS.textMuted}>
                    Route {selectedRoute.routeNumber} · {selectedRoute.name}
                  </Text>
                )}
              </View>
              <TouchableOpacity
                onPress={() => { setEtaModalVisible(false); setSelectedStop(null); setEtaData(null); }}
              >
                <Text style={styles.closeIcon}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.etaScrollContent}>

              {/* Stop picker section */}
              <Text variant="bodySemibold" style={styles.etaSectionLabel}>
                Select your stop:
              </Text>

              {isStopsLoading ? (
                <View style={styles.sheetLoading}>
                  <ActivityIndicator color={COLORS.primary} />
                  <Text variant="caption" color={COLORS.textMuted} style={{ marginTop: 8 }}>
                    Loading stops...
                  </Text>
                </View>
              ) : (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.stopChipsRow}
                >
                  {routeStops.map((stop) => {
                    const isSelected = stop.id === selectedStop?.id;
                    return (
                      <TouchableOpacity
                        key={stop.id}
                        style={[
                          styles.stopChip,
                          isSelected && { backgroundColor: routeColor, borderColor: routeColor },
                        ]}
                        onPress={() => setSelectedStop(stop)}
                        activeOpacity={0.75}
                      >
                        <Text
                          variant="caption"
                          color={isSelected ? COLORS.white : COLORS.text}
                          style={{ fontWeight: isSelected ? '700' : '400' }}
                          numberOfLines={1}
                        >
                          🚏 {stop.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              )}

              {/* ETA Results */}
              {!selectedStop ? (
                <View style={styles.etaHint}>
                  <Text style={{ fontSize: 40, opacity: 0.25, textAlign: 'center' }}>👆</Text>
                  <Text variant="body" color={COLORS.textMuted} style={styles.etaHintText}>
                    Choose the stop where you're waiting to see when the next bus arrives.
                  </Text>
                </View>
              ) : isEtaLoading ? (
                <View style={styles.sheetLoading}>
                  <ActivityIndicator size="large" color={routeColor} />
                  <Text variant="caption" color={COLORS.textMuted} style={{ marginTop: 12 }}>
                    Calculating ETA...
                  </Text>
                </View>
              ) : !etaData ? null : (
                <>
                  {/* Stop info */}
                  <View style={[styles.etaStopCard, { borderLeftColor: routeColor }]}>
                    <Text style={{ fontSize: 22 }}>🚏</Text>
                    <View style={{ flex: 1, marginLeft: SPACING.md }}>
                      <Text variant="bodySemibold">{etaData.stop.name}</Text>
                      {etaData.stop.nameAm ? (
                        <Text variant="caption" color={COLORS.textMuted}>{etaData.stop.nameAm}</Text>
                      ) : null}
                      <Text variant="caption" color={COLORS.primary}>
                        Stop #{etaData.stopOrder} · {etaData.distanceFromStartKm.toFixed(1)} km from start
                      </Text>
                    </View>
                  </View>

                  {/* Live countdown for next bus */}
                  {etaData.nextArrival ? (
                    <>
                      <Text variant="bodySemibold" style={styles.etaSectionLabel}>
                        Next Bus Arrives At {etaData.nextArrival.arrivalTime}:
                      </Text>
                      <LiveCountdown
                        minutesUntilArrival={etaData.nextArrival.minutesUntilArrival}
                        status={etaData.nextArrival.status}
                      />
                    </>
                  ) : (
                    <View style={styles.etaNoService}>
                      <Text style={{ fontSize: 36 }}>🌙</Text>
                      <Text variant="body" color={COLORS.textMuted} style={{ textAlign: 'center', marginTop: 8 }}>
                        No more buses arriving at this stop today.
                      </Text>
                    </View>
                  )}

                  {/* All upcoming arrivals list */}
                  {etaData.arrivals.length > 0 && (
                    <>
                      <Text variant="bodySemibold" style={styles.etaSectionLabel}>
                        Upcoming Arrivals ({etaData.totalUpcoming}):
                      </Text>
                      {etaData.arrivals.map((arrival, idx) => {
                        const { color, icon, label } = getETAStatusStyle(arrival.status);
                        return (
                          <View key={arrival.scheduleId} style={styles.arrivalRow}>
                            <View style={styles.arrivalIndexCircle}>
                              <Text variant="caption" color={COLORS.white} style={{ fontWeight: '700' }}>
                                {idx + 1}
                              </Text>
                            </View>
                            <View style={styles.arrivalTexts}>
                              <Text variant="bodySemibold" style={{ color }}>
                                {icon} Arrives {arrival.arrivalTime}
                              </Text>
                              <Text variant="caption" color={COLORS.textMuted}>
                                Bus departs first stop at {arrival.departureTime} · travel {arrival.travelMinutes} min
                              </Text>
                            </View>
                            {arrival.minutesUntilArrival !== null && (
                              <View style={[styles.arrivalMinsBadge, { backgroundColor: color + '22', borderColor: color }]}>
                                <Text style={{ fontSize: 11, color, fontWeight: '700' }}>
                                  {arrival.minutesUntilArrival}m
                                </Text>
                              </View>
                            )}
                          </View>
                        );
                      })}
                    </>
                  )}

                  {/* Speed note */}
                  <View style={styles.etaFootnote}>
                    <Text variant="caption" color={COLORS.textLight} style={{ textAlign: 'center' }}>
                      ℹ️ ETA calculated at {etaData.avgBusSpeedKmH} km/h average speed
                    </Text>
                  </View>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  // ── Header ──────────────────────────────────────────────────────────────────
  header: {
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  routeSelectorBtn: {
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
    height: 56,
    borderRadius: ROUNDNESS.lg,
    borderWidth: 1.5,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    paddingHorizontal: SPACING.lg,
    ...SHADOWS.light,
  },
  selectedRouteInner: { flexDirection: 'row', alignItems: 'center' },
  routeColorDot: { width: 14, height: 14, borderRadius: 7, marginRight: SPACING.md },
  selectedRouteTexts: { flex: 1 },
  routeSelectorIcon: { fontSize: 20, marginRight: SPACING.md },
  chevron: { fontSize: 14, color: COLORS.textMuted, marginLeft: SPACING.sm },

  dayPillRow: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.sm, gap: 8 },
  dayPill: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: ROUNDNESS.full,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    minWidth: 44,
  },
  dayPillText: { fontWeight: '500' },
  dayPillTextActive: { fontWeight: '700' },
  todayDot: { width: 4, height: 4, borderRadius: 2, marginTop: 2 },

  // ── Next Departure Banner ──────────────────────────────────────────────────
  nextDepartureBanner: {
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.md,
    borderRadius: ROUNDNESS.lg,
    padding: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
    ...SHADOWS.medium,
  },
  nextDepartureLeft: { flex: 1 },
  nextDepartureTime: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.white,
    letterSpacing: 1,
  },
  nextDepartureRight: { alignItems: 'center', marginHorizontal: SPACING.xl },
  nextDepartureMinutes: {
    fontSize: 36,
    fontWeight: '700',
    color: COLORS.white,
  },
  etaQuickBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: ROUNDNESS.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  etaQuickBtnText: { color: COLORS.white, fontWeight: '700', fontSize: 12 },

  noMoreBanner: {
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.md,
    padding: SPACING.lg,
    backgroundColor: COLORS.surface,
    borderRadius: ROUNDNESS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },

  // ── Stats Row ───────────────────────────────────────────────────────────────
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    marginTop: SPACING.md,
    gap: 8,
  },
  statChip: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: ROUNDNESS.md,
    padding: SPACING.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  // ── Timetable list ──────────────────────────────────────────────────────────
  listPadding: { padding: SPACING.lg, paddingBottom: 40 },
  scheduleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: ROUNDNESS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.light,
  },
  scheduleCardDeparted: { opacity: 0.55 },
  scheduleTimeColumn: { alignItems: 'center', width: 68 },
  scheduleTime: { color: COLORS.text, letterSpacing: 0.5 },
  departedText: { color: COLORS.textLight },
  scheduleDivider: {
    width: 1.5,
    height: 36,
    backgroundColor: COLORS.primary,
    marginHorizontal: SPACING.lg,
    borderRadius: 1,
  },
  departedDivider: { backgroundColor: COLORS.border },
  scheduleInfoColumn: { flex: 1 },
  statusPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: SPACING.md,
    paddingVertical: 4,
    borderRadius: ROUNDNESS.full,
    marginBottom: 4,
  },
  statusText: { fontSize: 12, fontWeight: '600' },
  minutesText: { marginTop: 2 },

  // ── Placeholder ─────────────────────────────────────────────────────────────
  placeholderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xxxl,
  },
  placeholderIcon: { fontSize: 72, marginBottom: SPACING.lg, opacity: 0.3 },
  placeholderTitle: { marginBottom: SPACING.sm, color: COLORS.text },
  placeholderText: { textAlign: 'center', lineHeight: 22, marginBottom: SPACING.xl },
  browseBtn: { width: 180 },

  // ── Empty ───────────────────────────────────────────────────────────────────
  emptyContainer: {
    paddingTop: 60,
    alignItems: 'center',
  },
  emptyIcon: { fontSize: 56, opacity: 0.3, marginBottom: SPACING.md },
  emptyTitle: { marginBottom: SPACING.xs },
  emptyText: { textAlign: 'center', lineHeight: 20 },

  // ── Modal / Sheet ────────────────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  modalDismissArea: { flex: 1 },
  bottomSheet: {
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
  sheetTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  sheetTitle: { color: COLORS.text },
  closeIcon: { fontSize: 18, color: COLORS.textMuted, padding: SPACING.sm },
  sheetLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 60,
  },

  // ── Route Picker Cards ───────────────────────────────────────────────────────
  routePickerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: ROUNDNESS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.light,
  },
  routePickerBadge: {
    width: 48,
    height: 28,
    borderRadius: ROUNDNESS.sm,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  routePickerTexts: { flex: 1 },

  // ── ETA Modal ────────────────────────────────────────────────────────────────
  etaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 2,
  },
  etaScrollContent: { paddingHorizontal: SPACING.lg, paddingBottom: 60 },
  etaSectionLabel: {
    color: COLORS.text,
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  stopChipsRow: { gap: 8, paddingBottom: SPACING.sm },
  stopChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 8,
    borderRadius: ROUNDNESS.full,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    maxWidth: 160,
  },
  etaHint: {
    paddingVertical: SPACING.xxxl,
    alignItems: 'center',
  },
  etaHintText: { textAlign: 'center', lineHeight: 22, marginTop: SPACING.md },
  etaStopCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: ROUNDNESS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  etaNoService: {
    alignItems: 'center',
    paddingVertical: SPACING.xxxl,
  },
  arrivalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: ROUNDNESS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.light,
  },
  arrivalIndexCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  arrivalTexts: { flex: 1 },
  arrivalMinsBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: ROUNDNESS.md,
    borderWidth: 1,
    alignItems: 'center',
    minWidth: 36,
  },
  etaFootnote: {
    marginTop: SPACING.xl,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
});

export default SchedulesScreen;
