// ============================================
// Route Controller
// ============================================
// Handles all bus route data endpoints:
//   GET /api/routes          — list all active routes
//   GET /api/routes/:id      — get one route with full stop details
//   GET /api/routes/:id/stops — get just the ordered stops for a route

const prisma = require("../lib/prisma");

// ─────────────────────────────────────────────
// GET /api/routes
// ─────────────────────────────────────────────
// Returns all active bus routes.
// Optional query param: ?search=merkato
// Searches by route number, name, or description.
const getAllRoutes = async (req, res, next) => {
  try {
    const { search } = req.query;

    // Build the where clause — always filter for active routes only
    const where = {
      isActive: true,
      ...(search && {
        OR: [
          { routeNumber: { contains: search, mode: "insensitive" } },
          { name: { contains: search, mode: "insensitive" } },
          { description: { contains: search, mode: "insensitive" } },
        ],
      }),
    };

    const routes = await prisma.route.findMany({
      where,
      include: {
        // Count how many stops are on this route
        _count: {
          select: { routeStops: true },
        },
        // Get the first and last stop so the mobile app can show
        // the start → end summary without a second request
        routeStops: {
          orderBy: { stopOrder: "asc" },
          select: {
            stopOrder: true,
            stop: {
              select: { name: true, nameAm: true },
            },
          },
        },
      },
      orderBy: { routeNumber: "asc" },
    });

    // Shape the response cleanly
    const formatted = routes.map((route) => {
      const sortedStops = route.routeStops;
      const firstStop = sortedStops[0]?.stop ?? null;
      const lastStop = sortedStops[sortedStops.length - 1]?.stop ?? null;

      return {
        id: route.id,
        routeNumber: route.routeNumber,
        name: route.name,
        description: route.description,
        color: route.color,
        totalStops: route._count.routeStops,
        firstStop: firstStop
          ? { name: firstStop.name, nameAm: firstStop.nameAm }
          : null,
        lastStop: lastStop
          ? { name: lastStop.name, nameAm: lastStop.nameAm }
          : null,
        isActive: route.isActive,
      };
    });

    return res.status(200).json({
      success: true,
      message: `${formatted.length} route(s) found.`,
      data: {
        count: formatted.length,
        routes: formatted,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────
// GET /api/routes/:id
// ─────────────────────────────────────────────
// Returns a single route with ALL of its stops
// in order (stop 1 → stop 2 → stop 3...).
// This is used on the "Route Detail" screen in the app.
const getRouteById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const route = await prisma.route.findUnique({
      where: { id },
      include: {
        routeStops: {
          orderBy: { stopOrder: "asc" },
          include: {
            stop: {
              select: {
                id: true,
                name: true,
                nameAm: true,
                latitude: true,
                longitude: true,
                description: true,
                isActive: true,
              },
            },
          },
        },
        // Include total bus and schedule counts for this route
        _count: {
          select: {
            buses: true,
            schedules: true,
          },
        },
      },
    });

    // Return 404 if not found or deactivated
    if (!route || !route.isActive) {
      return res.status(404).json({
        success: false,
        message: "Route not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Route fetched successfully.",
      data: {
        route: {
          id: route.id,
          routeNumber: route.routeNumber,
          name: route.name,
          description: route.description,
          color: route.color,
          isActive: route.isActive,
          totalBuses: route._count.buses,
          totalSchedules: route._count.schedules,
          stops: route.routeStops.map((rs) => ({
            order: rs.stopOrder,
            distanceFromStartKm: rs.distanceFromStart ?? 0,
            stop: rs.stop,
          })),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────
// GET /api/routes/:id/stops
// ─────────────────────────────────────────────
// Returns ONLY the ordered list of stops for a route.
// Lighter than getRouteById — useful when the mobile app
// already has the route info and just needs the stop list.
const getRouteStops = async (req, res, next) => {
  try {
    const { id } = req.params;

    // First verify the route exists and is active
    const route = await prisma.route.findUnique({
      where: { id },
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

    // Fetch all stops for this route in order
    const routeStops = await prisma.routeStop.findMany({
      where: { routeId: id },
      orderBy: { stopOrder: "asc" },
      include: {
        stop: {
          select: {
            id: true,
            name: true,
            nameAm: true,
            latitude: true,
            longitude: true,
            description: true,
            isActive: true,
          },
        },
      },
    });

    return res.status(200).json({
      success: true,
      message: `${routeStops.length} stop(s) found for route ${route.routeNumber}.`,
      data: {
        route: {
          id: route.id,
          routeNumber: route.routeNumber,
          name: route.name,
          color: route.color,
        },
        count: routeStops.length,
        stops: routeStops.map((rs) => ({
          order: rs.stopOrder,
          distanceFromStartKm: rs.distanceFromStart ?? 0,
          id: rs.stop.id,
          name: rs.stop.name,
          nameAm: rs.stop.nameAm,
          latitude: rs.stop.latitude,
          longitude: rs.stop.longitude,
          description: rs.stop.description,
          isActive: rs.stop.isActive,
        })),
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
  getAllRoutes,
  getRouteById,
  getRouteStops,
};
