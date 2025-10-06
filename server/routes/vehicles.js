const express = require('express');
const { body, validationResult } = require('express-validator');
const pool = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { validate: isUuid } = require('uuid');

const router = express.Router();

/** Helperid: aktsepteeri kas UUID või legacy int ja tagasta tegelik UUID **/
async function resolveVehicleUuid(idOrLegacy) {
  const idStr = String(idOrLegacy).trim();
  if (isUuid(idStr)) return idStr;

  if (/^\d+$/.test(idStr)) {
    const q = await pool.query(
      'SELECT id FROM public.vehicles WHERE legacy_id = $1',
      [Number(idStr)]
    );
    if (!q.rows[0]) {
      const err = new Error(`Vehicle with legacy_id ${idStr} not found`);
      err.status = 404;
      throw err;
    }
    return q.rows[0].id; // UUID
  }

  const err = new Error('Invalid vehicle identifier: must be UUID or integer legacy_id');
  err.status = 400;
  throw err;
}

async function resolveCustomerUuid(idOrLegacy) {
  const idStr = String(idOrLegacy).trim();
  if (isUuid(idStr)) return idStr;

  if (/^\d+$/.test(idStr)) {
    const q = await pool.query(
      'SELECT id FROM public.customers WHERE legacy_id = $1',
      [Number(idStr)]
    );
    if (!q.rows[0]) {
      const err = new Error(`Customer with legacy_id ${idStr} not found`);
      err.status = 404;
      throw err;
    }
    return q.rows[0].id; // UUID
  }

  const err = new Error('Invalid customer identifier: must be UUID or integer legacy_id');
  err.status = 400;
  throw err;
}

/** Custom validator: lubab uuid VÕI int (legacy) **/
const uuidOrInt = (field) =>
  body(field)
    .custom((v) => typeof v === 'string' || typeof v === 'number')
    .withMessage(`${field} required`)
    .bail()
    .custom((v) => {
      const s = String(v).trim();
      return isUuid(s) || /^\d+$/.test(s);
    })
    .withMessage(`${field} must be UUID or integer legacy_id`);

const yearValidator = body('year').isInt({ min: 1900, max: new Date().getFullYear() + 1 });

/* ========================= Routes ========================= */

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
  body('customer_id'),
  body('make').notEmpty().trim(),
  body('model').notEmpty().trim(),
  body('year').isInt({ min: 1900, max: new Date().getFullYear() + 1 }),
  body('license_plate').notEmpty().trim(),
  body('vin').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
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
  body('customer_id').isInt({ min: 1 }),
  body('make').notEmpty().trim(),
  body('model').notEmpty().trim(),
  body('year').isInt({ min: 1900, max: new Date().getFullYear() + 1 }),
  body('license_plate').notEmpty().trim(),
  body('vin').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
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