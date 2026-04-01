// ============================================
// Stops — Express Router
// ============================================
// Base path: /api/stops
//
//   GET /api/stops              — list all active bus stops
//   GET /api/stops/nearby       — find stops near a GPS location
//   GET /api/stops/:id          — get one stop + which routes pass through it
//
// ⚠️  ORDER MATTERS:
//   /nearby MUST be defined before /:id
//   If /:id came first, Express would match the word "nearby"
//   as an ID value and getNearbyStops would never be called.
//
// All endpoints are PUBLIC — no authentication required.

const express = require("express");
const router = express.Router();

const {
  nearbyValidation,
  getAllStops,
  getNearbyStops,
  getStopById,
} = require("../controllers/stopController");

const validate = require("../middleware/validate");

// ── GET /api/stops ────────────────────────────────────────
// List all active stops. Optional: ?search=merkato
router.get("/", getAllStops);

// ── GET /api/stops/nearby ─────────────────────────────────
// Find stops near a GPS location.
// Required: ?lat=9.03&lng=38.74
// Optional: &radius=2  (default 2 km)
// ⚠️  Must be ABOVE /:id — see note at the top of this file
router.get("/nearby", nearbyValidation, validate, getNearbyStops);

// ── GET /api/stops/:id ────────────────────────────────────
// Get a single stop with all routes that pass through it
router.get("/:id", getStopById);

module.exports = router;
