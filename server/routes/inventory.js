const express = require('express');
const { body, param, validationResult } = require('express-validator');
const pool = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Helper: ühtne veahaldus
function sendValidationErrors(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
}

// GET /api/inventory  – kõik kaubad
router.get('/', authenticateToken, async (_req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT i.*,
             (i.stock_quantity <= i.min_stock_level) AS is_low_stock
      FROM inventory i
      ORDER BY i.name
    `);
    res.json(rows);
  } catch (err) {
    console.error('Error fetching inventory:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/inventory/:id  – üks kaup (UUID!)
router.get(
  '/:id',
  authenticateToken,
  param('id').isUUID().withMessage('Invalid inventory id'),
  async (req, res) => {
    const val = sendValidationErrors(req, res);
    if (val) return;

    try {
      const { id } = req.params;
      const { rows } = await pool.query(
        `
        SELECT i.*,
               (i.stock_quantity <= i.min_stock_level) AS is_low_stock
        FROM inventory i
        WHERE i.id = $1
        `,
        [id]
      );
      if (!rows.length) return res.status(404).json({ error: 'Inventory item not found' });
      res.json(rows[0]);
    } catch (err) {
      console.error('Error fetching inventory item:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// POST /api/inventory – loo kaup (admin)
router.post(
  '/',
  authenticateToken,
  requireRole(['admin']),
  body('name').trim().isLength({ min: 1 }).withMessage('Name is required'),
  body('sku').trim().isLength({ min: 1 }).withMessage('SKU is required'),
  body('stock_quantity').optional().isInt({ min: 0 }).withMessage('stock_quantity must be >= 0'),
  body('min_stock_level').optional().isInt({ min: 0 }).withMessage('min_stock_level must be >= 0'),
  body('price').optional().isFloat({ min: 0 }).withMessage('price must be >= 0'),
  async (req, res) => {
    const val = sendValidationErrors(req, res);
    if (val) return;

    try {
      const {
        name,
        sku,
        stock_quantity = 0,
        min_stock_level = 5,
        price = 0
      } = req.body;

      const { rows } = await pool.query(
        `
        INSERT INTO inventory (name, sku, stock_quantity, min_stock_level, price)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
        `,
        [name.trim(), sku.trim(), Number(stock_quantity), Number(min_stock_level), Number(price)]
      );

      res.status(201).json(rows[0]);
    } catch (err) {
      if (err.code === '23505') {
        // eeldame unikaalne sku
        return res.status(400).json({ error: 'SKU already exists' });
      }
      console.error('Error creating inventory item:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// PUT /api/inventory/:id – uuenda kaup (admin)
router.put(
  '/:id',
  authenticateToken,
  requireRole(['admin']),
  param('id').isUUID().withMessage('Invalid inventory id'),
  body('name').trim().isLength({ min: 1 }).withMessage('Name is required'),
  body('sku').trim().isLength({ min: 1 }).withMessage('SKU is required'),
  body('stock_quantity').isInt({ min: 0 }).withMessage('stock_quantity must be >= 0'),
  body('min_stock_level').isInt({ min: 0 }).withMessage('min_stock_level must be >= 0'),
  body('price').isFloat({ min: 0 }).withMessage('price must be >= 0'),
  async (req, res) => {
    const val = sendValidationErrors(req, res);
    if (val) return;

    try {
      const { id } = req.params;
      const { name, sku, stock_quantity, min_stock_level, price } = req.body;

      const { rows } = await pool.query(
        `
        UPDATE inventory
           SET name = $1,
               sku = $2,
               stock_quantity = $3,
               min_stock_level = $4,
               price = $5,
               updated_at = CURRENT_TIMESTAMP
         WHERE id = $6
         RETURNING *
        `,
        [name.trim(), sku.trim(), Number(stock_quantity), Number(min_stock_level), Number(price), id]
      );

      if (!rows.length) return res.status(404).json({ error: 'Inventory item not found' });
      res.json(rows[0]);
    } catch (err) {
      if (err.code === '23505') {
        return res.status(400).json({ error: 'SKU already exists' });
      }
      console.error('Error updating inventory item:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// PATCH /api/inventory/:id/stock – muuda kogust (admin või mehhaanik, vajadusel kohanda rolli)
router.patch(
  '/:id/stock',
  authenticateToken,
  // requireRole(['admin']), // kui tahad, et ainult admin saaks, jäta sisse
  param('id').isUUID().withMessage('Invalid inventory id'),
  body('stock_quantity').isInt({ min: 0 }).withMessage('stock_quantity must be >= 0'),
  async (req, res) => {
    const val = sendValidationErrors(req, res);
    if (val) return;

    try {
      const { id } = req.params;
      const { stock_quantity } = req.body;

      const { rows } = await pool.query(
        `
        UPDATE inventory
           SET stock_quantity = $1,
               updated_at = CURRENT_TIMESTAMP
         WHERE id = $2
         RETURNING *
        `,
        [Number(stock_quantity), id]
      );

      if (!rows.length) return res.status(404).json({ error: 'Inventory item not found' });

      res.json(rows[0]);
    } catch (err) {
      console.error('Error updating stock quantity:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// DELETE /api/inventory/:id – kustuta kaup (admin)
router.delete(
  '/:id',
  authenticateToken,
  requireRole(['admin']),
  param('id').isUUID().withMessage('Invalid inventory id'),
  async (req, res) => {
    const val = sendValidationErrors(req, res);
    if (val) return;

    try {
      const { id } = req.params;
      const { rows } = await pool.query(
        `DELETE FROM inventory WHERE id = $1 RETURNING *`,
        [id]
      );

      if (!rows.length) return res.status(404).json({ error: 'Inventory item not found' });
      res.json({ message: 'Inventory item deleted successfully' });
    } catch (err) {
      console.error('Error deleting inventory item:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

module.exports = router;
