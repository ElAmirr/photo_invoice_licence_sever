const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors()); // Enable CORS for all origins
const PORT = process.env.PORT || 3000;

// Routes
const healthRoute = require('./routes/health');
const activateRoute = require('./routes/activate');
const adminRoute = require('./routes/admin');

// Middleware
app.use(cors());
app.use(express.json());

// Routes implementation
app.use('/api/health', healthRoute);
app.use('/api/activate', activateRoute);
app.use('/api/admin', adminRoute);

// Error Handling Middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        message: "Critical internal server error."
    });
});

// Start Server
app.listen(PORT, () => {
    console.log(`Shootix License Server running on port ${PORT}`);
    console.log(`Database URL: ${process.env.DATABASE_URL ? 'Connected' : 'Missing DATABASE_URL'}`);
});
