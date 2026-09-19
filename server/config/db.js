const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

let pool;

try {
  let poolConfig;

  if (process.env.DATABASE_URL || process.env.MYSQL_URL) {
    poolConfig = process.env.DATABASE_URL || process.env.MYSQL_URL;
  } else {
    poolConfig = {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT, 10) || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'new_leap_labs',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      connectTimeout: 8000,
      dateStrings: true // Return dates as strings to avoid timezone shift in JSON
    };

    const isRemote = poolConfig.host && !['localhost', '127.0.0.1'].includes(poolConfig.host);
    if (process.env.DB_SSL === 'true' || process.env.DB_SSL === '1' || isRemote) {
      poolConfig.ssl = { rejectUnauthorized: false };
    }
  }

  pool = mysql.createPool(poolConfig);
} catch (err) {
  console.error('MySQL Pool creation error:', err.message);
}

/**
 * Execute a query with parameters using the connection pool.
 */
async function query(sql, params = []) {
  if (!pool) {
    throw new Error('Database pool not initialized. Please verify DB configuration in environment variables.');
  }
  const [rows] = await pool.execute(sql, params);
  return rows;
}

/**
 * Execute a callback inside a database transaction.
 * Automatically handles BEGIN, COMMIT, and ROLLBACK.
 */
async function withTransaction(callback) {
  if (!pool) {
    throw new Error('Database pool not initialized. Please verify DB configuration in environment variables.');
  }
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * Test database connection.
 */
async function testConnection() {
  if (!pool) {
    return { success: false, error: 'Database pool is not initialized' };
  }
  try {
    const connection = await pool.getConnection();
    connection.release();
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

module.exports = {
  pool,
  query,
  withTransaction,
  testConnection
};

