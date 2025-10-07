const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;
const isProd = process.env.NODE_ENV === 'production';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// DB test
const pool = require('./config/database');
async function testDatabaseConnection() {
  try {
    await pool.query('SELECT 1');
    console.log('✅ Database connected successfully');
  } catch (e) {
    console.error('❌ Database connection failed:', e.message);
  }
}

// CF / reverse proxy taga:
app.set('trust proxy', 1);

// Helmet + CSP (prod-is range, dev-is lõdvem)
app.use(helmet({
  contentSecurityPolicy: isProd ? {
    useDefaults: true,
    directives: {
      "default-src": ["'self'"],
      "connect-src": ["'self'"], // fetch/XHR samalt domeenilt
      "img-src": ["'self'", "data:", "blob:"],
      "font-src": ["'self'", "data:"],
      "style-src": ["'self'", "'unsafe-inline'"], // tailwind/dev
      "script-src": ["'self'"],
      "frame-ancestors": ["'self'"],
      "base-uri": ["'self'"],
      "form-action": ["'self'"]
    }
  } : false,
  crossOriginEmbedderPolicy: false
}));

// Rate limit
app.use(rateLimit({ windowMs: 15*60*1000, max: 100 }));

// CORS – prodis same-origin, devis lubame Vite
app.use(cors({
  origin: isProd ? FRONTEND_URL : [FRONTEND_URL, 'http://localhost:5173'],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// API routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/customers', require('./routes/customers'));
app.use('/api/vehicles', require('./routes/vehicles'));
app.use('/api/work-orders', require('./routes/workOrders'));
app.use('/api/inventory', require('./routes/inventory'));
app.use('/api/appointments', require('./routes/appointments'));
app.use('/api/dashboard', require('./routes/dashboard'));

app.get('/api/health', (req, res) => res.json({ ok: true }));

// STATIC frontend (build kaust)
if (isProd) {
  const distDir = path.join(__dirname, '..', 'dist'); // kuna sul front on juures, mitte /client
  app.use(express.static(distDir));

  // SPA fallback
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    res.sendFile(path.join(distDir, 'index.html'));
  });
}

// errors
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Server error' });
});

app.listen(PORT, async () => {
  console.log(`🚀 API+Frontend on :${PORT}`);
  await testDatabaseConnection();
});
