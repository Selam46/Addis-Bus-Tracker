// ============================================
// Schedules — Express Router
// ============================================
// Base path: /api/schedules
//
//   GET /api/schedules                   — list all schedules (filterable)
//   GET /api/schedules/route/:routeId    — today's timetable for one route
//   GET /api/schedules/eta               — ETA at a specific stop
//   GET /api/schedules/:id               — single schedule detail
//
// ⚠️  ROUTE ORDER IS CRITICAL:
//   /route/:routeId and /eta MUST come before /:id
//   If /:id came first, Express would capture "route" and "eta"
//   as ID values and those handlers would never be called.
//
// All endpoints are PUBLIC — no authentication required.
// Passengers can check schedules and ETAs without logging in.

const express = require("express");
const router = express.Router();

const {
  etaValidation,
  getAllSchedules,
  getSchedulesByRoute,
  getETA,
  getScheduleById,
} = require("../controllers/scheduleController");

const validate = require("../middleware/validate");

// ── GET /api/schedules ────────────────────────────────────
// List all schedules.
// Optional filters: ?routeId=xxx  ?day=MON
router.get("/", getAllSchedules);

// ── GET /api/schedules/route/:routeId ─────────────────────
// Today's full timetable for a specific route.
// Optional: ?day=MON  (overrides today's day)
// ⚠️  Must be ABOVE /:id — see note at the top of this file
router.get("/route/:routeId", getSchedulesByRoute);

// ── GET /api/schedules/eta ────────────────────────────────
// ETA calculator — next bus arrivals at a specific stop.
// Required: ?routeId=xxx  &stopId=xxx
// Optional: &limit=5
// ⚠️  Must be ABOVE /:id — see note at the top of this file
router.get("/eta", etaValidation, validate, getETA);

// ── GET /api/schedules/:id ────────────────────────────────
// Get a single schedule by its ID.
// ⚠️  Must be BELOW the static routes above
router.get("/:id", getScheduleById);

module.exports = router;
