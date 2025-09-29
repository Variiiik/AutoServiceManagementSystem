const express = require('express');
const { body, validationResult } = require('express-validator');
const pool = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Get all vehicles with customer info
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT v.*, c.name as customer_name, c.phone as customer_phone, c.email as customer_email
      FROM vehicles v
      LEFT JOIN customers c ON v.customer_id = c.id
      ORDER BY v.created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching vehicles:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get vehicle by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT v.*, c.name as customer_name, c.phone as customer_phone, c.email as customer_email
      FROM vehicles v
      LEFT JOIN customers c ON v.customer_id = c.id
      WHERE v.id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching vehicle:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create vehicle (admin only)
router.post('/', [
  authenticateToken,
  requireRole(['admin']),
  body('customer_id').isInt({ min: 1 }),
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { customer_id, make, model, year, license_plate, vin } = req.body;

    const result = await pool.query(
      'INSERT INTO vehicles (customer_id, make, model, year, license_plate, vin) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [customer_id, make, model, year, license_plate, vin]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating vehicle:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update vehicle (admin only)
router.put('/:id', [
  authenticateToken,
  requireRole(['admin']),
  body('customer_id').isInt({ min: 1 }),
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { customer_id, make, model, year, license_plate, vin } = req.body;

    const result = await pool.query(
      'UPDATE vehicles SET customer_id = $1, make = $2, model = $3, year = $4, license_plate = $5, vin = $6, updated_at = CURRENT_TIMESTAMP WHERE id = $7 RETURNING *',
      [customer_id, make, model, year, license_plate, vin, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating vehicle:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete vehicle (admin only)
router.delete('/:id', [
  authenticateToken,
  requireRole(['admin'])
], async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query('DELETE FROM vehicles WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }

    res.json({ message: 'Vehicle deleted successfully' });
  } catch (error) {
    console.error('Error deleting vehicle:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;