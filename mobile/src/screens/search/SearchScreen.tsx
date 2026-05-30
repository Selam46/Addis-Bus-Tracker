// ============================================
// Search Screen  (Section 14 — redesigned)
// ============================================
// PRIMARY: Journey planner — user enters From + To,
//   app finds all routes that connect those two areas.
//   Each result has:
//     • "View Stops" → RouteDetailScreen (timeline)
//     • "Live Map"   → Home tab (track the bus live)
//
// SECONDARY: Browse mode — tap "All Routes" or
//   "All Stops" to browse/search the full list.
//
// APIs used:
//   GET /api/routes          — all routes (+ first/last stop)
//   GET /api/stops?search=   — stop search (supports Amharic)

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

import apiClient from "../../api/client";
import {
  Colors,
  FontSize,
  FontWeight,
  Radius,
  Shadow,
  Spacing,
} from "../../theme";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
type Mode = "home" | "journey" | "browse";
type BrowseTab = "routes" | "stops";

interface RouteListItem {
  id: string;
  routeNumber: string;
  name: string;
  description: string | null;
  color: string | null;
  totalStops: number;
  firstStop: { name: string; nameAm: string | null } | null;
  lastStop: { name: string; nameAm: string | null } | null;
}

interface StopListItem {
  id: string;
  name: string;
  nameAm: string | null;
  description: string | null;
  routes: Array<{
    id: string;
    routeNumber: string;
    name: string;
    color: string | null;
  }>;
}

