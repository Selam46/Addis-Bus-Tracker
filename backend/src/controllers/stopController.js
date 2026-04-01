// ============================================
// Stop Controller
// ============================================
// Handles all bus stop data endpoints:
//   GET /api/stops           — list all active stops
//   GET /api/stops/nearby    — find stops near a GPS location
//   GET /api/stops/:id       — get one stop + which routes pass through it
//
// The /nearby endpoint uses the Haversine formula to calculate
// the real-world distance in km between two GPS coordinates.

const { query } = require("express-validator");
const prisma = require("../lib/prisma");

// ─────────────────────────────────────────────
// HELPER: Haversine Distance Formula
// ─────────────────────────────────────────────
// Calculates the straight-line distance between
// two GPS coordinates (latitude/longitude) in kilometers.
//
// This is the standard formula used by GPS systems.
// It accounts for the curvature of the Earth.
//
// Parameters:
//   lat1, lon1 — the user's current GPS position
//   lat2, lon2 — the bus stop's GPS position
//
// Returns: distance in kilometers (rounded to 2 decimal places)
const haversineDistanceKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in kilometers
  const toRad = (deg) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distanceKm = R * c;

  // Round to 2 decimal places (e.g. 1.43 km)
  return Math.round(distanceKm * 100) / 100;
};

// ─────────────────────────────────────────────
// VALIDATION RULES — GET /api/stops/nearby
// ─────────────────────────────────────────────
// These run before the handler and validate the
// query params: ?lat=9.03&lng=38.74&radius=2
const nearbyValidation = [
  query("lat")
    .notEmpty()
    .withMessage("Latitude (lat) is required.")
    .isFloat({ min: -90, max: 90 })
    .withMessage("Latitude must be a number between -90 and 90."),

  query("lng")
    .notEmpty()
    .withMessage("Longitude (lng) is required.")
    .isFloat({ min: -180, max: 180 })
    .withMessage("Longitude must be a number between -180 and 180."),

  query("radius")
    .optional()
    .isFloat({ min: 0.1, max: 50 })
    .withMessage("Radius must be a number between 0.1 and 50 km."),
];

// ─────────────────────────────────────────────
// GET /api/stops
// ─────────────────────────────────────────────
// Returns all active bus stops.
// Optional query param: ?search=merkato
// Searches by English name, Amharic name, or description.
const getAllStops = async (req, res, next) => {
  try {
    const { search } = req.query;

    // Build the where clause — always show only active stops
    const where = {
      isActive: true,
      ...(search && {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { nameAm: { contains: search, mode: "insensitive" } },
          { description: { contains: search, mode: "insensitive" } },
        ],
      }),
    };

    const stops = await prisma.stop.findMany({
      where,
      include: {
        // Include which routes pass through each stop
        routeStops: {
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
        },
      },
      orderBy: { name: "asc" },
    });

    const formatted = stops.map((stop) => ({
      id: stop.id,
      name: stop.name,
      nameAm: stop.nameAm,
      latitude: stop.latitude,
      longitude: stop.longitude,
      description: stop.description,
      // Show which routes pass through this stop
      routes: stop.routeStops.map((rs) => rs.route),
    }));

    return res.status(200).json({
      success: true,
      message: `${formatted.length} stop(s) found.`,
      data: {
        count: formatted.length,
        stops: formatted,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────
// GET /api/stops/nearby
// ─────────────────────────────────────────────
// Finds all bus stops within a given radius of
// the user's current GPS location.
//
// Required query params: ?lat=9.03&lng=38.74
// Optional query param:  &radius=2  (default: 2 km)
//
// Results are sorted by distance — nearest stop first.
// Each stop also shows which routes pass through it.
const getNearbyStops = async (req, res, next) => {
  try {
    const userLat = parseFloat(req.query.lat);
    const userLng = parseFloat(req.query.lng);
    const radius = parseFloat(req.query.radius) || 2; // Default radius: 2 km

    // Fetch all active stops with their route info
    const allStops = await prisma.stop.findMany({
      where: { isActive: true },
      include: {
        routeStops: {
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
        },
      },
    });

    // Calculate distance from user to each stop using Haversine formula,
    // filter to only those within the radius, then sort nearest first
    const nearbyStops = allStops
      .map((stop) => ({
        id: stop.id,
        name: stop.name,
        nameAm: stop.nameAm,
        latitude: stop.latitude,
        longitude: stop.longitude,
        description: stop.description,
        distanceKm: haversineDistanceKm(
          userLat,
          userLng,
          stop.latitude,
          stop.longitude
        ),
        routes: stop.routeStops.map((rs) => rs.route),
      }))
      .filter((stop) => stop.distanceKm <= radius)
      .sort((a, b) => a.distanceKm - b.distanceKm);

    return res.status(200).json({
      success: true,
      message:
        nearbyStops.length > 0
          ? `${nearbyStops.length} stop(s) found within ${radius} km.`
          : `No stops found within ${radius} km. Try increasing the radius.`,
      data: {
        searchLocation: {
          latitude: userLat,
          longitude: userLng,
        },
        radiusKm: radius,
        count: nearbyStops.length,
        stops: nearbyStops,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────
// GET /api/stops/:id
// ─────────────────────────────────────────────
// Returns a single stop with full details,
// including which routes pass through it and
// the stop's order on each of those routes.
const getStopById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const stop = await prisma.stop.findUnique({
      where: { id },
      include: {
        routeStops: {
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
          orderBy: { stopOrder: "asc" },
        },
      },
    });

    // Return 404 if not found or deactivated
    if (!stop || !stop.isActive) {
      return res.status(404).json({
        success: false,
        message: "Stop not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Stop fetched successfully.",
      data: {
        stop: {
          id: stop.id,
          name: stop.name,
          nameAm: stop.nameAm,
          latitude: stop.latitude,
          longitude: stop.longitude,
          description: stop.description,
          isActive: stop.isActive,
          createdAt: stop.createdAt,
          // All routes that pass through this stop
          routes: stop.routeStops.map((rs) => ({
            id: rs.route.id,
            routeNumber: rs.route.routeNumber,
            name: rs.route.name,
            color: rs.route.color,
            description: rs.route.description,
            stopOrder: rs.stopOrder,
            distanceFromStartKm: rs.distanceFromStart ?? 0,
          })),
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
  nearbyValidation,
  getAllStops,
  getNearbyStops,
  getStopById,
};
