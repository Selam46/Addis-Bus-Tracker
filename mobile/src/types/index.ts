// ============================================
// Shared TypeScript Types
// ============================================
// These mirror the Prisma schema on the backend.

// ─────────────────────────────────────────────
// AUTH
// ─────────────────────────────────────────────
export interface User {
  id:        string;
  name:      string;
  email:     string;
  phone:     string | null;
  pushToken: string | null;
  createdAt: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data: {
    token: string;
    user:  User;
  };
}

// ─────────────────────────────────────────────
// ROUTES
// ─────────────────────────────────────────────
export interface Route {
  id:          string;
  routeNumber: string;
  name:        string;
  description: string | null;
  color:       string | null;
  isActive:    boolean;
  stopCount?:  number;
  stops?:      RouteStop[];
}

// ─────────────────────────────────────────────
// STOPS
// ─────────────────────────────────────────────
export interface Stop {
  id:          string;
  name:        string;
  nameAm:      string | null;
  latitude:    number;
  longitude:   number;
  description: string | null;
  isActive:    boolean;
}

export interface RouteStop {
  id:                string;
  stopOrder:         number;
  distanceFromStart: number | null;
  stop:              Stop;
}

// ─────────────────────────────────────────────
// BUSES & LOCATION
// ─────────────────────────────────────────────
export interface Bus {
  id:          string;
  busNumber:   string;
  licensePlate:string;
  capacity:    number;
  routeId:     string | null;
  isActive:    boolean;
  route?:      Route;
  lastLocation?: BusLocation;
}

export interface BusLocation {
  id:        string;
  busId:     string;
  latitude:  number;
  longitude: number;
  speed:     number | null;
  heading:   number | null;
  timestamp: string;
}

// ─────────────────────────────────────────────
// SCHEDULES
// ─────────────────────────────────────────────
export interface Schedule {
  id:            string;
  routeId:       string;
  departureTime: string;
  daysOfWeek:    string[];
  isActive:      boolean;
  route?:        Route;
  etaMinutes?:   number;
  status?:       'upcoming' | 'now' | 'passed';
}

// ─────────────────────────────────────────────
// FEEDBACK
// ─────────────────────────────────────────────
export type FeedbackCategory =
  | 'OVERCROWDING'
  | 'LATE_ARRIVAL'
  | 'RUDE_DRIVER'
  | 'VEHICLE_CONDITION'
  | 'WRONG_ROUTE'
  | 'OTHER';

export type FeedbackStatus = 'PENDING' | 'REVIEWED' | 'RESOLVED';

export interface Feedback {
  id:        string;
  routeId:   string | null;
  category:  FeedbackCategory;
  message:   string;
  status:    FeedbackStatus;
  createdAt: string;
}

// ─────────────────────────────────────────────
// NOTIFICATIONS
// ─────────────────────────────────────────────
export type NotificationType = 'BUS_APPROACHING' | 'SCHEDULE_CHANGE' | 'SYSTEM';

export interface Notification {
  id:        string;
  title:     string;
  body:      string;
  type:      NotificationType;
  typeLabel: string;
  typeIcon:  string;
  isRead:    boolean;
  createdAt: string;
}

// ─────────────────────────────────────────────
// API RESPONSE WRAPPER
// ─────────────────────────────────────────────
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data:    T;
}

// ─────────────────────────────────────────────
// NAVIGATION PARAM LISTS
// ─────────────────────────────────────────────
export type RootStackParamList = {
  Onboarding: undefined;
  Auth:       undefined;
  Main:       undefined;
};

export type AuthStackParamList = {
  Login:    undefined;
  Register: undefined;
};

export type MainTabParamList = {
  Home:          undefined;
  Search:        undefined;
  Notifications: undefined;
  Profile:       undefined;
};

// Screens accessible from tabs (pushed on the stack)
export type MainStackParamList = {
  Tabs:     undefined;
  Schedule: { routeId: string; routeName: string };
  Feedback: { routeId?: string; routeName?: string };
  RouteDetail: { routeId: string; routeName: string };
};
