// ============================================
// Feedback Controller
// ============================================
// Handles all passenger feedback / complaint endpoints:
//
//   GET  /api/feedback/categories  — list valid complaint categories (public)
//   POST /api/feedback             — submit a complaint (protected)
//   GET  /api/feedback/my          — my submission history (protected)
//   GET  /api/feedback/:id         — single submission detail (protected, own only)
//
// All write endpoints require a valid JWT (passenger must be logged in).
// Passengers can only read their own feedback — not other users'.

const { body } = require("express-validator");
const prisma = require("../lib/prisma");

// ─────────────────────────────────────────────
// CONSTANTS — must exactly match schema enums
// ─────────────────────────────────────────────

// These values match the FeedbackCategory enum in schema.prisma
const VALID_CATEGORIES = [
  "OVERCROWDING",
  "LATE_ARRIVAL",
  "RUDE_DRIVER",
  "VEHICLE_CONDITION",
  "WRONG_ROUTE",
  "OTHER",
];

// Human-readable labels — shown in the mobile app UI
const CATEGORY_LABELS = {
  OVERCROWDING:      "Overcrowding",
  LATE_ARRIVAL:      "Late Arrival",
  RUDE_DRIVER:       "Rude Driver",
  VEHICLE_CONDITION: "Vehicle Condition",
  WRONG_ROUTE:       "Wrong Route",
  OTHER:             "Other",
};

// Emoji icons — used in the mobile app category picker
const CATEGORY_ICONS = {
  OVERCROWDING:      "👥",
  LATE_ARRIVAL:      "⏰",
  RUDE_DRIVER:       "😠",
  VEHICLE_CONDITION: "🔧",
  WRONG_ROUTE:       "🗺️",
  OTHER:             "📝",
};

// These values match the FeedbackStatus enum in schema.prisma
const STATUS_LABELS = {
  PENDING:  "Pending Review",
  REVIEWED: "Under Review",
  RESOLVED: "Resolved",
};

const STATUS_COLORS = {
  PENDING:  "#F59E0B", // amber
  REVIEWED: "#3B82F6", // blue
  RESOLVED: "#10B981", // green
};

// ─────────────────────────────────────────────
// HELPER: format a feedback record for response
// ─────────────────────────────────────────────
const formatFeedback = (f) => ({
  id: f.id,
  category: f.category,
  categoryLabel: CATEGORY_LABELS[f.category],
  categoryIcon:  CATEGORY_ICONS[f.category],
  message: f.message,
  status: f.status,
  statusLabel: STATUS_LABELS[f.status],
  statusColor: STATUS_COLORS[f.status],
  route: f.route ?? null,
  createdAt: f.createdAt,
  updatedAt: f.updatedAt,
});

// ─────────────────────────────────────────────
// VALIDATION RULES — POST /api/feedback
// ─────────────────────────────────────────────
const submitFeedbackValidation = [
  body("category")
    .notEmpty()
    .withMessage("Category is required.")
    .isIn(VALID_CATEGORIES)
    .withMessage(
      `Category must be one of: ${VALID_CATEGORIES.join(", ")}.`
    ),

  body("message")
    .trim()
    .notEmpty()
    .withMessage("Message is required.")
    .isLength({ min: 10 })
    .withMessage("Message must be at least 10 characters long.")
    .isLength({ max: 1000 })
    .withMessage("Message cannot exceed 1000 characters."),

  body("routeId")
    .optional({ checkFalsy: true })
    .isUUID()
    .withMessage("routeId must be a valid UUID."),
];

// ─────────────────────────────────────────────
// GET /api/feedback/categories  (PUBLIC)
// ─────────────────────────────────────────────
// Returns the full list of valid complaint categories
// with their labels and icons.
//
// The mobile app calls this when it opens the feedback
// form — it uses this list to populate the category picker.
// This way, if we ever add new categories, the app updates
// automatically without a new release.
const getCategories = async (req, res, next) => {
  try {
    const categories = VALID_CATEGORIES.map((value) => ({
      value,
      label: CATEGORY_LABELS[value],
      icon:  CATEGORY_ICONS[value],
    }));

    return res.status(200).json({
      success: true,
      message: "Feedback categories fetched successfully.",
      data: {
        count: categories.length,
        categories,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────
// POST /api/feedback  (PROTECTED)
// ─────────────────────────────────────────────
// Submits a new complaint or feedback entry.
//
// Required body fields:
//   category  — must be one of VALID_CATEGORIES
//   message   — the complaint text (10–1000 chars)
//
// Optional body field:
//   routeId   — the route the complaint is about
//
// The userId is taken from req.user (set by protect middleware).
// Passengers never need to send their own ID — it's handled
// automatically from their JWT token.
const submitFeedback = async (req, res, next) => {
  try {
    const { category, message, routeId } = req.body;
    const userId = req.user.id;

    // ── If routeId is provided, verify the route exists ──
    if (routeId) {
      const route = await prisma.route.findUnique({
        where: { id: routeId },
        select: { id: true, isActive: true },
      });

      if (!route || !route.isActive) {
        return res.status(404).json({
          success: false,
          message: "The specified route was not found.",
        });
      }
    }

    // ── Create the feedback record ────────────────────────
    const feedback = await prisma.feedback.create({
      data: {
        userId,
        routeId: routeId || null,
        category,
        message: message.trim(),
        // status defaults to PENDING (set in schema)
      },
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
    });

    return res.status(201).json({
      success: true,
      message: "Thank you for your feedback! We will review it shortly. 🙏",
      data: {
        feedback: formatFeedback(feedback),
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────
// GET /api/feedback/my  (PROTECTED)
// ─────────────────────────────────────────────
// Returns all feedback submissions made by the
// currently logged-in passenger, newest first.
//
// The mobile app shows this on the "My Complaints" tab
// so the passenger can track the status of their reports.
const getMyFeedback = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const feedbacks = await prisma.feedback.findMany({
      where: { userId },
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
      orderBy: { createdAt: "desc" },
    });

    return res.status(200).json({
      success: true,
      message:
        feedbacks.length > 0
          ? `${feedbacks.length} submission(s) found.`
          : "You have not submitted any feedback yet.",
      data: {
        count: feedbacks.length,
        feedback: feedbacks.map(formatFeedback),
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────
// GET /api/feedback/:id  (PROTECTED)
// ─────────────────────────────────────────────
// Returns a single feedback record by its ID.
//
// Security rule:
//   A passenger can only view their OWN feedback.
//   If they try to fetch someone else's ID → 403 Forbidden.
//   This is important — we never expose one user's
//   complaints to another user.
const getFeedbackById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const feedback = await prisma.feedback.findUnique({
      where: { id },
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
    });

    // ── 404 if not found ─────────────────────────────────
    if (!feedback) {
      return res.status(404).json({
        success: false,
        message: "Feedback not found.",
      });
    }

    // ── 403 if this feedback belongs to a different user ─
    if (feedback.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to view this feedback.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Feedback fetched successfully.",
      data: {
        feedback: formatFeedback(feedback),
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
  submitFeedbackValidation,
  getCategories,
  submitFeedback,
  getMyFeedback,
  getFeedbackById,
};
