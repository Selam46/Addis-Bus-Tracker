import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import MapView, { Marker, Callout } from 'react-native-maps';
import * as Location from 'expo-location';
import { io, Socket } from 'socket.io-client';
import { useRoute, RouteProp } from '@react-navigation/native';
import { useAuthStore } from '../store/authStore';
import { COLORS, SPACING, ROUNDNESS, SHADOWS } from '../theme/theme';
import Text from '../components/ui/Text';
import ENV from '../config/env';
import stopsApi, { Stop } from '../api/stops';
import busesApi, { Bus } from '../api/buses';
import { MainTabParamList } from '../navigation/types';

const ADDIS_ABABA_REGION = {
  latitude: 9.0192,
  longitude: 38.7525,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

export const HomeScreen: React.FC = () => {
  const user = useAuthStore((state) => state.user);
  const route = useRoute<RouteProp<MainTabParamList, 'Home'>>();
  const [buses, setBuses] = useState<Bus[]>([]);
  const [stops, setStops] = useState<Stop[]>([]);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const mapRef = useRef<MapView | null>(null);
  const socketRef = useRef<Socket | null>(null);

  // Listen to navigation params to center on a selected stop
  useEffect(() => {
    if (route.params?.latitude && route.params?.longitude) {
      const { latitude, longitude } = route.params;
      console.log(`📍 HomeScreen: Navigation parameter received. Centering on (${latitude}, ${longitude})`);
      
      // Animate map view
      if (mapRef.current) {
        mapRef.current.animateToRegion({
          latitude,
          longitude,
          latitudeDelta: 0.012,
          longitudeDelta: 0.012,
        }, 1000);
      }
    }
  }, [route.params]);

  // Helper: Subscribe to route rooms for all buses that are active
  const subscribeToActiveRoutes = (activeBuses: Bus[], socketInstance: Socket) => {
    if (!socketInstance || !socketInstance.connected) return;

    // Find unique route IDs
    const routeIds = Array.from(
      new Set(activeBuses.map((bus) => bus.route?.id).filter(Boolean) as string[])
    );

    routeIds.forEach((routeId) => {
      console.log(`📡 Socket: Subscribing to route updates for routeId: ${routeId}`);
      socketInstance.emit('subscribe:route', routeId);
    });
  };

  // Helper: Handle incoming location updates
  const handleLocationUpdate = (updatedLocation: any) => {
    setBuses((prevBuses) => {
      return prevBuses.map((bus) => {
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
      });
    });
  };

  useEffect(() => {
    // 1. Fetch initial stops and active buses
    const fetchInitialData = async () => {
      try {
        const [stopsRes, busesRes] = await Promise.all([
          stopsApi.getAll(),
          busesApi.getAll(),
        ]);
        
        if (stopsRes.success) setStops(stopsRes.data.stops);
        if (busesRes.success) {
          setBuses(busesRes.data.buses);
          
          // If socket is already connected, subscribe immediately
          if (socketRef.current && socketRef.current.connected) {
            subscribeToActiveRoutes(busesRes.data.buses, socketRef.current);
          }
        }
      } catch (error) {
        console.error('Error fetching initial map data:', error);
        Alert.alert('Error', 'Unable to fetch stops or active buses from the server.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchInitialData();

    // 2. Request user GPS coordinates
    const requestLocation = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          console.warn('Location permission denied.');
          return;
        }

        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        const userCoords = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        };

        setUserLocation(userCoords);

        // Center map to user position in development/testing if desired
        if (mapRef.current) {
          mapRef.current.animateToRegion({
            ...userCoords,
            latitudeDelta: 0.02,
            longitudeDelta: 0.02,
          }, 1000);
        }
      } catch (error) {
        console.error('Error requesting user location:', error);
      }
    };

    requestLocation();

    // 3. Connect to real-time Socket.io server
    console.log(`🔌 Connecting to Socket.io server: ${ENV.SOCKET_URL}`);
    const socket = io(ENV.SOCKET_URL, {
      transports: ['websocket'],
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('✅ Socket: Connected with socket ID:', socket.id);
      
      // Subscribe to active routes once connection succeeds (if buses are already loaded)
      if (buses.length > 0) {
        subscribeToActiveRoutes(buses, socket);
      }
    });

    socket.on('bus:locationUpdate', (data) => {
      console.log('📍 Socket: Received bus location update:', data);
      handleLocationUpdate(data);
    });

    socket.on('disconnect', (reason) => {
      console.log('❌ Socket: Disconnected from real-time server:', reason);
    });

    // Cleanup: disconnect on unmount
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  const centerOnUser = () => {
    if (userLocation && mapRef.current) {
      mapRef.current.animateToRegion({
        ...userLocation,
        latitudeDelta: 0.015,
        longitudeDelta: 0.015,
      }, 800);
    } else {
      Alert.alert('Location Info', 'Finding your GPS coordinates, make sure your phone location is on.');
    }
  };

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

  // Filter out buses without valid GPS locations to prevent map marker rendering errors
  const activeBuses = buses.filter((bus) => bus.currentLocation !== null);

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={
          userLocation
            ? {
                ...userLocation,
                latitudeDelta: 0.02,
                longitudeDelta: 0.02,
              }
            : ADDIS_ABABA_REGION
        }
        showsUserLocation
        showsMyLocationButton={false}
      >
        {/* Render Bus Stop Markers */}
        {stops.map((stop) => (
          <Marker
            key={`stop-${stop.id}`}
            coordinate={{ latitude: stop.latitude, longitude: stop.longitude }}
            title={stop.name}
            description={stop.description || undefined}
          >
            <View style={styles.stopMarker}>
              <Text style={styles.stopIcon}>🚏</Text>
            </View>
            <Callout>
              <View style={styles.calloutContainer}>
                <Text variant="bodySemibold">{stop.name}</Text>
                {stop.nameAm && <Text variant="caption">{stop.nameAm}</Text>}
                {stop.routes && stop.routes.length > 0 && (
                  <View style={styles.calloutRoutes}>
                    {stop.routes.map((route) => (
                      <View 
                        key={route.id} 
                        style={[styles.routeBadge, { backgroundColor: route.color || COLORS.primary }]}
                      >
                        <Text variant="caption" color={COLORS.white} style={styles.badgeText}>
                          {route.routeNumber}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </Callout>
          </Marker>
        ))}

        {/* Render Live Bus Markers */}
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

      {/* Floating Greeting Header */}
      <View style={styles.floatingCard}>
        <Text variant="bodySemibold" style={styles.welcomeText}>
          Selam, {user?.fullName || 'Passenger'}!
        </Text>
        <Text variant="caption" color={COLORS.textMuted}>
          Where are you heading today?
        </Text>
      </View>

      {/* Re-center to User Button */}
      <TouchableOpacity 
        style={styles.myLocationBtn} 
        onPress={centerOnUser}
        activeOpacity={0.8}
      >
        <Text style={styles.myLocationIcon}>🎯</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: SPACING.md,
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
  stopIcon: {
    fontSize: 14,
  },
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
  busMarkerIcon: {
    fontSize: 20,
  },
  calloutContainer: {
    padding: SPACING.sm,
    width: 180,
  },
  calloutRoutes: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: SPACING.xs,
  },
  routeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 4,
    marginBottom: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  floatingCard: {
    position: 'absolute',
    top: 60,
    left: SPACING.lg,
    right: SPACING.lg,
    backgroundColor: COLORS.background,
    borderRadius: ROUNDNESS.lg,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    ...SHADOWS.medium,
  },
  welcomeText: {
    color: COLORS.primary,
  },
  myLocationBtn: {
    position: 'absolute',
    bottom: 30,
    right: SPACING.lg,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.medium,
  },
  myLocationIcon: {
    fontSize: 24,
  },
});

export default HomeScreen;
