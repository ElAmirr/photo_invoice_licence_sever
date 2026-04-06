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
    const newKey = uuidv4();

    try {
        await db.query(
            'INSERT INTO license_keys (key) VALUES ($1)',
            [newKey]
        );

        res.status(201).json({
            success: true,
            key: newKey
        });
    } catch (err) {
        console.error('Key generation error:', err);
        res.status(500).json({ error: "Failed to generate key" });
    }
});

module.exports = router;