// ═════════════════════════════════════════════
// Component
// ═════════════════════════════════════════════
export default function SearchScreen() {
  const navigation = useNavigation<any>();

  // ── Journey planner ──────────────────────────────────────
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  // ── Mode ─────────────────────────────────────────────────
  const [mode, setMode] = useState<Mode>("home");
  const [browseTab, setBrowseTab] = useState<BrowseTab>("routes");
  const [browseQuery, setBrowseQuery] = useState("");

  // ── Data ─────────────────────────────────────────────────
  const [allRoutes, setAllRoutes] = useState<RouteListItem[]>([]);
  const [journeyRoutes, setJourneyRoutes] = useState<RouteListItem[]>([]);
  const [browseRoutes, setBrowseRoutes] = useState<RouteListItem[]>([]);
  const [browseStops, setBrowseStops] = useState<StopListItem[]>([]);

  // ── Loading / error ───────────────────────────────────────
  const [loadingRoutes, setLoadingRoutes] = useState(false);
  const [loadingStops, setLoadingStops] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [stopError, setStopError] = useState<string | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  // ── Initial load: fetch all routes once ──────────────────
  useEffect(() => {
    fetchAllRoutes();
    return () => clearTimeout(debounceRef.current);
  }, []);

  const fetchAllRoutes = async () => {
    setLoadingRoutes(true);
    setRouteError(null);
    try {
      const res = await apiClient.get("/api/routes");
      const routes = res.data.data.routes as RouteListItem[];
      setAllRoutes(routes);
      setBrowseRoutes(routes);
    } catch (err: any) {
      setRouteError(err.message ?? "Failed to load routes.");
    } finally {
      setLoadingRoutes(false);
    }
  };

  const fetchAllStops = async () => {
    if (browseStops.length > 0) return; // already loaded
    setLoadingStops(true);
    setStopError(null);
    try {
      const res = await apiClient.get("/api/stops");
      setBrowseStops(res.data.data.stops as StopListItem[]);
    } catch (err: any) {
      setStopError(err.message ?? "Failed to load stops.");
    } finally {
      setLoadingStops(false);
    }
  };

  // ─────────────────────────────────────────────────────────
  // Journey planner logic
  // ─────────────────────────────────────────────────────────
  const findRoutes = useCallback(() => {
    const f = from.trim().toLowerCase();
    const t = to.trim().toLowerCase();
    if (!f && !t) return;

    // Search text = route name + routeNumber + firstStop + lastStop
    const results = allRoutes.filter((route) => {
      const haystack = [
        route.name,
        route.routeNumber,
        route.firstStop?.name ?? "",
        route.lastStop?.name ?? "",
      ]
        .join(" ")
        .toLowerCase();

      if (f && t) return haystack.includes(f) && haystack.includes(t);
      if (f) return haystack.includes(f);
      return haystack.includes(t);
    });

    setJourneyRoutes(results);
    setMode("journey");
  }, [from, to, allRoutes]);

  const handleSwap = () => {
    setFrom(to);
    setTo(from);
  };

  // ─────────────────────────────────────────────────────────
  // Browse mode
  // ─────────────────────────────────────────────────────────
  const openBrowse = (tab: BrowseTab) => {
    setMode("browse");
    setBrowseTab(tab);
    setBrowseQuery("");
    if (tab === "stops") fetchAllStops();
  };

  const switchBrowseTab = (tab: BrowseTab) => {
    setBrowseTab(tab);
    setBrowseQuery("");
    if (tab === "stops") fetchAllStops();
  };

  const onBrowseQueryChange = (text: string) => {
    setBrowseQuery(text);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const q = text.toLowerCase().trim();
      if (browseTab === "routes") {
        setBrowseRoutes(
          q
            ? allRoutes.filter(
                (r) =>
                  r.name.toLowerCase().includes(q) ||
                  r.routeNumber.toLowerCase().includes(q),
              )
            : allRoutes,
        );
      } else {
        // For stops: use the API so Amharic search also works
        apiClient
          .get(q ? `/api/stops?search=${encodeURIComponent(q)}` : "/api/stops")
          .then((res) => setBrowseStops(res.data.data.stops))
          .catch(() => {});
      }
    }, 400);
  };

  // ─────────────────────────────────────────────────────────
  // Route card — used in both journey + browse modes
  // ─────────────────────────────────────────────────────────
  const renderRouteCard = ({ item }: { item: RouteListItem }) => {
    const color = item.color ?? Colors.primary;
    return (
      <View style={styles.card}>
        {/* Color accent strip */}
        <View style={[styles.colorStrip, { backgroundColor: color }]} />

        <View style={styles.cardBody}>
          {/* Route info row */}
          <View style={styles.routeTopRow}>
            <View
              style={[styles.routeBadge, { backgroundColor: color + "22" }]}
            >
              <Text style={[styles.routeBadgeText, { color }]}>
                {item.routeNumber}
              </Text>
            </View>
            <Text style={styles.routeName} numberOfLines={1}>
              {item.name}
            </Text>
          </View>

          {/* Origin → Destination */}
          {item.firstStop && item.lastStop ? (
            <View style={styles.odRow}>
              <Ionicons
                name="ellipse"
                size={8}
                color={Colors.success}
                style={{ marginTop: 1 }}
              />
              <Text style={styles.odText} numberOfLines={1}>
                {item.firstStop.name}
              </Text>
              <Ionicons
                name="arrow-forward"
                size={11}
                color={Colors.textMuted}
              />
              <Ionicons
                name="ellipse"
                size={8}
                color={Colors.error}
                style={{ marginTop: 1 }}
              />
              <Text style={styles.odText} numberOfLines={1}>
                {item.lastStop.name}
              </Text>
            </View>
          ) : null}

          {/* Stop count */}
          <Text style={styles.routeMeta}>
            {item.totalStops} stop{item.totalStops !== 1 ? "s" : ""}
          </Text>

          {/* ── Action buttons ──────────────────────── */}
          <View style={styles.cardActions}>
            {/* View Stops → RouteDetailScreen */}
            <TouchableOpacity
              style={styles.actionOutline}
              onPress={() =>
                navigation.navigate("RouteDetail", {
                  routeId: item.id,
                  routeName: item.name,
                })
              }
              activeOpacity={0.8}
            >
              <Ionicons
                name="list-outline"
                size={13}
                color={Colors.textSecondary}
              />
              <Text style={styles.actionOutlineText}>View Stops</Text>
            </TouchableOpacity>

            {/* Live Map → Home tab (live bus tracking) */}
            <TouchableOpacity
              style={[styles.actionFilled, { backgroundColor: color }]}
              onPress={() => navigation.navigate("Home")}
              activeOpacity={0.85}
            >
              <Ionicons name="map" size={13} color="#FFF" />
              <Text style={styles.actionFilledText}>Live Map</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  // ─────────────────────────────────────────────────────────
  // Stop card
  // ─────────────────────────────────────────────────────────
  const renderStopCard = ({ item }: { item: StopListItem }) => (
    <View style={styles.card}>
      <View style={styles.stopIconBox}>
        <Ionicons name="location" size={22} color={Colors.stopMarker} />
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.stopName}>{item.name}</Text>
        {item.nameAm ? (
          <Text style={styles.stopNameAm}>{item.nameAm}</Text>
        ) : null}
        {item.routes.length > 0 ? (
          <View style={styles.chipRow}>
            {item.routes.slice(0, 5).map((r) => {
              const c = r.color ?? Colors.primary;
              return (
                <View
                  key={r.id}
                  style={[styles.chip, { backgroundColor: c + "22" }]}
                >
                  <Text style={[styles.chipText, { color: c }]}>
                    {r.routeNumber}
                  </Text>
                </View>
              );
            })}
            {item.routes.length > 5 && (
              <Text style={styles.chipMore}>+{item.routes.length - 5}</Text>
            )}
          </View>
        ) : null}
      </View>
    </View>
  );

  // ─────────────────────────────────────────────────────────
  // Planner card (always visible at top)
  // ─────────────────────────────────────────────────────────
  const PlannerCard = () => (
    <View style={styles.plannerCard}>
      {/* From input */}
      <View style={styles.inputRow}>
        <View style={[styles.inputDot, { backgroundColor: Colors.success }]} />
        <TextInput
          style={styles.plannerInput}
          placeholder="Starting point…"
          placeholderTextColor={Colors.textMuted}
          value={from}
          onChangeText={setFrom}
          autoCorrect={false}
          returnKeyType="next"
        />
        {from.length > 0 && (
          <TouchableOpacity
            onPress={() => setFrom("")}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="close-circle" size={16} color={Colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Swap divider */}
      <View style={styles.swapRow}>
        <View style={styles.swapLine} />
        <TouchableOpacity
          style={styles.swapBtn}
          onPress={handleSwap}
          activeOpacity={0.7}
        >
          <Ionicons
            name="swap-vertical"
            size={16}
            color={Colors.textSecondary}
          />
        </TouchableOpacity>
        <View style={styles.swapLine} />
      </View>

      {/* To input */}
      <View style={styles.inputRow}>
        <View style={[styles.inputDot, { backgroundColor: Colors.error }]} />
        <TextInput
          style={styles.plannerInput}
          placeholder="Destination…"
          placeholderTextColor={Colors.textMuted}
          value={to}
          onChangeText={setTo}
          autoCorrect={false}
          returnKeyType="search"
          onSubmitEditing={findRoutes}
        />
        {to.length > 0 && (
          <TouchableOpacity
            onPress={() => setTo("")}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="close-circle" size={16} color={Colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Find Routes button */}
      <TouchableOpacity
        style={[
          styles.findBtn,
          !from.trim() && !to.trim() && styles.findBtnOff,
        ]}
        onPress={findRoutes}
        disabled={!from.trim() && !to.trim()}
        activeOpacity={0.88}
      >
        <Ionicons name="search" size={17} color="#FFF" />
        <Text style={styles.findBtnText}>Find Routes</Text>
      </TouchableOpacity>
    </View>
  );

  // ─────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {/* ── Page header ───────────────────────────────── */}
      <View style={styles.pageHeader}>
        <Text style={styles.pageTitle}>Plan Your Journey</Text>
        <Text style={styles.pageSub}>
          Find the right bus across Addis Ababa
        </Text>
      </View>

      {/* ── Journey planner card ──────────────────────── */}
      <PlannerCard />

      {/* ══════════════════════════════════════════════ */}
      {/*  MODE: home  — show browse options            */}
      {/* ══════════════════════════════════════════════ */}
      {mode === "home" && (
        <ScrollView
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.homeContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or browse all</Text>
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.browseGrid}>
            <TouchableOpacity
              style={styles.browseBtn}
              onPress={() => openBrowse("routes")}
              activeOpacity={0.85}
            >
              <View style={styles.browseBtnIcon}>
                <Ionicons name="bus" size={26} color={Colors.primary} />
              </View>
              <Text style={styles.browseBtnLabel}>All Routes</Text>
              <Text style={styles.browseBtnSub}>
                {allRoutes.length > 0 ? `${allRoutes.length} routes` : "—"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.browseBtn}
              onPress={() => openBrowse("stops")}
              activeOpacity={0.85}
            >
              <View style={styles.browseBtnIcon}>
                <Ionicons name="location" size={26} color={Colors.stopMarker} />
              </View>
              <Text style={styles.browseBtnLabel}>All Stops</Text>
              <Text style={styles.browseBtnSub}>Bus stops city-wide</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {/* ══════════════════════════════════════════════ */}
      {/*  MODE: journey — show filtered route results  */}
      {/* ══════════════════════════════════════════════ */}
      {mode === "journey" && (
        <>
          {/* Results header */}
          <View style={styles.resultsBar}>
            <TouchableOpacity
              onPress={() => setMode("home")}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={styles.backBtn}
            >
              <Ionicons name="arrow-back" size={20} color={Colors.primary} />
            </TouchableOpacity>
            <Text style={styles.resultsTitle}>
              {journeyRoutes.length === 0
                ? "No routes found"
                : `${journeyRoutes.length} route${journeyRoutes.length > 1 ? "s" : ""} found`}
            </Text>
          </View>

          {journeyRoutes.length === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons name="bus-outline" size={52} color={Colors.textMuted} />
              <Text style={styles.emptyTitle}>No routes found</Text>
              <Text style={styles.emptySub}>
                Try different location names, or browse all routes
              </Text>
              <TouchableOpacity
                style={styles.emptyAction}
                onPress={() => openBrowse("routes")}
              >
                <Text style={styles.emptyActionText}>Browse All Routes</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={journeyRoutes}
              keyExtractor={(r) => r.id}
              renderItem={renderRouteCard}
              contentContainerStyle={styles.list}
              showsVerticalScrollIndicator={false}
              ItemSeparatorComponent={() => (
                <View style={{ height: Spacing.sm }} />
              )}
              keyboardShouldPersistTaps="handled"
            />
          )}
        </>
      )}

      {/* ══════════════════════════════════════════════ */}
      {/*  MODE: browse — full route / stop list        */}
      {/* ══════════════════════════════════════════════ */}
      {mode === "browse" && (
        <>
          {/* Browse header: back + search bar */}
          <View style={styles.browseHeader}>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => setMode("home")}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons
                name="arrow-back"
                size={20}
                color={Colors.textPrimary}
              />
            </TouchableOpacity>

            <View style={styles.browseSearchWrap}>
              <Ionicons
                name="search-outline"
                size={15}
                color={Colors.textMuted}
              />
              <TextInput
                style={styles.browseSearchInput}
                placeholder={
                  browseTab === "routes" ? "Search routes…" : "Search stops…"
                }
                placeholderTextColor={Colors.textMuted}
                value={browseQuery}
                onChangeText={onBrowseQueryChange}
                autoCorrect={false}
                autoCapitalize="none"
              />
              {browseQuery.length > 0 && (
                <TouchableOpacity
                  onPress={() => onBrowseQueryChange("")}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                >
                  <Ionicons
                    name="close-circle"
                    size={15}
                    color={Colors.textMuted}
                  />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Tab switcher */}
          <View style={styles.tabRow}>
            {(["routes", "stops"] as BrowseTab[]).map((tab) => {
              const on = browseTab === tab;
              return (
                <TouchableOpacity
                  key={tab}
                  style={[styles.tabBtn, on && styles.tabBtnOn]}
                  onPress={() => switchBrowseTab(tab)}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={tab === "routes" ? "bus-outline" : "location-outline"}
                    size={14}
                    color={on ? Colors.primary : Colors.textSecondary}
                  />
                  <Text style={[styles.tabLabel, on && styles.tabLabelOn]}>
                    {tab === "routes" ? "Routes" : "Stops"}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* List content */}
          {(browseTab === "routes" ? loadingRoutes : loadingStops) ? (
            <View style={styles.centered}>
              <ActivityIndicator color={Colors.primary} />
              <Text style={styles.loadingText}>Loading {browseTab}…</Text>
            </View>
          ) : (browseTab === "routes" ? routeError : stopError) ? (
            <View style={styles.centered}>
              <Ionicons
                name="alert-circle-outline"
                size={28}
                color={Colors.error}
              />
              <Text style={styles.errorText}>
                {browseTab === "routes" ? routeError : stopError}
              </Text>
              <TouchableOpacity
                style={styles.emptyAction}
                onPress={
                  browseTab === "routes" ? fetchAllRoutes : fetchAllStops
                }
              >
                <Text style={styles.emptyActionText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={
                (browseTab === "routes" ? browseRoutes : browseStops) as any[]
              }
              keyExtractor={(item) => item.id}
              renderItem={(info) =>
                browseTab === "routes"
                  ? renderRouteCard({ item: info.item as RouteListItem })
                  : renderStopCard({ item: info.item as StopListItem })
              }
              ListEmptyComponent={
                <View style={styles.emptyBox}>
                  <Ionicons
                    name="search-outline"
                    size={44}
                    color={Colors.textMuted}
                  />
                  <Text style={styles.emptyTitle}>No {browseTab} found</Text>
                  <Text style={styles.emptySub}>
                    Try a different search term
                  </Text>
                </View>
              }
              contentContainerStyle={styles.list}
              showsVerticalScrollIndicator={false}
              ItemSeparatorComponent={() => (
                <View style={{ height: Spacing.sm }} />
              )}
              keyboardShouldPersistTaps="handled"
            />
          )}
        </>
      )}
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

  // ── Page header ───────────────────────────────────────────
  pageHeader: {
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
  },

  pageTitle: {
    fontSize: FontSize["2xl"],
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    letterSpacing: -0.3,
  },

  pageSub: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: 3,
  },

  // ── Journey planner card ──────────────────────────────────
  plannerCard: {
    marginHorizontal: Spacing.base,
    marginBottom: Spacing.base,
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.base,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.md,
  },

  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 4,
  },

  inputDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    flexShrink: 0,
  },

  plannerInput: {
    flex: 1,
    fontSize: FontSize.base,
    color: Colors.textPrimary,
    padding: 0,
    paddingVertical: 6,
  },

  swapRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginVertical: 4,
  },

  swapLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },

  swapBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.border,
  },

  findBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: Radius.lg,
    paddingVertical: 14,
    marginTop: Spacing.sm,
    ...Shadow.sm,
    shadowColor: Colors.primary,
  },

  findBtnOff: {
    backgroundColor: Colors.textMuted,
    shadowColor: "transparent",
  },

  findBtnText: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.semibold,
    color: "#FFF",
    letterSpacing: 0.2,
  },

  // ── Home mode ─────────────────────────────────────────────
  homeContent: {
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing["3xl"],
  },

  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.base,
  },

  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },

  dividerText: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    fontWeight: FontWeight.medium,
    letterSpacing: 0.5,
  },

  browseGrid: {
    flexDirection: "row",
    gap: Spacing.md,
  },

  browseBtn: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.base,
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.sm,
  },

  browseBtnIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.primaryBg,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },

  browseBtnLabel: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
  },

  browseBtnSub: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    textAlign: "center",
  },

  // ── Journey results bar ───────────────────────────────────
  resultsBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    marginBottom: Spacing.md,
  },

  resultsTitle: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
  },

  // ── Browse header ─────────────────────────────────────────
  browseHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing.sm,
  },

  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
    ...Shadow.sm,
  },

  browseSearchWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: 9,
  },

  browseSearchInput: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
    padding: 0,
  },

  // ── Tab switcher ──────────────────────────────────────────
  tabRow: {
    flexDirection: "row",
    marginHorizontal: Spacing.base,
    marginBottom: Spacing.md,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radius.lg,
    padding: 4,
    gap: 4,
  },

  tabBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 9,
    borderRadius: Radius.md,
  },

  tabBtnOn: {
    backgroundColor: Colors.surface,
    ...Shadow.sm,
  },

  tabLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
  },

  tabLabelOn: {
    color: Colors.primary,
  },

  // ── Route card ────────────────────────────────────────────
  card: {
    flexDirection: "row",
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    overflow: "hidden",
    ...Shadow.sm,
  },

  colorStrip: {
    width: 5,
    alignSelf: "stretch",
  },

  cardBody: {
    flex: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    gap: 4,
  },

  routeTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  routeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.sm,
  },

  routeBadgeText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.3,
  },

  routeName: {
    flex: 1,
    fontSize: FontSize.base,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
  },

  odRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 2,
    flexWrap: "nowrap",
  },

  odText: {
    flex: 1,
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    fontWeight: FontWeight.medium,
    minWidth: 0,
  },

  routeMeta: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: 1,
  },

  // Route card action buttons
  cardActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: Spacing.sm,
  },

  actionOutline: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 8,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },

  actionOutlineText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
  },

  actionFilled: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 8,
    borderRadius: Radius.md,
  },

  actionFilledText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: "#FFF",
  },

  // ── Stop card ─────────────────────────────────────────────
  stopIconBox: {
    width: 52,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
  },

  stopName: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
  },

  stopNameAm: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: 1,
  },

  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5,
    marginTop: 6,
  },

  chip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.sm,
  },

  chipText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
  },

  chipMore: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    alignSelf: "center",
    fontWeight: FontWeight.medium,
  },

  // ── FlatList container ────────────────────────────────────
  list: {
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing["3xl"],
    flexGrow: 1,
  },

  // ── Centered (loading / error) ────────────────────────────
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: Spacing["2xl"],
  },

  loadingText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontWeight: FontWeight.medium,
  },

  errorText: {
    fontSize: FontSize.sm,
    color: Colors.error,
    textAlign: "center",
    lineHeight: FontSize.sm * 1.5,
  },

  // ── Empty state ───────────────────────────────────────────
  emptyBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: Spacing["5xl"],
    gap: 12,
    paddingHorizontal: Spacing["2xl"],
  },

  emptyTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
    textAlign: "center",
  },

  emptySub: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    textAlign: "center",
    lineHeight: FontSize.sm * 1.5,
  },

  emptyAction: {
    backgroundColor: Colors.primaryBg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    marginTop: Spacing.xs,
  },

  emptyActionText: {
    fontSize: FontSize.sm,
    color: Colors.primary,
    fontWeight: FontWeight.semibold,
  },
});
