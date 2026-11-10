# Multi-App License Server & Management Dashboard

Node.js/Express backend and Web Dashboard for validating and managing software license keys for:
1. **Photo Invoice (Shootix)** desktop application
2. **YouTube Video Downloader (Vidos / TubeFlow)** desktop application

## Features
- **Web Dashboard**: Modern visual UI at `/` (and `/dashboard`, `/admin`) to generate access keys, inspect statuses, filter by app, and reset HWID.
- **Multi-App Key Generation**: Target either `photo_invoice` or `youtube_video_downloader`.
- **HWID-Locked Activation**: Cryptographic binding to hardware identifiers.
- **Background Heartbeat**: 5-minute heartbeat check with automatic revocation.
- **Trials Management**: Register free trials separated by app and machine HWID.
- **PostgreSQL**: Production-grade persistence with automatic schema migrations.

---

## Web Dashboard
Open the server URL in your browser: `http://localhost:3000/` or your deployed Render URL.
Enter your `ADMIN_SECRET` token to authenticate.
From the dashboard you can:
- Switch between **All Apps**, **Photo Invoice (Shootix)**, and **YouTube Downloader (Vidos)** tabs.
- Click **Create Access Key** to generate keys with lifetime or timed durations (7d, 30d, 90d, 365d, custom) and customer metadata.
- View real-time active bound machines, copy keys, reset HWID bindings for transfers, or delete keys.

---

## API Endpoints

### 1. Health Check
`GET /api/health`
- **Response**: `{ "status": "ok" }`

### 2. Activate License
`POST /api/activate`
- **Body**: `{ "key": "...", "hwid": "...", "app": "youtube_video_downloader", "version": "1.0.0", "os": "win32" }`
- **Logic**:
  - Checks if the key exists.
  - Verifies key is valid for the requested `app`.
  - Binds the key to `hwid` if unassigned.
  - Rejects if assigned to another `hwid` or if expired.

### 3. Generate Key (Admin Only)
`POST /api/admin/generate-key`
- **Headers**: `x-admin-token: YOUR_ADMIN_SECRET`
- **Body** (Optional):
  ```json
  {
    "app": "youtube_video_downloader", // or "photo_invoice"
    "durationDays": 30,               // omitted for lifetime
    "customerName": "John Doe",
    "customerEmail": "john@example.com",
    "studioName": "Creator Studio",
    "phone": "+123456789"
  }
  ```
- **Response**: `{ "success": true, "key": "...", "app": "youtube_video_downloader" }`

---

## Desktop App Integration (Electron)

In your Electron main process, you can validate the license like this:

```javascript
const axios = require('axios');
const { machineIdSync } = require('node-machine-id');

async function activateLicense(licenseKey) {
  const hwid = machineIdSync();
  try {
    const response = await axios.post('https://your-app.onrender.com/api/activate', {
      key: licenseKey,
      hwid: hwid
    });
    return response.data;
  } catch (error) {
    return error.response ? error.response.data : { success: false, message: "Server connection failed" };
  }
}
```
