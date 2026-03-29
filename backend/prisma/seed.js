require("dotenv").config();

const { PrismaClient } = require("@prisma/client");
const { Pool } = require("pg");
const { PrismaPg } = require("@prisma/adapter-pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({
  adapter: new PrismaPg(pool),
});
async function main() {
  console.log("🌱 Seeding database...");

  // ── Routes ──────────────────────────────────────────
  const route45 = await prisma.route.upsert({
    where: { routeNumber: "45" },
    update: {},
    create: {
      routeNumber: "45",
      name: "Merkato to Bole",
      description: "Runs from Merkato through Piassa to Bole Airport road",
      color: "#E53935",
    },
  });

  const route12 = await prisma.route.upsert({
    where: { routeNumber: "12" },
    update: {},
    create: {
      routeNumber: "12",
      name: "Megenagna to Torhailoch",
      description: "Runs from Megenagna through Bole to Torhailoch",
      color: "#1E88E5",
    },
  });

  const route78 = await prisma.route.upsert({
    where: { routeNumber: "78" },
    update: {},
    create: {
      routeNumber: "78",
      name: "Piassa to Ayat",
      description: "Connects Piassa to Ayat residential area",
      color: "#43A047",
    },
  });

  console.log("✅ Routes seeded");

  // ── Stops ──────────────────────────────────────────
  const stops = [
    { name: "Merkato", nameAm: "መርካቶ", latitude: 9.0348, longitude: 38.7469 },
    { name: "Piassa", nameAm: "ፒያሳ", latitude: 9.0365, longitude: 38.7525 },
    { name: "Mexico", nameAm: "ሜክሲኮ", latitude: 9.0221, longitude: 38.7544 },
    { name: "Bole", nameAm: "ቦሌ", latitude: 8.9994, longitude: 38.799 },
    { name: "Megenagna", nameAm: "መገናኛ", latitude: 9.0247, longitude: 38.8012 },
    {
      name: "Torhailoch",
      nameAm: "ቶርሃይሎክ",
      latitude: 8.9823,
      longitude: 38.7612,
    },
    { name: "Ayat", nameAm: "አያት", latitude: 9.0198, longitude: 38.8534 },
    { name: "Stadium", nameAm: "ስታዲየም", latitude: 9.0262, longitude: 38.7626 },
    { name: "Lideta", nameAm: "ልደታ", latitude: 9.0171, longitude: 38.7362 },
    { name: "Gotera", nameAm: "ጎተራ", latitude: 9.0063, longitude: 38.7578 },
  ];

  const createdStops = [];
  for (const stop of stops) {
    const created = await prisma.stop.create({ data: stop });
    createdStops.push(created);
  }

  console.log("✅ Stops seeded");

  // ── Route-Stop Links ────────────────────────────────
  // Route 45: Merkato → Piassa → Mexico → Bole
  const route45Stops = [
    createdStops[0], // Merkato
    createdStops[1], // Piassa
    createdStops[2], // Mexico
    createdStops[3], // Bole
  ];
  for (let i = 0; i < route45Stops.length; i++) {
    await prisma.routeStop.create({
      data: {
        routeId: route45.id,
        stopId: route45Stops[i].id,
        stopOrder: i + 1,
        distanceFromStart: i * 3.2,
      },
    });
  }

  // Route 12: Megenagna → Bole → Mexico → Gotera → Torhailoch
  const route12Stops = [
    createdStops[4], // Megenagna
    createdStops[3], // Bole
    createdStops[2], // Mexico
    createdStops[9], // Gotera
    createdStops[5], // Torhailoch
  ];
  for (let i = 0; i < route12Stops.length; i++) {
    await prisma.routeStop.create({
      data: {
        routeId: route12.id,
        stopId: route12Stops[i].id,
        stopOrder: i + 1,
        distanceFromStart: i * 4.1,
      },
    });
  }

  console.log("✅ Route-stops linked");

  // ── Schedules ──────────────────────────────────────
  const weekdays = ["MON", "TUE", "WED", "THU", "FRI"];
  const allDays = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
  const times = [
    "06:00",
    "06:30",
    "07:00",
    "07:30",
    "08:00",
    "08:30",
    "12:00",
    "12:30",
    "17:00",
    "17:30",
    "18:00",
  ];

  for (const time of times) {
    await prisma.schedule.create({
      data: { routeId: route45.id, departureTime: time, daysOfWeek: weekdays },
    });
    await prisma.schedule.create({
      data: { routeId: route12.id, departureTime: time, daysOfWeek: allDays },
    });
  }

  console.log("✅ Schedules seeded");

  // ── Sample Buses ───────────────────────────────────
  await prisma.bus.createMany({
    data: [
      {
        busNumber: "AA-001",
        licensePlate: "3-22345 AA",
        capacity: 60,
        routeId: route45.id,
      },
      {
        busNumber: "AA-002",
        licensePlate: "3-22346 AA",
        capacity: 60,
        routeId: route45.id,
      },
      {
        busNumber: "AA-003",
        licensePlate: "3-22347 AA",
        capacity: 80,
        routeId: route12.id,
      },
      {
        busNumber: "AA-004",
        licensePlate: "3-22348 AA",
        capacity: 80,
        routeId: route12.id,
      },
      {
        busNumber: "AA-005",
        licensePlate: "3-22349 AA",
        capacity: 60,
        routeId: route78.id,
      },
    ],
    skipDuplicates: true,
  });

  console.log("✅ Buses seeded");
  console.log("🎉 Database seeding complete!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
