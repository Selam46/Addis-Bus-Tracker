// ============================================
// Auth Routes
// ============================================
// Base path: /api/auth
//
//   POST /api/auth/register  — create a new passenger account
//   POST /api/auth/login     — login and receive a JWT token
//   GET  /api/auth/me        — get the currently logged-in user (protected)

const express = require("express");
const router = express.Router();

const {
  registerValidation,
  loginValidation,
  register,
  login,
  getMe,
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

module.exports = router;
