const pool = require('./config/database');

async function updateExistingRecords() {
  try {
    console.log('🔄 Updating existing work orders and appointments...');

    // Get the first mechanic user ID
    const mechanicResult = await pool.query(`
      SELECT id FROM users WHERE role = 'mechanic' LIMIT 1;
    `);

    if (mechanicResult.rows.length > 0) {
      const mechanicId = mechanicResult.rows[0].id;
      console.log('Found mechanic ID:', mechanicId);

      // Update existing work orders
      const updateWO = await pool.query(`
        UPDATE work_orders
        SET assigned_mechanic = $1
        WHERE assigned_mechanic IS NULL;
      `, [mechanicId]);

      console.log('Updated', updateWO.rowCount, 'work orders');

      // Update existing appointments
      const updateAppt = await pool.query(`
        UPDATE appointments
        SET assigned_mechanic = $1
        WHERE assigned_mechanic IS NULL;
      `, [mechanicId]);

      console.log('Updated', updateAppt.rowCount, 'appointments');

      console.log('✅ All records updated successfully!');
    } else {
      console.log('❌ No mechanic user found');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error updating records:', error.message);
    process.exit(1);
  }
}

updateExistingRecords();