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
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
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
      "Phone number must be 9–15 digits and may start with +. Example: +251911234567",
    ),

  body("password")
    .notEmpty()
    .withMessage("Password is required.")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters long."),
];

// ─────────────────────────────────────────────
// VALIDATION RULES — Update Push Token
// ─────────────────────────────────────────────
const pushTokenValidation = [
  body("pushToken")
    .trim()
    .notEmpty()
    .withMessage("pushToken is required.")
    .isString()
    .withMessage("pushToken must be a string."),
];

// ─────────────────────────────────────────────
// VALIDATION RULES — Update Profile
// ─────────────────────────────────────────────
const updateProfileValidation = [
  body("name")
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("Name must be between 2 and 100 characters."),

  body("phone")
    .optional({ checkFalsy: true })
    .trim()
    .matches(/^\+?[0-9]{9,15}$/)
    .withMessage(
      "Phone number must be 9–15 digits and may start with +. Example: +251911234567",
    ),
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

  body("password").notEmpty().withMessage("Password is required."),
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
// PUT /api/auth/push-token  (protected)
// ─────────────────────────────────────────────
// Saves the device's Expo push token to the user's record.
// Called by the mobile app on startup, right after login.
// Without this, the server cannot send push notifications
// to the user's device when a bus is approaching.
//
// Body: { pushToken: "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]" }
const updatePushToken = async (req, res, next) => {
  try {
    const { pushToken } = req.body;
    const userId = req.user.id;

    // ── Save the token to the database ────────────────────
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { pushToken },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        pushToken: true,
        createdAt: true,
      },
    });

    console.log(`📲 Push token saved for user ${updatedUser.email}`);

    return res.status(200).json({
      success: true,
      message:
        "Push token saved successfully. You will now receive notifications. 🔔",
      data: {
        user: updatedUser,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────
// PUT /api/auth/profile  (protected)
// ─────────────────────────────────────────────
// Lets a passenger update their name and/or phone number.
// At least one of the two fields must be provided.
// The user's email cannot be changed here.
//
// Body: { name?, phone? }
const updateProfile = async (req, res, next) => {
  try {
    const { name, phone } = req.body;
    const userId = req.user.id;

    // ── Require at least one field to update ──────────────
    if (!name && !phone) {
      return res.status(400).json({
        success: false,
        message: "Please provide at least one field to update: name or phone.",
      });
    }

    // ── If phone is being changed, check it isn't taken ───
    // We exclude the current user from the uniqueness check
    // so they can re-submit their own phone without an error.
    if (phone) {
      const existingPhone = await prisma.user.findFirst({
        where: {
          phone,
          NOT: { id: userId },
        },
      });

      if (existingPhone) {
        return res.status(409).json({
          success: false,
          message: "This phone number is already linked to another account.",
        });
      }
    }

    // ── Build the update payload with only provided fields ─
    const updateData = {};
    if (name) updateData.name = name.trim();
    if (phone) updateData.phone = phone.trim();

    // ── Apply the update ──────────────────────────────────
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        pushToken: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully. ✅",
      data: {
        user: updatedUser,
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
  pushTokenValidation,
  updateProfileValidation,
  register,
  login,
  getMe,
  updatePushToken,
  updateProfile,
};
