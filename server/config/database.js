const { Pool } = require('pg');
require('dotenv').config();

// Database configuration with better error handling
const dbConfig = {
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  // Connection pool settings
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

console.log('Database config:', {
  host: process.env.DB_HOST || 'from DATABASE_URL',
  database: process.env.DB_NAME || 'from DATABASE_URL',
  ssl: dbConfig.ssl
});

const pool = new Pool(dbConfig);

// Test the connection
pool.on('connect', () => {
  console.log('✅ New client connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('❌ Unexpected database error:', err);
  process.exit(-1);
});

module.exports = pool;