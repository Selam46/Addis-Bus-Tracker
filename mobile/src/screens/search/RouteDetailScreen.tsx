// ============================================
// Route Detail Screen  (Section 14)
// ============================================
// Shown when a passenger taps a route card in SearchScreen.
// Displays the route's full stop list as a timeline,
// plus a sticky "View Schedule & ETA" CTA at the bottom.
//
// Navigation params:
//   routeId   — UUID of the route
//   routeName — display name (shown in header while loading)
//
// API used:
//   GET /api/routes/:id
//   → Returns route info + ordered stop list

import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import apiClient from '../../api/client';
import { MainStackParamList } from '../../types';
import {
  Colors,
  FontSize,
  FontWeight,
  Radius,
  Shadow,
  Spacing,
} from '../../theme';

// ─────────────────────────────────────────────
// Types (shaped from GET /api/routes/:id)
// ─────────────────────────────────────────────
interface StopOnRoute {
  order:              number;
  distanceFromStartKm: number;
  stop: {
    id:          string;
    name:        string;
    nameAm:      string | null;
    latitude:    number;
    longitude:   number;
    description: string | null;
    isActive:    boolean;
  };
}

interface RouteDetail {
  id:             string;
  routeNumber:    string;
  name:           string;
  description:    string | null;
  color:          string | null;
  isActive:       boolean;
  totalBuses:     number;
  totalSchedules: number;
  stops:          StopOnRoute[];
}

type Props = NativeStackScreenProps<MainStackParamList, 'RouteDetail'>;

