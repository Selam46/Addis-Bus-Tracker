// ============================================
// Real Addis Ababa Bus Data Seed
// ============================================
// Reads prisma/data/addis-routes.json and populates
// the database with real GPS-accurate Addis Ababa
// bus routes, stops, schedules, and buses.
//
// Data source: OpenStreetMap / OpenTripPlanner
// Coverage:    Addis Ababa, Ethiopia
//
// Run with:  npm run seed:real

require("dotenv").config();

const { PrismaClient } = require("@prisma/client");
const { Pool } = require("pg");
const { PrismaPg } = require("@prisma/adapter-pg");
const fs = require("fs");
const path = require("path");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

// ─────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────

// How many routes to import (keep small for dev)
const MAX_ROUTES = 10;

// Route colors for map display
const ROUTE_COLORS = [
  "#E53935", // Red       — Route 0
  "#1E88E5", // Blue      — Route 1
  "#43A047", // Green     — Route 2
  "#FB8C00", // Orange    — Route 3
  "#8E24AA", // Purple    — Route 4
  "#00ACC1", // Cyan      — Route 5
  "#FFB300", // Amber     — Route 6
  "#F4511E", // Deep Orange — Route 7
  "#6D4C41", // Brown     — Route 8
  "#039BE5", // Light Blue — Route 9
];

// Departure times seeded for each route
const MORNING_PEAK   = ["06:00", "06:30", "07:00", "07:30", "08:00", "08:30"];
const MIDDAY         = ["12:00", "12:30", "13:00"];
const EVENING_PEAK   = ["17:00", "17:30", "18:00", "18:30"];
const ALL_TIMES      = [...MORNING_PEAK, ...MIDDAY, ...EVENING_PEAK];

const WEEKDAYS = ["MON", "TUE", "WED", "THU", "FRI"];
const ALL_DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

/**
 * Generate a stop deduplication key.
 * Rounds lat/lon to 4 decimal places (~11m precision).
 * Nearby stops at the same corner are merged into one.
 */
const stopKey = (lat, lon) =>
  `${Math.round(lat * 10000) / 10000}_${Math.round(lon * 10000) / 10000}`;

/**
 * Clean a route short name into a usable route number.
 * "Tx LID 009" → "LID-009"
 * "TX002"      → "TX002"
 */
const cleanRouteNumber = (shortName) =>
  shortName.replace(/^Tx\s+/i, "").replace(/\s+/g, "-").toUpperCase();

