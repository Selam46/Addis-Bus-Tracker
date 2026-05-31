import apiClient from './client';

export interface Route {
  id: string;
  routeNumber: string;
  name: string;
  description: string;
  color: string;
  totalStops: number;
  firstStop: { name: string; nameAm: string } | null;
  lastStop: { name: string; nameAm: string } | null;
  isActive: boolean;
}

export interface RouteDetail extends Omit<Route, 'totalStops' | 'firstStop' | 'lastStop'> {
  totalBuses: number;
  totalSchedules: number;
  stops: Array<{
    order: number;
    distanceFromStartKm: number;
    stop: {
      id: string;
      name: string;
      nameAm: string;
      latitude: number;
      longitude: number;
      description: string | null;
      isActive: boolean;
    };
  }>;
}

export interface RouteStopsResponse {
  route: {
    id: string;
    routeNumber: string;
    name: string;
    color: string;
  };
  count: number;
  stops: Array<{
    order: number;
    distanceFromStartKm: number;
    id: string;
    name: string;
    nameAm: string;
    latitude: number;
    longitude: number;
    description: string | null;
    isActive: boolean;
  }>;
}

export const routesApi = {
  getAll: async (search?: string): Promise<{ success: boolean; data: { routes: Route[] } }> => {
    const response = await apiClient.get('/routes', {
      params: { search },
    });
    return response.data;
  },

  getById: async (id: string): Promise<{ success: boolean; data: { route: RouteDetail } }> => {
    const response = await apiClient.get(`/routes/${id}`);
    return response.data;
  },

  getStops: async (id: string): Promise<{ success: boolean; data: RouteStopsResponse }> => {
    const response = await apiClient.get(`/routes/${id}/stops`);
    return response.data;
  },
};

export default routesApi;
