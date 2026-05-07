const express = require("express");
const http = require("http");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
require("dotenv").config();

// --- Route Imports ---
const authRoutes = require("./routes/auth");
const routeRoutes = require("./routes/routes");
const stopRoutes = require("./routes/stops");
const scheduleRoutes = require("./routes/schedules");

// --- App Setup ---
const app = express();
const server = http.createServer(app);

// --- Middleware ---
app.use(helmet());
app.use(cors());
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- Health Check Route ---
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Addis Bus Tracker API is running 🚌",
    version: "1.0.0",
  });
});

// ============================================
// API Routes
// ============================================
app.use("/api/auth", authRoutes);
app.use("/api/routes", routeRoutes);
app.use("/api/stops", stopRoutes);
app.use("/api/schedules", scheduleRoutes);
// app.use("/api/buses",     busRoutes);      — Section 8
// app.use("/api/feedback",  feedbackRoutes); — Section 9

// --- 404 Handler ---
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

// --- Global Error Handler ---
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
});

// --- Start Server ---
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
});
