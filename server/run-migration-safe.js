const pool = require('./config/database');

async function runMigration() {
  try {
    console.log('🔄 Running database migration...');
    
    // Step 1: Add assigned_mechanic column to work_orders WITHOUT foreign key constraint
    try {
      await pool.query(`
        ALTER TABLE work_orders 
        ADD COLUMN assigned_mechanic INTEGER;
      `);
      console.log('✅ Added assigned_mechanic column to work_orders');
    } catch (error) {
      if (error.code === '42701') { // Column already exists
        console.log('ℹ️  assigned_mechanic column already exists in work_orders');
      } else {
        console.log('⚠️  Could not add assigned_mechanic to work_orders:', error.message);
      }
    }

    // Step 2: Add assigned_mechanic column to appointments WITHOUT foreign key constraint
    try {
      await pool.query(`
        ALTER TABLE appointments 
        ADD COLUMN assigned_mechanic INTEGER;
      `);
      console.log('✅ Added assigned_mechanic column to appointments');
    } catch (error) {
      if (error.code === '42701') { // Column already exists
        console.log('ℹ️  assigned_mechanic column already exists in appointments');
      } else {
        console.log('⚠️  Could not add assigned_mechanic to appointments:', error.message);
      }
    }

    // Step 3: Check if users table exists and has the right structure
    try {
      const usersCheck = await pool.query(`
        SELECT column_name FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'id';
      `);
      
      if (usersCheck.rows.length > 0) {
        console.log('✅ Users table exists with id column');
        
        // Step 4: Now try to add foreign key constraints
        try {
          await pool.query(`
            ALTER TABLE work_orders 
            ADD CONSTRAINT work_orders_assigned_mechanic_fkey 
            FOREIGN KEY (assigned_mechanic) REFERENCES users(id);
          `);
          console.log('✅ Added foreign key constraint to work_orders.assigned_mechanic');
        } catch (error) {
          console.log('ℹ️  Foreign key constraint already exists or could not be added to work_orders:', error.message);
        }

        try {
          await pool.query(`
            ALTER TABLE appointments 
            ADD CONSTRAINT appointments_assigned_mechanic_fkey 
            FOREIGN KEY (assigned_mechanic) REFERENCES users(id);
          `);
          console.log('✅ Added foreign key constraint to appointments.assigned_mechanic');
        } catch (error) {
          console.log('ℹ️  Foreign key constraint already exists or could not be added to appointments:', error.message);
        }
      } else {
        console.log('⚠️  Users table does not exist or missing id column - skipping foreign key constraints');
      }
    } catch (error) {
      console.log('⚠️  Could not check users table:', error.message);
    }

    // Step 5: Create indexes
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

    // Step 6: Get the first mechanic user ID and update existing records
    try {
      const mechanicResult = await pool.query(`
        SELECT id FROM users WHERE role = 'mechanic' LIMIT 1;
      `);

      if (mechanicResult.rows.length > 0) {
        const mechanicId = mechanicResult.rows[0].id;
        console.log('🔍 Found mechanic ID:', mechanicId);

        // Update existing work orders
        const updateWO = await pool.query(`
          UPDATE work_orders
          SET assigned_mechanic = $1
          WHERE assigned_mechanic IS NULL;
        `, [mechanicId]);

        console.log('✅ Updated', updateWO.rowCount, 'work orders');

        // Update existing appointments
        const updateAppt = await pool.query(`
          UPDATE appointments
          SET assigned_mechanic = $1
          WHERE assigned_mechanic IS NULL;
        `, [mechanicId]);

        console.log('✅ Updated', updateAppt.rowCount, 'appointments');
      } else {
        console.log('⚠️  No mechanic user found - creating a default one');
        
        // Create a default mechanic user
        try {
          const newMechanic = await pool.query(`
            INSERT INTO users (email, password_hash, full_name, role, phone) 
            VALUES ('mechanic@autoservice.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Default Mechanic', 'mechanic', '(555) 234-5678')
            ON CONFLICT (email) DO NOTHING
            RETURNING id;
          `);
          
          if (newMechanic.rows.length > 0) {
            const mechanicId = newMechanic.rows[0].id;
            console.log('✅ Created default mechanic with ID:', mechanicId);
            
            // Update records with new mechanic
            await pool.query(`UPDATE work_orders SET assigned_mechanic = $1 WHERE assigned_mechanic IS NULL;`, [mechanicId]);
            await pool.query(`UPDATE appointments SET assigned_mechanic = $1 WHERE assigned_mechanic IS NULL;`, [mechanicId]);
            console.log('✅ Updated records with new mechanic');
          }
        } catch (error) {
          console.log('⚠️  Could not create default mechanic:', error.message);
        }
      }
    } catch (error) {
      console.log('⚠️  Could not update existing records:', error.message);
    }

    // Step 7: Check if inventory table needs to be renamed
    try {
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
    } catch (error) {
      console.log('ℹ️  Could not check/rename inventory table:', error.message);
    }

    console.log('✅ Migration completed successfully!');
    
    // Show database statistics
    try {
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
    } catch (error) {
      console.log('ℹ️  Could not fetch statistics:', error.message);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

runMigration();