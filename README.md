# Shootix License Server

Node.js/Express backend for validating software license keys for the Shootix Electron desktop app.

## Features
- **License Activation**: HWID-locked key activation.
- **Admin API**: Protected key generation endpoint.
- **PostgreSQL**: Robust persistence for license keys.
- **Render Ready**: Blueprint included for easy deployment.

---

## Deployment on Render

### 1. Create a PostgreSQL Database
- Go to [Dashboard](https://dashboard.render.com/) > **New** > **Database**.
- Name: `shootix_db`
- Copy the **Internal Database URL** for the next step.

### 2. Deploy the Web Service
- Click **New** > **Blueprint**.
- Connect your GitHub repository.
- Render will automatically detect `render.yaml` and set up the Web Service.
- It will run `npm run migrate` automatically on the first build.

### 3. Environment Variables
If not using Blueprints, manually set these in the Render dashboard:
- `DATABASE_URL`: Your PostgreSQL connection string.
- `ADMIN_SECRET`: A secret string used for the `/api/admin` endpoints.
- `PORT`: `3000` (Render's default is fine too).

---

## API Endpoints

### 1. Health Check
`GET /api/health`
- **Response**: `{ "status": "ok" }`

### 2. Activate License
`POST /api/activate`
- **Body**: `{ "key": "...", "hwid": "..." }`
- **Logic**: 
  - Checks if the key exists.
  - Binds the key to the `hwid` if it's currently unassigned.
  - Rejects if the key is already assigned to a different `hwid`.

### 3. Generate Key (Admin Only)
`POST /api/admin/generate-key`
- **Headers**: `x-admin-token: YOUR_ADMIN_SECRET`
- **Body** (Optional): `{ "durationDays": 30 }`
- **Response**: `{ "success": true, "key": "..." }`
- **Logic**: If `durationDays` is provided, the key will expire after that many days. If omitted, it's a **Lifetime** key.

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
