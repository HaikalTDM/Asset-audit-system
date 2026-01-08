const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config();

async function run() {
const migrationsDir = path.join(__dirname, '..', 'migrations');
const files = fs.readdirSync(migrationsDir)
  .filter((f) => f.endsWith('.sql'))
  .sort();
const database = process.env.DB_NAME || 'asset_audit';

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database,
    multipleStatements: true,
  });

  try {
    await connection.query(
      `CREATE TABLE IF NOT EXISTS migrations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        applied_at BIGINT NOT NULL
      )`
    );

    const [appliedRows] = await connection.query('SELECT name FROM migrations');
    const applied = new Set(appliedRows.map((row) => row.name));

    for (const file of files) {
      if (applied.has(file)) {
        console.log(`Skipping ${file} (already applied)`);
        continue;
      }
      if (file === '002_add_assessment_photo_blob.sql') {
        const [columns] = await connection.query(
          `SELECT COUNT(*) as count
           FROM information_schema.columns
           WHERE table_schema = ?
             AND table_name = 'assessments'
             AND column_name = 'photo_blob'`,
          [database]
        );
        if (columns?.[0]?.count > 0) {
          await connection.query(
            'INSERT INTO migrations (name, applied_at) VALUES (?, ?)',
            [file, Date.now()]
          );
          console.log(`Skipping ${file} (columns already exist)`);
          continue;
        }
      }
      const sqlPath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(sqlPath, 'utf8');
      await connection.query(sql);
      await connection.query(
        'INSERT INTO migrations (name, applied_at) VALUES (?, ?)',
        [file, Date.now()]
      );
      console.log(`Applied ${file}`);
    }
    console.log('Migration completed');
  } finally {
    await connection.end();
  }
}

run().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
