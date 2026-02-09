require('dotenv').config();
const mongoose = require('mongoose');
const currencyService = require('./services/currencyService');

const runSync = async () => {
    try {
        const mongoUri = process.env.MONGO_URI;
        if (!mongoUri) {
            console.error('MONGO_URI not found in .env');
            process.exit(1);
        }

        await mongoose.connect(mongoUri);
        console.log('✅ Connected to MongoDB');

        console.log('Starting currency sync (up to 20 pages, 5000 records)...');
        const result = await currencyService.syncCurrencies(250, 20);
        console.log('Sync result:', result);

        process.exit(0);
    } catch (error) {
        console.error('❌ Sync Error:', error.message);
        process.exit(1);
    }
};

runSync();
