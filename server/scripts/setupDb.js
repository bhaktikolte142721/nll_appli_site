const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

async function runSqlFile(connection, filePath) {
  console.log(`Executing SQL file: ${path.basename(filePath)}...`);
  const content = fs.readFileSync(filePath, 'utf8');

  // Split content by semicolon while respecting strings and comments
  // A clean split by semicolon followed by newline/whitespace:
  const statements = content
    .split(/;\s*$/m)
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  for (const statement of statements) {
    if (statement.trim()) {
      try {
        await connection.query(statement);
      } catch (err) {
        // Ignore "database exists" warning or duplicate key warnings if any
        if (err.code !== 'ER_DB_CREATE_EXISTS') {
          console.warn(`Warning executing statement: ${statement.slice(0, 60)}...`);
          console.warn(`Reason: ${err.message}`);
        }
      }
    }
  }
  console.log(` Finished executing: ${path.basename(filePath)}`);
}

async function setupDatabase() {
  console.log('====================================================');
  console.log(' New Leap Labs - MySQL Database Setup Script');
  console.log('====================================================');

  const config = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true
  };

  console.log(`Connecting to MySQL at ${config.host}:${config.port} as user '${config.user}'...`);

  let connection;
  try {
    connection = await mysql.createConnection(config);
    console.log(' Connected to MySQL server successfully.');
  } catch (err) {
    console.error(' Failed to connect to MySQL server.');
    console.error(`Error code: ${err.code}`);
    console.error(`Error message: ${err.message}`);
    console.error('\nPlease verify that:');
    console.error('1. MySQL server is running (e.g. Windows service MySQL80)');
    console.error('2. Your DB_PASSWORD and DB_USER in .env match your MySQL setup.');
    process.exit(1);
  }

  try {
    const schemaPath = path.join(__dirname, '..', '..', 'database', 'schema.sql');
    const seedPath = path.join(__dirname, '..', '..', 'database', 'seed.sql');

    // Run schema.sql
    if (fs.existsSync(schemaPath)) {
      const schemaSql = fs.readFileSync(schemaPath, 'utf8');
      await connection.query(schemaSql);
      console.log(' Schema created successfully.');
    } else {
      console.error(` Schema file not found at ${schemaPath}`);
    }

    // Run seed.sql
    if (fs.existsSync(seedPath)) {
      const seedSql = fs.readFileSync(seedPath, 'utf8');
      await connection.query(seedSql);
      console.log(' Database seeded with sample records and admin user.');
    } else {
      console.error(` Seed file not found at ${seedPath}`);
    }

    console.log('====================================================');
    console.log(' Database initialization complete!');
    console.log(' Default Admin: admin@newleaplabs.com / Admin@123');
    console.log(' Candidate 1: bhakti@example.com / Candidate@123');
    console.log(' Candidate 2: rohan.deshmukh@example.com / Candidate@123');
    console.log('====================================================');
  } catch (err) {
    console.error(' Error during SQL execution:', err);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

setupDatabase();
