// ============================================
// Bus Routes — Express Router
// ============================================
// Base path: /api/routes
//
//   GET /api/routes              — list all active bus routes
//   GET /api/routes/:id          — get one route with full stop details
//   GET /api/routes/:id/stops    — get just the ordered stops for a route
//
// All endpoints are PUBLIC — no authentication required.
// Passengers can browse routes without logging in.

const express = require("express");
const router = express.Router();

const {
  getAllRoutes,
  getRouteById,
  getRouteStops,
} = require("../controllers/routeController");

// ── GET /api/routes ───────────────────────────────────────
// List all active routes. Optional: ?search=merkato
router.get("/", getAllRoutes);

// ── GET /api/routes/:id ───────────────────────────────────
// Get a single route with all its stops in order
router.get("/:id", getRouteById);

// ── GET /api/routes/:id/stops ─────────────────────────────
// Get just the ordered stops for a specific route
router.get("/:id/stops", getRouteStops);

module.exports = router;
