require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const Commodity = require('../models/Commodity');

const commodities = [
    { symbol: 'GOLD', name: 'Gold (XAU/USD)' },
    { symbol: 'SILVER', name: 'Silver (XAG/USD)' },
    { symbol: 'WTI', name: 'WTI Crude Oil' },
    { symbol: 'BRENT', name: 'Brent Crude Oil' },
    { symbol: 'NATGAS', name: 'Natural Gas' },
    { symbol: 'COPPER', name: 'Copper' },
    { symbol: 'PLATINUM', name: 'Platinum' },
    { symbol: 'PALLADIUM', name: 'Palladium' },
    { symbol: 'CORN', name: 'Corn' },
    { symbol: 'WHEAT', name: 'Wheat' },
    { symbol: 'SOYBEAN', name: 'Soybean' },
    { symbol: 'COFFEE', name: 'Coffee' },
    { symbol: 'SUGAR', name: 'Sugar' }
];

const seedCommodities = async () => {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected.');

        for (const comm of commodities) {
            const exists = await Commodity.findOne({ symbol: comm.symbol });
            if (!exists) {
                await Commodity.create(comm);
                console.log(`Added: ${comm.name}`);
            } else {
                console.log(`Skipped (Exists): ${comm.name}`);
            }
        }

        console.log('Seeding complete.');
        process.exit(0);
    } catch (error) {
        console.error('Seeding failed:', error);
        process.exit(1);
    }
};

seedCommodities();
