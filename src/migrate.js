const { Client } = require('pg');
require('dotenv').config();

const migrate = async () => {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  const query = `
    CREATE TABLE IF NOT EXISTS license_keys (
      id SERIAL PRIMARY KEY,
      key TEXT UNIQUE NOT NULL,
      hwid TEXT DEFAULT NULL,
      activated_at TIMESTAMP DEFAULT NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      expires_at TIMESTAMP DEFAULT NULL,
      last_heartbeat TIMESTAMP DEFAULT NULL
    );

    DO $$ 
    BEGIN 
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='license_keys' AND column_name='expires_at') THEN
        ALTER TABLE license_keys ADD COLUMN expires_at TIMESTAMP DEFAULT NULL;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='license_keys' AND column_name='last_heartbeat') THEN
        ALTER TABLE license_keys ADD COLUMN last_heartbeat TIMESTAMP DEFAULT NULL;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='license_keys' AND column_name='customer_name') THEN
        ALTER TABLE license_keys ADD COLUMN customer_name TEXT DEFAULT NULL;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='license_keys' AND column_name='customer_email') THEN
        ALTER TABLE license_keys ADD COLUMN customer_email TEXT DEFAULT NULL;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='license_keys' AND column_name='studio_name') THEN
        ALTER TABLE license_keys ADD COLUMN studio_name TEXT DEFAULT NULL;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='license_keys' AND column_name='phone') THEN
        ALTER TABLE license_keys ADD COLUMN phone TEXT DEFAULT NULL;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='license_keys' AND column_name='app_version') THEN
        ALTER TABLE license_keys ADD COLUMN app_version TEXT DEFAULT NULL;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='license_keys' AND column_name='os_info') THEN
        ALTER TABLE license_keys ADD COLUMN os_info TEXT DEFAULT NULL;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='license_keys' AND column_name='app') THEN
        ALTER TABLE license_keys ADD COLUMN app TEXT DEFAULT 'photo_invoice';
      END IF;
      UPDATE license_keys SET app = 'photo_invoice' WHERE app IS NULL;
    END $$;

    CREATE INDEX IF NOT EXISTS idx_license_keys_app ON license_keys (app);

    CREATE TABLE IF NOT EXISTS trials (
      id SERIAL PRIMARY KEY,
      hwid TEXT NOT NULL,
      started_at TIMESTAMP DEFAULT NOW(),
      last_heartbeat TIMESTAMP DEFAULT NULL
    );

    DO $$ 
    BEGIN 
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='trials' AND column_name='app_version') THEN
        ALTER TABLE trials ADD COLUMN app_version TEXT DEFAULT NULL;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='trials' AND column_name='os_info') THEN
        ALTER TABLE trials ADD COLUMN os_info TEXT DEFAULT NULL;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='trials' AND column_name='app') THEN
        ALTER TABLE trials ADD COLUMN app TEXT DEFAULT 'photo_invoice';
      END IF;
      UPDATE trials SET app = 'photo_invoice' WHERE app IS NULL;

      -- Safely drop old single-hwid unique constraint if present
      IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'trials_hwid_key' 
        AND conrelid = 'trials'::regclass
      ) THEN
        ALTER TABLE trials DROP CONSTRAINT trials_hwid_key;
      END IF;
    END $$;

    CREATE UNIQUE INDEX IF NOT EXISTS idx_trials_hwid_app ON trials (hwid, app);
  `;

  try {
    console.log('Running database migrations...');
    await client.connect();
    await client.query(query);
    console.log('Migration successful: all tables are ready.');
  } catch (err) {
    console.error('Migration failed:', err.message);
    throw err;
  } finally {
    await client.end();
  }
};

module.exports = migrate;

// Auto-run when called directly: node src/migrate.js
if (require.main === module) {
  migrate()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
