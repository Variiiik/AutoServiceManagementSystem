const express = require('express');
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get dashboard statistics
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const [
      customersResult,
      vehiclesResult,
      workOrdersResult,
      inventoryResult,
      appointmentsResult
    ] = await Promise.all([
      pool.query('SELECT COUNT(*) as count FROM customers'),
      pool.query('SELECT COUNT(*) as count FROM vehicles'),
      pool.query(`
        SELECT 
          status,
          COUNT(*) as count
        FROM work_orders 
        GROUP BY status
      `),
      pool.query(`
        SELECT 
          COUNT(*) as total_items,
          COUNT(*) FILTER (WHERE stock_quantity <= min_stock_level) as low_stock_items  
        FROM inventory
      `),
      pool.query(`
        SELECT 
          COUNT(*) FILTER (WHERE DATE(appointment_date) = CURRENT_DATE) as today_appointments,
          COUNT(*) as total_appointments
        FROM appointments
      `)
    ]);

    // Process work orders by status
    const workOrderStats = {
      pending: 0,
      in_progress: 0,
      completed: 0
    };

    workOrdersResult.rows.forEach(row => {
      workOrderStats[row.status] = parseInt(row.count);
    });

    const stats = {
      totalCustomers: parseInt(customersResult.rows[0].count),
      totalVehicles: parseInt(vehiclesResult.rows[0].count),
      pendingOrders: workOrderStats.pending,
      inProgressOrders: workOrderStats.in_progress,
      completedOrders: workOrderStats.completed,
      totalInventoryItems: parseInt(inventoryResult.rows[0].total_items),
      lowStockItems: parseInt(inventoryResult.rows[0].low_stock_items),
      todayAppointments: parseInt(appointmentsResult.rows[0].today_appointments),
      totalAppointments: parseInt(appointmentsResult.rows[0].total_appointments)
    };

    res.json(stats);
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get recent work orders
router.get('/recent-orders', authenticateToken, async (req, res) => {
  try {
    let query = `
      SELECT wo.*, 
             c.name as customer_name,
             v.make, v.model, v.year,
             u.full_name as mechanic_name
      FROM work_orders wo
      LEFT JOIN customers c ON wo.customer_id = c.id
      LEFT JOIN vehicles v ON wo.vehicle_id = v.id
      LEFT JOIN users u ON wo.assigned_mechanic = u.id
    `;
    
    let params = [];
    
    // Mechanics can only see their assigned work orders
    if (req.user.role === 'mechanic') {
      query += ' WHERE wo.assigned_mechanic = $1';
      params.push(req.user.id);
    }
    
    query += ' ORDER BY wo.created_at DESC LIMIT 5';
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching recent orders:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get today's appointments
router.get('/today-appointments', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT a.*, 
             c.name as customer_name,
             v.make, v.model, v.year,
             u.full_name as mechanic_name
      FROM appointments a
      LEFT JOIN customers c ON a.customer_id = c.id
      LEFT JOIN vehicles v ON a.vehicle_id = v.id
      LEFT JOIN users u ON a.assigned_mechanic = u.id
      WHERE DATE(a.appointment_date) = CURRENT_DATE
      ORDER BY a.appointment_date
    `);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching today appointments:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get low stock items
router.get('/low-stock', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM inventory 
      WHERE stock_quantity <= min_stock_level 
      ORDER BY stock_quantity ASC 
      LIMIT 10
    `);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching low stock items:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;