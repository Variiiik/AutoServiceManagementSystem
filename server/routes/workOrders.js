const express = require('express');
const { body, validationResult } = require('express-validator');
const pool = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Get work orders (filtered by role)
// GET /api/work-orders
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        wo.*,
        c.name AS customer_name,
        v.make, v.model, v.year, v.license_plate,
        u.full_name AS mechanic_name,
        (
        COALESCE(wo.labor_hours, 0) * COALESCE(wo.labor_rate, 0)
        +
        COALESCE((
          SELECT SUM(wop.quantity_used * wop.unit_price)
          FROM work_order_parts wop
          WHERE wop.work_order_id = wo.id
        ), 0)
      ) AS total_amount,
      COALESCE((
        SELECT SUM(wop.quantity_used * COALESCE(wop.cost_price, 0))
        FROM work_order_parts wop
        WHERE wop.work_order_id = wo.id
      ), 0) AS parts_cost_total
      FROM work_orders wo
      LEFT JOIN vehicles  v ON v.id = wo.vehicle_id
      LEFT JOIN customers c ON c.id = wo.customer_id
      LEFT JOIN users     u ON u.id = wo.assigned_to
      ORDER BY wo.created_at DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error('Error fetching work orders:', err);
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

// CREATE Work Order (admin)
router.post('/',
  authenticateToken,
  requireRole(['admin']),
  body('vehicle_id').isUUID().withMessage('vehicle_id must be UUID'),
  body('customer_id').isUUID().withMessage('customer_id must be UUID'),
  body('title').isString().trim().notEmpty().withMessage('title is required'),
  body('description').optional().isString(),
  body('assigned_to').optional({ nullable: true }).isUUID().withMessage('assigned_to must be UUID'),
  body('labor_hours').optional().isFloat({ min: 0 }),
  body('labor_rate').optional().isFloat({ min: 0 }),
  body('status').optional().isIn(['pending','in_progress','completed','cancelled']),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

      const {
        vehicle_id,
        customer_id,
        title,
        description = null,
        assigned_to = null,
        labor_hours = 0,
        labor_rate = 0,
        status = 'pending',
        priority = 'medium',
        estimated_hours = 0
      } = req.body;

      const { rows } = await pool.query(
        `
        INSERT INTO work_orders
          (vehicle_id, customer_id, title, description, assigned_to, labor_hours, labor_rate, status, priority, estimated_hours)
        VALUES
          ($1::uuid, $2::uuid, $3, $4, $5::uuid, $6::numeric, $7::numeric, $8, $9, $10::numeric)
        RETURNING *;
        `,
        [vehicle_id, customer_id, title.trim(), description, assigned_to, labor_hours || 0, labor_rate || 0, status, priority, estimated_hours || 0]
      );

      res.status(201).json(rows[0]);
    } catch (err) {
      console.error('Error creating work order:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);


// Update work order
router.put('/:id',
  authenticateToken,
  requireRole(['admin']),
  body('vehicle_id').optional().isUUID(),
  body('customer_id').optional().isUUID(),
  body('title').optional().isString().trim().notEmpty(),
  body('description').optional().isString(),
  body('assigned_to').optional({ nullable: true }).isUUID(),
  body('labor_hours').optional().isFloat({ min: 0 }),
  body('labor_rate').optional().isFloat({ min: 0 }),
  body('status').optional().isIn(['pending','in_progress','completed','cancelled']),
  body('priority').optional().isIn(['low','medium','high','urgent']),
  body('estimated_hours').optional().isFloat({ min: 0 }),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

      const { id } = req.params;
      const updates = req.body;
      const fields = Object.keys(updates);
      if (!fields.length) return res.status(400).json({ error: 'No fields to update' });

      const setClause = fields.map((f, i) => `${f} = $${i + 2}`).join(', ');
      const values = [id, ...fields.map(f => updates[f])];

      const { rows } = await pool.query(
        `UPDATE work_orders SET ${setClause}, updated_at = now() WHERE id = $1 RETURNING *`,
        values
      );
      if (!rows.length) return res.status(404).json({ error: 'Not found' });
      res.json(rows[0]);
    } catch (err) {
      console.error('Error updating work order:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

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
    const { rows } = await pool.query(`
      SELECT
        wop.*,
        -- kui inventory-st, siis kuvame inventory nime/sku; kui custom, siis custom_name/custom_sku
        COALESCE(wop.custom_name, i.name) AS name,
        COALESCE(wop.custom_sku, i.sku)  AS sku
      FROM work_order_parts wop
      LEFT JOIN inventory i ON i.id = wop.inventory_item_id
      WHERE wop.work_order_id = $1::uuid
      ORDER BY wop.created_at ASC, wop.id ASC
    `, [id]);
    res.json(rows);
  } catch (err) {
    console.error('Error fetching order parts:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add part to work order
router.post('/:id/parts', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const workOrderId = req.params.id; // uuid
    const {
      is_custom = false,
      inventory_item_id = null,
      custom_name = null,
      custom_sku = null,
      quantity_used,
      unit_price,
      cost_price = null
    } = req.body;

    if (!quantity_used || !unit_price) {
      return res.status(400).json({ error: 'quantity_used and unit_price are required' });
    }

    // Valideeri teed
    if (is_custom) {
      if (!custom_name) return res.status(400).json({ error: 'custom_name is required for custom items' });

      const insert = await pool.query(
        `INSERT INTO work_order_parts
           (work_order_id, inventory_item_id, quantity_used, unit_price, is_custom, custom_name, custom_sku, cost_price)
         VALUES ($1, NULL, $2, $3, TRUE, $4, $5, $6)
         RETURNING *`,
        [workOrderId, quantity_used, unit_price, custom_name, custom_sku, cost_price]
      );
      return res.status(201).json(insert.rows[0]);

    } else {
      if (!inventory_item_id) return res.status(400).json({ error: 'inventory_item_id is required for inventory items' });

      const insert = await pool.query(
        `INSERT INTO work_order_parts
           (work_order_id, inventory_item_id, quantity_used, unit_price, is_custom, cost_price)
         VALUES ($1, $2, $3, $4, FALSE, $5)
         RETURNING *`,
        [workOrderId, inventory_item_id, quantity_used, unit_price, cost_price]
      );

      // (valikuline) lao vähendamine:
      await pool.query(
        `UPDATE inventory_items
           SET stock_quantity = stock_quantity - $2,
               updated_at = NOW()
         WHERE id = $1`,
        [inventory_item_id, quantity_used]
      );

      return res.status(201).json(insert.rows[0]);
    }
  } catch (err) {
    console.error('Error adding part:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id/parts/:partId',
  authenticateToken,
  requireRole(['admin']),
  async (req, res) => {
    try {
      const { id, partId } = req.params;
      const { rowCount } = await pool.query(`
        DELETE FROM work_order_parts
        WHERE id = $1::uuid AND work_order_id = $2::uuid
      `, [partId, id]);

      if (!rowCount) return res.status(404).json({ error: 'Part not found' });
      res.json({ success: true });
    } catch (err) {
      console.error('Error deleting part:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// UPDATE a part (qty / unit_price / cost_price, jm)
router.patch('/:orderId/parts/:partId', authenticateToken, requireRole(['admin', 'mechanic']), async (req, res) => {
  const client = await pool.connect();
  try {
    const { orderId, partId } = req.params;
    const { quantity_used, unit_price, cost_price } = req.body;

    await client.query('BEGIN');

    // Loe vana väärtused (lao korrigeerimiseks)
    const { rows: oldRows } = await client.query(
      `SELECT id, work_order_id, inventory_item_id, quantity_used, unit_price, is_custom
       FROM work_order_parts
       WHERE id = $1 AND work_order_id = $2
       LIMIT 1`,
      [partId, orderId]
    );
    if (!oldRows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Part not found' });
    }
    const old = oldRows[0];

    // Lao delta kui inventari osa ja qty muutub
    if (old.inventory_item_id != null && typeof quantity_used === 'number') {
      const delta = old.quantity_used - quantity_used; // kui vähendad qty, paneme vahe lattu tagasi
      if (delta !== 0) {
        await client.query(
          `UPDATE inventory_items
             SET stock_quantity = stock_quantity + $2, updated_at = NOW()
           WHERE id = $1`,
          [old.inventory_item_id, delta]
        );
      }
    }

    // --- SIIN ON PARANDUS: SET placeholderid algavad $3-st ---
    const setPieces = [];
    const values = [partId, orderId]; // $1, $2 on WHERE jaoks
    if (typeof quantity_used === 'number') { setPieces.push(`quantity_used = $${values.length + 1}`); values.push(quantity_used); }
    if (typeof unit_price === 'number')     { setPieces.push(`unit_price   = $${values.length + 1}`); values.push(unit_price); }
    if (typeof cost_price === 'number')     { setPieces.push(`cost_price   = $${values.length + 1}`); values.push(cost_price); }

    if (!setPieces.length) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    const { rows: upd } = await client.query(
      `UPDATE work_order_parts
         SET ${setPieces.join(', ')}, updated_at = NOW()
       WHERE id = $1 AND work_order_id = $2
       RETURNING *`,
      values
    );

    await client.query('COMMIT');
    return res.json(upd[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error updating part:', err);
    return res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});


// DELETE a part (ja taasta ladu kui inventory osa)
router.delete('/:orderId/parts/:partId', authenticateToken, requireRole(['admin', 'mechanic']), async (req, res) => {
  const client = await pool.connect();
  try {
    const { orderId, partId } = req.params;

    await client.query('BEGIN');

    const { rows: oldRows } = await client.query(
      `SELECT id, work_order_id, inventory_item_id, quantity_used, is_custom
       FROM work_order_parts
       WHERE id = $1 AND work_order_id = $2
       LIMIT 1`,
      [partId, orderId]
    );
    if (!oldRows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Part not found' });
    }
    const old = oldRows[0];

    if (old.inventory_item_id) {
      await client.query(
        `UPDATE inventory_items
           SET stock_quantity = stock_quantity + $2, updated_at = NOW()
         WHERE id = $1`,
        [old.inventory_item_id, old.quantity_used]
      );
    }

    await client.query(
      `DELETE FROM work_order_parts WHERE id = $1 AND work_order_id = $2`,
      [partId, orderId]
    );

    await client.query('COMMIT');
    return res.json({ success: true });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error deleting part:', err);
    return res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});


module.exports = router;