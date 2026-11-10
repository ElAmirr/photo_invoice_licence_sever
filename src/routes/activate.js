const express = require('express');
const router = express.Router();
const db = require('../db');

/**
 * Helper to normalize app name
 */
const normalizeApp = (app) => {
    if (!app) return null;
    const lower = String(app).trim().toLowerCase();
    if (lower === 'youtube_video_downloader' || lower === 'vidos' || lower === 'tubeflow' || lower === 'yt_downloader') {
        return 'youtube_video_downloader';
    }
    if (lower === 'photo_invoice' || lower === 'shootix') {
        return 'photo_invoice';
    }
    return lower;
};

/**
 * @route   POST /api/activate
 * @desc    Activate a license key and bind it to a hardware ID (HWID)
 */
router.post('/', async (req, res) => {
    const { key, hwid, version, os, app } = req.body;

    if (!key || !hwid) {
        return res.status(400).json({
            success: false,
            message: "License key and HWID are required."
        });
    }

    const requestApp = normalizeApp(app);

    try {
        // 1. Check if the key exists
        const result = await db.query(
            'SELECT id, hwid, expires_at, app FROM license_keys WHERE key = $1',
            [key]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Invalid license key."
            });
        }

        const license = result.rows[0];
        const licenseApp = license.app || 'photo_invoice';

        // 1.2. Validate application match
        if (requestApp && licenseApp !== requestApp) {
            const readableLicenseApp = licenseApp === 'youtube_video_downloader' ? 'YouTube Video Downloader (Vidos)' : 'Photo Invoice (Shootix)';
            return res.status(403).json({
                success: false,
                message: `This license key is only valid for ${readableLicenseApp}.`
            });
        }

        // If requestApp is missing but key is for youtube_video_downloader, prevent legacy Shootix clients from claiming it
        if (!requestApp && licenseApp === 'youtube_video_downloader') {
            return res.status(403).json({
                success: false,
                message: "This license key is only valid for YouTube Video Downloader (Vidos)."
            });
        }

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
            console.log(`[Heartbeat] Key ${key} seen again on ${hwid} (${licenseApp} v${version || '?'})`);
            // Update last seen heartbeat even if already activated
            await db.query(
                `UPDATE license_keys 
                 SET last_heartbeat = NOW(), 
                     app_version = CASE WHEN $2::text IS NOT NULL AND $2::text <> '' THEN $2::text ELSE app_version END,
                     os_info = CASE WHEN $3::text IS NOT NULL AND $3::text <> '' THEN $3::text ELSE os_info END 
                 WHERE key = $1`,
                [key, version, os]
            );

            return res.json({
                success: true,
                message: "Key already activated on this device.",
                expiresAt: license.expires_at,
                expires_at: license.expires_at,
                app: licenseApp
            });
        }

        // 4. Activate key (bind to HWID)
        await db.query(
            'UPDATE license_keys SET hwid = $1, activated_at = NOW(), last_heartbeat = NOW(), app_version = $3::text, os_info = $4::text WHERE key = $2',
            [hwid, key, version, os]
        );

        return res.json({
            success: true,
            message: "Activé avec succès",
            expiresAt: license.expires_at,
            expires_at: license.expires_at,
            app: licenseApp
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
    const { key, hwid, version, os, app } = req.body;

    console.log(`[Heartbeat Attempt] Key: ${key}, HWID: ${hwid}, App: ${app || 'N/A'}, Version: ${version || 'N/A'}, OS: ${os || 'N/A'}`);

    if (!key || !hwid) {
        return res.status(400).json({ success: false, message: "Key and HWID required." });
    }

    const requestApp = normalizeApp(app);

    try {
        console.log(`[Heartbeat] Manual heartbeat for ${key} on ${hwid} (v${version || '?'})`);
        
        let query = `UPDATE license_keys 
             SET last_heartbeat = NOW(), 
                 app_version = CASE WHEN $3::text IS NOT NULL AND $3::text <> '' THEN $3::text ELSE app_version END,
                 os_info = CASE WHEN $4::text IS NOT NULL AND $4 <> '' THEN $4::text ELSE os_info END 
             WHERE key = $1 AND hwid = $2`;
        const params = [key, hwid, version, os];

        if (requestApp) {
            query += ` AND app = $5`;
            params.push(requestApp);
        }

        query += ` RETURNING id, expires_at, app`;

        const result = await db.query(query, params);

        if (result.rowCount === 0) {
            return res.status(404).json({ success: false, message: "License not found, HWID mismatch, or wrong application." });
        }

        res.json({
            success: true,
            expiresAt: result.rows[0].expires_at,
            expires_at: result.rows[0].expires_at,
            app: result.rows[0].app
        });
    } catch (err) {
        console.error('Heartbeat error:', err);
        res.status(500).json({ success: false });
    }
});

module.exports = router;
