const dotenv = require('dotenv');
dotenv.config();

const app = require('./app');
const { testConnection } = require('./config/db');

const PORT = process.env.PORT || 5000;

async function startServer() {
  // Test MySQL connection
  const dbStatus = await testConnection();
  if (dbStatus.success) {
    console.log(' Successfully connected to MySQL database: ' + (process.env.DB_NAME || 'new_leap_labs'));
  } else {
    console.warn(' MySQL connection warning:', dbStatus.error);
    console.warn('  Ensure MySQL server is running and database credentials in .env are configured.');
  }

  const server = app.listen(PORT, () => {
    console.log(` New Leap Labs REST API Server running on port ${PORT}`);
    console.log(` Health check: http://localhost:${PORT}/api/health`);
    console.log(` Client URL: ${process.env.CLIENT_URL || 'http://localhost:3000'}`);
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    server.close(() => {
      console.log('HTTP server closed');
      process.exit(0);
    });
  });
}

startServer();
