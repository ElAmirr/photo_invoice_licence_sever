const db = require('./db');

const migrate = async () => {
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

    -- Add columns if they don't exist (for existing databases)
    DO $$ 
    BEGIN 
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='license_keys' AND column_name='expires_at') THEN
        ALTER TABLE license_keys ADD COLUMN expires_at TIMESTAMP DEFAULT NULL;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='license_keys' AND column_name='last_heartbeat') THEN
        ALTER TABLE license_keys ADD COLUMN last_heartbeat TIMESTAMP DEFAULT NULL;
      END IF;
      -- Customer Info
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
      -- PC Insights
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='license_keys' AND column_name='app_version') THEN
        ALTER TABLE license_keys ADD COLUMN app_version TEXT DEFAULT NULL;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='license_keys' AND column_name='os_info') THEN
        ALTER TABLE license_keys ADD COLUMN os_info TEXT DEFAULT NULL;
      END IF;
    END $$;

    CREATE TABLE IF NOT EXISTS trials (
      id SERIAL PRIMARY KEY,
      hwid TEXT UNIQUE NOT NULL,
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
    END $$;
  `;

  try {
    console.log('Running database migrations...');
    await db.query(query);
    console.log('Migration successful: table "license_keys" is ready.');
  } catch (err) {
    console.error('Migration failed:', err);
    // Don't exit process if we are running as part of the app
    if (require.main === module) process.exit(1);
  }
};

if (require.main === module) {
  migrate();
}

module.exports = migrate;
