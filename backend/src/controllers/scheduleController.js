// ============================================
// Schedule Controller
// ============================================
// Handles all schedule and ETA endpoints:
//
//   GET /api/schedules                   — list all schedules
//   GET /api/schedules/route/:routeId    — today's timetable for a route
//   GET /api/schedules/eta               — ETA at a specific stop
//   GET /api/schedules/:id               — single schedule detail
//
// ETA FORMULA:
//   arrivalTime = departureTime + (distanceFromStart ÷ AVG_SPEED) × 60 min
//   Average bus speed in Addis Ababa: 20 km/h (accounts for city traffic)

const { query } = require("express-validator");
const prisma = require("../lib/prisma");

// ─────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────
const AVG_BUS_SPEED_KMH = 20; // Realistic average for Addis Ababa city traffic

// Day-of-week map: JS getDay() returns 0 (Sun) → 6 (Sat)
const DAYS_MAP = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

// Addis Ababa timezone — East Africa Time (EAT) = UTC+3
const ADDIS_TZ = "Africa/Addis_Ababa";

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

/**
 * Parse a time string like "06:30" into minutes since midnight.
 * "06:30" → 390
 */
const parseTimeToMinutes = (timeStr) => {
  const [hours, minutes] = timeStr.split(":").map(Number);
  return hours * 60 + minutes;
};

/**
 * Convert minutes since midnight back to "HH:MM" format.
 * 390 → "06:30"
 */
