// ============================================
// Notification Controller
// ============================================
// Handles all in-app notification endpoints:
//
//   GET /api/notifications             — list my notifications (unread first)
//   PUT /api/notifications/:id/read    — mark one notification as read
//   PUT /api/notifications/read-all   — mark ALL my notifications as read
//
// All endpoints are PROTECTED — a valid JWT is required.
// A passenger can only see and manage their OWN notifications.
// The notifications themselves are created by the server
// (e.g. when a bus is approaching a stop).

const prisma = require("../lib/prisma");

// ─────────────────────────────────────────────
// HELPER: Format a notification for the response
// ─────────────────────────────────────────────
// Adds a human-readable label and icon for each
// notification type so the mobile app can render
// them without hardcoding logic client-side.
const TYPE_LABELS = {
  BUS_APPROACHING:  "Bus Approaching",
  SCHEDULE_CHANGE:  "Schedule Change",
  SYSTEM:           "System Message",
};

const TYPE_ICONS = {
  BUS_APPROACHING:  "🚌",
  SCHEDULE_CHANGE:  "📅",
  SYSTEM:           "🔔",
};

const formatNotification = (n) => ({
  id:        n.id,
  title:     n.title,
  body:      n.body,
  type:      n.type,
  typeLabel: TYPE_LABELS[n.type] ?? n.type,
  typeIcon:  TYPE_ICONS[n.type]  ?? "🔔",
  isRead:    n.isRead,
  createdAt: n.createdAt,
});

// ─────────────────────────────────────────────
// GET /api/notifications  (PROTECTED)
// ─────────────────────────────────────────────
// Returns all notifications for the logged-in user.
//
// Sort order:
//   1. Unread notifications come first
//   2. Within each group, newest first
//
// This is used by the Notifications screen in the
// mobile app to show the user what's waiting for them.
const getMyNotifications = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: [
        { isRead: "asc" },       // false (unread) sorts before true (read)
        { createdAt: "desc" },   // newest first within each group
      ],
    });

    // Count how many are still unread — useful for the badge on the app icon
    const unreadCount = notifications.filter((n) => !n.isRead).length;

    return res.status(200).json({
      success: true,
      message:
        notifications.length > 0
          ? `${notifications.length} notification(s) found. ${unreadCount} unread.`
          : "You have no notifications yet.",
      data: {
        count:       notifications.length,
        unreadCount,
        notifications: notifications.map(formatNotification),
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────
// PUT /api/notifications/:id/read  (PROTECTED)
// ─────────────────────────────────────────────
// Marks a single notification as read.
//
// Security rule:
//   A passenger can only mark their OWN notifications as read.
//   Trying to mark another user's notification → 403 Forbidden.
const markOneAsRead = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // ── Find the notification first ───────────────────────
    const notification = await prisma.notification.findUnique({
      where: { id },
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found.",
      });
    }

    // ── Only the owner can mark it as read ────────────────
    if (notification.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to update this notification.",
      });
    }

    // ── Already read — no DB write needed ─────────────────
    if (notification.isRead) {
      return res.status(200).json({
        success: true,
        message: "Notification was already marked as read.",
        data: {
          notification: formatNotification(notification),
        },
      });
    }

    // ── Mark as read ──────────────────────────────────────
    const updated = await prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });

    return res.status(200).json({
      success: true,
      message: "Notification marked as read. ✅",
      data: {
        notification: formatNotification(updated),
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────
// PUT /api/notifications/read-all  (PROTECTED)
// ─────────────────────────────────────────────
// Marks ALL of the logged-in user's unread notifications
// as read in a single operation.
//
// This is called when the user taps "Mark all as read"
// on the Notifications screen in the mobile app.
// Only unread ones are updated — already-read ones are
// left untouched to avoid unnecessary DB writes.
const markAllAsRead = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // ── Bulk-update only unread notifications ─────────────
    const result = await prisma.notification.updateMany({
      where: {
        userId,
        isRead: false,   // Skip already-read ones
      },
      data: { isRead: true },
    });

    // result.count = number of rows actually updated
    const updatedCount = result.count;

    return res.status(200).json({
      success: true,
      message:
        updatedCount > 0
          ? `${updatedCount} notification(s) marked as read. ✅`
          : "All notifications were already read. Nothing to update.",
      data: {
        updatedCount,
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
  getMyNotifications,
  markOneAsRead,
  markAllAsRead,
};
