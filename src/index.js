const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Run database migrations on start
const migrate = require('./migrate');
migrate();

const app = express();
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'x-admin-token']
}));
const PORT = process.env.PORT || 3000;

// Routes
const healthRoute = require('./routes/health');
const activateRoute = require('./routes/activate');
const adminRoute = require('./routes/admin');
const trialsRoute = require('./routes/trials');

// Middleware
app.use(express.json());

// Routes implementation
app.use('/api/health', healthRoute);
app.use('/api/activate', activateRoute);
app.use('/api/admin', adminRoute);
app.use('/api/trials', trialsRoute);

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
