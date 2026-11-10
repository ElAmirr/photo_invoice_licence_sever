const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db');

/**
 * Middleware to protect admin routes
 */
const isAdmin = (req, res, next) => {
    const adminSecret = process.env.ADMIN_SECRET;
    const providedSecret = req.headers['x-admin-token'];

    if (!providedSecret || providedSecret !== adminSecret) {
        return res.status(401).json({ error: "Unauthorized" });
    }
    next();
};


/**
 * Helper to normalize app name
 */
const normalizeApp = (app) => {
    if (!app) return 'photo_invoice';
    const lower = String(app).trim().toLowerCase();
    if (lower === 'youtube_video_downloader' || lower === 'vidos' || lower === 'tubeflow' || lower === 'yt_downloader') {
        return 'youtube_video_downloader';
    }
    return 'photo_invoice';
};

/**
 * @route   POST /api/admin/generate-key
 * @desc    Generate a new unique license key and store it in the DB
 */
router.post('/generate-key', isAdmin, async (req, res) => {
    const {
        app,
        durationDays,
        customerName,
        customerEmail,
        studioName,
        phone
    } = req.body;

    const newKey = uuidv4();
    const targetApp = normalizeApp(app);

    try {
        let query, params;

        if (durationDays) {
            // Timed key: set expires_at to NOW() + durationDays
            query = `
                INSERT INTO license_keys (key, expires_at, customer_name, customer_email, studio_name, phone, app)
                VALUES ($1, NOW() + ($2 * INTERVAL '1 day'), $3, $4, $5, $6, $7)
                RETURNING *
            `;
            params = [
                newKey,
                parseInt(durationDays),
                customerName || null,
                customerEmail || null,
                studioName || null,
                phone || null,
                targetApp
            ];
        } else {
            // Lifetime key: expires_at stays NULL
            query = `
                INSERT INTO license_keys (key, expires_at, customer_name, customer_email, studio_name, phone, app)
                VALUES ($1, NULL, $2, $3, $4, $5, $6)
                RETURNING *
            `;
            params = [
                newKey,
                customerName || null,
                customerEmail || null,
                studioName || null,
                phone || null,
                targetApp
            ];
        }

        const result = await db.query(query, params);

        res.status(201).json({
            success: true,
            key: newKey,
            app: targetApp,
            license: result.rows[0]
        });
    } catch (err) {
        console.error('Key generation error:', err);
        res.status(500).json({ error: "Failed to generate key" });
    }
});

/**
 * @route   GET /api/admin/licenses
 * @desc    Fetch all license keys from the database, optionally filtered by app
 */
router.get('/licenses', isAdmin, async (req, res) => {
    const { app } = req.query;

    try {
        let query = 'SELECT * FROM license_keys';
        const params = [];

        if (app && app.toLowerCase() !== 'all') {
            query += ' WHERE app = $1';
            params.push(normalizeApp(app));
        }

        query += ' ORDER BY created_at DESC';

        const result = await db.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error('Fetch licenses error:', err);
        res.status(500).json({ error: "Failed to fetch licenses" });
    }
});

/**
 * @route   POST /api/admin/reset-hwid
 * @desc    Clear the HWID binding for a specific license key
 */
router.post('/reset-hwid', isAdmin, async (req, res) => {
    const { key } = req.body;

    if (!key) {
        return res.status(400).json({ error: "License key is required" });
    }

    try {
        const result = await db.query(
            'UPDATE license_keys SET hwid = NULL, activated_at = NULL WHERE key = $1 RETURNING id',
            [key]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ error: "License key not found" });
        }

        res.json({ success: true, message: "HWID reset successfully" });
    } catch (err) {
        console.error('Reset HWID error:', err);
        res.status(500).json({ error: "Failed to reset HWID" });
    }
});

/**
 * @route   DELETE /api/admin/license/:id
 * @desc    Delete a license key from the database
 */
router.delete('/license/:id', isAdmin, async (req, res) => {
    const { id } = req.params;

    try {
        const result = await db.query(
            'DELETE FROM license_keys WHERE id = $1 RETURNING id',
            [id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ error: "License key not found" });
        }

        res.json({ success: true, message: "License key deleted successfully" });
    } catch (err) {
        console.error('Delete license error:', err);
        res.status(500).json({ error: "Failed to delete license" });
    }
});

/**
 * @route   GET /api/admin/trials
 * @desc    Fetch all trial machines from the database, optionally filtered by app
 */
router.get('/trials', isAdmin, async (req, res) => {
    const { app } = req.query;

    try {
        let query = 'SELECT id, hwid, app, started_at, last_heartbeat, app_version, os_info FROM trials';
        const params = [];

        if (app && app.toLowerCase() !== 'all') {
            query += ' WHERE app = $1';
            params.push(normalizeApp(app));
        }

        query += ' ORDER BY started_at DESC';

        const result = await db.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error('Fetch trials error:', err);
        res.status(500).json({ error: "Failed to fetch trials" });
    }
});

/**
 * @route   PUT /api/admin/license/:id/metadata
 * @desc    Update customer, studio metadata, and optional app for a license key
 */
router.put('/license/:id/metadata', isAdmin, async (req, res) => {
    const { id } = req.params;
    const {
        customerName,
        customerEmail,
        studioName,
        phone,
        app
    } = req.body;

    try {
        const query = `
            UPDATE license_keys 
            SET customer_name = $1, 
                customer_email = $2, 
                studio_name = $3, 
                phone = $4,
                app = CASE WHEN $5::text IS NOT NULL AND $5::text <> '' THEN $5::text ELSE app END
            WHERE id = $6::integer 
            RETURNING *
        `;
        const params = [customerName, customerEmail, studioName, phone, app ? normalizeApp(app) : null, id];

        const result = await db.query(query, params);

        if (result.rowCount === 0) {
            return res.status(404).json({ error: "License key not found" });
        }

        res.json({ success: true, message: "Metadata updated successfully", license: result.rows[0] });
    } catch (err) {
        console.error('Update metadata error:', err);
        res.status(500).json({ error: "Failed to update metadata" });
    }
});

module.exports = router;
