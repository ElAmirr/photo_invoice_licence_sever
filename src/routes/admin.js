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
 * @route   POST /api/admin/generate-key
 * @desc    Generate a new unique license key and store it in the DB
 */
router.post('/generate-key', isAdmin, async (req, res) => {
    const { durationDays } = req.body;
    const newKey = uuidv4();

    try {
        let query = 'INSERT INTO license_keys (key) VALUES ($1)';
        let params = [newKey];

        if (durationDays) {
            query = 'INSERT INTO license_keys (key, expires_at) VALUES ($1, NOW() + ($2 || \' days\')::interval)';
            params.push(durationDays);
        }

        await db.query(query, params);

        res.status(201).json({
            success: true,
            key: newKey
        });
    } catch (err) {
        console.error('Key generation error:', err);
        res.status(500).json({ error: "Failed to generate key" });
    }
});

/**
 * @route   GET /api/admin/licenses
 * @desc    Fetch all license keys from the database
 */
router.get('/licenses', isAdmin, async (req, res) => {
    try {
        const result = await db.query(
            'SELECT id, key, hwid, activated_at, created_at FROM license_keys ORDER BY created_at DESC'
        );
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

module.exports = router;
