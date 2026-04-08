const express = require('express');
const router = express.Router();
const db = require('../db');

/**
 * @route   POST /api/trials/start
 * @desc    Register a new machine starting a free trial
 */
router.post('/start', async (req, res) => {
    const { hwid } = req.body;

    if (!hwid) {
        return res.status(400).json({ success: false, message: "HWID is required." });
    }

    try {
        // Upsert: If already exists, we just return success (doesn't change start date)
        await db.query(
            'INSERT INTO trials (hwid) VALUES ($1) ON CONFLICT (hwid) DO NOTHING',
            [hwid]
        );
        res.status(201).json({ success: true });
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
    const { hwid } = req.body;

    if (!hwid) {
        return res.status(400).json({ success: false, message: "HWID is required." });
    }

    try {
        const result = await db.query(
            'UPDATE trials SET last_heartbeat = NOW() WHERE hwid = $1 RETURNING id',
            [hwid]
        );

        if (result.rowCount === 0) {
            // If doesn't exist, we could auto-start trial here, but let's be strict
            return res.status(404).json({ success: false, message: "Trial not found." });
        }

        res.json({ success: true });
    } catch (err) {
        console.error('Trial heartbeat error:', err);
        res.status(500).json({ success: false });
    }
});

module.exports = router;