// ═════════════════════════════════════════════
// Component
// ═════════════════════════════════════════════
export default function RouteDetailScreen({ navigation, route }: Props) {
  const { routeId, routeName } = route.params;

  const [detail,    setDetail]    = useState<RouteDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error,     setError]     = useState<string | null>(null);

  // ── Fetch route details ──────────────────────────────────
  const fetchDetail = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res   = await apiClient.get(`/api/routes/${routeId}`);
      setDetail(res.data.data.route);
    } catch (err: any) {
      setError(err.message ?? 'Failed to load route details.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [routeId]);

  // ─────────────────────────────────────────────────────────
  // Render helpers
  // ─────────────────────────────────────────────────────────
  const color       = detail?.color ?? Colors.primary;
  const totalStops  = detail?.stops.length ?? 0;

  // One row in the stop timeline
  const renderStopRow = (item: StopOnRoute, index: number) => {
    const isFirst = index === 0;
    const isLast  = index === totalStops - 1;
    const isEnd   = isFirst || isLast;

    return (
      <View key={item.stop.id} style={styles.stopRow}>
        {/* ── Timeline column ──────────────────── */}
        <View style={styles.timeline}>
          {/* Line above the dot (hidden for first stop) */}
          <View style={[styles.line, { opacity: isFirst ? 0 : 1 }]} />

          {/* Dot */}
          <View
            style={[
              styles.dot,
              isEnd
                ? [styles.dotEnd, { backgroundColor: color }]
                : [styles.dotMid, { borderColor: color }],
            ]}
          />

          {/* Line below the dot (hidden for last stop) */}
          <View style={[styles.line, { opacity: isLast ? 0 : 1, backgroundColor: color + '50' }]} />
        </View>

        {/* ── Stop info ────────────────────────── */}
        <View style={styles.stopInfo}>
          <View style={styles.stopNameRow}>
            <Text style={styles.stopOrder}>{item.order}</Text>
            <View style={styles.stopNames}>
              <Text style={styles.stopName}>{item.stop.name}</Text>
              {item.stop.nameAm ? (
                <Text style={styles.stopNameAm}>{item.stop.nameAm}</Text>
              ) : null}
            </View>
          </View>
          {item.distanceFromStartKm > 0 ? (
            <Text style={styles.stopDist}>
              {item.distanceFromStartKm.toFixed(1)} km from start
            </Text>
          ) : null}
        </View>
      </View>
    );
  };

  // ─────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>

      {/* ── Custom header ───────────────────────── */}
      <View style={[styles.header, { borderBottomColor: color + '40' }]}>
        {/* Back button */}
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>

        {/* Route number + name */}
        <View style={styles.headerCenter}>
          <View style={[styles.headerBadge, { backgroundColor: color + '22' }]}>
            <Text style={[styles.headerBadgeText, { color }]}>
              Route {detail?.routeNumber ?? '…'}
            </Text>
          </View>
          <Text style={styles.headerName} numberOfLines={2}>
            {detail?.name ?? routeName}
          </Text>
        </View>
      </View>

      {/* Color accent bar under header */}
      <View style={[styles.colorBar, { backgroundColor: color }]} />

      {/* ── Loading state ───────────────────────── */}
      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={Colors.primary} size="large" />
          <Text style={styles.loadingText}>Loading route…</Text>
        </View>
      ) : error ? (
        /* ── Error state ────────────────────────── */
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={32} color={Colors.error} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={fetchDetail}>
            <Text style={styles.retryLabel}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : detail ? (
        <>
          {/* ── Stats row ───────────────────────── */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Ionicons name="location-outline" size={16} color={color} />
              <Text style={styles.statValue}>{totalStops}</Text>
              <Text style={styles.statLabel}>stops</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Ionicons name="bus-outline" size={16} color={color} />
              <Text style={styles.statValue}>{detail.totalBuses}</Text>
              <Text style={styles.statLabel}>buses</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Ionicons name="calendar-outline" size={16} color={color} />
              <Text style={styles.statValue}>{detail.totalSchedules}</Text>
              <Text style={styles.statLabel}>schedules</Text>
            </View>
          </View>

          {/* ── Description ─────────────────────── */}
          {detail.description ? (
            <Text style={styles.description}>{detail.description}</Text>
          ) : null}

          {/* ── Stop list label ─────────────────── */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>All Stops</Text>
            <Text style={styles.sectionSub}>in order of travel</Text>
          </View>

          {/* ── Timeline scroll ─────────────────── */}
          <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {detail.stops.map((stop, i) => renderStopRow(stop, i))}
            {/* Extra space so last item clears the sticky button */}
            <View style={{ height: 100 }} />
          </ScrollView>

          {/* ── Sticky bottom CTA ───────────────── */}
          <View style={styles.stickyBar}>
            <TouchableOpacity
              style={[styles.scheduleBtn, { backgroundColor: color }]}
              onPress={() =>
                navigation.navigate('Schedule', {
                  routeId:   detail.id,
                  routeName: detail.name,
                })
              }
              activeOpacity={0.88}
            >
              <Ionicons name="time-outline" size={20} color="#FFF" />
              <Text style={styles.scheduleBtnText}>View Schedule & ETA</Text>
              <Ionicons name="chevron-forward" size={18} color="#FFF" />
            </TouchableOpacity>
          </View>
        </>
      ) : null}
    </SafeAreaView>
  );
}

// ═════════════════════════════════════════════
// Styles
// ═════════════════════════════════════════════
const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  // ── Custom header ─────────────────────────────────────────
  header: {
    flexDirection:     'row',
    alignItems:        'center',
    paddingHorizontal: Spacing.base,
    paddingVertical:   Spacing.md,
    backgroundColor:   Colors.surface,
    borderBottomWidth: 1,
    gap:               Spacing.md,
  },

  backBtn: {
    width:           40,
    height:          40,
    borderRadius:    20,
    backgroundColor: Colors.surfaceAlt,
    alignItems:      'center',
    justifyContent:  'center',
    ...Shadow.sm,
  },

  headerCenter: {
    flex: 1,
    gap:  4,
  },

  headerBadge: {
    alignSelf:         'flex-start',
    paddingHorizontal: 10,
    paddingVertical:   3,
    borderRadius:      Radius.full,
  },

  headerBadgeText: {
    fontSize:   FontSize.xs,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.5,
  },

  headerName: {
    fontSize:   FontSize.lg,
    fontWeight: FontWeight.bold,
    color:      Colors.textPrimary,
    lineHeight: FontSize.lg * 1.3,
  },

  // Thin color accent line under the header
  colorBar: {
    height: 3,
  },

  // ── Stats row ─────────────────────────────────────────────
  statsRow: {
    flexDirection:     'row',
    alignItems:        'center',
    backgroundColor:   Colors.surface,
    paddingVertical:   Spacing.md,
    paddingHorizontal: Spacing.xl,
    marginBottom:      Spacing.md,
    ...Shadow.sm,
  },

  statItem: {
    flex:           1,
    alignItems:     'center',
    flexDirection:  'row',
    justifyContent: 'center',
    gap:            5,
  },

  statValue: {
    fontSize:   FontSize.base,
    fontWeight: FontWeight.bold,
    color:      Colors.textPrimary,
  },

  statLabel: {
    fontSize: FontSize.xs,
    color:    Colors.textSecondary,
  },

  statDivider: {
    width:           1,
    height:          24,
    backgroundColor: Colors.border,
    marginHorizontal: Spacing.sm,
  },

  // ── Description ───────────────────────────────────────────
  description: {
    fontSize:          FontSize.sm,
    color:             Colors.textSecondary,
    lineHeight:        FontSize.sm * 1.6,
    paddingHorizontal: Spacing.base,
    marginBottom:      Spacing.md,
  },

  // ── Section header ────────────────────────────────────────
  sectionHeader: {
    flexDirection:     'row',
    alignItems:        'baseline',
    gap:               8,
    paddingHorizontal: Spacing.base,
    marginBottom:      Spacing.sm,
  },

  sectionTitle: {
    fontSize:   FontSize.base,
    fontWeight: FontWeight.bold,
    color:      Colors.textPrimary,
  },

  sectionSub: {
    fontSize: FontSize.xs,
    color:    Colors.textMuted,
  },

  // ── Stop list ─────────────────────────────────────────────
  scrollArea: {
    flex: 1,
  },

  scrollContent: {
    paddingHorizontal: Spacing.base,
  },

  // One stop row = [timeline column] + [info column]
  stopRow: {
    flexDirection: 'row',
  },

  // Left: vertical timeline
  timeline: {
    width:      36,
    alignItems: 'center',
  },

  line: {
    flex:            1,
    width:           2,
    backgroundColor: Colors.primary + '50',
    minHeight:       20,
  },

  dot: {
    width:        14,
    height:       14,
    borderRadius: 7,
    zIndex:       1,
    marginVertical: 2,
  },

  dotEnd: {
    // Filled circle for first and last stop (set backgroundColor dynamically)
  },

  dotMid: {
    // Outlined circle for middle stops
    backgroundColor: Colors.surface,
    borderWidth:     2,
    // borderColor set dynamically
  },

  // Right: stop name + distance
  stopInfo: {
    flex:            1,
    paddingLeft:     Spacing.sm,
    paddingBottom:   Spacing.base,
    paddingTop:      2,
  },

  stopNameRow: {
    flexDirection: 'row',
    alignItems:    'flex-start',
    gap:           8,
  },

  stopOrder: {
    fontSize:   FontSize.xs,
    fontWeight: FontWeight.bold,
    color:      Colors.textMuted,
    minWidth:   18,
    marginTop:  1,
  },

  stopNames: {
    flex: 1,
  },

  stopName: {
    fontSize:   FontSize.base,
    fontWeight: FontWeight.medium,
    color:      Colors.textPrimary,
  },

  stopNameAm: {
    fontSize:  FontSize.sm,
    color:     Colors.textSecondary,
    marginTop: 1,
  },

  stopDist: {
    fontSize:   FontSize.xs,
    color:      Colors.textMuted,
    marginTop:  3,
    marginLeft: 26, // align under stop name (past the order number)
  },

  // ── Loading / error ───────────────────────────────────────
  centered: {
    flex:           1,
    alignItems:     'center',
    justifyContent: 'center',
    gap:            12,
    paddingHorizontal: Spacing['2xl'],
  },

  loadingText: {
    fontSize:   FontSize.sm,
    color:      Colors.textSecondary,
    fontWeight: FontWeight.medium,
  },

  errorText: {
    fontSize:   FontSize.sm,
    color:      Colors.error,
    textAlign:  'center',
    lineHeight: FontSize.sm * 1.5,
  },

  retryBtn: {
    backgroundColor:   Colors.primaryBg,
    paddingHorizontal: Spacing.lg,
    paddingVertical:   Spacing.sm,
    borderRadius:      Radius.full,
  },

  retryLabel: {
    fontSize:   FontSize.sm,
    color:      Colors.primary,
    fontWeight: FontWeight.semibold,
  },

  // ── Sticky bottom CTA ─────────────────────────────────────
  stickyBar: {
    paddingHorizontal: Spacing.base,
    paddingVertical:   Spacing.md,
    backgroundColor:   Colors.surface,
    borderTopWidth:    1,
    borderTopColor:    Colors.border,
    ...Shadow.lg,
  },

  scheduleBtn: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'center',
    gap:            8,
    borderRadius:   Radius.lg,
    paddingVertical: 16,
  },

  scheduleBtnText: {
    flex:       1,
    fontSize:   FontSize.base,
    fontWeight: FontWeight.semibold,
    color:      '#FFF',
    textAlign:  'center',
  },
});
