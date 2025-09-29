const express = require('express');
const { body, validationResult } = require('express-validator');
const pool = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Get work orders (filtered by role)
router.get('/', authenticateToken, async (req, res) => {
  try {
    let query = `
      SELECT wo.*, 
             c.name as customer_name, c.phone as customer_phone, c.email as customer_email,
             v.make, v.model, v.year, v.license_plate,
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
    
    query += ' ORDER BY wo.created_at DESC';
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching work orders:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get work order by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    let query = `
      SELECT wo.*, 
             c.name as customer_name, c.phone as customer_phone, c.email as customer_email,
             v.make, v.model, v.year, v.license_plate,
             u.full_name as mechanic_name
      FROM work_orders wo
      LEFT JOIN customers c ON wo.customer_id = c.id
      LEFT JOIN vehicles v ON wo.vehicle_id = v.id
      LEFT JOIN users u ON wo.assigned_mechanic = u.id
      WHERE wo.id = $1
    `;
    
    let params = [id];
    
    // Mechanics can only see their assigned work orders
    if (req.user.role === 'mechanic') {
      query += ' AND wo.assigned_mechanic = $2';
      params.push(req.user.id);
    }
    
    const result = await pool.query(query, params);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Work order not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching work order:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create work order (admin only)
router.post('/', [
  authenticateToken,
  requireRole(['admin']),
  body('vehicle_id').isInt({ min: 1 }),
  body('customer_id').isInt({ min: 1 }),
  body('title').trim().isLength({ min: 1 }),
  body('description').optional().trim(),
  body('assigned_mechanic').optional().isInt({ min: 1 }),
  body('labor_hours').optional().isFloat({ min: 0 }),
  body('labor_rate').optional().isFloat({ min: 0 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { 
      vehicle_id, 
      customer_id, 
      title, 
      description, 
      assigned_mechanic, 
      labor_hours = 0, 
      labor_rate = 75.00 
    } = req.body;

    const result = await pool.query(
      'INSERT INTO work_orders (vehicle_id, customer_id, title, description, assigned_mechanic, labor_hours, labor_rate) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [vehicle_id, customer_id, title, description, assigned_mechanic, labor_hours, labor_rate]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating work order:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update work order
router.put('/:id', [
  authenticateToken,
  body('title').optional().trim().isLength({ min: 1 }),
  body('description').optional().trim(),
  body('status').optional().isIn(['pending', 'in_progress', 'completed']),
  body('assigned_mechanic').optional().isInt({ min: 1 }),
  body('labor_hours').optional().isFloat({ min: 0 }),
  body('labor_rate').optional().isFloat({ min: 0 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const updates = req.body;

    // Check if user can update this work order
    if (req.user.role === 'mechanic') {
      const checkResult = await pool.query(
        'SELECT assigned_mechanic FROM work_orders WHERE id = $1',
        [id]
      );
      
      if (checkResult.rows.length === 0) {
        return res.status(404).json({ error: 'Work order not found' });
      }
      
      if (checkResult.rows[0].assigned_mechanic !== req.user.id) {
        return res.status(403).json({ error: 'Not authorized to update this work order' });
      }
      
      // Mechanics can only update status and description
      const allowedFields = ['status', 'description'];
      Object.keys(updates).forEach(key => {
        if (!allowedFields.includes(key)) {
          delete updates[key];
        }
      });
    }

    // Build dynamic update query
    const fields = Object.keys(updates);
    if (fields.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ');
    const values = [id, ...fields.map(field => updates[field])];

    const result = await pool.query(
      `UPDATE work_orders SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Work order not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating work order:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete work order (admin only)
router.delete('/:id', [
  authenticateToken,
  requireRole(['admin'])
], async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query('DELETE FROM work_orders WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Work order not found' });
    }

    res.json({ message: 'Work order deleted successfully' });
  } catch (error) {
    console.error('Error deleting work order:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get work order parts
router.get('/:id/parts', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      SELECT wop.*, ii.name, ii.sku
      FROM work_order_items wop
      LEFT JOIN inventory ii ON wop.inventory_id = ii.id
      WHERE wop.work_order_id = $1
      ORDER BY wop.created_at
    `, [id]);

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching work order parts:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add part to work order
router.post('/:id/parts', [
  authenticateToken,
  body('inventory_item_id').isInt({ min: 1 }),
  body('quantity_used').isInt({ min: 1 }),
  body('unit_price').isFloat({ min: 0 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { inventory_id, quantity_used, unit_price } = req.body;

    // Check if user can modify this work order
    if (req.user.role === 'mechanic') {
      const checkResult = await pool.query(
        'SELECT assigned_mechanic FROM work_orders WHERE id = $1',
        [id]
      );
      
      if (checkResult.rows.length === 0) {
        return res.status(404).json({ error: 'Work order not found' });
      }
      
      if (checkResult.rows[0].assigned_mechanic !== req.user.id) {
        return res.status(403).json({ error: 'Not authorized to modify this work order' });
      }
    }

    // Add part to work order
    const result = await pool.query(
      'INSERT INTO work_order_items (work_order_id, inventory_id, quantity_used, unit_price) VALUES ($1, $2, $3, $4) RETURNING *',
      [id, inventory_id, quantity_used, unit_price]
    );

    // Update inventory stock
    await pool.query(
      'UPDATE inventory SET stock_quantity = stock_quantity - $1 WHERE id = $2',
      [quantity_used, inventory_id]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error adding part to work order:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;