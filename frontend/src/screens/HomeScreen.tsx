import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  FlatList,
  Animated,
  Easing,
  ScrollView,
  Dimensions,
} from 'react-native';
import MapView, { Marker, Callout } from 'react-native-maps';
import * as Location from 'expo-location';
import { io, Socket } from 'socket.io-client';
import { useRoute, RouteProp } from '@react-navigation/native';
import { useAuthStore } from '../store/authStore';
import { COLORS, SPACING, ROUNDNESS, SHADOWS } from '../theme/theme';
import Text from '../components/ui/Text';
import ENV from '../config/env';
import stopsApi, { Stop, NearbyStop } from '../api/stops';
import busesApi, { Bus } from '../api/buses';
import routesApi, { Route } from '../api/routes';
import { MainTabParamList } from '../navigation/types';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const ADDIS_ABABA_REGION = {
  latitude: 9.0192,
  longitude: 38.7525,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

type SearchResult =
  | { type: 'stop'; data: Stop }
  | { type: 'route'; data: Route };

export const HomeScreen: React.FC = () => {
  const user = useAuthStore((state) => state.user);
  const route = useRoute<RouteProp<MainTabParamList, 'Home'>>();

  // Core map data
  const [buses, setBuses] = useState<Bus[]>([]);
  const [stops, setStops] = useState<Stop[]>([]);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Selected/Highlighted stop from RoutesScreen navigation
  const [highlightedStopId, setHighlightedStopId] = useState<string | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Route filter (when user selects a route from search)
  const [activeRouteFilter, setActiveRouteFilter] = useState<Route | null>(null);

  // Search Sheet state
  const [searchSheetVisible, setSearchSheetVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearchLoading, setIsSearchLoading] = useState(false);

  // Nearby Stops Sheet state
  const [nearbySheetVisible, setNearbySheetVisible] = useState(false);
  const [nearbyStops, setNearbyStops] = useState<NearbyStop[]>([]);
  const [isNearbyLoading, setIsNearbyLoading] = useState(false);

  const mapRef = useRef<MapView | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const searchInputRef = useRef<TextInput>(null);

  // ─── Pulsing animation for highlighted stop marker ─────────────────────────
  useEffect(() => {
    if (!highlightedStopId) return;
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.8,
          duration: 700,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 700,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => {
      pulse.stop();
      pulseAnim.setValue(1);
    };
  }, [highlightedStopId]);

  // ─── Listen to navigation params (from RoutesScreen "View on Live Map") ─────
  useEffect(() => {
    if (route.params?.latitude && route.params?.longitude) {
      const { latitude, longitude, selectedStopId } = route.params;
      console.log(`📍 HomeScreen: Navigating to stop (${latitude}, ${longitude})`);

      // Highlight the stop marker
      if (selectedStopId) {
        setHighlightedStopId(selectedStopId);
        // Auto-clear highlight after 8 seconds
        const timer = setTimeout(() => setHighlightedStopId(null), 8000);
        return () => clearTimeout(timer);
      }

      if (mapRef.current) {
        mapRef.current.animateToRegion(
          { latitude, longitude, latitudeDelta: 0.012, longitudeDelta: 0.012 },
          1000
        );
      }
    }
  }, [route.params]);

  // Separate effect just for animating to the new coords
  useEffect(() => {
    if (route.params?.latitude && route.params?.longitude && mapRef.current) {
      mapRef.current.animateToRegion(
        {
          latitude: route.params.latitude,
          longitude: route.params.longitude,
          latitudeDelta: 0.012,
          longitudeDelta: 0.012,
        },
        1000
      );
    }
  }, [route.params?.latitude, route.params?.longitude]);

  // ─── Debounce search query ──────────────────────────────────────────────────
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // ─── Fetch search results when debounced query changes ─────────────────────
  useEffect(() => {
    if (!searchSheetVisible) return;
    if (!debouncedQuery.trim()) {
      setSearchResults([]);
      return;
    }

    let active = true;
    const fetchSearch = async () => {
      setIsSearchLoading(true);
      try {
        const [routesRes, stopsRes] = await Promise.all([
          routesApi.getAll(debouncedQuery),
          stopsApi.getAll(debouncedQuery),
        ]);

        if (!active) return;

        const results: SearchResult[] = [];
        if (routesRes.success) {
          routesRes.data.routes.slice(0, 4).forEach((r) =>
            results.push({ type: 'route', data: r })
          );
        }
        if (stopsRes.success) {
          stopsRes.data.stops.slice(0, 6).forEach((s) =>
            results.push({ type: 'stop', data: s })
          );
        }
        setSearchResults(results);
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        if (active) setIsSearchLoading(false);
      }
    };

    fetchSearch();
    return () => { active = false; };
  }, [debouncedQuery, searchSheetVisible]);

  // ─── Subscribe to route socket rooms ───────────────────────────────────────
  const subscribeToActiveRoutes = useCallback((activeBuses: Bus[], socketInstance: Socket) => {
    if (!socketInstance?.connected) return;
    const routeIds = Array.from(
      new Set(activeBuses.map((bus) => bus.route?.id).filter(Boolean) as string[])
    );
    routeIds.forEach((routeId) => {
      socketInstance.emit('subscribe:route', routeId);
    });
  }, []);

  // ─── Handle realtime location updates ──────────────────────────────────────
  const handleLocationUpdate = useCallback((updatedLocation: any) => {
    setBuses((prevBuses) =>
      prevBuses.map((bus) => {
        if (bus.id === updatedLocation.busId) {
          return {
            ...bus,
            currentLocation: {
              id: bus.currentLocation?.id || '',
              busId: updatedLocation.busId,
              latitude: updatedLocation.latitude,
              longitude: updatedLocation.longitude,
              speed: updatedLocation.speed,
              heading: updatedLocation.heading,
              timestamp: updatedLocation.timestamp,
            },
          };
        }
        return bus;
      })
    );
  }, []);

  // ─── Initial data fetch + Socket connection ────────────────────────────────
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [stopsRes, busesRes] = await Promise.all([
          stopsApi.getAll(),
          busesApi.getAll(),
        ]);
        if (stopsRes.success) setStops(stopsRes.data.stops);
        if (busesRes.success) {
          setBuses(busesRes.data.buses);
          if (socketRef.current?.connected) {
            subscribeToActiveRoutes(busesRes.data.buses, socketRef.current);
          }
        }
      } catch (error) {
        console.error('Error fetching initial map data:', error);
        Alert.alert('Connection Error', 'Unable to fetch map data. Check your connection.');
      } finally {
        setIsLoading(false);
      }
    };

    const requestLocation = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        const userCoords = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        };
        setUserLocation(userCoords);
        if (mapRef.current) {
          mapRef.current.animateToRegion(
            { ...userCoords, latitudeDelta: 0.02, longitudeDelta: 0.02 },
            1000
          );
        }
      } catch (error) {
        console.error('Location error:', error);
      }
    };

    fetchInitialData();
    requestLocation();

    console.log(`🔌 Connecting to Socket.io: ${ENV.SOCKET_URL}`);
    const socket = io(ENV.SOCKET_URL, { transports: ['websocket'] });
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('✅ Socket connected:', socket.id);
      if (buses.length > 0) subscribeToActiveRoutes(buses, socket);
    });
    socket.on('bus:locationUpdate', handleLocationUpdate);
    socket.on('disconnect', (reason) => console.log('❌ Socket disconnected:', reason));

    return () => {
      socketRef.current?.disconnect();
    };
  }, []);

  // ─── Center map on user ────────────────────────────────────────────────────
  const centerOnUser = () => {
    if (userLocation && mapRef.current) {
      mapRef.current.animateToRegion(
        { ...userLocation, latitudeDelta: 0.015, longitudeDelta: 0.015 },
        800
      );
    } else {
      Alert.alert('Location', 'Finding your GPS location. Make sure location is enabled.');
    }
  };

  // ─── Handle selecting a stop from search ──────────────────────────────────
  const handleSelectStopFromSearch = (stop: Stop) => {
    setSearchSheetVisible(false);
    setSearchQuery('');
    setHighlightedStopId(stop.id);
    setTimeout(() => setHighlightedStopId(null), 8000);

    if (mapRef.current) {
      mapRef.current.animateToRegion(
        {
          latitude: stop.latitude,
          longitude: stop.longitude,
          latitudeDelta: 0.012,
          longitudeDelta: 0.012,
        },
        800
      );
    }
  };

  // ─── Handle selecting a route from search ─────────────────────────────────
  const handleSelectRouteFromSearch = (routeItem: Route) => {
    setSearchSheetVisible(false);
    setSearchQuery('');
    setActiveRouteFilter(routeItem);
    Alert.alert(
      `Route ${routeItem.routeNumber}`,
      `Showing buses on: ${routeItem.name}`,
      [{ text: 'OK' }]
    );
  };

  // ─── Clear route filter ────────────────────────────────────────────────────
  const clearRouteFilter = () => setActiveRouteFilter(null);

  // ─── Load nearby stops ─────────────────────────────────────────────────────
  const loadNearbyStops = async () => {
    if (!userLocation) {
      Alert.alert('Location Required', 'Turn on your GPS to find nearby stops.');
      return;
    }
    setNearbySheetVisible(true);
    setIsNearbyLoading(true);
    try {
      const res = await stopsApi.getNearby(userLocation.latitude, userLocation.longitude, 2);
      if (res.success) setNearbyStops(res.data.stops);
    } catch (err) {
      console.error('Nearby stops error:', err);
      Alert.alert('Error', 'Could not fetch nearby stops.');
    } finally {
      setIsNearbyLoading(false);
    }
  };

  // ─── Handle selecting nearby stop ─────────────────────────────────────────
  const handleSelectNearbyStop = (stop: NearbyStop) => {
    setNearbySheetVisible(false);
    setHighlightedStopId(stop.id);
    setTimeout(() => setHighlightedStopId(null), 8000);
    if (mapRef.current) {
      mapRef.current.animateToRegion(
        { latitude: stop.latitude, longitude: stop.longitude, latitudeDelta: 0.01, longitudeDelta: 0.01 },
        800
      );
    }
  };

  // ─── Loading state ─────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText} variant="body" color={COLORS.textMuted}>
          Loading Addis Ababa Live Map...
        </Text>
      </View>
    );
  }

  // ─── Filter buses by active route filter ──────────────────────────────────
  const activeBuses = buses.filter((bus) => {
    if (!bus.currentLocation) return false;
    if (activeRouteFilter) return bus.route?.id === activeRouteFilter.id;
    return true;
  });

  const displayedStops = activeRouteFilter
    ? stops.filter((s) => s.routes?.some((r) => r.id === activeRouteFilter.id))
    : stops;

  return (
    <View style={styles.container}>
      {/* ── MAP ─────────────────────────────────────────────────────────── */}
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={
          userLocation
            ? { ...userLocation, latitudeDelta: 0.02, longitudeDelta: 0.02 }
            : ADDIS_ABABA_REGION
        }
        showsUserLocation
        showsMyLocationButton={false}
      >
        {/* Bus Stop Markers */}
        {displayedStops.map((stop) => {
          const isHighlighted = stop.id === highlightedStopId;
          return (
            <Marker
              key={`stop-${stop.id}`}
              coordinate={{ latitude: stop.latitude, longitude: stop.longitude }}
              title={stop.name}
              description={stop.description || undefined}
              zIndex={isHighlighted ? 999 : 1}
            >
              <View style={styles.stopMarkerWrapper}>
                {isHighlighted && (
                  <Animated.View
                    style={[
                      styles.stopPulseRing,
                      { transform: [{ scale: pulseAnim }] },
                    ]}
                  />
                )}
                <View
                  style={[
                    styles.stopMarker,
                    isHighlighted && styles.stopMarkerHighlighted,
                  ]}
                >
                  <Text style={styles.stopIcon}>🚏</Text>
                </View>
              </View>
              <Callout>
                <View style={styles.calloutContainer}>
                  <Text variant="bodySemibold">{stop.name}</Text>
                  {stop.nameAm && <Text variant="caption">{stop.nameAm}</Text>}
                  {stop.routes && stop.routes.length > 0 && (
                    <View style={styles.calloutRoutes}>
                      {stop.routes.map((r) => (
                        <View
                          key={r.id}
                          style={[styles.routeBadge, { backgroundColor: r.color || COLORS.primary }]}
                        >
                          <Text variant="caption" color={COLORS.white} style={styles.badgeText}>
                            {r.routeNumber}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              </Callout>
            </Marker>
          );
        })}

        {/* Live Bus Markers */}
        {activeBuses.map((bus) => {
          const loc = bus.currentLocation!;
          const routeColor = bus.route?.color || COLORS.primary;
          const headingAngle = loc.heading || 0;
          return (
            <Marker
              key={`bus-${bus.id}`}
              coordinate={{ latitude: loc.latitude, longitude: loc.longitude }}
              title={`Bus ${bus.busNumber}`}
              description={bus.route ? `Route ${bus.route.routeNumber}: ${bus.route.name}` : undefined}
              zIndex={10}
            >
              <View style={[styles.busMarker, { backgroundColor: routeColor }]}>
                <View style={{ transform: [{ rotate: `${headingAngle}deg` }] }}>
                  <Text style={styles.busMarkerIcon}>🚌</Text>
                </View>
              </View>
              <Callout>
                <View style={styles.calloutContainer}>
                  <Text variant="bodySemibold">Bus {bus.busNumber}</Text>
                  {bus.route && (
                    <Text variant="caption" color={COLORS.primary}>
                      Route {bus.route.routeNumber}: {bus.route.name}
                    </Text>
                  )}
                  {bus.licensePlate && (
                    <Text variant="caption" color={COLORS.textMuted}>
                      Plate: {bus.licensePlate}
                    </Text>
                  )}
                  {loc.speed !== null && (
                    <Text variant="caption" color={COLORS.textLight}>
                      Speed: {Math.round(loc.speed)} km/h
                    </Text>
                  )}
                </View>
              </Callout>
            </Marker>
          );
        })}
      </MapView>

      {/* ── SEARCH BAR (Tappable Floating) ──────────────────────────────── */}
      <TouchableOpacity
        style={styles.searchBar}
        onPress={() => setSearchSheetVisible(true)}
        activeOpacity={0.85}
      >
        <Text style={styles.searchBarIcon}>🔍</Text>
        <Text variant="body" color={COLORS.textLight} style={styles.searchBarPlaceholder}>
          Search routes & stops...
        </Text>
        <View style={styles.searchBarGreeting}>
          <Text variant="caption" color={COLORS.primary} style={{ fontWeight: '600' }}>
            {user?.fullName?.split(' ')[0] || 'Hey'}! 👋
          </Text>
        </View>
      </TouchableOpacity>

      {/* ── ACTIVE ROUTE FILTER BADGE ──────────────────────────────────── */}
      {activeRouteFilter && (
        <View style={styles.activeFilterBadge}>
          <View style={[styles.filterBadgeDot, { backgroundColor: activeRouteFilter.color || COLORS.primary }]} />
          <Text variant="caption" color={COLORS.text} style={styles.filterBadgeText}>
            Route {activeRouteFilter.routeNumber}
          </Text>
          <TouchableOpacity onPress={clearRouteFilter} style={styles.filterClearBtn}>
            <Text style={{ fontSize: 11 }}>✕</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── FAB BUTTONS (right side) ─────────────────────────────────── */}
      <View style={styles.fabColumn}>
        {/* My Location */}
        <TouchableOpacity style={styles.fab} onPress={centerOnUser} activeOpacity={0.8}>
          <Text style={styles.fabIcon}>🎯</Text>
        </TouchableOpacity>

        {/* Nearby Stops */}
        <TouchableOpacity
          style={[styles.fab, styles.fabNearby]}
          onPress={loadNearbyStops}
          activeOpacity={0.8}
        >
          <Text style={styles.fabIcon}>📍</Text>
        </TouchableOpacity>
      </View>

      {/* ── HIGHLIGHTED STOP TOAST ──────────────────────────────────────── */}
      {highlightedStopId && (
        <View style={styles.highlightToast}>
          <Text style={{ fontSize: 14 }}>🚏</Text>
          <Text variant="caption" color={COLORS.white} style={{ marginLeft: 6 }}>
            Stop highlighted on map
          </Text>
        </View>
      )}

      {/* ╔══════════════════════════════════════════════════════════════════╗
          ║           SEARCH SHEET MODAL                                    ║
          ╚══════════════════════════════════════════════════════════════════╝ */}
      <Modal
        visible={searchSheetVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setSearchSheetVisible(false)}
        onShow={() => setTimeout(() => searchInputRef.current?.focus(), 100)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalDismissArea}
            activeOpacity={1}
            onPress={() => { setSearchSheetVisible(false); setSearchQuery(''); }}
          />
          <View style={[styles.bottomSheet, { height: SCREEN_HEIGHT * 0.72 }]}>
            <View style={styles.sheetHandle} />

            {/* Search Input */}
            <View style={styles.searchSheetHeader}>
              <Text style={{ fontSize: 16 }}>🔍</Text>
              <TextInput
                ref={searchInputRef}
                style={styles.searchSheetInput}
                placeholder="Search routes or stops..."
                placeholderTextColor={COLORS.textLight}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCorrect={false}
                returnKeyType="search"
              />
              {searchQuery !== '' && (
                <TouchableOpacity onPress={() => setSearchQuery('')} style={{ paddingHorizontal: 8 }}>
                  <Text style={{ fontSize: 12 }}>✕</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Results */}
            {isSearchLoading ? (
              <View style={styles.searchLoadingContainer}>
                <ActivityIndicator color={COLORS.primary} />
                <Text variant="caption" color={COLORS.textMuted} style={{ marginTop: 8 }}>
                  Searching...
                </Text>
              </View>
            ) : searchResults.length === 0 && debouncedQuery.trim() ? (
              <View style={styles.searchEmptyContainer}>
                <Text style={{ fontSize: 40, opacity: 0.3 }}>🔍</Text>
                <Text variant="body" color={COLORS.textMuted} style={{ marginTop: 12, textAlign: 'center' }}>
                  No results found for "{debouncedQuery}"
                </Text>
              </View>
            ) : searchResults.length === 0 ? (
              <View style={styles.searchHintContainer}>
                <Text variant="bodySemibold" color={COLORS.text} style={styles.searchHintTitle}>
                  🚍 Find Routes & Stops
                </Text>
                <Text variant="body" color={COLORS.textMuted} style={styles.searchHintText}>
                  Search by route number (e.g. LID-009), stop name (e.g. Bole), or neighborhood.
                </Text>
                <View style={styles.searchQuickChips}>
                  {['Merkato', 'Bole', 'Megenagna', 'Piazza'].map((hint) => (
                    <TouchableOpacity
                      key={hint}
                      style={styles.quickChip}
                      onPress={() => setSearchQuery(hint)}
                    >
                      <Text variant="caption" color={COLORS.primary}>{hint}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ) : (
              <FlatList
                data={searchResults}
                keyExtractor={(item, idx) =>
                  item.type === 'route' ? `route-${item.data.id}` : `stop-${item.data.id}-${idx}`
                }
                contentContainerStyle={{ paddingHorizontal: SPACING.lg, paddingBottom: 40 }}
                renderItem={({ item }) => {
                  if (item.type === 'route') {
                    const r = item.data as Route;
                    return (
                      <TouchableOpacity
                        style={styles.searchResultCard}
                        onPress={() => handleSelectRouteFromSearch(r)}
                        activeOpacity={0.75}
                      >
                        <View
                          style={[
                            styles.searchResultIcon,
                            { backgroundColor: r.color || COLORS.primary },
                          ]}
                        >
                          <Text style={{ fontSize: 14 }}>🚍</Text>
                        </View>
                        <View style={styles.searchResultTexts}>
                          <Text variant="bodySemibold">{r.name}</Text>
                          <Text variant="caption" color={COLORS.textMuted}>
                            Route {r.routeNumber} · {r.totalStops} stops
                          </Text>
                        </View>
                        <View
                          style={[
                            styles.searchResultBadge,
                            { backgroundColor: r.color || COLORS.primary },
                          ]}
                        >
                          <Text variant="caption" color={COLORS.white} style={{ fontWeight: '700', fontSize: 10 }}>
                            {r.routeNumber}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  }

                  const s = item.data as Stop;
                  return (
                    <TouchableOpacity
                      style={styles.searchResultCard}
                      onPress={() => handleSelectStopFromSearch(s)}
                      activeOpacity={0.75}
                    >
                      <View style={[styles.searchResultIcon, { backgroundColor: COLORS.primaryLight }]}>
                        <Text style={{ fontSize: 14 }}>🚏</Text>
                      </View>
                      <View style={styles.searchResultTexts}>
                        <Text variant="bodySemibold">{s.name}</Text>
                        {s.nameAm ? (
                          <Text variant="caption" color={COLORS.textMuted}>{s.nameAm}</Text>
                        ) : null}
                        {s.routes && s.routes.length > 0 && (
                          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 }}>
                            {s.routes.slice(0, 3).map((r) => (
                              <View
                                key={r.id}
                                style={[styles.tinyBadge, { backgroundColor: r.color || COLORS.primary }]}
                              >
                                <Text style={{ fontSize: 9, color: COLORS.white, fontWeight: '700' }}>
                                  {r.routeNumber}
                                </Text>
                              </View>
                            ))}
                          </View>
                        )}
                      </View>
                      <Text style={{ fontSize: 16, opacity: 0.4 }}>→</Text>
                    </TouchableOpacity>
                  );
                }}
              />
            )}
          </View>
        </View>
      </Modal>

      {/* ╔══════════════════════════════════════════════════════════════════╗
          ║           NEARBY STOPS SHEET MODAL                              ║
          ╚══════════════════════════════════════════════════════════════════╝ */}
      <Modal
        visible={nearbySheetVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setNearbySheetVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalDismissArea}
            activeOpacity={1}
            onPress={() => setNearbySheetVisible(false)}
          />
          <View style={[styles.bottomSheet, { height: SCREEN_HEIGHT * 0.55 }]}>
            <View style={styles.sheetHandle} />

            <View style={styles.nearbySheetHeader}>
              <Text variant="h3" style={{ color: COLORS.primary }}>
                📍 Nearby Stops
              </Text>
              <Text variant="caption" color={COLORS.textMuted}>
                Within 2 km of your location
              </Text>
            </View>

            {isNearbyLoading ? (
              <View style={styles.searchLoadingContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text variant="caption" color={COLORS.textMuted} style={{ marginTop: 12 }}>
                  Finding stops near you...
                </Text>
              </View>
            ) : nearbyStops.length === 0 ? (
              <View style={styles.searchEmptyContainer}>
                <Text style={{ fontSize: 48, opacity: 0.3 }}>🚏</Text>
                <Text variant="body" color={COLORS.textMuted} style={{ marginTop: 12, textAlign: 'center' }}>
                  No stops found within 2 km.{'\n'}Try moving closer to a bus route.
                </Text>
              </View>
            ) : (
              <ScrollView contentContainerStyle={{ paddingHorizontal: SPACING.lg, paddingBottom: 40 }}>
                {nearbyStops.map((stop, idx) => (
                  <TouchableOpacity
                    key={stop.id}
                    style={styles.nearbyStopCard}
                    onPress={() => handleSelectNearbyStop(stop)}
                    activeOpacity={0.75}
                  >
                    <View style={styles.nearbyRankCircle}>
                      <Text variant="caption" color={COLORS.white} style={{ fontWeight: '700' }}>
                        {idx + 1}
                      </Text>
                    </View>
                    <View style={styles.nearbyStopTexts}>
                      <Text variant="bodySemibold">{stop.name}</Text>
                      {stop.nameAm && (
                        <Text variant="caption" color={COLORS.textMuted}>{stop.nameAm}</Text>
                      )}
                      {stop.routes && stop.routes.length > 0 && (
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 }}>
                          {stop.routes.slice(0, 4).map((r) => (
                            <View
                              key={r.id}
                              style={[styles.tinyBadge, { backgroundColor: r.color || COLORS.primary }]}
                            >
                              <Text style={{ fontSize: 9, color: COLORS.white, fontWeight: '700' }}>
                                {r.routeNumber}
                              </Text>
                            </View>
                          ))}
                        </View>
                      )}
                    </View>
                    <View style={styles.nearbyDistanceBadge}>
                      <Text variant="caption" color={COLORS.primary} style={{ fontWeight: '700' }}>
                        {stop.distanceKm < 1
                          ? `${Math.round(stop.distanceKm * 1000)} m`
                          : `${stop.distanceKm.toFixed(1)} km`}
                      </Text>
                      <Text style={{ fontSize: 10, opacity: 0.5 }}>away</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: { marginTop: SPACING.md },

  // ── Stop Markers ────────────────────────────────────────────────────────────
  stopMarkerWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 50,
    height: 50,
  },
  stopPulseRing: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    opacity: 0.25,
  },
  stopMarker: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: COLORS.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stopMarkerHighlighted: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 3,
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },
  stopIcon: { fontSize: 14 },

  // ── Bus Markers ─────────────────────────────────────────────────────────────
  busMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2.5,
    borderColor: COLORS.white,
    ...SHADOWS.medium,
  },
  busMarkerIcon: { fontSize: 20 },

  // ── Callout ─────────────────────────────────────────────────────────────────
  calloutContainer: { padding: SPACING.sm, width: 180 },
  calloutRoutes: { flexDirection: 'row', flexWrap: 'wrap', marginTop: SPACING.xs },
  routeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 4,
    marginBottom: 4,
  },
  badgeText: { fontSize: 10, fontWeight: 'bold' },

  // ── Floating Search Bar ─────────────────────────────────────────────────────
  searchBar: {
    position: 'absolute',
    top: 55,
    left: SPACING.lg,
    right: SPACING.lg,
    height: 52,
    backgroundColor: COLORS.background,
    borderRadius: ROUNDNESS.xl,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    ...SHADOWS.dark,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchBarIcon: { fontSize: 16, marginRight: SPACING.sm },
  searchBarPlaceholder: { flex: 1 },
  searchBarGreeting: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: SPACING.md,
    paddingVertical: 4,
    borderRadius: ROUNDNESS.full,
  },

  // ── Active Route Filter Badge ───────────────────────────────────────────────
  activeFilterBadge: {
    position: 'absolute',
    top: 120,
    left: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: ROUNDNESS.full,
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    ...SHADOWS.medium,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterBadgeDot: { width: 10, height: 10, borderRadius: 5, marginRight: 6 },
  filterBadgeText: { marginRight: 6 },
  filterClearBtn: { padding: 2 },

  // ── FAB Column ──────────────────────────────────────────────────────────────
  fabColumn: {
    position: 'absolute',
    bottom: 36,
    right: SPACING.lg,
    gap: 12,
  },
  fab: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.medium,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  fabNearby: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primaryDark,
  },
  fabIcon: { fontSize: 22 },

  // ── Highlight Toast ─────────────────────────────────────────────────────────
  highlightToast: {
    position: 'absolute',
    bottom: 110,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: ROUNDNESS.full,
    ...SHADOWS.medium,
  },

  // ── Modal / Bottom Sheet ────────────────────────────────────────────────────
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

  // ── Search Sheet ────────────────────────────────────────────────────────────
  searchSheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: SPACING.lg,
    marginVertical: SPACING.md,
    height: 48,
    borderRadius: ROUNDNESS.md,
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchSheetInput: {
    flex: 1,
    height: '100%',
    color: COLORS.text,
    fontSize: 15,
    marginLeft: SPACING.sm,
  },
  searchLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 40,
  },
  searchEmptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xxxl,
  },
  searchHintContainer: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
  },
  searchHintTitle: { marginBottom: SPACING.sm },
  searchHintText: { lineHeight: 20, marginBottom: SPACING.lg },
  searchQuickChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  quickChip: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: ROUNDNESS.full,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },

  // ── Search Result Cards ─────────────────────────────────────────────────────
  searchResultCard: {
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
  searchResultIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  searchResultTexts: { flex: 1 },
  searchResultBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: ROUNDNESS.sm,
    marginLeft: SPACING.sm,
  },
  tinyBadge: {
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 3,
    marginRight: 4,
    marginBottom: 2,
  },

  // ── Nearby Stops Sheet ──────────────────────────────────────────────────────
  nearbySheetHeader: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  nearbyStopCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: ROUNDNESS.lg,
    padding: SPACING.md,
    marginTop: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.light,
  },
  nearbyRankCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  nearbyStopTexts: { flex: 1 },
  nearbyDistanceBadge: {
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: ROUNDNESS.md,
    minWidth: 52,
  },
});

export default HomeScreen;
