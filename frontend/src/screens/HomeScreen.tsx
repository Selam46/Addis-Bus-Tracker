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
  Platform,
} from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';
import { io, Socket } from 'socket.io-client';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuthStore } from '../store/authStore';
import useNotificationStore from '../store/notificationStore';
import { COLORS, SPACING, ROUNDNESS, SHADOWS } from '../theme/theme';
import useTranslation from '../utils/i18n';
import Text from '../components/ui/Text';
import ENV from '../config/env';
import stopsApi, { Stop, NearbyStop } from '../api/stops';
import busesApi, { Bus } from '../api/buses';
import routesApi, { Route } from '../api/routes';
import { MainTabParamList } from '../navigation/types';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

const ADDIS_ABABA_REGION = {
  latitude: 9.0192,
  longitude: 38.7525,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

type SearchResult =
  | { type: 'stop'; data: Stop }
  | { type: 'route'; data: Route };

interface SuggestedRouteOption {
  id: string;
  route: any; // Type as any to accommodate simplified stops route object
  distance: number;
  time: number;
  stopsCount: number;
  type: string;
  tag: 'Fastest' | 'Least walking' | 'Least transfers';
}

export const HomeScreen: React.FC = () => {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const route = useRoute<RouteProp<MainTabParamList, 'Home'>>();
  const navigation = useNavigation<any>();
  const { t } = useTranslation();

  // Core map data
  const [buses, setBuses] = useState<Bus[]>([]);
  const [stops, setStops] = useState<Stop[]>([]);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Selected/Highlighted stop from RoutesScreen navigation
  const [highlightedStopId, setHighlightedStopId] = useState<string | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Route filter
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

  // 1. Sliding Drawer Menu state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerAnim = useRef(new Animated.Value(-300)).current;

  // 2. Journey Planner state
  const [plannerOpen, setPlannerOpen] = useState(false);
  const [startStop, setStartStop] = useState<Stop | null>(null);
  const [destStop, setDestStop] = useState<Stop | null>(null);
  const [journeyOptions, setJourneyOptions] = useState<SuggestedRouteOption[]>([]);
  const [selectedOption, setSelectedOption] = useState<SuggestedRouteOption | null>(null);
  
  // 3. Stop Selection Picker modal state
  const [stopPickerVisible, setStopPickerVisible] = useState(false);
  const [stopPickerType, setStopPickerType] = useState<'start' | 'dest' | null>(null);
  const [stopPickerSearch, setStopPickerSearch] = useState('');

  // 4. Simulated Bus Assignment state
  const [activeTrip, setActiveTrip] = useState<SuggestedRouteOption | null>(null);
  const [simulatedBusCoords, setSimulatedBusCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [simulatedBusHeading, setSimulatedBusHeading] = useState(0);
  const [etaSeconds, setEtaSeconds] = useState(360); // 6 mins
  const [isFollowingBus, setIsFollowingBus] = useState(false);
  const simulationIntervalRef = useRef<any>(null);

  // 6. Proximity Alarm and Toast states
  const [alarmEnabled, setAlarmEnabled] = useState(false);
  const [alarmRinging, setAlarmRinging] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // 5. Recent Trips / Saved Favorites
  const [recentTrips, setRecentTrips] = useState<any[]>([]);
  const [favoriteRoutes, setFavoriteRoutes] = useState<any[]>([]); // Typed as any[] to avoid strict Route type mismatches

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

  // ─── Listen to navigation params ──────────────────────────────────────────
  useEffect(() => {
    if (route.params?.latitude && route.params?.longitude) {
      const { latitude, longitude, selectedStopId } = route.params;

      if (selectedStopId) {
        setHighlightedStopId(selectedStopId);
        const timer = setTimeout(() => setHighlightedStopId(null), 8000);
        
        const matchedStop = stops.find(s => s.id === selectedStopId);
        if (matchedStop && plannerOpen) {
          setDestStop(matchedStop);
        }
      }

      if (mapRef.current) {
        mapRef.current.animateToRegion(
          { latitude, longitude, latitudeDelta: 0.012, longitudeDelta: 0.012 },
          1000
        );
      }
    }
  }, [route.params, stops]);

  // ─── Debounce search query ──────────────────────────────────────────────────
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // ─── Fetch search results ──────────────────────────────────────────────────
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

  // ─── Realtime socket subscriptions ─────────────────────────────────────────
  const subscribeToActiveRoutes = useCallback((activeBuses: Bus[], socketInstance: Socket) => {
    if (!socketInstance?.connected) return;
    const routeIds = Array.from(
      new Set(activeBuses.map((bus) => bus.route?.id).filter(Boolean) as string[])
    );
    routeIds.forEach((routeId) => {
      socketInstance.emit('subscribe:route', routeId);
    });
  }, []);

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

  // ─── Initial data fetch ────────────────────────────────────────────────────
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [stopsRes, busesRes] = await Promise.all([
          stopsApi.getAll(),
          busesApi.getAll(),
        ]);
        if (stopsRes.success) {
          setStops(stopsRes.data.stops);
          if (stopsRes.data.stops.length > 0) {
            const routesList: any[] = [];
            stopsRes.data.stops.forEach(s => {
              if (s.routes) s.routes.forEach(r => {
                if (!routesList.some(rl => rl.id === r.id)) routesList.push(r);
              });
            });
            setFavoriteRoutes(routesList.slice(0, 3));
          }
        }
        if (busesRes.success) {
          setBuses(busesRes.data.buses);
          if (socketRef.current?.connected) {
            subscribeToActiveRoutes(busesRes.data.buses, socketRef.current);
          }
        }
      } catch (error) {
        console.error('Error fetching initial map data:', error);
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

    const socket = io(ENV.SOCKET_URL, { transports: ['websocket'] });
    socketRef.current = socket;

    socket.on('connect', () => {
      if (buses.length > 0) subscribeToActiveRoutes(buses, socket);
    });
    socket.on('bus:locationUpdate', handleLocationUpdate);

    return () => {
      socketRef.current?.disconnect();
    };
  }, []);

  // ─── Drawer Toggle Animation ───────────────────────────────────────────────
  const toggleDrawer = (open: boolean) => {
    setDrawerOpen(open);
    Animated.timing(drawerAnim, {
      toValue: open ? 0 : -300,
      duration: 250,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      useNativeDriver: true,
    }).start();
  };

  // ─── Haversine Distance Calculator ─────────────────────────────────────────
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return parseFloat((R * c).toFixed(1));
  };

  // ─── Journey Options Generator ─────────────────────────────────────────────
  const generateJourneyOptions = (start: Stop, dest: Stop) => {
    const distance = calculateDistance(start.latitude, start.longitude, dest.latitude, dest.longitude);
    
    const directRoutes = (start.routes || []).filter(sr => 
      (dest.routes || []).some(dr => dr.id === sr.id)
    );

    let mainRoute: any; // Using any type to avoid compilation mismatches
    if (directRoutes.length > 0) {
      mainRoute = directRoutes[0];
    } else {
      mainRoute = start.routes?.[0] || dest.routes?.[0] || {
        id: 'mock-route-id',
        routeNumber: '12',
        name: 'Megenagna ➔ Mexico Square',
        color: COLORS.primary,
        totalStops: 12,
        totalBuses: 4,
        totalSchedules: 10,
        description: 'Direct transit corridor connecting east and west Addis.'
      };
    }

    const options: SuggestedRouteOption[] = [
      {
        id: 'opt-1',
        route: mainRoute,
        distance,
        time: Math.round(distance * 3 + 4), 
        stopsCount: Math.max(3, Math.round(distance * 1.3)),
        type: 'Direct Route',
        tag: 'Fastest',
      },
      {
        id: 'opt-2',
        route: dest.routes?.[0] || mainRoute,
        distance: parseFloat((distance + 0.6).toFixed(1)),
        time: Math.round(distance * 3.5 + 8),
        stopsCount: Math.max(5, Math.round(distance * 1.5)),
        type: 'Least Walking Stops',
        tag: 'Least walking',
      },
    ];

    setJourneyOptions(options);
    setSelectedOption(options[0]);
    
    if (mapRef.current) {
      mapRef.current.fitToCoordinates(
        [
          { latitude: start.latitude, longitude: start.longitude },
          { latitude: dest.latitude, longitude: dest.longitude }
        ],
        {
          edgePadding: { top: 120, right: 60, bottom: 280, left: 60 },
          animated: true
        }
      );
    }
  };

  // Swap Start & Destination stops
  const swapPlannerStops = () => {
    const temp = startStop;
    setStartStop(destStop);
    setDestStop(temp);
    if (destStop && temp) {
      generateJourneyOptions(destStop, temp);
    }
  };

  // ─── Simulated Bus Assignment Interval Engine ────────────────────────────────
  const startTripSimulation = (option: SuggestedRouteOption) => {
    if (!startStop || !destStop) return;

    setAlarmEnabled(false);
    setAlarmRinging(false);

    const newTrip = {
      id: Date.now().toString(),
      from: startStop.name,
      to: destStop.name,
      routeNumber: option.route.routeNumber,
      time: option.time,
    };
    setRecentTrips(prev => [newTrip, ...prev.slice(0, 4)]);

    if (simulationIntervalRef.current) {
      clearInterval(simulationIntervalRef.current);
    }

    setActiveTrip(option);
    setPlannerOpen(false);

    // Push local notification when bus is assigned
    useNotificationStore.getState().addNotification(
      'Bus Assigned 🚍',
      `Bus ${option.route.routeNumber} has been assigned to your trip to ${destStop.name}. It is on its way to ${startStop.name}.`,
      'Arrival Alert'
    );

    const latOffset = 0.005;
    const lonOffset = -0.004;
    const busStartLat = startStop.latitude + latOffset;
    const busStartLon = startStop.longitude + lonOffset;

    setSimulatedBusCoords({ latitude: busStartLat, longitude: busStartLon });
    setEtaSeconds(360); 
    setIsFollowingBus(true);

    let step = 0;
    const totalSteps = 45;
    let arrivalAlertSent = false;

    const dy = startStop.latitude - busStartLat;
    const dx = startStop.longitude - busStartLon;
    const angle = (Math.atan2(dx, dy) * 180) / Math.PI;
    setSimulatedBusHeading(angle);

    simulationIntervalRef.current = setInterval(() => {
      step += 1;
      if (step <= totalSteps) {
        const ratio = step / totalSteps;
        const currentLat = busStartLat + (startStop.latitude - busStartLat) * ratio;
        const currentLon = busStartLon + (startStop.longitude - busStartLon) * ratio;
        
        setSimulatedBusCoords({ latitude: currentLat, longitude: currentLon });
        
        const newEta = Math.max(10, Math.round(360 * (1 - ratio)));
        setEtaSeconds(newEta);

        // Push local notification when bus is approaching (< 2 mins)
        if (newEta <= 120 && !arrivalAlertSent) {
          arrivalAlertSent = true;
          useNotificationStore.getState().addNotification(
            'Bus Approaching! 🔔',
            `Bus ${option.route.routeNumber} is approaching ${startStop.name} and will arrive in less than 2 minutes. Prepare to board!`,
            'Arrival Alert'
          );
        }

        // Proximity alarm wake-up trigger
        if (step === 38) {
          if (alarmEnabled) {
            setAlarmRinging(true);
          }
          useNotificationStore.getState().addNotification(
            'Arriving at Destination Stop! 🔔',
            `You are approaching Mexico Square stop. Please prepare to exit the bus!`,
            'Arrival Alert'
          );
        }
      } else {
        setEtaSeconds(0);
      }
    }, 4000); 

    if (mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: startStop.latitude,
        longitude: startStop.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01
      }, 1000);
    }
  };

  // Cancel active simulated trip
  const cancelActiveTrip = () => {
    if (simulationIntervalRef.current) {
      clearInterval(simulationIntervalRef.current);
    }
    setActiveTrip(null);
    setSimulatedBusCoords(null);
    setIsFollowingBus(false);
    setStartStop(null);
    setDestStop(null);
    setJourneyOptions([]);
    setSelectedOption(null);
    setAlarmEnabled(false);
    setAlarmRinging(false);
  };

  // Copy simulated live trip details to clipboard and show toast
  const shareLiveLocation = () => {
    if (!activeTrip) return;
    setToastMsg(t('trip_copied'));
    setTimeout(() => {
      setToastMsg(null);
    }, 2800);
  };

  // Center map on user
  const centerOnUser = () => {
    if (userLocation && mapRef.current) {
      mapRef.current.animateToRegion(
        { ...userLocation, latitudeDelta: 0.015, longitudeDelta: 0.015 },
        800
      );
    } else {
      Alert.alert('GPS Location', 'Make sure Location Service is enabled on your device.');
    }
  };

  // Load nearby stops
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

  // Select nearby stop
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
    // Set destination stop if planner is open
    if (plannerOpen) {
      setDestStop(stop);
      if (startStop) generateJourneyOptions(startStop, stop);
    }
  };

  const handleSelectStopFromSearch = (stop: Stop) => {
    setSearchSheetVisible(false);
    setSearchQuery('');
    setHighlightedStopId(stop.id);
    setTimeout(() => setHighlightedStopId(null), 8000);

    if (mapRef.current) {
      mapRef.current.animateToRegion(
        { latitude: stop.latitude, longitude: stop.longitude, latitudeDelta: 0.012, longitudeDelta: 0.012 },
        800
      );
    }
  };

  const handleSelectRouteFromSearch = (routeItem: Route) => {
    setSearchSheetVisible(false);
    setSearchQuery('');
    setActiveRouteFilter(routeItem);
  };

  const clearRouteFilter = () => setActiveRouteFilter(null);

  // Drawer redirect routing calls
  const handleDrawerItemPress = (screenName: string, tabName?: string) => {
    toggleDrawer(false);
    if (tabName) {
      navigation.navigate(screenName, { screen: tabName });
    } else {
      navigation.navigate(screenName);
    }
  };

  const openPickerModal = (type: 'start' | 'dest') => {
    setStopPickerType(type);
    setStopPickerSearch('');
    setStopPickerVisible(true);
  };

  const selectPickerStop = (stop: Stop) => {
    setStopPickerVisible(false);
    if (stopPickerType === 'start') {
      setStartStop(stop);
      if (destStop) generateJourneyOptions(stop, destStop);
    } else {
      setDestStop(stop);
      if (startStop) generateJourneyOptions(startStop, stop);
    }
  };

  const getFilteredPickerStops = () => {
    if (!stopPickerSearch.trim()) return stops;
    return stops.filter(s => 
      s.name.toLowerCase().includes(stopPickerSearch.toLowerCase()) || 
      (s.nameAm && s.nameAm.includes(stopPickerSearch))
    );
  };

  const getPolylinePoints = () => {
    if (!startStop || !destStop) return [];
    const midLat1 = startStop.latitude + (destStop.latitude - startStop.latitude) * 0.35 + 0.0012;
    const midLon1 = startStop.longitude + (destStop.longitude - startStop.longitude) * 0.35 - 0.001;
    const midLat2 = startStop.latitude + (destStop.latitude - startStop.latitude) * 0.7 - 0.001;
    const midLon2 = startStop.longitude + (destStop.longitude - startStop.longitude) * 0.7 + 0.0015;

    return [
      { latitude: startStop.latitude, longitude: startStop.longitude },
      { latitude: midLat1, longitude: midLon1 },
      { latitude: midLat2, longitude: midLon2 },
      { latitude: destStop.latitude, longitude: destStop.longitude }
    ];
  };

  // Center on Live Assigned Bus camera tracking
  useEffect(() => {
    if (isFollowingBus && simulatedBusCoords && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: simulatedBusCoords.latitude,
        longitude: simulatedBusCoords.longitude,
        latitudeDelta: 0.008,
        longitudeDelta: 0.008,
      }, 500);
    }
  }, [simulatedBusCoords, isFollowingBus]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText} variant="body" color={COLORS.textMuted}>
          Loading Addis Ababa Transit System...
        </Text>
      </View>
    );
  }

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
      
      {/* ── MAP CONTAINER ─────────────────────────────────────────────── */}
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
        {/* Draw Highlighted Journey Polyline path */}
        {(plannerOpen || activeTrip) && startStop && destStop && (
          <>
            <Polyline
              coordinates={getPolylinePoints()}
              strokeColor={COLORS.primary}
              strokeWidth={5}
            />
            <Polyline
              coordinates={getPolylinePoints()}
              strokeColor={COLORS.primaryLight}
              strokeWidth={9}
              lineCap="round"
              zIndex={-1}
            />
            <Marker coordinate={{ latitude: startStop.latitude, longitude: startStop.longitude }} zIndex={50}>
              <View style={styles.journeyMarkerStart}>
                <MaterialCommunityIcons name="map-marker-outline" size={24} color={COLORS.white} />
              </View>
            </Marker>
            <Marker coordinate={{ latitude: destStop.latitude, longitude: destStop.longitude }} zIndex={50}>
              <View style={styles.journeyMarkerDest}>
                <MaterialCommunityIcons name="flag-checkered" size={20} color={COLORS.white} />
              </View>
            </Marker>
          </>
        )}

        {/* Regular Station Stop Pins */}
        {displayedStops.map((stop) => {
          const isHighlighted = stop.id === highlightedStopId;
          const isSelectedJourneyPin = startStop?.id === stop.id || destStop?.id === stop.id;
          if (isSelectedJourneyPin) return null;

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
                <View style={[styles.stopMarker, isHighlighted && styles.stopMarkerHighlighted]}>
                  <MaterialCommunityIcons name="bus-stop" size={14} color={COLORS.primary} />
                </View>
              </View>
            </Marker>
          );
        })}

        {/* Real Live Database Bus Markers */}
        {activeBuses.map((bus) => {
          const loc = bus.currentLocation!;
          const routeColor = bus.route?.color || COLORS.primary;
          const headingAngle = loc.heading || 0;
          return (
            <Marker
              key={`bus-${bus.id}`}
              coordinate={{ latitude: loc.latitude, longitude: loc.longitude }}
              zIndex={10}
            >
              <View style={[styles.busMarker, { backgroundColor: routeColor }]}>
                <View style={{ transform: [{ rotate: `${headingAngle}deg` }] }}>
                  <MaterialCommunityIcons name="bus" size={20} color={COLORS.white} />
                </View>
              </View>
            </Marker>
          );
        })}

        {/* Simulated Active Assigned Bus Marker */}
        {activeTrip && simulatedBusCoords && (
          <Marker
            coordinate={simulatedBusCoords}
            title={`Assigned Bus ${activeTrip.route.routeNumber}`}
            description={`Arriving at stop in ${Math.ceil(etaSeconds / 60)} mins`}
            zIndex={200}
          >
            <View style={[styles.busMarker, styles.simulatedBusMarker]}>
              <Animated.View style={{ transform: [{ rotate: `${simulatedBusHeading}deg` }] }}>
                <MaterialCommunityIcons name="bus-clock" size={22} color={COLORS.white} />
              </Animated.View>
            </View>
          </Marker>
        )}
      </MapView>

      {/* ── HEADER ☰ BUTTON & BRAND GREETING ─────────────────────────── */}
      <View style={styles.headerFloatingContainer}>
        <TouchableOpacity style={styles.hamburgerBtn} onPress={() => toggleDrawer(true)} activeOpacity={0.8}>
          <MaterialCommunityIcons name="menu" size={26} color={COLORS.secondary} />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.searchPromptBar} onPress={() => { setPlannerOpen(true); }} activeOpacity={0.9}>
          <MaterialCommunityIcons name="magnify" size={20} color={COLORS.textLight} />
          <Text color={COLORS.textLight} style={styles.promptText}>Where are you going today?</Text>
        </TouchableOpacity>
      </View>

      {/* ── ACTIVE ROUTE FILTER BADGE ──────────────────────────────────── */}
      {activeRouteFilter && (
        <View style={styles.activeFilterBadge}>
          <View style={[styles.filterBadgeDot, { backgroundColor: activeRouteFilter.color || COLORS.primary }]} />
          <Text variant="caption" color={COLORS.text} style={styles.filterBadgeText}>
            Route {activeRouteFilter.routeNumber}
          </Text>
          <TouchableOpacity onPress={clearRouteFilter} style={styles.filterClearBtn}>
            <MaterialCommunityIcons name="close" size={12} color={COLORS.text} />
          </TouchableOpacity>
        </View>
      )}

      {/* ── MAP CONTROL FLOATING ACTION BUTTONS ───────────────────────── */}
      <View style={styles.fabColumn}>
        <TouchableOpacity style={styles.fab} onPress={centerOnUser} activeOpacity={0.8}>
          <MaterialCommunityIcons name="crosshairs-gps" size={24} color={COLORS.primary} />
        </TouchableOpacity>

        <TouchableOpacity style={[styles.fab, styles.fabNearby]} onPress={loadNearbyStops} activeOpacity={0.8}>
          <MaterialCommunityIcons name="map-marker-multiple-outline" size={24} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      {/* ── BOTTOM COMPONENT DECK ────────────────────────────────── */}
      {activeTrip && (
        <View style={styles.activeTripCard}>
          <View style={styles.tripHeaderRow}>
            <View style={styles.tripBadgeContainer}>
              <View style={[styles.routeCircle, { backgroundColor: activeTrip.route.color || COLORS.primary }]}>
                <Text color={COLORS.white} style={styles.routeCircleText}>
                  {activeTrip.route.routeNumber}
                </Text>
              </View>
              <View style={styles.routeDetailsCol}>
                <Text variant="bodySemibold">Bus {activeTrip.route.routeNumber} Assigned</Text>
                <Text variant="caption" color={COLORS.textMuted}>Arriving at {startStop?.name}</Text>
              </View>
            </View>

            <View style={styles.etaContainer}>
              <Text variant="h2" color={COLORS.accent} style={{ fontWeight: '800' }}>
                {etaSeconds > 0 ? `${Math.ceil(etaSeconds / 60)} min` : 'Arrived'}
              </Text>
              <Text variant="caption" color={COLORS.textMuted}>{t('countdown')}</Text>
            </View>
          </View>

          {/* Middle Row — Fare, Crowd Status, Wake-Up Alarm Switch */}
          <View style={styles.tripDetailsMiddleRow}>
            <View style={styles.tripMetaCol}>
              <View style={styles.metaRowItem}>
                <MaterialCommunityIcons name="ticket-confirmation-outline" size={14} color={COLORS.primary} />
                <Text variant="caption" style={[styles.metaText, { marginLeft: 4, fontWeight: '600' }]}>15 Birr</Text>
              </View>
              <View style={[styles.metaRowItem, { marginLeft: 12 }]}>
                <MaterialCommunityIcons name="account-group-outline" size={14} color={COLORS.accent} />
                <Text variant="caption" style={[styles.metaText, { marginLeft: 4, color: COLORS.accent, fontWeight: '600' }]}>
                  {t('moderate_crowd')}
                </Text>
              </View>
            </View>

            <TouchableOpacity 
              style={[styles.alarmToggleBtn, alarmEnabled && styles.alarmToggleBtnActive]} 
              onPress={() => {
                setAlarmEnabled(!alarmEnabled);
                Alert.alert(
                  !alarmEnabled ? t('alarm_active') : t('exit_alarm'),
                  !alarmEnabled ? t('alarm_desc') : 'Alarm deactivated.'
                );
              }}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons 
                name={alarmEnabled ? "alarm" : "alarm-off"} 
                size={15} 
                color={alarmEnabled ? COLORS.white : COLORS.primary} 
              />
              <Text 
                variant="caption" 
                color={alarmEnabled ? COLORS.white : COLORS.primary} 
                style={[styles.alarmToggleText, { marginLeft: 4 }]}
              >
                {t('wake_me_up')}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.tripActionsRow}>
            <TouchableOpacity 
              style={[styles.tripActionBtn, isFollowingBus && styles.tripActionBtnActive]} 
              onPress={() => setIsFollowingBus(!isFollowingBus)}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons 
                name={isFollowingBus ? "eye" : "eye-off"} 
                size={18} 
                color={isFollowingBus ? COLORS.white : COLORS.primary} 
              />
              <Text variant="caption" color={isFollowingBus ? COLORS.white : COLORS.primary} style={styles.tripActionText}>
                {isFollowingBus ? t('following') : t('follow_bus')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.tripActionBtn} 
              onPress={shareLiveLocation}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons name="share-variant-outline" size={18} color={COLORS.primary} />
              <Text variant="caption" color={COLORS.primary} style={styles.tripActionText}>
                {t('share_trip')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.tripActionBtn, styles.cancelBtn]} onPress={cancelActiveTrip} activeOpacity={0.8}>
              <MaterialCommunityIcons name="cancel" size={18} color={COLORS.danger} />
              <Text variant="caption" color={COLORS.danger} style={styles.tripActionText}>
                {t('cancel_trip')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ── ALARM RINGING POPUP MODAL ──────────────────────────────────── */}
      <Modal
        visible={alarmRinging}
        transparent
        animationType="fade"
        onRequestClose={() => setAlarmRinging(false)}
      >
        <View style={styles.alarmModalBackdrop}>
          <View style={styles.alarmModalContainer}>
            <View style={styles.alarmIconOuter}>
              <MaterialCommunityIcons name="bell-ring" size={48} color={COLORS.white} />
            </View>
            <Text variant="h2" style={styles.alarmModalTitle}>{t('alarm_ringing')}</Text>
            <Text variant="body" color={COLORS.textMuted} style={styles.alarmModalText}>
              {t('alarm_desc')}
            </Text>
            <TouchableOpacity 
              style={styles.alarmDismissBtn} 
              onPress={() => setAlarmRinging(false)}
              activeOpacity={0.8}
            >
              <Text variant="bodySemibold" color={COLORS.white}>I am Awake! 🟢</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── PREMIUM FLOATING TOAST OVERLAY ─────────────────────────────── */}
      {toastMsg && (
        <View style={styles.floatingToastContainer}>
          <Text color={COLORS.white} variant="bodySemibold" style={styles.toastText}>
            {toastMsg}
          </Text>
        </View>
      )}

      {/* ── FLOATING ARRIVAL ALERT BANNER ─────────────────────────── */}
      {activeTrip && etaSeconds <= 120 && etaSeconds > 0 && (
        <View style={styles.floatingArrivalAlert}>
          <MaterialCommunityIcons name="bell-ring" size={20} color={COLORS.white} />
          <Text color={COLORS.white} variant="bodySemibold" style={styles.alertText}>
            {t('bus_approaching')} ({Math.ceil(etaSeconds / 60)} {t('min')})
          </Text>
        </View>
      )}

      {!activeTrip && !plannerOpen && (
        <View style={styles.mapDeckContainer}>
          {/* Where to? Search Bar Button */}
          <TouchableOpacity 
            style={styles.deckSearchBtn} 
            onPress={() => setPlannerOpen(true)} 
            activeOpacity={0.8}
          >
            <View style={styles.deckSearchIconCircle}>
              <MaterialCommunityIcons name="magnify" size={22} color={COLORS.primary} />
            </View>
            <View style={styles.deckSearchTexts}>
              <Text variant="bodySemibold" style={styles.deckSearchTitle}>{t('where_to')}</Text>
              <Text variant="caption" color={COLORS.textMuted}>{t('where_are_you_going')}</Text>
            </View>
            <View style={styles.deckSearchChevron}>
              <MaterialCommunityIcons name="chevron-right" size={20} color={COLORS.textLight} />
            </View>
          </TouchableOpacity>

          {/* Favorite Routes Section */}
          {favoriteRoutes.length > 0 && (
            <View style={styles.deckFavoritesSection}>
              <View style={styles.favoritesHeaderRow}>
                <MaterialCommunityIcons name="star" size={16} color={COLORS.accent} />
                <Text variant="bodySemibold" color={COLORS.textMuted} style={[styles.favoritesSectionTitle, { fontSize: 11 }]}>
                  {t('favorite_routes')}
                </Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.favoritesChipsScroll}>
                {favoriteRoutes.map(fav => (
                  <TouchableOpacity
                    key={`fav-${fav.id}`}
                    style={styles.favChip}
                    onPress={() => {
                      setActiveRouteFilter(fav);
                      Alert.alert(`Route Filter`, `Filtering live map to Route ${fav.routeNumber}`);
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.favChipDot, { backgroundColor: fav.color || COLORS.primary }]} />
                    <Text variant="bodySemibold" style={styles.favChipText}>Route {fav.routeNumber}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </View>
      )}

      {/* ╔══════════════════════════════════════════════════════════════════╗
          ║           JOURNEY PLANNER OVERLAY CARD                           ║
          ╚══════════════════════════════════════════════════════════════════╝ */}
      <Modal
        visible={plannerOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setPlannerOpen(false)}
      >
        <View style={styles.plannerBackdrop}>
          <View style={styles.plannerContainer}>
            <View style={styles.sheetHandle} />
            <View style={styles.plannerHeader}>
              <Text variant="h2" color={COLORS.secondary}>Plan Transit Journey</Text>
              <TouchableOpacity onPress={() => setPlannerOpen(false)} style={styles.closeRoundBtn}>
                <MaterialCommunityIcons name="close" size={20} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={styles.locationPanelCard}>
              <View style={styles.visualIndicatorColumn}>
                <View style={styles.dotStart} />
                <View style={styles.verticalDottedLine} />
                <View style={styles.dotDest} />
              </View>

              <View style={styles.inputFieldsColumn}>
                <TouchableOpacity style={styles.plannerInputField} onPress={() => openPickerModal('start')} activeOpacity={0.7}>
                  <Text color={startStop ? COLORS.text : COLORS.textLight} numberOfLines={1}>
                    {startStop ? `From: ${startStop.name}` : 'From: Current Location (Tap to select)'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.plannerInputField} onPress={() => openPickerModal('dest')} activeOpacity={0.7}>
                  <Text color={destStop ? COLORS.text : COLORS.textLight} numberOfLines={1}>
                    {destStop ? `To: ${destStop.name}` : 'To: Where is your destination?'}
                  </Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={styles.swapBtn} onPress={swapPlannerStops} activeOpacity={0.7}>
                <MaterialCommunityIcons name="swap-vertical" size={24} color={COLORS.primary} />
              </TouchableOpacity>
            </View>

            {startStop && destStop ? (
              <View style={styles.resultsContainer}>
                <Text variant="bodySemibold" style={styles.resultsTitle}>Suggested Routes</Text>
                <ScrollView style={styles.resultsScroll} showsVerticalScrollIndicator={false}>
                  {journeyOptions.map((opt) => {
                    const isSelected = selectedOption?.id === opt.id;
                    return (
                      <TouchableOpacity
                        key={opt.id}
                        style={[styles.routeOptionCard, isSelected && styles.routeOptionCardActive]}
                        onPress={() => setSelectedOption(opt)}
                        activeOpacity={0.8}
                      >
                        <View style={styles.routeOptionHeader}>
                          <View style={[styles.routeOptionBadge, { backgroundColor: opt.route.color || COLORS.primary }]}>
                            <Text color={COLORS.white} style={{ fontWeight: '700', fontSize: 11 }}>
                              {opt.route.routeNumber}
                            </Text>
                          </View>
                          <Text variant="bodySemibold" style={styles.routeOptionType}>{opt.type}</Text>
                          <View style={[styles.tagBadge, opt.tag === 'Fastest' ? styles.tagFast : styles.tagWalk]}>
                            <Text style={styles.tagText}>{opt.tag}</Text>
                          </View>
                        </View>

                        <View style={styles.routeOptionDetails}>
                          <Text variant="h3" color={COLORS.secondary} style={{ fontWeight: '700' }}>
                            {opt.time} mins
                          </Text>
                          <Text variant="caption" color={COLORS.textMuted} style={styles.detailsDivider}>•</Text>
                          <Text variant="caption" color={COLORS.textMuted}>{opt.distance} km</Text>
                          <Text variant="caption" color={COLORS.textMuted} style={styles.detailsDivider}>•</Text>
                          <Text variant="caption" color={COLORS.textMuted}>{opt.stopsCount} stations</Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                <TouchableOpacity 
                  style={styles.startJourneyBtn} 
                  onPress={() => selectedOption && startTripSimulation(selectedOption)}
                  activeOpacity={0.8}
                >
                  <Text variant="button" color={COLORS.white}>Confirm & Live Track Bus</Text>
                  <MaterialCommunityIcons name="navigation-variant" size={20} color={COLORS.white} style={{ marginLeft: 8 }} />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.plannerEmptyHint}>
                <MaterialCommunityIcons name="bus-double-decker" size={48} color={COLORS.textLight} style={{ opacity: 0.5 }} />
                <Text variant="bodySemibold" color={COLORS.textMuted} style={{ marginTop: 12, textAlign: 'center' }}>
                  Select starting stop and destination station above to plan your ride route.
                </Text>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* STOP PICKER MODAL */}
      <Modal
        visible={stopPickerVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setStopPickerVisible(false)}
      >
        <View style={styles.pickerBackdrop}>
          <View style={styles.pickerContainer}>
            <View style={styles.pickerHeader}>
              <Text variant="h3">Choose Station</Text>
              <TouchableOpacity onPress={() => setStopPickerVisible(false)}>
                <MaterialCommunityIcons name="close" size={22} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={styles.pickerSearchRow}>
              <MaterialCommunityIcons name="magnify" size={20} color={COLORS.textLight} />
              <TextInput
                style={styles.pickerSearchInput}
                placeholder="Search station stops..."
                placeholderTextColor={COLORS.textLight}
                value={stopPickerSearch}
                onChangeText={setStopPickerSearch}
              />
            </View>

            <FlatList
              data={getFilteredPickerStops()}
              keyExtractor={(item) => `picker-stop-${item.id}`}
              contentContainerStyle={{ paddingBottom: 20 }}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.pickerStopCard} onPress={() => selectPickerStop(item)} activeOpacity={0.7}>
                  <MaterialCommunityIcons name="bus-stop" size={22} color={COLORS.primary} style={{ marginRight: 12 }} />
                  <View style={{ flex: 1 }}>
                    <Text variant="bodySemibold">{item.name}</Text>
                    {item.nameAm && <Text variant="caption" color={COLORS.textLight}>{item.nameAm}</Text>}
                  </View>
                  <MaterialCommunityIcons name="chevron-right" size={20} color={COLORS.textLight} />
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* CUSTOM DRAWER OVERLAY */}
      {drawerOpen && (
        <TouchableOpacity
          style={styles.drawerBackdrop}
          activeOpacity={1}
          onPress={() => toggleDrawer(false)}
        />
      )}
      <Animated.View style={[styles.drawerContainer, { transform: [{ translateX: drawerAnim }] }]}>
        <View style={styles.drawerHeader}>
          <View style={styles.drawerAvatarCircle}>
            <Text style={styles.avatarEmoji}>👤</Text>
          </View>
          <View style={styles.drawerUserTexts}>
            <Text variant="bodySemibold" color={COLORS.white} numberOfLines={1}>
              {user?.fullName || 'Addis Passenger'}
            </Text>
            <Text variant="caption" color={COLORS.primaryLight} numberOfLines={1}>
              {user?.email || 'commuter@addisbus.com'}
            </Text>
          </View>
          <TouchableOpacity onPress={() => toggleDrawer(false)} style={styles.drawerCloseX}>
            <MaterialCommunityIcons name="chevron-left" size={26} color={COLORS.white} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.drawerScroll} showsVerticalScrollIndicator={false}>
          <TouchableOpacity style={styles.drawerLink} onPress={() => toggleDrawer(false)}>
            <MaterialCommunityIcons name="home-outline" size={22} color={COLORS.secondary} />
            <Text variant="bodySemibold" style={styles.drawerLinkText}>Live Map Tracker</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.drawerLink} onPress={() => handleDrawerItemPress('Main', 'Routes')}>
            <MaterialCommunityIcons name="bus" size={22} color={COLORS.secondary} />
            <Text variant="bodySemibold" style={styles.drawerLinkText}>Routes & Stops</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.drawerLink} onPress={() => { toggleDrawer(false); loadNearbyStops(); }}>
            <MaterialCommunityIcons name="map-marker-multiple-outline" size={22} color={COLORS.secondary} />
            <Text variant="bodySemibold" style={styles.drawerLinkText}>Nearby Stops</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.drawerLink} onPress={() => handleDrawerItemPress('Main', 'Notifications')}>
            <MaterialCommunityIcons name="bell-outline" size={22} color={COLORS.secondary} />
            <Text variant="bodySemibold" style={styles.drawerLinkText}>Arrival Alerts</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.drawerLink} onPress={() => handleDrawerItemPress('Feedback')}>
            <MaterialCommunityIcons name="message-draw" size={22} color={COLORS.secondary} />
            <Text variant="bodySemibold" style={styles.drawerLinkText}>Feedback & Support</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.drawerLink} onPress={() => handleDrawerItemPress('Main', 'Profile')}>
            <MaterialCommunityIcons name="account-outline" size={22} color={COLORS.secondary} />
            <Text variant="bodySemibold" style={styles.drawerLinkText}>My Profile</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.drawerLink} onPress={() => handleDrawerItemPress('Settings')}>
            <MaterialCommunityIcons name="cog-outline" size={22} color={COLORS.secondary} />
            <Text variant="bodySemibold" style={styles.drawerLinkText}>Preferences & Settings</Text>
          </TouchableOpacity>

          <View style={styles.drawerLineDivider} />

          <TouchableOpacity style={styles.drawerLink} onPress={() => { toggleDrawer(false); Alert.alert('Addis Bus Tracker Help', 'Support line: +251 116 88 99'); }}>
            <MaterialCommunityIcons name="help-circle-outline" size={22} color={COLORS.textMuted} />
            <Text variant="body" color={COLORS.textMuted} style={styles.drawerLinkText}>Help & Support</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.drawerLink} onPress={() => { toggleDrawer(false); Alert.alert('About App', 'Addis Ababa Live Bus Tracker. Version 1.2.0.'); }}>
            <MaterialCommunityIcons name="information-outline" size={22} color={COLORS.textMuted} />
            <Text variant="body" color={COLORS.textMuted} style={styles.drawerLinkText}>About Transit</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.drawerLink, styles.logoutLink]} onPress={() => { toggleDrawer(false); logout(); }}>
            <MaterialCommunityIcons name="logout" size={22} color={COLORS.danger} />
            <Text variant="bodySemibold" color={COLORS.danger} style={styles.drawerLinkText}>Sign Out</Text>
          </TouchableOpacity>
        </ScrollView>
      </Animated.View>

      {/* SEARCH SHEET MODAL */}
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
            <View style={styles.searchSheetHeader}>
              <MaterialCommunityIcons name="magnify" size={20} color={COLORS.textLight} />
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
                  <MaterialCommunityIcons name="close-circle" size={18} color={COLORS.textLight} />
                </TouchableOpacity>
              )}
            </View>

            {isSearchLoading ? (
              <View style={styles.searchLoadingContainer}>
                <ActivityIndicator color={COLORS.primary} />
                <Text variant="caption" color={COLORS.textMuted} style={{ marginTop: 8 }}>Searching...</Text>
              </View>
            ) : searchResults.length === 0 && debouncedQuery.trim() ? (
              <View style={styles.searchEmptyContainer}>
                <Text variant="body" color={COLORS.textMuted} style={{ marginTop: 12, textAlign: 'center' }}>
                  No results found for "{debouncedQuery}"
                </Text>
              </View>
            ) : searchResults.length === 0 ? (
              <View style={styles.searchHintContainer}>
                <Text variant="bodySemibold" color={COLORS.text} style={styles.searchHintTitle}>Find Station stops</Text>
                <Text variant="body" color={COLORS.textMuted} style={styles.searchHintText}>
                  Type a route number or stop (e.g. Merkato, Bole, Piazza).
                </Text>
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
                      <TouchableOpacity style={styles.searchResultCard} onPress={() => handleSelectRouteFromSearch(r)} activeOpacity={0.75}>
                        <View style={[styles.searchResultIcon, { backgroundColor: r.color || COLORS.primary }]}>
                          <MaterialCommunityIcons name="bus" size={18} color={COLORS.white} />
                        </View>
                        <View style={styles.searchResultTexts}>
                          <Text variant="bodySemibold">{r.name}</Text>
                          <Text variant="caption" color={COLORS.textMuted}>Route {r.routeNumber} • {r.totalStops} stops</Text>
                        </View>
                      </TouchableOpacity>
                    );
                  }

                  const s = item.data as Stop;
                  return (
                    <TouchableOpacity style={styles.searchResultCard} onPress={() => handleSelectStopFromSearch(s)} activeOpacity={0.75}>
                      <View style={[styles.searchResultIcon, { backgroundColor: COLORS.primaryLight }]}>
                        <MaterialCommunityIcons name="bus-stop" size={18} color={COLORS.primary} />
                      </View>
                      <View style={styles.searchResultTexts}>
                        <Text variant="bodySemibold">{s.name}</Text>
                        {s.nameAm && <Text variant="caption" color={COLORS.textLight}>{s.nameAm}</Text>}
                      </View>
                    </TouchableOpacity>
                  );
                }}
              />
            )}
          </View>
        </View>
      </Modal>

      {/* NEARBY STOPS MODAL */}
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
              <Text variant="h3" style={{ color: COLORS.primary }}>Nearby Stops</Text>
              <Text variant="caption" color={COLORS.textMuted}>Within 2 km range</Text>
            </View>

            {isNearbyLoading ? (
              <View style={styles.searchLoadingContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text variant="caption" color={COLORS.textMuted} style={{ marginTop: 12 }}>Finding stops near you...</Text>
              </View>
            ) : nearbyStops.length === 0 ? (
              <View style={styles.searchEmptyContainer}>
                <Text variant="body" color={COLORS.textMuted} style={{ marginTop: 12, textAlign: 'center' }}>No stops found nearby.</Text>
              </View>
            ) : (
              <ScrollView contentContainerStyle={{ paddingHorizontal: SPACING.lg, paddingBottom: 40 }}>
                {nearbyStops.map((stop, idx) => (
                  <TouchableOpacity key={stop.id} style={styles.nearbyStopCard} onPress={() => handleSelectNearbyStop(stop)} activeOpacity={0.75}>
                    <View style={styles.nearbyRankCircle}>
                      <Text variant="caption" color={COLORS.white} style={{ fontWeight: '700' }}>{idx + 1}</Text>
                    </View>
                    <View style={styles.nearbyStopTexts}>
                      <Text variant="bodySemibold">{stop.name}</Text>
                      {stop.nameAm && <Text variant="caption" color={COLORS.textLight}>{stop.nameAm}</Text>}
                    </View>
                    <View style={styles.nearbyDistanceBadge}>
                      <Text variant="caption" color={COLORS.primary} style={{ fontWeight: '700' }}>
                        {stop.distanceKm < 1 ? `${Math.round(stop.distanceKm * 1000)} m` : `${stop.distanceKm.toFixed(1)} km`}
                      </Text>
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

  // Stop Markers
  stopMarkerWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 44,
    height: 44,
  },
  stopPulseRing: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    opacity: 0.25,
  },
  stopMarker: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.light,
  },
  stopMarkerHighlighted: {
    borderColor: COLORS.accent,
    backgroundColor: COLORS.accentLight,
  },

  // Bus Markers
  busMarker: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2.5,
    borderColor: COLORS.white,
    ...SHADOWS.medium,
  },
  simulatedBusMarker: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.white,
    borderWidth: 3,
  },

  // Journey markers
  journeyMarkerStart: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2.5,
    borderColor: COLORS.white,
    ...SHADOWS.medium,
  },
  journeyMarkerDest: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2.5,
    borderColor: COLORS.white,
    ...SHADOWS.medium,
  },

  // Floating Header & Prompt Panel
  headerFloatingContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 56 : 40,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  hamburgerBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.medium,
  },
  searchPromptBar: {
    flex: 1,
    height: 52,
    borderRadius: ROUNDNESS.xl,
    backgroundColor: COLORS.white,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.medium,
  },
  promptText: {
    marginLeft: 8,
    fontSize: 15,
  },

  // Active filter badge
  activeFilterBadge: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 120 : 104,
    left: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: ROUNDNESS.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.light,
  },
  filterBadgeDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  filterBadgeText: { marginRight: 6 },
  filterClearBtn: { padding: 2 },

  // Floating map actions Column
  fabColumn: {
    position: 'absolute',
    bottom: 120,
    right: 20,
    gap: 12,
  },
  fab: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.medium,
  },
  fabNearby: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primaryDark,
  },

  // Map deck scroll shortcut overlay
  mapDeckContainer: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    backgroundColor: COLORS.white,
    borderRadius: ROUNDNESS.xl,
    padding: SPACING.md,
    ...SHADOWS.medium,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  deckSearchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: ROUNDNESS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  deckSearchIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  deckSearchTexts: {
    flex: 1,
  },
  deckSearchTitle: {
    fontSize: 15,
  },
  deckSearchChevron: {
    marginLeft: SPACING.sm,
  },
  deckFavoritesSection: {
    marginTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: SPACING.sm,
  },
  favoritesHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  favoritesSectionTitle: {
    marginLeft: 4,
    letterSpacing: 0.8,
    fontSize: 10,
  },
  favoritesChipsScroll: {
    gap: 8,
    paddingVertical: 4,
  },
  favChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: ROUNDNESS.full,
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
  },
  favChipDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  favChipText: {
    fontSize: 12,
  },
  floatingArrivalAlert: {
    position: 'absolute',
    top: 110,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.accent,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: ROUNDNESS.full,
    ...SHADOWS.medium,
    zIndex: 999,
  },
  alertText: {
    marginLeft: SPACING.xs,
    fontSize: 14,
  },

  // Active Trip Card
  activeTripCard: {
    position: 'absolute',
    bottom: 24,
    left: 20,
    right: 20,
    backgroundColor: COLORS.white,
    borderRadius: ROUNDNESS.xl,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.dark,
  },
  tripHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingBottom: 14,
    marginBottom: 14,
  },
  tripBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  routeCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  routeCircleText: {
    fontWeight: '800',
    fontSize: 14,
  },
  routeDetailsCol: {
    gap: 2,
  },
  etaContainer: {
    alignItems: 'flex-end',
  },
  tripActionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  tripActionBtn: {
    flex: 1,
    height: 46,
    borderRadius: ROUNDNESS.md,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  tripActionBtnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  tripActionText: {
    fontWeight: '600',
  },
  cancelBtn: {
    borderColor: COLORS.danger,
  },

  // Journey Planner Modal Container
  plannerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  plannerContainer: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: ROUNDNESS.xxl,
    borderTopRightRadius: ROUNDNESS.xxl,
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'ios' ? 44 : 24,
    maxHeight: '85%',
  },
  sheetHandle: {
    width: 40,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: COLORS.borderDark,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 16,
  },
  plannerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  closeRoundBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationPanelCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: ROUNDNESS.lg,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    marginBottom: 20,
  },
  visualIndicatorColumn: {
    alignItems: 'center',
    paddingVertical: 10,
    gap: 4,
    marginRight: 10,
  },
  dotStart: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.primary },
  verticalDottedLine: { width: 1.5, height: 26, backgroundColor: COLORS.textLight, opacity: 0.4 },
  dotDest: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.secondary },
  inputFieldsColumn: {
    flex: 1,
    gap: 8,
  },
  plannerInputField: {
    height: 40,
    backgroundColor: COLORS.white,
    borderRadius: ROUNDNESS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  swapBtn: {
    padding: 8,
    marginLeft: 4,
  },
  resultsContainer: {
    flex: 1,
  },
  resultsTitle: {
    marginBottom: 12,
    color: COLORS.secondary,
  },
  resultsScroll: {
    maxHeight: 220,
    marginBottom: 16,
  },
  routeOptionCard: {
    backgroundColor: COLORS.white,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: ROUNDNESS.md,
    padding: 12,
    marginBottom: 10,
  },
  routeOptionCardActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight + '20',
  },
  routeOptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  routeOptionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 10,
  },
  routeOptionType: {
    flex: 1,
    fontSize: 13,
  },
  tagBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: ROUNDNESS.sm,
  },
  tagFast: { backgroundColor: COLORS.accentLight },
  tagWalk: { backgroundColor: COLORS.primaryLight },
  tagText: { fontSize: 10, fontWeight: '700', color: COLORS.textMuted },
  routeOptionDetails: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  detailsDivider: {
    marginHorizontal: 6,
  },
  startJourneyBtn: {
    backgroundColor: COLORS.secondary,
    height: 54,
    borderRadius: ROUNDNESS.lg,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  plannerEmptyHint: {
    alignItems: 'center',
    paddingVertical: 40,
  },

  // Picker Modal styles
  pickerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerContainer: {
    width: SCREEN_WIDTH * 0.88,
    height: SCREEN_HEIGHT * 0.65,
    backgroundColor: COLORS.white,
    borderRadius: ROUNDNESS.xl,
    padding: 20,
    ...SHADOWS.dark,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  pickerSearchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: ROUNDNESS.md,
    paddingHorizontal: 12,
    height: 46,
    marginBottom: 16,
  },
  pickerSearchInput: {
    flex: 1,
    marginLeft: 8,
    color: COLORS.text,
  },
  pickerStopCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },

  // Custom sliding drawer styles
  drawerBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    zIndex: 9998,
  },
  drawerContainer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: 300,
    backgroundColor: COLORS.white,
    zIndex: 9999,
    ...SHADOWS.dark,
  },
  drawerHeader: {
    backgroundColor: COLORS.secondary,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 24,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  drawerAvatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarEmoji: { fontSize: 24 },
  drawerUserTexts: {
    marginLeft: 12,
    flex: 1,
  },
  drawerCloseX: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    right: 12,
  },
  drawerScroll: {
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  drawerLink: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: ROUNDNESS.md,
    marginBottom: 4,
  },
  drawerLinkText: {
    marginLeft: 14,
  },
  drawerLineDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 16,
    marginHorizontal: 8,
  },
  logoutLink: {
    marginTop: 20,
  },

  // Search Results details
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.3)',
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
  searchBar: {
    position: 'absolute',
    top: 55,
    left: SPACING.lg,
    right: SPACING.lg,
    height: 52,
    backgroundColor: COLORS.white,
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
  
  // Premium passenger trip details styles
  tripDetailsMiddleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.xs,
  },
  tripMetaCol: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  alarmToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight,
    borderRadius: ROUNDNESS.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  alarmToggleBtnActive: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  alarmToggleText: {
    fontSize: 11,
    fontWeight: '700',
  },

  // Alarm ringing modal styles
  alarmModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  alarmModalContainer: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: COLORS.white,
    borderRadius: ROUNDNESS.xl,
    padding: SPACING.xl,
    alignItems: 'center',
    ...SHADOWS.dark,
  },
  alarmIconOuter: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.accent,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
    ...SHADOWS.medium,
  },
  alarmModalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.secondary,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  alarmModalText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: SPACING.xl,
  },
  alarmDismissBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: ROUNDNESS.full,
    paddingHorizontal: 28,
    paddingVertical: 12,
    width: '100%',
    alignItems: 'center',
    ...SHADOWS.medium,
  },

  // Floating Toast styles
  floatingToastContainer: {
    position: 'absolute',
    bottom: 180,
    alignSelf: 'center',
    backgroundColor: COLORS.secondary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: ROUNDNESS.lg,
    ...SHADOWS.dark,
    zIndex: 10000,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  toastText: {
    fontSize: 13,
  },
});

export default HomeScreen;
