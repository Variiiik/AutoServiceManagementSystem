const express = require('express');
const { body, validationResult } = require('express-validator');
const pool = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Get all appointments
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT a.*, 
             c.name as customer_name, c.phone as customer_phone, c.email as customer_email,
             v.make, v.model, v.year, v.license_plate,
             u.full_name as mechanic_name
      FROM appointments a
      LEFT JOIN customers c ON a.customer_id = c.id
      LEFT JOIN vehicles v ON a.vehicle_id = v.id
      LEFT JOIN users u ON a.assigned_mechanic = u.id
      ORDER BY a.appointment_date
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching appointments:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get appointment by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT a.*, 
             c.name as customer_name, c.phone as customer_phone, c.email as customer_email,
             v.make, v.model, v.year, v.license_plate,
             u.full_name as mechanic_name
      FROM appointments a
      LEFT JOIN customers c ON a.customer_id = c.id
      LEFT JOIN vehicles v ON a.vehicle_id = v.id
      LEFT JOIN users u ON a.assigned_mechanic = u.id
      WHERE a.id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Appointment not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching appointment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create appointment (admin only)
router.post('/', [
  authenticateToken,
  requireRole(['admin']),
  body('customer_id').isInt({ min: 1 }),
  body('vehicle_id').isInt({ min: 1 }),
  body('appointment_date').isISO8601(),
  body('duration').optional().matches(/^\d+:\d{2}:\d{2}$|^\d+ hours?$/),
  body('description').optional().trim(),
  body('assigned_mechanic').optional().isInt({ min: 1 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { 
      customer_id, 
      vehicle_id, 
      appointment_date, 
      duration = '2 hours', 
      description, 
      assigned_mechanic 
    } = req.body;

    const result = await pool.query(
      'INSERT INTO appointments (customer_id, vehicle_id, appointment_date, duration, description, assigned_mechanic) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [customer_id, vehicle_id, appointment_date, duration, description, assigned_mechanic]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating appointment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update appointment (admin only)
router.put('/:id', [
  authenticateToken,
  requireRole(['admin']),
  body('customer_id').optional().isInt({ min: 1 }),
  body('vehicle_id').optional().isInt({ min: 1 }),
  body('appointment_date').optional().isISO8601(),
  body('duration').optional().matches(/^\d+:\d{2}:\d{2}$|^\d+ hours?$/),
  body('description').optional().trim(),
  body('assigned_mechanic').optional().isInt({ min: 1 }),
  body('status').optional().isIn(['scheduled', 'confirmed', 'completed', 'cancelled'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const updates = req.body;

    // Build dynamic update query
    const fields = Object.keys(updates);
    if (fields.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ');
    const values = [id, ...fields.map(field => updates[field])];

    const result = await pool.query(
      `UPDATE appointments SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating appointment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update appointment status
router.patch('/:id/status', [
  authenticateToken,
  body('status').isIn(['scheduled', 'confirmed', 'completed', 'cancelled'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { status } = req.body;

    const result = await pool.query(
      'UPDATE appointments SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating appointment status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete appointment (admin only)
router.delete('/:id', [
  authenticateToken,
  requireRole(['admin'])
], async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query('DELETE FROM appointments WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    res.json({ message: 'Appointment deleted successfully' });
  } catch (error) {
    console.error('Error deleting appointment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;