import apiClient from './client';

export interface Stop {
  id: string;
  name: string;
  nameAm: string;
  latitude: number;
  longitude: number;
  description: string | null;
  routes: Array<{
    id: string;
    routeNumber: string;
    name: string;
    color: string;
  }>;
}

export interface NearbyStop extends Stop {
  distanceKm: number;
}

export interface StopDetail {
  id: string;
  name: string;
  nameAm: string;
  latitude: number;
  longitude: number;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  routes: Array<{
    id: string;
    routeNumber: string;
    name: string;
    color: string;
    description: string;
    stopOrder: number;
    distanceFromStartKm: number;
  }>;
}

export const stopsApi = {
  getAll: async (search?: string): Promise<{ success: boolean; data: { stops: Stop[] } }> => {
    const response = await apiClient.get('/stops', {
      params: { search },
    });
    return response.data;
  },

  getNearby: async (
    lat: number,
    lng: number,
    radius?: number
  ): Promise<{ success: boolean; data: { stops: NearbyStop[] } }> => {
    const response = await apiClient.get('/stops/nearby', {
      params: { lat, lng, radius },
    });
    return response.data;
  },

  getById: async (id: string): Promise<{ success: boolean; data: { stop: StopDetail } }> => {
    const response = await apiClient.get(`/stops/${id}`);
    return response.data;
  },
};

export default stopsApi;
