// ============================================
// Feedback — Express Router
// ============================================
// Base path: /api/feedback
//
//   GET  /api/feedback/categories  — valid complaint categories (PUBLIC)
//   POST /api/feedback             — submit a complaint (PROTECTED)
//   GET  /api/feedback/my          — my submission history (PROTECTED)
//   GET  /api/feedback/:id         — single submission detail (PROTECTED)
//
// ⚠️  ROUTE ORDER IS CRITICAL:
//   /categories and /my MUST be defined before /:id.
//   If /:id came first, Express would match "categories" and "my"
//   as ID values and those handlers would never be called.

const express = require("express");
const router = express.Router();

const {
  submitFeedbackValidation,
  getCategories,
  submitFeedback,
  getMyFeedback,
  getFeedbackById,
} = require("../controllers/feedbackController");

const validate = require("../middleware/validate");
const { protect } = require("../middleware/auth");

// ── GET /api/feedback/categories ──────────────────────────
// Public — no login required.
// Returns valid categories for the mobile app's complaint form.
// ⚠️ Must be ABOVE /:id
router.get("/categories", getCategories);

// ── GET /api/feedback/my ──────────────────────────────────
// Protected — must be logged in.
// Returns the current passenger's full feedback history.
// ⚠️ Must be ABOVE /:id
router.get("/my", protect, getMyFeedback);

// ── POST /api/feedback ────────────────────────────────────
// Protected — must be logged in.
// Body: { category, message, routeId? }
router.post("/", protect, submitFeedbackValidation, validate, submitFeedback);

// ── GET /api/feedback/:id ─────────────────────────────────
// Protected — must be logged in.
// Only returns the feedback if it belongs to the logged-in user.
// ⚠️ Must be BELOW the static routes above
router.get("/:id", protect, getFeedbackById);

module.exports = router;
