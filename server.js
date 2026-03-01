require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const path = require('path');
const fs = require('fs');
const authRoutes = require('./routes/auth');
const traceLogger = require('./middleware/traceLogger');
const multer = require('multer');
const currencyService = require('./services/currencyService');

const app = express();
const PORT = process.env.PORT || 3000;

// VERY TOP middleware for total debugging
app.use((req, res, next) => {
    console.log(`[DEBUG] ${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(traceLogger);

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// Static files
app.use('/uploads', express.static(uploadDir));

// Swagger Configuration
const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Signology API',
            version: '1.0.0',
            description: 'API documentation for the Signology application',
        },
        servers: [
            {
                url: `http://backend.prosignalmarket.com:${PORT}`,
            },
        ],
    },
    apis: ['./routes/*.js'], // Path to the API docs
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/user', require('./routes/user'));
app.use('/api/signals', require('./routes/signals'));
app.use('/api/payment', require('./routes/payment'));
app.use('/api/currencies', require('./routes/currencies'));
app.use('/api/forex', require('./routes/forex'));
app.use('/api/stocks', require('./routes/stocks'));
app.use('/api/commodities', require('./routes/commodities'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/locations', require('./routes/locations'));

// Global Error Handler
app.use((err, req, res, next) => {
    console.error('[GLOBAL ERROR]:', err);
    if (err instanceof multer.MulterError) {
        return res.status(400).json({ message: `Upload error: ${err.message}`, details: err.code });
    }
    res.status(err.status || 500).json({
        message: err.message || 'Internal Server Error',
        details: err.stack
    });
});

// Health check
app.get('/', (req, res) => {
    res.send('Signology API is running...');
});

// Start Server Immendiately (so Swagger works)
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📖 Swagger UI available at http://backend.prosignalmarket.com:${PORT}/api-docs`);
});

// MongoDB Connection (Attempt in background)
if (process.env.MONGO_URI) {
    console.log('Attempting to connect to MongoDB...');
    mongoose.connect(process.env.MONGO_URI)
        .then(() => {
            console.log('✅ Connected to MongoDB successfully');
            // Sync currencies on startup
            // Sync currencies on startup - DISABLED per user request
            // currencyService.syncCurrencies().catch(err => {
            //     console.error('❌ Initial Currency Sync Failed:', err.message);
            // });
        })
        .catch(err => {
            console.error('❌ MongoDB Connection Error:', err.message);
            console.log('⚠️  API routes requiring DB will fail, but Swagger is available.');
        });
} else {
    console.error('❌ MONGO_URI is not defined in .env');
}
