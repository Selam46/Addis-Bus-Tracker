// ============================================
// Notifications — Express Router
// ============================================
// Base path: /api/notifications
//
//   GET /api/notifications             — list my notifications (unread first)
//   PUT /api/notifications/read-all    — mark ALL as read
//   PUT /api/notifications/:id/read    — mark ONE as read
//
// ⚠️  ROUTE ORDER IS CRITICAL:
//   /read-all MUST be defined before /:id/read.
//   If /:id came first, Express would match "read-all"
//   as an ID value and markAllAsRead would never be called.
//
// All endpoints are PROTECTED — valid JWT required.

const express = require("express");
const router = express.Router();

const {
  getMyNotifications,
  markOneAsRead,
  markAllAsRead,
} = require("../controllers/notificationController");

const { protect } = require("../middleware/auth");

// ── GET /api/notifications ────────────────────────────────
// List all notifications for the logged-in user.
// Unread notifications are returned first.
router.get("/", protect, getMyNotifications);

// ── PUT /api/notifications/read-all ──────────────────────
// Mark ALL unread notifications as read in one shot.
// ⚠️  Must be ABOVE /:id/read — see note at top of file
router.put("/read-all", protect, markAllAsRead);

// ── PUT /api/notifications/:id/read ──────────────────────
// Mark a single notification as read.
// Returns 403 if the notification belongs to a different user.
// ⚠️  Must be BELOW /read-all — see note at top of file
router.put("/:id/read", protect, markOneAsRead);

module.exports = router;
