// ============================================
// Home Screen — Live Map  (Section 13)
// ============================================
// Full-screen Google Maps showing all active
// Addis Ababa buses in real-time.
//
// Features:
//   • Bus markers (orange pin) fetched from GET /api/buses
//   • Tap a marker → callout shows bus number, route, speed
//   • Real-time position updates via Socket.io
//   • User's own GPS location dot on the map
//   • "Re-center on me" floating button
//   • Top header: greeting + notification bell
//   • Bottom card: live bus count + last-updated + refresh

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, {
  Callout,
  Marker,
  PROVIDER_GOOGLE,
  Region,
} from "react-native-maps";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { io, Socket } from "socket.io-client";
import { useNavigation } from "@react-navigation/native";

import { useAuthStore } from "../../store/authStore";
import apiClient, { API_BASE_URL } from "../../api/client";
import {
  Colors,
  FontSize,
  FontWeight,
  Radius,
  Shadow,
  Spacing,
} from "../../theme";

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────

// Addis Ababa city center
const ADDIS_ABABA: Region = {
  latitude: 9.0054,
  longitude: 38.7636,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08,
};

// ─────────────────────────────────────────────
// Local type — a bus position on the map
// ─────────────────────────────────────────────
interface BusPin {
  id: string;
  busNumber: string;
  routeId: string | null;
  routeNumber: string;
  routeName: string;
  latitude: number;
  longitude: number;
  speed: number | null;
  heading: number | null;
  timestamp: string;
}

// Socket.io "bus:locationUpdate" payload (from backend)
interface LocationUpdatePayload {
  busId: string;
  busNumber: string;
  routeId: string | null;
  latitude: number;
  longitude: number;
  speed: number | null;
  heading: number | null;
  timestamp: string;
}

// ─────────────────────────────────────────────
// Helper
// ─────────────────────────────────────────────
function buildGreeting(name: string): string {
  const h = new Date().getHours();
  const part = h < 12 ? "morning" : h < 17 ? "afternoon" : "evening";
  const first = name.split(" ")[0];
  return `Good ${part}, ${first}`;
}

