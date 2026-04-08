const db = require('./db');

const migrate = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS license_keys (
      id SERIAL PRIMARY KEY,
      key TEXT UNIQUE NOT NULL,
      hwid TEXT DEFAULT NULL,
      activated_at TIMESTAMP DEFAULT NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      expires_at TIMESTAMP DEFAULT NULL
    );

    -- Add column if it doesn't exist (for existing databases)
    DO $$ 
    BEGIN 
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='license_keys' AND column_name='expires_at') THEN
        ALTER TABLE license_keys ADD COLUMN expires_at TIMESTAMP DEFAULT NULL;
      END IF;
    END $$;
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
