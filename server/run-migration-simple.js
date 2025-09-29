const pool = require('./config/database');

async function runMigration() {
  try {
    console.log('🔄 Running database migration...');
    
    // Step 1: Add assigned_mechanic column to work_orders if it doesn't exist
    try {
      await pool.query(`
        ALTER TABLE work_orders 
        ADD COLUMN assigned_mechanic INTEGER REFERENCES users(id);
      `);
      console.log('✅ Added assigned_mechanic column to work_orders');
    } catch (error) {
      if (error.code === '42701') { // Column already exists
        console.log('ℹ️  assigned_mechanic column already exists in work_orders');
      } else {
        throw error;
      }
    }

    // Step 2: Add assigned_mechanic column to appointments if it doesn't exist
    try {
      await pool.query(`
        ALTER TABLE appointments 
        ADD COLUMN assigned_mechanic INTEGER REFERENCES users(id);
      `);
      console.log('✅ Added assigned_mechanic column to appointments');
    } catch (error) {
      if (error.code === '42701') { // Column already exists
        console.log('ℹ️  assigned_mechanic column already exists in appointments');
      } else {
        throw error;
      }
    }

    // Step 3: Create indexes
    try {
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_work_orders_assigned_mechanic ON work_orders(assigned_mechanic);
      `);
      console.log('✅ Created index on work_orders.assigned_mechanic');
    } catch (error) {
      console.log('ℹ️  Index already exists or error:', error.message);
    }

    try {
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_appointments_assigned_mechanic ON appointments(assigned_mechanic);
      `);
      console.log('✅ Created index on appointments.assigned_mechanic');
    } catch (error) {
      console.log('ℹ️  Index already exists or error:', error.message);
    }

    // Step 4: Get the first mechanic user ID
    const mechanicResult = await pool.query(`
      SELECT id FROM users WHERE role = 'mechanic' LIMIT 1;
    `);

    if (mechanicResult.rows.length > 0) {
      const mechanicId = mechanicResult.rows[0].id;
      console.log('🔍 Found mechanic ID:', mechanicId);

      // Step 5: Update existing work orders
      const updateWO = await pool.query(`
        UPDATE work_orders
        SET assigned_mechanic = $1
        WHERE assigned_mechanic IS NULL;
      `, [mechanicId]);

      console.log('✅ Updated', updateWO.rowCount, 'work orders');

      // Step 6: Update existing appointments
      const updateAppt = await pool.query(`
        UPDATE appointments
        SET assigned_mechanic = $1
        WHERE assigned_mechanic IS NULL;
      `, [mechanicId]);

      console.log('✅ Updated', updateAppt.rowCount, 'appointments');
    } else {
      console.log('⚠️  No mechanic user found');
    }

    // Step 7: Check if inventory table needs to be renamed
    const inventoryCheck = await pool.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_name IN ('inventory', 'inventory_items');
    `);

    const tableNames = inventoryCheck.rows.map(row => row.table_name);
    
    if (tableNames.includes('inventory') && !tableNames.includes('inventory_items')) {
      await pool.query(`ALTER TABLE inventory RENAME TO inventory_items;`);
      console.log('✅ Renamed inventory table to inventory_items');
    } else {
      console.log('ℹ️  Inventory table naming is correct');
    }

    // Step 8: Update work order totals
    const workOrders = await pool.query('SELECT id FROM work_orders');
    for (const order of workOrders.rows) {
      try {
        await pool.query('SELECT update_work_order_total($1)', [order.id]);
      } catch (error) {
        console.log('ℹ️  Could not update total for work order', order.id, ':', error.message);
      }
    }
    console.log('✅ Updated work order totals');

    console.log('✅ Migration completed successfully!');
    
    // Show database statistics
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
    console.error('❌ Migration failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

runMigration();