const formatMinutesToTime = (totalMinutes) => {
  const h = Math.floor(totalMinutes / 60) % 24;
  const m = Math.round(totalMinutes % 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};

/**
 * Get the current time details in Addis Ababa (EAT = UTC+3).
 * Returns: current day string, current total minutes, display time string.
 */
const getAddisAbabaTime = () => {
  const now = new Date();
  // Convert to Addis Ababa local time
  const addisDate = new Date(
    now.toLocaleString("en-US", { timeZone: ADDIS_TZ })
  );

  const hours = addisDate.getHours();
  const minutes = addisDate.getMinutes();

  return {
    currentMinutes: hours * 60 + minutes,
    currentDay: DAYS_MAP[addisDate.getDay()],
    displayTime: `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`,
  };
};

/**
 * Calculate arrival time at a stop, given:
 *   - departureTime: the time the bus leaves the FIRST stop (e.g. "06:30")
 *   - distanceFromStartKm: how far this stop is from the first stop
 *
 * Returns the arrival time string and travel duration in minutes.
 */
const calculateArrival = (departureTime, distanceFromStartKm) => {
  const departureMinutes = parseTimeToMinutes(departureTime);
  const travelMinutes = (distanceFromStartKm / AVG_BUS_SPEED_KMH) * 60;
  const arrivalMinutes = Math.round(departureMinutes + travelMinutes);

  return {
    arrivalMinutes,
    arrivalTime: formatMinutesToTime(arrivalMinutes),
    travelMinutes: Math.round(travelMinutes),
  };
};

// ─────────────────────────────────────────────
// VALIDATION RULES — GET /api/schedules/eta
// ─────────────────────────────────────────────
const etaValidation = [
  query("routeId")
    .notEmpty()
    .withMessage("routeId query parameter is required.")
    .isUUID()
    .withMessage("routeId must be a valid UUID."),

  query("stopId")
    .notEmpty()
    .withMessage("stopId query parameter is required.")
    .isUUID()
    .withMessage("stopId must be a valid UUID."),

  query("limit")
    .optional()
    .isInt({ min: 1, max: 10 })
    .withMessage("limit must be an integer between 1 and 10."),
];

// ─────────────────────────────────────────────
// GET /api/schedules
// ─────────────────────────────────────────────
// Returns all active schedules.
//
// Optional query filters:
//   ?routeId=xxx   — only schedules for a specific route
//   ?day=MON       — only schedules that run on a specific day
//
// Example: GET /api/schedules?day=MON&routeId=abc123
const getAllSchedules = async (req, res, next) => {
  try {
    const { routeId, day } = req.query;

    // Build Prisma where clause dynamically
    const where = {
      isActive: true,
      ...(routeId && { routeId }),
      ...(day && { daysOfWeek: { has: day.toUpperCase() } }),
    };

    const schedules = await prisma.schedule.findMany({
      where,
      include: {
        route: {
          select: {
            id: true,
            routeNumber: true,
            name: true,
            color: true,
          },
        },
      },
      // Sort by route number first, then by departure time within each route
      orderBy: [{ departureTime: "asc" }],
    });

    return res.status(200).json({
      success: true,
      message: `${schedules.length} schedule(s) found.`,
      data: {
        filters: {
          routeId: routeId || null,
          day: day ? day.toUpperCase() : null,
        },
        count: schedules.length,
        schedules: schedules.map((s) => ({
          id: s.id,
          departureTime: s.departureTime,
          daysOfWeek: s.daysOfWeek,
          isActive: s.isActive,
          route: s.route,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────
// GET /api/schedules/route/:routeId
// ─────────────────────────────────────────────
// Returns today's complete timetable for one route.
// Each departure is tagged as UPCOMING, SOON, or DEPARTED.
//
// Optional query param:
//   ?day=MON   — override the day (defaults to today in Addis Ababa time)
//
// This is what the mobile app shows on the "Timetable" screen.
const getSchedulesByRoute = async (req, res, next) => {
  try {
    const { routeId } = req.params;
    const { day } = req.query;

    // Get current Addis Ababa time
    const { currentDay, currentMinutes, displayTime } = getAddisAbabaTime();
    const targetDay = day ? day.toUpperCase() : currentDay;

    // ── Verify route exists ──────────────────────────────
    const route = await prisma.route.findUnique({
      where: { id: routeId },
      select: {
        id: true,
        routeNumber: true,
        name: true,
        color: true,
        description: true,
        isActive: true,
      },
    });

    if (!route || !route.isActive) {
      return res.status(404).json({
        success: false,
        message: "Route not found.",
      });
    }

    // ── Get all active schedules for this route on the target day ──
    const schedules = await prisma.schedule.findMany({
      where: {
        routeId,
        isActive: true,
        daysOfWeek: { has: targetDay },
      },
      orderBy: { departureTime: "asc" },
    });

    // ── Tag each schedule as upcoming or past ────────────
    const tagged = schedules.map((s) => {
      const depMinutes = parseTimeToMinutes(s.departureTime);
      const minutesFromNow = depMinutes - currentMinutes;
      const isUpcoming = minutesFromNow > 0;

      // Classify how soon the departure is
      let status;
      if (!isUpcoming) {
        status = "DEPARTED";
      } else if (minutesFromNow <= 15) {
        status = "SOON"; // Departing within 15 minutes
      } else {
        status = "UPCOMING";
      }

      return {
        id: s.id,
        departureTime: s.departureTime,
        daysOfWeek: s.daysOfWeek,
        isUpcoming,
        minutesFromNow: isUpcoming ? minutesFromNow : null,
        status,
      };
    });

    const upcoming = tagged.filter((s) => s.isUpcoming);
    const nextDeparture = upcoming[0] ?? null;

    return res.status(200).json({
      success: true,
      message:
        upcoming.length > 0
          ? `Next departure for Route ${route.routeNumber} is at ${nextDeparture.departureTime} (in ${nextDeparture.minutesFromNow} min).`
          : `No more departures for Route ${route.routeNumber} today.`,
      data: {
        route,
        queryDay: targetDay,
        currentTime: displayTime,
        totalDepartures: schedules.length,
        upcomingCount: upcoming.length,
        nextDeparture: nextDeparture
          ? {
              id: nextDeparture.id,
              departureTime: nextDeparture.departureTime,
              minutesFromNow: nextDeparture.minutesFromNow,
              status: nextDeparture.status,
            }
          : null,
        schedules: tagged,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────
// GET /api/schedules/eta
// ─────────────────────────────────────────────
// The core ETA feature — "When will the next bus arrive at MY stop?"
//
// Required query params:
//   ?routeId=xxx    — which route
//   ?stopId=xxx     — which stop you are waiting at
//
// Optional:
//   ?limit=5        — how many upcoming arrivals to show (default: 5)
//
// How it works:
//   1. Finds today's schedules for the route
//   2. Finds the stop's position & distance on this route
//   3. For each schedule: arrivalTime = departure + (distance ÷ 20km/h × 60)
//   4. Filters to only future arrivals, returns next N
//
// Status labels:
//   ARRIVING_SOON  — arriving in < 10 minutes (trigger notification!)
//   COMING         — arriving in 10–30 minutes
//   SCHEDULED      — arriving in > 30 minutes
//   DEPARTED       — already passed
const getETA = async (req, res, next) => {
  try {
    const { routeId, stopId } = req.query;
    const limit = parseInt(req.query.limit) || 5;

    // ── Verify route exists ──────────────────────────────
    const route = await prisma.route.findUnique({
      where: { id: routeId },
      select: {
        id: true,
        routeNumber: true,
        name: true,
        color: true,
        isActive: true,
      },
    });

    if (!route || !route.isActive) {
      return res.status(404).json({
        success: false,
        message: "Route not found.",
      });
    }

    // ── Verify the stop exists AND is on this route ──────
    // We need the stop's distance from the start to calculate ETA
    const routeStop = await prisma.routeStop.findUnique({
      where: {
        routeId_stopId: { routeId, stopId },
      },
      include: {
        stop: {
          select: {
            id: true,
            name: true,
            nameAm: true,
            latitude: true,
            longitude: true,
          },
        },
      },
    });

    if (!routeStop) {
      return res.status(404).json({
        success: false,
        message:
          "This stop is not part of the specified route. Please check both IDs.",
      });
    }

    const distanceFromStartKm = routeStop.distanceFromStart ?? 0;

    // ── Get current Addis Ababa time ─────────────────────
    const { currentDay, currentMinutes, displayTime } = getAddisAbabaTime();

    // ── Get today's active schedules for this route ──────
    const schedules = await prisma.schedule.findMany({
      where: {
        routeId,
        isActive: true,
        daysOfWeek: { has: currentDay },
      },
      orderBy: { departureTime: "asc" },
    });

    // ── Handle: no service today ─────────────────────────
    if (schedules.length === 0) {
      return res.status(200).json({
        success: true,
        message: `Route ${route.routeNumber} does not operate on ${currentDay}.`,
        data: {
          route,
          stop: routeStop.stop,
          stopOrder: routeStop.stopOrder,
          distanceFromStartKm,
          currentDay,
          currentTime: displayTime,
          avgBusSpeedKmH: AVG_BUS_SPEED_KMH,
          totalUpcoming: 0,
          nextArrival: null,
          arrivals: [],
        },
      });
    }

    // ── Calculate arrival time at target stop for each schedule ──
    const allArrivals = schedules.map((schedule) => {
      const { arrivalMinutes, arrivalTime, travelMinutes } = calculateArrival(
        schedule.departureTime,
        distanceFromStartKm
      );

      const minutesUntilArrival = arrivalMinutes - currentMinutes;
      const isUpcoming = minutesUntilArrival > 0;

      // Classify the arrival status
      let status;
      if (!isUpcoming) {
        status = "DEPARTED";
      } else if (minutesUntilArrival <= 10) {
        status = "ARRIVING_SOON"; // Mobile app should trigger notification here
      } else if (minutesUntilArrival <= 30) {
        status = "COMING";
      } else {
        status = "SCHEDULED";
      }

      return {
        scheduleId: schedule.id,
        departureTime: schedule.departureTime,   // When bus leaves the first stop
        arrivalTime,                              // When bus arrives at YOUR stop
        travelMinutes,                            // Travel time from first stop to your stop
        minutesUntilArrival: isUpcoming ? minutesUntilArrival : null,
        isUpcoming,
        status,
      };
    });

    // Filter to only future arrivals and cap at the requested limit
    const upcomingArrivals = allArrivals
      .filter((a) => a.isUpcoming)
      .slice(0, limit);

    const nextArrival = upcomingArrivals[0] ?? null;

    return res.status(200).json({
      success: true,
      message:
        upcomingArrivals.length > 0
          ? `Next bus arrives at ${routeStop.stop.name} at ${nextArrival.arrivalTime} (in ${nextArrival.minutesUntilArrival} min).`
          : `No more buses arriving at ${routeStop.stop.name} for Route ${route.routeNumber} today.`,
      data: {
        route,
        stop: routeStop.stop,
        stopOrder: routeStop.stopOrder,
        distanceFromStartKm,
        currentDay,
        currentTime: displayTime,
        avgBusSpeedKmH: AVG_BUS_SPEED_KMH,
        totalUpcoming: upcomingArrivals.length,
        nextArrival: nextArrival
          ? {
              arrivalTime: nextArrival.arrivalTime,
              minutesUntilArrival: nextArrival.minutesUntilArrival,
              status: nextArrival.status,
            }
          : null,
        arrivals: upcomingArrivals,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────
// GET /api/schedules/:id
// ─────────────────────────────────────────────
// Returns a single schedule by its ID, with route info.
// Useful when the mobile app needs to show schedule detail.
const getScheduleById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const schedule = await prisma.schedule.findUnique({
      where: { id },
      include: {
        route: {
          select: {
            id: true,
            routeNumber: true,
            name: true,
            color: true,
            description: true,
          },
        },
      },
    });

    if (!schedule || !schedule.isActive) {
      return res.status(404).json({
        success: false,
        message: "Schedule not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Schedule fetched successfully.",
      data: {
        schedule: {
          id: schedule.id,
          departureTime: schedule.departureTime,
          daysOfWeek: schedule.daysOfWeek,
          isActive: schedule.isActive,
          createdAt: schedule.createdAt,
          route: schedule.route,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────
module.exports = {
  etaValidation,
  getAllSchedules,
  getSchedulesByRoute,
  getETA,
  getScheduleById,
};
