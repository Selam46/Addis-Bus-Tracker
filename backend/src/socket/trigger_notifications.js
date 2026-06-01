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
  
  console.log("🗑️ Clearing existing notifications for this user...");
  await pool.query('DELETE FROM notifications WHERE "userId" = $1;', [user.id]);
  
  console.log("🌱 Inserting test notifications...");
  
  const notifications = [
    {
      id: 'test-notif-1',
      userId: user.id,
      title: 'Bus Approaching Merkato 🚌',
      body: 'Bus AA-001 operating on Route 45 is 2 minutes away from your stop. Get ready to board!',
      type: 'BUS_APPROACHING',
      isRead: false,
      createdAt: new Date().toISOString()
    },
    {
      id: 'test-notif-2',
      userId: user.id,
      title: 'Saturday Schedule Change 📅',
      body: 'Please note that Route 12 will operate with a 15-minute headway this Saturday due to scheduled fleet maintenance.',
      type: 'SCHEDULE_CHANGE',
      isRead: false,
      createdAt: new Date(Date.now() - 3600000 * 2).toISOString() // 2 hours ago
    },
    {
      id: 'test-notif-3',
      userId: user.id,
      title: 'Delay Warning: Mexico Square ⚠️',
      body: 'Heavy traffic reported near Mexico Square. Expect 10-15 minute delays for all routes crossing this area.',
      type: 'SYSTEM',
      isRead: false,
      createdAt: new Date(Date.now() - 3600000 * 24).toISOString() // 1 day ago
    }
  ];
  
  for (const n of notifications) {
    await pool.query(
      `INSERT INTO notifications (id, "userId", title, body, type, "isRead", "createdAt") 
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (id) DO UPDATE SET "isRead" = EXCLUDED."isRead";`,
      [n.id, n.userId, n.title, n.body, n.type, n.isRead, n.createdAt]
    );
  }
  
  console.log("✅ Successfully inserted 3 test notifications!");
  pool.end();
}

main().catch(err => {
  console.error("❌ Error running script:", err);
  pool.end();
});
