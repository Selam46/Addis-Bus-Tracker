// ============================================
// Auth Controller
// ============================================
// Handles all authentication logic:
//   POST /api/auth/register  — create a new passenger account
//   POST /api/auth/login     — login and receive a JWT token
//   GET  /api/auth/me        — get the currently logged-in user

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { body } = require("express-validator");
const prisma = require("../lib/prisma");

// ─────────────────────────────────────────────
// HELPER: Generate a signed JWT token
// ─────────────────────────────────────────────
const generateToken = (userId) => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );
};

// ─────────────────────────────────────────────
// HELPER: Format user object safe for response
// Never expose passwordHash to the client
// ─────────────────────────────────────────────
const formatUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  phone: user.phone || null,
  pushToken: user.pushToken || null,
  createdAt: user.createdAt,
});

// ─────────────────────────────────────────────
// VALIDATION RULES — Register
// ─────────────────────────────────────────────
const registerValidation = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Name is required.")
    .isLength({ min: 2, max: 100 })
    .withMessage("Name must be between 2 and 100 characters."),

  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required.")
    .isEmail()
    .withMessage("Please provide a valid email address.")
    .normalizeEmail(),

  body("phone")
    .optional({ checkFalsy: true })
    .trim()
    .matches(/^\+?[0-9]{9,15}$/)
    .withMessage(
      "Phone number must be 9–15 digits and may start with +. Example: +251911234567"
    ),

  body("password")
    .notEmpty()
    .withMessage("Password is required.")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters long."),
];

// ─────────────────────────────────────────────
// VALIDATION RULES — Login
// ─────────────────────────────────────────────
const loginValidation = [
  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required.")
    .isEmail()
    .withMessage("Please provide a valid email address.")
    .normalizeEmail(),

  body("password")
    .notEmpty()
    .withMessage("Password is required."),
];

// ─────────────────────────────────────────────
// POST /api/auth/register
// ─────────────────────────────────────────────
const register = async (req, res, next) => {
  try {
    const { name, email, phone, password } = req.body;

    // ── Check if email is already taken ───────────────────
    const existingEmail = await prisma.user.findUnique({ where: { email } });
    if (existingEmail) {
      return res.status(409).json({
        success: false,
        message: "An account with this email address already exists.",
      });
    }

    // ── Check if phone number is already taken (if provided) ─
    if (phone) {
      const existingPhone = await prisma.user.findUnique({ where: { phone } });
      if (existingPhone) {
        return res.status(409).json({
          success: false,
          message: "An account with this phone number already exists.",
        });
      }
    }

    // ── Hash the password (salt rounds = 12) ──────────────
    const passwordHash = await bcrypt.hash(password, 12);

    // ── Create the user in the database ───────────────────
    const user = await prisma.user.create({
      data: {
        name,
        email,
        phone: phone || null,
        passwordHash,
      },
    });

    // ── Generate JWT token ─────────────────────────────────
    const token = generateToken(user.id);

    // ── Respond with token + user data ────────────────────
    return res.status(201).json({
      success: true,
      message: "Account created successfully. Welcome aboard! 🚌",
      data: {
        token,
        user: formatUser(user),
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────
// POST /api/auth/login
// ─────────────────────────────────────────────
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // ── Find user by email (include hash for comparison) ──
    const user = await prisma.user.findUnique({ where: { email } });

    // Use the same generic error for both "not found" and "wrong password"
    // This prevents user enumeration attacks
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    // ── Check if account is active ────────────────────────
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: "This account has been deactivated. Please contact support.",
      });
    }

    // ── Compare the provided password with the stored hash ─
    const isPasswordCorrect = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordCorrect) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    // ── Generate JWT token ─────────────────────────────────
    const token = generateToken(user.id);

    // ── Respond with token + user data ────────────────────
    return res.status(200).json({
      success: true,
      message: "Login successful. Welcome back! 🚌",
      data: {
        token,
        user: formatUser(user),
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────
// GET /api/auth/me  (protected)
// ─────────────────────────────────────────────
// The protect middleware runs first and attaches
// req.user — this handler just returns it.
const getMe = async (req, res, next) => {
  try {
    return res.status(200).json({
      success: true,
      message: "User profile fetched successfully.",
      data: {
        user: req.user,
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
  registerValidation,
  loginValidation,
  register,
  login,
  getMe,
};
