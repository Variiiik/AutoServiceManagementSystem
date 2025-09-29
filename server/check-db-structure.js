const pool = require('./config/database');

async function checkAndFixColumns() {
  try {
    console.log('🔍 Checking work_orders table structure...');
    const workOrdersColumns = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'work_orders'
      ORDER BY ordinal_position;
    `);

    console.log('Work Orders columns:', workOrdersColumns.rows);

    console.log('\n🔍 Checking appointments table structure...');
    const appointmentsColumns = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'appointments'
      ORDER BY ordinal_position;
    `);

    console.log('Appointments columns:', appointmentsColumns.rows);

    // Check if assigned_mechanic exists in work_orders
    const woHasAssignedMechanic = workOrdersColumns.rows.some(col => col.column_name === 'assigned_mechanic');
    const apptHasAssignedMechanic = appointmentsColumns.rows.some(col => col.column_name === 'assigned_mechanic');

    console.log('\n📊 Column Status:');
    console.log('Work Orders has assigned_mechanic:', woHasAssignedMechanic);
    console.log('Appointments has assigned_mechanic:', apptHasAssignedMechanic);

    // Add missing columns if needed
    if (!woHasAssignedMechanic) {
      console.log('\n➕ Adding assigned_mechanic to work_orders...');
      await pool.query(`
        ALTER TABLE work_orders 
        ADD COLUMN assigned_mechanic INTEGER REFERENCES users(id);
      `);
      console.log('✅ Added assigned_mechanic to work_orders');
    }

    if (!apptHasAssignedMechanic) {
      console.log('\n➕ Adding assigned_mechanic to appointments...');
      await pool.query(`
        ALTER TABLE appointments 
        ADD COLUMN assigned_mechanic INTEGER REFERENCES users(id);
      `);
      console.log('✅ Added assigned_mechanic to appointments');
    }

    // Check customers table structure
    console.log('\n🔍 Checking customers table structure...');
    const customersColumns = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'customers'
      ORDER BY ordinal_position;
    `);

    console.log('Customers columns:', customersColumns.rows);

    // Check vehicles table structure
    console.log('\n🔍 Checking vehicles table structure...');
    const vehiclesColumns = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'vehicles'
      ORDER BY ordinal_position;
    `);

    console.log('Vehicles columns:', vehiclesColumns.rows);

    console.log('\n✅ Database structure check completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkAndFixColumns();