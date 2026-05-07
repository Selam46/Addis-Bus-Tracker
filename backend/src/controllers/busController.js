// ============================================
// Bus Controller
// ============================================
// Handles all bus data endpoints:
//
//   GET  /api/buses                  — list all active buses + latest location
//   GET  /api/buses/route/:routeId   — buses on a specific route + latest location
//   GET  /api/buses/:id              — one bus + last 10 GPS positions (trail)
//   POST /api/buses/:id/location     — update bus GPS + broadcast via Socket.io
//
// The POST /location endpoint is the bridge between REST and real-time:
//   1. Saves new GPS coordinate to the database
//   2. Emits "bus:locationUpdate" to all clients watching that route/bus
//
// In production, this endpoint would be called by the bus driver's device.
// For testing, we simulate it manually from Postman.

const { body } = require("express-validator");
const prisma = require("../lib/prisma");

// ─────────────────────────────────────────────
// VALIDATION — POST /api/buses/:id/location
// ─────────────────────────────────────────────
const locationUpdateValidation = [
  body("latitude")
    .notEmpty()
    .withMessage("Latitude is required.")
    .isFloat({ min: -90, max: 90 })
    .withMessage("Latitude must be a number between -90 and 90."),

  body("longitude")
    .notEmpty()
    .withMessage("Longitude is required.")
    .isFloat({ min: -180, max: 180 })
    .withMessage("Longitude must be a number between -180 and 180."),

  body("speed")
    .optional()
    .isFloat({ min: 0, max: 200 })
    .withMessage("Speed must be between 0 and 200 km/h."),

  body("heading")
    .optional()
    .isFloat({ min: 0, max: 360 })
    .withMessage("Heading (direction) must be between 0 and 360 degrees."),
];

// ─────────────────────────────────────────────
// GET /api/buses
// ─────────────────────────────────────────────
// Returns all active buses with:
//   - Their assigned route info
//   - Their LATEST GPS location (most recent entry in bus_locations)
//
// If a bus has no location yet, currentLocation will be null.
// This happens for new buses that haven't started moving.
const getAllBuses = async (req, res, next) => {
  try {
    const buses = await prisma.bus.findMany({
      where: { isActive: true },
      include: {
        route: {
          select: {
            id: true,
            routeNumber: true,
            name: true,
            color: true,
          },
        },
        // Fetch only the most recent location for each bus
        locations: {
          orderBy: { timestamp: "desc" },
          take: 1,
        },
      },
      orderBy: { busNumber: "asc" },
    });

    const formatted = buses.map((bus) => ({
      id: bus.id,
      busNumber: bus.busNumber,
      licensePlate: bus.licensePlate,
      capacity: bus.capacity,
      isActive: bus.isActive,
      route: bus.route ?? null,
      // If no location entry exists yet, this will be null
      currentLocation: bus.locations[0] ?? null,
    }));

    return res.status(200).json({
      success: true,
      message: `${formatted.length} bus(es) found.`,
      data: {
        count: formatted.length,
        buses: formatted,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────
// GET /api/buses/route/:routeId
// ─────────────────────────────────────────────
// Returns all buses currently assigned to a specific route,
// each with their latest GPS location.
//
// This is what the mobile app map screen uses to show
// all the buses on the route the passenger is viewing.
const getBusesByRoute = async (req, res, next) => {
  try {
    const { routeId } = req.params;

    // Verify route exists
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

    const buses = await prisma.bus.findMany({
      where: { routeId, isActive: true },
      include: {
        locations: {
          orderBy: { timestamp: "desc" },
          take: 1,
        },
      },
      orderBy: { busNumber: "asc" },
    });

    const formatted = buses.map((bus) => ({
      id: bus.id,
      busNumber: bus.busNumber,
      licensePlate: bus.licensePlate,
      capacity: bus.capacity,
      currentLocation: bus.locations[0] ?? null,
    }));

    return res.status(200).json({
      success: true,
      message: `${formatted.length} bus(es) found on Route ${route.routeNumber}.`,
      data: {
        route,
        count: formatted.length,
        buses: formatted,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────
// GET /api/buses/:id
// ─────────────────────────────────────────────
// Returns a single bus with:
//   - Route info
//   - Current location (most recent)
//   - Location history (last 10 positions = movement trail)
//
// The location trail is what the mobile app uses to draw
// the dotted "path" behind the bus icon on the map.
const getBusById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const bus = await prisma.bus.findUnique({
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
        // Last 10 positions gives us the movement trail
        locations: {
          orderBy: { timestamp: "desc" },
          take: 10,
        },
      },
    });

    if (!bus || !bus.isActive) {
      return res.status(404).json({
        success: false,
        message: "Bus not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Bus fetched successfully.",
      data: {
        bus: {
          id: bus.id,
          busNumber: bus.busNumber,
          licensePlate: bus.licensePlate,
          capacity: bus.capacity,
          isActive: bus.isActive,
          route: bus.route ?? null,
          currentLocation: bus.locations[0] ?? null,       // Most recent
          locationHistory: bus.locations,                  // Full trail (max 10)
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────
// POST /api/buses/:id/location
// ─────────────────────────────────────────────
// Updates a bus's GPS position.
// After saving to the database, it broadcasts a real-time
// Socket.io event to ALL clients watching this route or bus.
//
// Request body:
//   { latitude, longitude, speed?, heading? }
//
// Socket.io event emitted: "bus:locationUpdate"
// Rooms that receive it:
//   - "route:<routeId>"  — passengers watching this route
//   - "bus:<busId>"      — passengers tracking this specific bus
//
// In production: called by the bus driver's GPS device.
// For testing:   call manually from Postman.
const updateBusLocation = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { latitude, longitude, speed, heading } = req.body;

    // ── Verify bus exists ────────────────────────────────
    const bus = await prisma.bus.findUnique({
      where: { id },
      select: {
        id: true,
        busNumber: true,
        routeId: true,
        isActive: true,
      },
    });

    if (!bus || !bus.isActive) {
      return res.status(404).json({
        success: false,
        message: "Bus not found.",
      });
    }

    // ── Save new location to the database ────────────────
    const location = await prisma.busLocation.create({
      data: {
        busId: id,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        speed: speed !== undefined ? parseFloat(speed) : null,
        heading: heading !== undefined ? parseFloat(heading) : null,
      },
    });

    // ── Build the payload to broadcast ───────────────────
    const locationPayload = {
      busId: bus.id,
      busNumber: bus.busNumber,
      routeId: bus.routeId,
      latitude: location.latitude,
      longitude: location.longitude,
      speed: location.speed,
      heading: location.heading,
      timestamp: location.timestamp,
    };

    // ── Emit Socket.io event to subscribed clients ───────
    // Get the io instance we stored on app in index.js
    const io = req.app.get("io");

    // 1. Broadcast to all clients watching this route
    if (bus.routeId) {
      io.to(`route:${bus.routeId}`).emit("bus:locationUpdate", locationPayload);
    }

    // 2. Broadcast to all clients tracking this specific bus
    io.to(`bus:${bus.id}`).emit("bus:locationUpdate", locationPayload);

    console.log(
      `📍 Bus ${bus.busNumber} location updated → (${location.latitude}, ${location.longitude})`
    );

    return res.status(201).json({
      success: true,
      message: `Location updated for Bus ${bus.busNumber}. Real-time update broadcast. 📡`,
      data: {
        location: locationPayload,
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
  locationUpdateValidation,
  getAllBuses,
  getBusesByRoute,
  getBusById,
  updateBusLocation,
};
