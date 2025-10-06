// server/routes/appointments.js
const express = require('express');
const { body, param, validationResult } = require('express-validator');
const pool = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { vevent, wrapCalendar } = require('../utils/ics');

const router = express.Router();

function assertValid(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ error: 'Validation failed', details: errors.array() });
    return true;
  }
  return false;
}

// ========= GET: list =========
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        a.id,
        a.customer_id,
        a.vehicle_id,
        a.assigned_to,
        a.appointment_date,
        a.title,
        a.duration_minutes,
        a.status,
        a.description,
        a.created_at,
        a.updated_at,

        c.name  AS customer_name,
        c.phone AS customer_phone,
        c.email AS customer_email,

        v.make, v.model, v.year,
        v.license_plate AS license_plate

        -- NB: Ära joini assigned_mechanic enne, kui veerg on UUID
        -- LEFT JOIN users u ON u.id = a.assigned_mechanic
        -- , u.full_name AS mechanic_name

      FROM appointments a
      LEFT JOIN customers c ON a.customer_id = c.id                            -- UUID = UUID
      LEFT JOIN vehicles  v ON a.vehicle_id  = v.id                            -- UUID = UUID
      ORDER BY a.appointment_date
    `);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching appointments:', { message: error.message, code: error.code, stack: error.stack });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ========= GET: by id =========
router.get('/:id',
  authenticateToken,
  param('id').isUUID(),
  async (req, res) => {
    if (assertValid(req, res)) return;
    try {
      const { id } = req.params;
      const { rows } = await pool.query(`
        SELECT
          a.id,
          a.customer_id,
          a.vehicle_id,
          a.assigned_to,
          a.appointment_date,
          a.title,
          a.duration_minutes,
          a.status,
          a.description,
          a.created_at,
          a.updated_at,

          c.name  AS customer_name,
          c.phone AS customer_phone,
          c.email AS customer_email,

          v.make, v.model, v.year,
          v.license_plate AS license_plate

        FROM appointments a
        LEFT JOIN customers c ON a.customer_id = c.id
        LEFT JOIN vehicles  v ON a.vehicle_id  = v.id
        WHERE a.id = $1
        LIMIT 1
      `, [id]);

      if (!rows.length) return res.status(404).json({ error: 'Appointment not found' });
      res.json(rows[0]);
    } catch (error) {
      console.error('Error fetching appointment:', { message: error.message, code: error.code });
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// ========= CREATE (admin) =========
router.post('/',
  authenticateToken,
  requireRole(['admin']),
  body('customer_id').isUUID().withMessage('customer_id must be UUID'),
  body('vehicle_id').isUUID().withMessage('vehicle_id must be UUID'),
  body('appointment_date').isISO8601(),
  body('duration_minutes').optional({ nullable: true }).isInt({ min: 1, max: 24*60 }),
  body('title').optional({ nullable: true }).isString().trim().isLength({ max: 200 }),
  body('description').optional({ nullable: true }).trim().isLength({ max: 2000 }),
  body('status').optional({ nullable: true }).isIn(['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled']),
  // NB: ära valideeri assigned_mechanic kui veerg on integer – ära üldse kasuta seni
  async (req, res) => {
    if (assertValid(req, res)) return;
    try {
      const {
        customer_id,
        vehicle_id,
        appointment_date,
        duration_minutes,
        description = null,
        status = 'scheduled',
        // assigned_mechanic, // ära saada enne kui veerg on UUID ja FK users(id) peale
        title: rawTitle,
      } = req.body;

      let title = (rawTitle || '').trim();
      if (!title) {
        const { rows: vrows } = await pool.query(
          `SELECT v.make, v.model, v.year, v.license_plate, c.name AS customer_name
            FROM vehicles v
            LEFT JOIN customers c ON c.id = $1
          WHERE v.id = $2
          LIMIT 1`,
          [customer_id, vehicle_id]
       );
       const v = vrows[0] || {};
       title = [v.license_plate, v.make, v.model, v.year].filter(Boolean).join(' ').trim() || 'Service appointment';
       if (v.customer_name) title = `${v.customer_name}: ${title}`;
      }

      const q = `
        INSERT INTO appointments
          (customer_id, vehicle_id, appointment_date, duration_minutes, description, status, title)
        VALUES ($1, $2, $3, COALESCE($4, 120), $5, $6, $7)
        RETURNING *;
      `;
      const { rows } = await pool.query(q, [
        customer_id,
        vehicle_id,
        appointment_date,
        duration_minutes ?? null, // default 120 min
        description,
        status,
        title,
      ]);

      res.status(201).json(rows[0]);
    } catch (error) {
      console.error('Error creating appointment:', { message: error.message, code: error.code });
      // PostgreSQL UUID parse -> 22P02
      if (error.code === '22P02') return res.status(400).json({ error: 'Invalid UUID in payload' });
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// ========= UPDATE (admin) =========
router.put('/:id',
  authenticateToken,
  requireRole(['admin']),
  param('id').isUUID(),
  body('customer_id').optional().isUUID(),
  body('vehicle_id').optional().isUUID(),
  body('appointment_date').optional().isISO8601(),
  body('duration_minutes').optional({ nullable: true }).isInt({ min: 1, max: 24*60 }),
  body('title').optional({ nullable: true }).isString().trim().isLength({ max: 200 }),
  body('description').optional({ nullable: true }).trim().isLength({ max: 2000 }),
  body('status').optional().isIn(['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled']),
  async (req, res) => {
    if (assertValid(req, res)) return;

    try {
      const { id } = req.params;
      const updates = req.body;

      const fields = Object.keys(updates);
      if (!fields.length) return res.status(400).json({ error: 'No valid fields to update' });

      const setClause = fields.map((f, i) => `${f} = $${i + 2}`).join(', ') + ', updated_at = CURRENT_TIMESTAMP';
      const values = [id, ...fields.map(f => updates[f])];

      const { rows } = await pool.query(
        `UPDATE appointments SET ${setClause} WHERE id = $1 RETURNING *`,
        values
      );
      if (!rows.length) return res.status(404).json({ error: 'Appointment not found' });
      res.json(rows[0]);
    } catch (error) {
      console.error('Error updating appointment:', { message: error.message, code: error.code });
      if (error.code === '22P02') return res.status(400).json({ error: 'Invalid UUID in payload' });
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// ========= PATCH status =========
router.patch('/:id/status',
  authenticateToken,
  param('id').isUUID(),
  body('status').isIn(['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled']),
  async (req, res) => {
    if (assertValid(req, res)) return;
    try {
      const { id } = req.params;
      const { status } = req.body;

      const { rows } = await pool.query(
        'UPDATE appointments SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
        [status, id]
      );
      if (!rows.length) return res.status(404).json({ error: 'Appointment not found' });
      res.json(rows[0]);
    } catch (error) {
      console.error('Error updating appointment status:', { message: error.message, code: error.code });
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// ========= DELETE =========
router.delete('/:id',
  authenticateToken,
  requireRole(['admin']),
  param('id').isUUID(),
  async (req, res) => {
    if (assertValid(req, res)) return;
    try {
      const { id } = req.params;
      const { rows } = await pool.query('DELETE FROM appointments WHERE id = $1 RETURNING *', [id]);
      if (!rows.length) return res.status(404).json({ error: 'Appointment not found' });
      res.json({ message: 'Appointment deleted successfully' });
    } catch (error) {
      console.error('Error deleting appointment:', { message: error.message, code: error.code });
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// ========= ICS: single =========
router.get('/:id/ics',
  param('id').isUUID(),
  async (req, res, next) => {
    if (assertValid(req, res)) return;
    try {
      const { rows } = await pool.query(`
        SELECT a.id, a.appointment_date, a.duration_minutes, a.description,
               v.license_plate AS license_plate, v.make, v.model, v.year,
               c.name AS customer_name
        FROM appointments a
        JOIN vehicles v ON v.id = a.vehicle_id
        LEFT JOIN customers c ON c.id = a.customer_id
        WHERE a.id = $1
        LIMIT 1
      `, [req.params.id]);

      if (!rows.length) return res.status(404).send('Not found');
      const a = rows[0];

      const start = new Date(a.appointment_date);
      const minutes = Number(a.duration_minutes ?? 120);
      const end = new Date(start.getTime() + minutes * 60 * 1000);

      const summary = `${a.license_plate || ''} · ${a.make || ''} ${a.model || ''}`.trim();
      const description = `${a.customer_name || ''}${a.customer_name ? ': ' : ''}${a.description || ''}`.trim();

      const ev = vevent({
        uid: `apt-${a.id}@autoservice.local`,
        start, end,
        summary,
        description,
        location: a.license_plate ? `Vehicle ${a.license_plate}` : undefined,
      });

      const ics = wrapCalendar([ev]);
      res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename=appointment-${a.id}.ics`);
      return res.send(ics);
    } catch (err) { next(err); }
  }
);

