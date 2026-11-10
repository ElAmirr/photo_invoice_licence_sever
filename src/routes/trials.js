const express = require('express');
const router = express.Router();
const db = require('../db');

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
 * @route   POST /api/trials/start
 * @desc    Register a new machine starting a free trial
 */
router.post('/start', async (req, res) => {
    const { hwid, version, os, app } = req.body;

    if (!hwid) {
        return res.status(400).json({ success: false, message: "HWID is required." });
    }

    const targetApp = normalizeApp(app);

    try {
        // Upsert on (hwid, app)
        await db.query(
            `INSERT INTO trials (hwid, app, last_heartbeat, app_version, os_info) 
             VALUES ($1, $2, NOW(), $3::text, $4::text) 
             ON CONFLICT (hwid, app) DO UPDATE SET 
                last_heartbeat = NOW(), 
                app_version = CASE WHEN EXCLUDED.app_version IS NOT NULL AND EXCLUDED.app_version <> '' THEN EXCLUDED.app_version ELSE trials.app_version END, 
                os_info = CASE WHEN EXCLUDED.os_info IS NOT NULL AND EXCLUDED.os_info <> '' THEN EXCLUDED.os_info ELSE trials.os_info END`,
            [hwid, targetApp, version, os]
        );
        res.status(201).json({ success: true, app: targetApp });
    } catch (err) {
        console.error('Trial start error:', err);
        res.status(500).json({ success: false });
    }
});

/**
 * @route   POST /api/trials/heartbeat
 * @desc    Update heartbeat for a trial machine
 */
router.post('/heartbeat', async (req, res) => {
    const { hwid, version, os, app } = req.body;

    if (!hwid) {
        return res.status(400).json({ success: false, message: "HWID is required." });
    }

    const targetApp = normalizeApp(app);

    try {
        const result = await db.query(
            `UPDATE trials 
             SET last_heartbeat = NOW(), 
                 app_version = CASE WHEN $2::text IS NOT NULL AND $2::text <> '' THEN $2::text ELSE app_version END,
                 os_info = CASE WHEN $3::text IS NOT NULL AND $3::text <> '' THEN $3::text ELSE os_info END 
             WHERE hwid = $1 AND app = $4 RETURNING id`,
            [hwid, version, os, targetApp]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ success: false, message: "Trial not found." });
        }

        res.json({ success: true });
    } catch (err) {
        console.error('Trial heartbeat error:', err);
        res.status(500).json({ success: false });
    }
});

module.exports = router;
