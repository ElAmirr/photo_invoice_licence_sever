const db = require('./db');

const migrate = async () => {
    const query = `
    CREATE TABLE IF NOT EXISTS license_keys (
      id SERIAL PRIMARY KEY,
      key TEXT UNIQUE NOT NULL,
      hwid TEXT DEFAULT NULL,
      activated_at TIMESTAMP DEFAULT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `;

    try {
        console.log('Running database migrations...');
        await db.query(query);
        console.log('Migration successful: table "license_keys" is ready.');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
};

migrate();
