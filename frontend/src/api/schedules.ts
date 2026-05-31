import apiClient from './client';

// ─── Schedule Types ────────────────────────────────────────────────────────

export type DayOfWeek = 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT' | 'SUN';

export type ScheduleStatus = 'UPCOMING' | 'SOON' | 'DEPARTED';

export type ETAStatus = 'ARRIVING_SOON' | 'COMING' | 'SCHEDULED' | 'DEPARTED';

export interface ScheduleRouteInfo {
  id: string;
  routeNumber: string;
  name: string;
  color: string;
}

/** A single departure entry in the timetable */
export interface ScheduleEntry {
  id: string;
  departureTime: string;       // "HH:MM" e.g. "06:30"
  daysOfWeek: DayOfWeek[];
  isUpcoming: boolean;
  minutesFromNow: number | null;
  status: ScheduleStatus;
}

/** Full timetable response for a route */
export interface RouteScheduleResponse {
  route: ScheduleRouteInfo & { description: string; isActive: boolean };
  queryDay: DayOfWeek;
  currentTime: string;         // Current time in Addis Ababa "HH:MM"
  totalDepartures: number;
  upcomingCount: number;
  nextDeparture: {
    id: string;
    departureTime: string;
    minutesFromNow: number;
    status: ScheduleStatus;
  } | null;
  schedules: ScheduleEntry[];
}

/** A single arrival in the ETA response */
export interface ETAArrival {
  scheduleId: string;
  departureTime: string;       // Bus departs first stop at this time
  arrivalTime: string;         // Bus arrives at YOUR stop at this time
  travelMinutes: number;       // Travel time from route start to your stop
  minutesUntilArrival: number | null;
  isUpcoming: boolean;
  status: ETAStatus;
}

/** Full ETA response */
export interface ETAResponse {
  route: ScheduleRouteInfo;
  stop: {
    id: string;
    name: string;
    nameAm: string;
    latitude: number;
    longitude: number;
  };
  stopOrder: number;
  distanceFromStartKm: number;
  currentDay: DayOfWeek;
  currentTime: string;
  avgBusSpeedKmH: number;
  totalUpcoming: number;
  nextArrival: {
    arrivalTime: string;
    minutesUntilArrival: number;
    status: ETAStatus;
  } | null;
  arrivals: ETAArrival[];
}

/** Simple schedule list item (from GET /api/schedules) */
export interface SimpleSchedule {
  id: string;
  departureTime: string;
  daysOfWeek: DayOfWeek[];
  isActive: boolean;
  route: ScheduleRouteInfo;
}

// ─── API Methods ────────────────────────────────────────────────────────────

export const schedulesApi = {
  /**
   * GET /api/schedules
   * List all schedules, optionally filtered by routeId and/or day.
   */
  getAll: async (
    routeId?: string,
    day?: DayOfWeek
  ): Promise<{ success: boolean; data: { count: number; schedules: SimpleSchedule[] } }> => {
    const response = await apiClient.get('/schedules', {
      params: { routeId, day },
    });
    return response.data;
  },

  /**
   * GET /api/schedules/route/:routeId
   * Today's full timetable for a specific route.
   * Pass `day` to override (e.g. 'MON').
   */
  getByRoute: async (
    routeId: string,
    day?: DayOfWeek
  ): Promise<{ success: boolean; message: string; data: RouteScheduleResponse }> => {
    const response = await apiClient.get(`/schedules/route/${routeId}`, {
      params: { day },
    });
    return response.data;
  },

  /**
   * GET /api/schedules/eta?routeId=xxx&stopId=xxx&limit=5
   * Next bus arrivals at a specific stop on a route.
   */
  getETA: async (
    routeId: string,
    stopId: string,
    limit = 5
  ): Promise<{ success: boolean; message: string; data: ETAResponse }> => {
    const response = await apiClient.get('/schedules/eta', {
      params: { routeId, stopId, limit },
    });
    return response.data;
  },

  /**
   * GET /api/schedules/:id
   * Single schedule detail by ID.
   */
  getById: async (
    id: string
  ): Promise<{ success: boolean; data: { schedule: SimpleSchedule & { createdAt: string } } }> => {
    const response = await apiClient.get(`/schedules/${id}`);
    return response.data;
  },
};

export default schedulesApi;