// ═════════════════════════════════════════════
// Component
// ═════════════════════════════════════════════
export default function HomeScreen() {
  const navigation = useNavigation<any>();
  const { top: topInset, bottom: btmInset } = useSafeAreaInsets();

  const user = useAuthStore((s) => s.user);

  const mapRef = useRef<MapView>(null);
  const socketRef = useRef<Socket | null>(null);

  // buses keyed by busId → O(1) update when socket fires
  const [buses, setBuses] = useState<Record<string, BusPin>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasLocPerm, setHasLocPerm] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // ── 1. Request location permission ──────────────────────
  const initLocation = useCallback(async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status === "granted") setHasLocPerm(true);
  }, []);

  // ── 2. Fetch all buses from REST API ─────────────────────
  //    Also subscribes the socket to all active route rooms.
  const fetchBuses = useCallback(async (showSpinner = false) => {
    if (showSpinner) setIsLoading(true);
    setError(null);

    try {
      const res = await apiClient.get("/api/buses");
      const rawBuses: any[] = res.data.data.buses;

      const pinMap: Record<string, BusPin> = {};
      const routeIds = new Set<string>();

      for (const bus of rawBuses) {
        // Collect unique route IDs for socket subscriptions
        if (bus.route?.id) routeIds.add(bus.route.id);

        // Skip buses that don't have a GPS fix yet
        if (!bus.currentLocation) continue;

        pinMap[bus.id] = {
          id: bus.id,
          busNumber: bus.busNumber,
          routeId: bus.route?.id ?? null,
          routeNumber: bus.route?.routeNumber ?? "?",
          routeName: bus.route?.name ?? "Unknown Route",
          latitude: bus.currentLocation.latitude,
          longitude: bus.currentLocation.longitude,
          speed: bus.currentLocation.speed,
          heading: bus.currentLocation.heading,
          timestamp: bus.currentLocation.timestamp,
        };
      }

      setBuses(pinMap);
      setLastUpdated(new Date());

      // Tell the socket server which route rooms to join
      const socket = socketRef.current;
      if (socket) {
        routeIds.forEach((rid) => socket.emit("subscribe:route", rid));
      }
    } catch (err: any) {
      setError(err.message ?? "Failed to load buses. Is the backend running?");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ── 3. Set up Socket.io for real-time updates ────────────
  const initSocket = useCallback(() => {
    const socket = io(API_BASE_URL, {
      transports: ["websocket"],
      reconnection: true,
      reconnectionDelay: 3000,
    });

    socketRef.current = socket;

    // Received every time a bus moves (from POST /api/buses/:id/location)
    socket.on("bus:locationUpdate", (payload: LocationUpdatePayload) => {
      setBuses((prev) => {
        // Only update buses we already know about
        if (!prev[payload.busId]) return prev;

        return {
          ...prev,
          [payload.busId]: {
            ...prev[payload.busId],
            latitude: payload.latitude,
            longitude: payload.longitude,
            speed: payload.speed,
            heading: payload.heading,
            timestamp: payload.timestamp,
          },
        };
      });
      setLastUpdated(new Date());
    });

    socket.on("connect_error", () => {
      // Backend might not be running — the HTTP error from fetchBuses
      // is already shown to the user; no need to duplicate.
    });

    return socket;
  }, []);

  // ── Mount / unmount ───────────────────────────────────────
  useEffect(() => {
    initLocation();
    initSocket();
    fetchBuses(true);

    return () => {
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, []);

  // ── Re-center map on user's position ─────────────────────
  const centerOnUser = useCallback(async () => {
    if (!hasLocPerm) {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;
      setHasLocPerm(true);
    }

    try {
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      mapRef.current?.animateToRegion(
        {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          latitudeDelta: 0.015,
          longitudeDelta: 0.015,
        },
        700,
      );
    } catch {
      // Position unavailable — do nothing
    }
  }, [hasLocPerm]);

  // ── Derived values ────────────────────────────────────────
  const busList = Object.values(buses);
  const busCount = busList.length;
  const greeting = user ? buildGreeting(user.name) : "Bus Tracker";
  const updatedAt = lastUpdated
    ? lastUpdated.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  // ─────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────
  return (
    <View style={styles.root}>
      <StatusBar
        barStyle="dark-content"
        translucent
        backgroundColor="transparent"
      />

      {/* ── Google Map ─────────────────────────────────── */}
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFillObject}
        provider={Platform.OS === "android" ? PROVIDER_GOOGLE : undefined}
        initialRegion={ADDIS_ABABA}
        showsUserLocation={hasLocPerm}
        showsMyLocationButton={false}
        showsCompass={false}
        showsTraffic={false}
        toolbarEnabled={false}
        // Push the initial camera down so buses aren't hidden under the header
        mapPadding={{ top: topInset + 76, left: 0, right: 0, bottom: 0 }}
      >
        {/* ── Bus markers ─────────────────────────────── */}
        {busList.map((bus) => (
          <Marker
            key={bus.id}
            identifier={bus.id}
            coordinate={{ latitude: bus.latitude, longitude: bus.longitude }}
            pinColor={Colors.busMarker}
            tracksViewChanges={false}
          >
            {/* Callout card shown when marker is tapped */}
            <Callout tooltip={false}>
              <View style={styles.callout}>
                <Text style={styles.calloutBus}>🚌 Bus {bus.busNumber}</Text>
                <Text style={styles.calloutRouteNum}>
                  Route {bus.routeNumber}
                </Text>
                <Text style={styles.calloutRouteName} numberOfLines={1}>
                  {bus.routeName}
                </Text>
                {bus.speed != null && (
                  <Text style={styles.calloutSpeed}>
                    {Math.round(bus.speed)} km/h
                  </Text>
                )}
              </View>
            </Callout>
          </Marker>
        ))}
      </MapView>

      {/* ── Header overlay ─────────────────────────────── */}
      <View style={[styles.header, { paddingTop: topInset + 10 }]}>
        <View style={styles.headerRow}>
          {/* Left: greeting + live status */}
          <View style={styles.headerLeft}>
            <Text style={styles.greetingText} numberOfLines={1}>
              {greeting}
            </Text>
            <View style={styles.liveRow}>
              <View style={styles.liveDot} />
              <Text style={styles.liveLabel}>Live bus tracking</Text>
            </View>
          </View>

          {/* Right: notification bell */}
          <TouchableOpacity
            style={styles.notifBtn}
            onPress={() => navigation.navigate("Notifications")}
            activeOpacity={0.75}
          >
            <Ionicons
              name="notifications-outline"
              size={22}
              color={Colors.textPrimary}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Initial loading spinner ─────────────────────── */}
      {isLoading && (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="small" color={Colors.primary} />
          <Text style={styles.loadingText}>Finding buses…</Text>
        </View>
      )}

      {/* ── Error banner ────────────────────────────────── */}
      {!!error && !isLoading && (
        <View style={[styles.errorBanner, { top: topInset + 80 }]}>
          <Ionicons
            name="alert-circle-outline"
            size={15}
            color={Colors.error}
          />
          <Text style={styles.errorText} numberOfLines={2}>
            {error}
          </Text>
          <TouchableOpacity
            onPress={() => fetchBuses(true)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── "My Location" floating button ──────────────── */}
      <TouchableOpacity
        style={[styles.locateBtn, { bottom: btmInset + 90 }]}
        onPress={centerOnUser}
        activeOpacity={0.85}
      >
        <Ionicons name="locate-outline" size={22} color={Colors.primary} />
      </TouchableOpacity>

      {/* ── Bottom status card ──────────────────────────── */}
      <View style={[styles.statusCard, { bottom: btmInset + 16 }]}>
        {/* Left: bus count + last updated */}
        <View style={styles.statusLeft}>
          <View style={styles.liveBadge}>
            <View style={styles.liveBadgeDot} />
            <Text style={styles.liveBadgeText}>
              {busCount > 0
                ? `${busCount} bus${busCount > 1 ? "es" : ""} live`
                : "No buses online"}
            </Text>
          </View>
          {updatedAt ? (
            <Text style={styles.updatedAt}>Updated {updatedAt}</Text>
          ) : null}
        </View>

        {/* Right: refresh button */}
        <TouchableOpacity
          style={styles.refreshBtn}
          onPress={() => fetchBuses(false)}
          activeOpacity={0.8}
        >
          <Ionicons name="refresh-outline" size={15} color={Colors.primary} />
          <Text style={styles.refreshLabel}>Refresh</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ═════════════════════════════════════════════
// Styles
// ═════════════════════════════════════════════
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  // ── Header ────────────────────────────────────────────────
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(255, 255, 255, 0.97)",
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    zIndex: 10,
    ...Shadow.sm,
  },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing.sm,
  },

  headerLeft: {
    flex: 1,
    marginRight: Spacing.sm,
  },

  greetingText: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    letterSpacing: 0.1,
  },

  liveRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 3,
  },

  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: Colors.success,
  },

  liveLabel: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    fontWeight: FontWeight.medium,
  },

  notifBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
    ...Shadow.sm,
  },

  // ── Loading overlay ───────────────────────────────────────
  loadingBox: {
    position: "absolute",
    top: "45%",
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(255, 255, 255, 0.96)",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: Radius.lg,
    zIndex: 20,
    ...Shadow.md,
  },

  loadingText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontWeight: FontWeight.medium,
  },

  // ── Error banner ──────────────────────────────────────────
  errorBanner: {
    position: "absolute",
    left: Spacing.base,
    right: Spacing.base,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.errorLight,
    borderWidth: 1,
    borderColor: Colors.error,
    borderRadius: Radius.md,
    padding: Spacing.md,
    zIndex: 20,
  },

  errorText: {
    flex: 1,
    fontSize: FontSize.xs,
    color: Colors.error,
    lineHeight: FontSize.xs * 1.5,
  },

  retryText: {
    fontSize: FontSize.xs,
    color: Colors.primary,
    fontWeight: FontWeight.semibold,
    textDecorationLine: "underline",
  },

  // ── "My Location" button ──────────────────────────────────
  locateBtn: {
    position: "absolute",
    right: Spacing.base,
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: Colors.surface,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
    ...Shadow.md,
  },

  // ── Bottom status card ────────────────────────────────────
  statusCard: {
    position: "absolute",
    left: Spacing.base,
    right: Spacing.base,
    backgroundColor: "rgba(255, 255, 255, 0.97)",
    borderRadius: Radius.xl,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    zIndex: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.lg,
  },

  statusLeft: {
    rowGap: 3,
  },

  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  liveBadgeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.success,
  },

  liveBadgeText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
  },

  updatedAt: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginLeft: 14, // align with text after the dot
  },

  refreshBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.primaryBg,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.full,
  },

  refreshLabel: {
    fontSize: FontSize.sm,
    color: Colors.primary,
    fontWeight: FontWeight.semibold,
  },

  // ── Bus callout card ──────────────────────────────────────
  callout: {
    minWidth: 155,
    maxWidth: 210,
    padding: Spacing.sm,
  },

  calloutBus: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    marginBottom: 3,
  },

  calloutRouteNum: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.primary,
  },

  calloutRouteName: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginTop: 1,
  },

  calloutSpeed: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: 3,
  },
});
