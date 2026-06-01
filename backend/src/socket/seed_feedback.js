require('dotenv').config({ path: 'c:/Users/hp/Documents/addis-bus-tracker/backend/.env' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://postgres:Selhope27@localhost:5432/addis_bus_db",
});

async function main() {
  console.log("🔗 Connecting to database...");
  
  // Find the first user in the database
  const userRes = await pool.query('SELECT id, name, email FROM users LIMIT 1;');
  if (userRes.rows.length === 0) {
    console.error("❌ No users found in the database. Please register a user in the mobile app first!");
    process.exit(1);
  }
  
  const user = userRes.rows[0];
  console.log(`👤 Found user: ${user.name} (${user.email}) - ID: ${user.id}`);
  
  console.log("🗑️ Clearing existing feedback for this user...");
  await pool.query('DELETE FROM feedback WHERE "userId" = $1;', [user.id]);
  
  console.log("🌱 Inserting test feedback entries...");
  
  // Find a route to link
  const routeRes = await pool.query('SELECT id, "routeNumber", name FROM routes LIMIT 1;');
  const route = routeRes.rows.length > 0 ? routeRes.rows[0] : null;
  if (route) {
    console.log(`🚍 Linking to route: Route ${route.routeNumber} - ${route.name}`);
  }
  
  const feedbackItems = [
    {
      id: 'test-feedback-1',
      userId: user.id,
      routeId: route ? route.id : null,
      category: 'OVERCROWDING',
      message: 'The bus AA-001 was extremely overcrowded this morning around 8:00 AM. There was no ventilation and many passengers could not get on the bus at Mexico stop.',
      status: 'PENDING',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'test-feedback-2',
      userId: user.id,
      routeId: route ? route.id : null,
      category: 'LATE_ARRIVAL',
      message: 'Bus on Route 45 arrived 25 minutes late at Piassa stop. The ETA in the app showed 5 minutes but it took almost half an hour. Please look into this routing delay.',
      status: 'RESOLVED',
      createdAt: new Date(Date.now() - 3600000 * 24).toISOString(), // 1 day ago
      updatedAt: new Date().toISOString()
    }
  ];
  
  for (const f of feedbackItems) {
    await pool.query(
      `INSERT INTO feedback (id, "userId", "routeId", category, message, status, "createdAt", "updatedAt") 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (id) DO UPDATE SET message = EXCLUDED.message;`,
      [f.id, f.userId, f.routeId, f.category, f.message, f.status, f.createdAt, f.updatedAt]
    );
  }
  
  console.log("✅ Successfully inserted 2 test feedback entries!");
  pool.end();
}

main().catch(err => {
  console.error("❌ Error running script:", err);
  pool.end();
});
