// ============================================
// Auth Routes
// ============================================
// Base path: /api/auth
//
//   POST /api/auth/register      — create a new passenger account
//   POST /api/auth/login         — login and receive a JWT token
//   GET  /api/auth/me            — get the currently logged-in user (protected)
//   PUT  /api/auth/push-token    — save Expo push token to user record (protected)
//   PUT  /api/auth/profile       — update name and/or phone number (protected)

const express = require("express");
const router = express.Router();

const {
  registerValidation,
  loginValidation,
  pushTokenValidation,
  updateProfileValidation,
  register,
  login,
  getMe,
  updatePushToken,
  updateProfile,
} = require("../controllers/authController");

const validate = require("../middleware/validate");
const { protect } = require("../middleware/auth");

// ── POST /api/auth/register ───────────────────────────────
// 1. registerValidation  — checks name, email, phone, password
// 2. validate            — returns 400 if any check failed
// 3. register            — creates the user and returns a token
router.post("/register", registerValidation, validate, register);

// ── POST /api/auth/login ──────────────────────────────────
// 1. loginValidation     — checks email and password are present
// 2. validate            — returns 400 if any check failed
// 3. login               — verifies credentials and returns a token
router.post("/login", loginValidation, validate, login);

// ── GET /api/auth/me ──────────────────────────────────────
// 1. protect             — verifies JWT, loads user into req.user
// 2. getMe               — returns the logged-in user's profile
router.get("/me", protect, getMe);

// ── PUT /api/auth/push-token ──────────────────────────────
// 1. protect             — verifies JWT
// 2. pushTokenValidation — ensures pushToken field is present
// 3. validate            — returns 400 if check failed
// 4. updatePushToken     — saves the token to the user's record
router.put(
  "/push-token",
  protect,
  pushTokenValidation,
  validate,
  updatePushToken,
);

// ── PUT /api/auth/profile ─────────────────────────────────
// 1. protect               — verifies JWT
// 2. updateProfileValidation — validates name/phone format if provided
// 3. validate              — returns 400 if any check failed
// 4. updateProfile         — applies the updates and returns the new profile
router.put(
  "/profile",
  protect,
  updateProfileValidation,
  validate,
  updateProfile,
);

module.exports = router;
