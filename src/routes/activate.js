const express = require('express');
const router = express.Router();
const db = require('../db');

/**
 * @route   POST /api/activate
 * @desc    Activate a license key and bind it to a hardware ID (HWID)
 */
router.post('/', async (req, res) => {
    const { key, hwid } = req.body;

    if (!key || !hwid) {
        return res.status(400).json({
            success: false,
            message: "License key and HWID are required."
        });
    }

    try {
        // 1. Check if the key exists
        const result = await db.query(
            'SELECT id, hwid, expires_at FROM license_keys WHERE key = $1',
            [key]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Invalid license key."
            });
        }

        const license = result.rows[0];

        // 1.5. Check expiration
        if (license.expires_at && new Date() > new Date(license.expires_at)) {
            return res.status(403).json({
                success: false,
                message: "Votre abonnement a expiré"
            });
        }

        // 2. If already activated by a different HWID
        if (license.hwid && license.hwid !== hwid) {
            return res.status(403).json({
                success: false,
                message: "This key is already activated on another device."
            });
        }

        // 3. If already activated by the SAME HWID (idempotency)
        if (license.hwid === hwid) {
            return res.json({
                success: true,
                message: "Key already activated on this device.",
                expiresAt: license.expires_at,
                expires_at: license.expires_at
            });
        }

        // 4. Activate key (bind to HWID)
        await db.query(
            'UPDATE license_keys SET hwid = $1, activated_at = NOW() WHERE key = $2',
            [hwid, key]
        );

        return res.json({
            success: true,
            message: "Activé avec succès",
            expiresAt: license.expires_at,
            expires_at: license.expires_at
        });

    } catch (err) {
        console.error('Activation error:', err);
        return res.status(500).json({
            success: false,
            message: "Internal server error."
        });
    }
});

/**
 * @route   POST /api/activate/heartbeat
 * @desc    Update the last seen status of a license
 */
router.post('/heartbeat', async (req, res) => {
    const { key, hwid } = req.body;

    if (!key || !hwid) {
        return res.status(400).json({ success: false, message: "Key and HWID required." });
    }

    try {
        const result = await db.query(
            'UPDATE license_keys SET last_heartbeat = NOW() WHERE key = $1 AND hwid = $2 RETURNING id, expires_at',
            [key, hwid]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ success: false, message: "License not found or HWID mismatch." });
        }

        res.json({
            success: true,
            expiresAt: result.rows[0].expires_at,
            expires_at: result.rows[0].expires_at
        });
    } catch (err) {
        console.error('Heartbeat error:', err);
        res.status(500).json({ success: false });
    }
});

module.exports = router;