// ========= ICS: all (last 6 months forward) =========
router.get('/ics', async (req, res, next) => {
  try {
    const { rows } = await pool.query(`
      SELECT a.id, a.appointment_date, a.duration_minutes, a.description,
             v.license_plate AS license_plate, v.make, v.model, v.year,
             c.name AS customer_name
      FROM appointments a
      JOIN vehicles v ON v.id = a.vehicle_id
      LEFT JOIN customers c ON c.id = a.customer_id
      WHERE a.appointment_date >= NOW() - INTERVAL '6 months'
      ORDER BY a.appointment_date ASC
    `);

    const events = rows.map(a => {
      const start = new Date(a.appointment_date);
      const minutes = Number(a.duration_minutes ?? 120);
      const end = new Date(start.getTime() + minutes * 60 * 1000);

      const summary = `${a.license_plate || ''} · ${a.make || ''} ${a.model || ''}`.trim();
      const description = `${a.customer_name || ''}${a.customer_name ? ': ' : ''}${a.description || ''}`.trim();

      return vevent({
        uid: `apt-${a.id}@autoservice.local`,
        start, end,
        summary,
        description,
        location: a.license_plate ? `Vehicle ${a.license_plate}` : undefined,
      });
    });

    const ics = wrapCalendar(events);
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=appointments.ics`);
    return res.send(ics);
  } catch (err) { next(err); }
});

module.exports = router;
