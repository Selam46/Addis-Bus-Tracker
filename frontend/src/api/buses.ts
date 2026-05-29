import apiClient from './client';

export interface BusLocation {
  id: string;
  busId: string;
  latitude: number;
  longitude: number;
  speed: number | null;
  heading: number | null;
  timestamp: string;
}

export interface Bus {
  id: string;
  busNumber: string;
  licensePlate: string;
  capacity: number;
  isActive?: boolean;
  route: {
    id: string;
    routeNumber: string;
    name: string;
    color: string;
  } | null;
  currentLocation: BusLocation | null;
}

export interface BusDetail {
  id: string;
  busNumber: string;
  licensePlate: string;
  capacity: number;
  isActive: boolean;
  route: {
    id: string;
    routeNumber: string;
    name: string;
    color: string;
    description: string;
  } | null;
  currentLocation: BusLocation | null;
  locationHistory: BusLocation[];
}

export const busesApi = {
  getAll: async (): Promise<{ success: boolean; data: { buses: Bus[] } }> => {
    const response = await apiClient.get('/buses');
    return response.data;
  },

  getByRoute: async (
    routeId: string
  ): Promise<{
    success: boolean;
    data: {
      route: {
        id: string;
        routeNumber: string;
        name: string;
        color: string;
        isActive: boolean;
      };
      count: number;
      buses: Array<Omit<Bus, 'route'>>;
    };
  }> => {
    const response = await apiClient.get(`/buses/route/${routeId}`);
    return response.data;
  },

  getById: async (id: string): Promise<{ success: boolean; data: { bus: BusDetail } }> => {
    const response = await apiClient.get(`/buses/${id}`);
    return response.data;
  },
};

export default busesApi;
