// ============================================
// Validation Middleware
// ============================================
// Reads the results from express-validator checks
// that run before this middleware in the route chain.
// If there are errors, it returns a clean 400 response.
// If everything is valid, it calls next() to continue.

const { validationResult } = require("express-validator");

const validate = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Validation failed. Please check your input.",
      errors: errors.array().map((err) => ({
        field: err.path,
        message: err.msg,
      })),
    });
  }

  next();
};

module.exports = validate;
