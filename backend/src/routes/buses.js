// ============================================
// Buses — Express Router
// ============================================
// Base path: /api/buses
//
//   GET  /api/buses                  — all active buses + latest location
//   GET  /api/buses/route/:routeId   — buses on a specific route
//   GET  /api/buses/:id              — one bus + location trail
//   POST /api/buses/:id/location     — update GPS + trigger Socket.io broadcast
//
// ⚠️  ROUTE ORDER IS CRITICAL:
//   /route/:routeId MUST come before /:id
//   If /:id came first, Express would match the word "route"
//   as an ID value and getBusesByRoute would never be called.
//
// All GET endpoints are PUBLIC — no authentication required.
// The POST /location endpoint would be protected in production
// (only bus driver devices should update locations).

const express = require("express");
const router = express.Router();

const {
  locationUpdateValidation,
  getAllBuses,
  getBusesByRoute,
  getBusById,
  updateBusLocation,
} = require("../controllers/busController");

const validate = require("../middleware/validate");

// ── GET /api/buses ────────────────────────────────────────
// List all active buses with their latest GPS location.
router.get("/", getAllBuses);

// ── GET /api/buses/route/:routeId ─────────────────────────
// All buses assigned to a route + their latest locations.
// ⚠️  Must be ABOVE /:id — see note at the top of this file
router.get("/route/:routeId", getBusesByRoute);

// ── GET /api/buses/:id ────────────────────────────────────
// Single bus detail with current location + trail (last 10).
// ⚠️  Must be BELOW the static routes above
router.get("/:id", getBusById);

// ── POST /api/buses/:id/location ──────────────────────────
// Update a bus's GPS position.
// Body: { latitude, longitude, speed?, heading? }
// Triggers real-time broadcast to subscribed Socket.io clients.
router.post("/:id/location", locationUpdateValidation, validate, updateBusLocation);

module.exports = router;
