const fs = require('fs');
const path = require('path');
const pool = require('../config/database');

async function runMigrations() {
  try {
    console.log('🔄 Running database migrations...');
    
    // Get all migration files
    const migrationFiles = fs.readdirSync(__dirname, { withFileTypes: true })
      .filter(dirent => dirent.isFile())
      .map(dirent => dirent.name)
      .filter(file => file.endsWith('.sql'))
      .sort();
    
    console.log(`📁 Found ${migrationFiles.length} migration files`);
    
    for (const file of migrationFiles) {
      console.log(`⚡ Running migration: ${file}`);
      const migrationPath = path.join(__dirname, file);
      const sql = fs.readFileSync(migrationPath, 'utf8');
      
      await pool.query(sql);
      console.log(`✅ Completed migration: ${file}`);
    }
    
    console.log('🎉 All database migrations completed successfully');
    
    // Test the connection and show some stats
    const stats = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM users) as users,
        (SELECT COUNT(*) FROM customers) as customers,
        (SELECT COUNT(*) FROM vehicles) as vehicles,
        (SELECT COUNT(*) FROM work_orders) as work_orders,
        (SELECT COUNT(*) FROM inventory_items) as inventory_items,
        (SELECT COUNT(*) FROM appointments) as appointments
    `);
    
    console.log('📊 Database Statistics:');
    console.log(`   👥 Users: ${stats.rows[0].users}`);
    console.log(`   🏢 Customers: ${stats.rows[0].customers}`);
    console.log(`   🚗 Vehicles: ${stats.rows[0].vehicles}`);
    console.log(`   🔧 Work Orders: ${stats.rows[0].work_orders}`);
    console.log(`   📦 Inventory Items: ${stats.rows[0].inventory_items}`);
    console.log(`   📅 Appointments: ${stats.rows[0].appointments}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

runMigrations();