// ============================================
// Auth Middleware — JWT Route Protection
// ============================================
// Use this middleware on any route that requires
// the user to be logged in.
//
// Usage in a route file:
//   const { protect } = require('../middleware/auth');
//   router.get('/me', protect, getMe);
//
// What it does:
//   1. Reads the Authorization header
//   2. Extracts the Bearer token
//   3. Verifies the token with JWT_SECRET
//   4. Loads the user from the database
//   5. Attaches the user to req.user
//   6. Calls next() so the real handler runs

const jwt = require("jsonwebtoken");
const prisma = require("../lib/prisma");

const protect = async (req, res, next) => {
  try {
    // ── 1. Check that the Authorization header exists ──────
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Access denied. Please log in to continue.",
      });
    }

    // ── 2. Extract the token from "Bearer <token>" ─────────
    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Access denied. Token is missing.",
      });
    }

    // ── 3. Verify the token signature and expiry ───────────
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // ── 4. Load the user from the database ─────────────────
    // We select only safe fields — never return passwordHash
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        pushToken: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // ── 5. Make sure the user still exists ─────────────────
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "The account belonging to this token no longer exists.",
      });
    }

    // ── 6. Make sure the account is not deactivated ────────
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: "Your account has been deactivated. Please contact support.",
      });
    }

    // ── 7. Attach user to request and continue ─────────────
    req.user = user;
    next();
  } catch (error) {
    // Handle specific JWT errors with clear messages
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Invalid token. Please log in again.",
      });
    }

    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Your session has expired. Please log in again.",
      });
    }

    // Any other unexpected error goes to the global error handler
    next(error);
  }
};

module.exports = { protect };
