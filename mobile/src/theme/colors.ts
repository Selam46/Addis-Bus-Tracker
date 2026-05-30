// ============================================
// App Color Palette — Addis Bus Tracker
// ============================================
// Primary: Deep Teal  (brand, trust, reliability)
// Accent:  Amber      (Ethiopian warmth, CTAs)

export const Colors = {
  // ── Primary Brand (Teal) ───────────────────
  primary: "#1B7A7A", // Deep teal — buttons, headers, icons
  primaryLight: "#2A9090", // Lighter teal — hover/pressed states
  primaryDark: "#0F5C5C", // Darker teal — pressed states
  primaryBg: "#E0F2F2", // Very light teal — icon circle backgrounds

  // ── Accent ─────────────────────────────────
  accent: "#F57C00", // Amber orange — highlights, badges
  accentLight: "#FFB74D", // Light amber
  accentDark: "#E65100", // Dark amber

  // ── Backgrounds ────────────────────────────
  background: "#F4F6FA", // App background (light grey-blue)
  surface: "#FFFFFF", // Cards, modals, inputs
  surfaceAlt: "#F5F7FA", // Slightly tinted surface / input bg

  // ── Text ───────────────────────────────────
  textPrimary: "#1A1A2E", // Dark navy — headings
  textSecondary: "#6B7280", // Grey — subtext, labels
  textMuted: "#9CA3AF", // Very light — placeholders, hints
  textInverse: "#FFFFFF", // On dark/teal backgrounds

  // ── Status Colors ──────────────────────────
  success: "#2E7D32", // Green — on time, confirmed
  successLight: "#E8F5E9", // Light green background
  warning: "#F9A825", // Yellow — delayed, caution
  warningLight: "#FFF8E1", // Light yellow background
  error: "#C62828", // Red — errors, overdue
  errorLight: "#FFEBEE", // Light red background
  info: "#0277BD", // Info blue

  // ── UI Elements ────────────────────────────
  border: "#E5E7EB", // Input borders, dividers
  borderFocus: "#1B7A7A", // Focused input border (teal)
  shadow: "#000000", // Box shadow color (use with opacity)
  overlay: "rgba(0,0,0,0.5)", // Modal overlay

  // ── Tab Bar ────────────────────────────────
  tabActive: "#1B7A7A", // Active tab icon + label
  tabInactive: "#9CA3AF", // Inactive tab icon + label
  tabBackground: "#FFFFFF", // Tab bar background

  // ── Map ────────────────────────────────────
  busMarker: "#F57C00", // Bus icon on map
  stopMarker: "#1B7A7A", // Stop dot on map
  routeLine: "#2A9090", // Route polyline on map

  // ── Pager dots ─────────────────────────────
  dotActive: "#1B7A7A", // Active onboarding dot
  dotInactive: "#D1D5DB", // Inactive onboarding dot

  // ── Transparent ────────────────────────────
  transparent: "transparent",
} as const;

export type ColorKey = keyof typeof Colors;
