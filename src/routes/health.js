const express = require('express');
const router = express.Router();

/**
 * @route   GET /api/health
 * @desc    Simple health check
 */
router.get('/', (req, res) => {
    res.json({ status: 'ok' });
});

module.exports = router;