// ─────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────
async function main() {
  console.log("╔══════════════════════════════════════════════╗");
  console.log("║   Addis Ababa Bus Tracker — Real Data Seed  ║");
  console.log("╚══════════════════════════════════════════════╝\n");

  // ── Load source data ──────────────────────────────────────────
  const dataPath = path.join(__dirname, "data", "addis-routes.json");

  if (!fs.existsSync(dataPath)) {
    throw new Error(`Data file not found at: ${dataPath}`);
  }

  const rawData = fs.readFileSync(dataPath, "utf-8");
  const allRoutes = JSON.parse(rawData);

  console.log(`📂  Source file loaded`);
  console.log(`    Total routes available : ${allRoutes.length}`);
  console.log(`    Routes to import       : ${MAX_ROUTES}\n`);

  // Take the first MAX_ROUTES entries
  const selectedRoutes = allRoutes.slice(0, MAX_ROUTES);

  // ── Step 1: Clear all existing data ──────────────────────────
  console.log("🗑️   Clearing existing data...");

  await prisma.busLocation.deleteMany();
  await prisma.trip.deleteMany();
  await prisma.schedule.deleteMany();
  await prisma.bus.deleteMany();
  await prisma.routeStop.deleteMany();
  await prisma.feedback.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.stop.deleteMany();
  await prisma.route.deleteMany();

  console.log("    ✅ All tables cleared\n");

  // ── Step 2: Collect and deduplicate stops ─────────────────────
  console.log("📍  Processing stops...");

  // Map: stopKey → { name, lat, lon }
  const uniqueStops = new Map();

  for (const routeData of selectedRoutes) {
    for (const stop of routeData.stops) {
      const key = stopKey(stop.lat, stop.lon);
      if (!uniqueStops.has(key)) {
        uniqueStops.set(key, {
          name: stop.name || "Unknown Stop",
          latitude: stop.lat,
          longitude: stop.lon,
        });
      }
    }
  }

  console.log(`    Unique stop locations found: ${uniqueStops.size}`);

  // Insert all unique stops into DB
  // Map: stopKey → DB Stop record (with real UUID)
  const dbStops = new Map();

  for (const [key, stopData] of uniqueStops.entries()) {
    const created = await prisma.stop.create({
      data: {
        name:      stopData.name,
        latitude:  stopData.latitude,
        longitude: stopData.longitude,
        isActive:  true,
      },
    });
    dbStops.set(key, created);
  }

  console.log(`    ✅ ${dbStops.size} stops created in database\n`);

  // ── Step 3: Create routes, route_stops, schedules, buses ──────
  console.log("🚌  Creating routes...\n");

  let totalStopLinks = 0;
  let totalSchedules = 0;

  for (let i = 0; i < selectedRoutes.length; i++) {
    const routeData   = selectedRoutes[i];
    const color       = ROUTE_COLORS[i % ROUTE_COLORS.length];
    const routeNumber = cleanRouteNumber(routeData.shortName);
    const times       = i % 3 === 0 ? ALL_TIMES : [...MORNING_PEAK, ...EVENING_PEAK];
    const days        = i % 2 === 0 ? WEEKDAYS : ALL_DAYS;

    // 3a. Create the Route ──────────────────────────────────────
    const route = await prisma.route.create({
      data: {
        routeNumber,
        name:        routeData.longName,
        description: `Runs from ${routeData.from} to ${routeData.to}`,
        color,
        isActive: true,
      },
    });

    // 3b. Create RouteStops (link route → stops in order) ───────
    let distanceFromStartKm = 0;
    const seenStopIds = new Set(); // Prevent duplicate [routeId, stopId]
    let order = 1;                 // Re-index to avoid gaps from skipped dupes

    for (const stop of routeData.stops) {
      const key      = stopKey(stop.lat, stop.lon);
      const dbStop   = dbStops.get(key);

      if (!dbStop) continue;

      // Skip if this exact stop is already linked to this route
      if (seenStopIds.has(dbStop.id)) continue;
      seenStopIds.add(dbStop.id);

      // Accumulate distance: source data is in meters → convert to km
      if (stop.distance_from_previous) {
        distanceFromStartKm += stop.distance_from_previous / 1000;
      }

      await prisma.routeStop.create({
        data: {
          routeId:           route.id,
          stopId:            dbStop.id,
          stopOrder:         order,
          distanceFromStart: Math.round(distanceFromStartKm * 100) / 100,
        },
      });

      order++;
      totalStopLinks++;
    }

    // 3c. Create Schedules ─────────────────────────────────────
    for (const time of times) {
      await prisma.schedule.create({
        data: {
          routeId:       route.id,
          departureTime: time,
          daysOfWeek:    days,
          isActive:      true,
        },
      });
      totalSchedules++;
    }

    // 3d. Create 1–2 sample Buses for this route ───────────────
    const busCount = i % 3 === 0 ? 2 : 1; // Every 3rd route gets 2 buses
    for (let b = 0; b < busCount; b++) {
      const busIndex = i * 2 + b + 1;
      await prisma.bus.create({
        data: {
          busNumber:    `AA-${String(busIndex).padStart(3, "0")}`,
          licensePlate: `3-${String(20000 + busIndex).padStart(5, "0")} AA`,
          capacity:     i % 2 === 0 ? 80 : 60,
          routeId:      route.id,
          isActive:     true,
        },
      });
    }

    // Log progress
    console.log(
      `    [${String(i + 1).padStart(2, "0")}] ${routeNumber.padEnd(15)} ` +
      `"${routeData.longName.slice(0, 40)}"` +
      `\n         ${(order - 1)} stops | ${times.length} departures | ${days.length === 5 ? "Weekdays" : "All days"}`
    );
  }

  // ── Final Summary ─────────────────────────────────────────────
  console.log("\n╔══════════════════════════════════════════════╗");
  console.log("║              🎉 Seed Complete!               ║");
  console.log("╠══════════════════════════════════════════════╣");
  console.log(`║  Routes created      : ${String(selectedRoutes.length).padStart(4)}                  ║`);
  console.log(`║  Unique stops        : ${String(dbStops.size).padStart(4)}                  ║`);
  console.log(`║  Route-stop links    : ${String(totalStopLinks).padStart(4)}                  ║`);
  console.log(`║  Schedules created   : ${String(totalSchedules).padStart(4)}                  ║`);
  console.log("╚══════════════════════════════════════════════╝\n");
}

main()
  .catch((e) => {
    console.error("\n❌ Seed failed:", e.message);
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
