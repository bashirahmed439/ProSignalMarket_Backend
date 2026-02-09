require('dotenv').config();
const mongoose = require('mongoose');
const Currency = require('./models/Currency');

/**
 * This script checks how many currencies are already in the database
 * and provides instructions on how to continue syncing.
 */
const checkProgress = async () => {
    try {
        const mongoUri = process.env.MONGO_URI;
        if (!mongoUri) {
            console.error('MONGO_URI not found in .env');
            process.exit(1);
        }

        await mongoose.connect(mongoUri);
        console.log('✅ Connected to MongoDB');

        const count = await Currency.countDocuments();
        console.log(`\n📊 Current database status:`);
        console.log(`   Total currencies stored: ${count}`);
        console.log(`   Target: 5000 currencies`);
        console.log(`   Progress: ${((count / 5000) * 100).toFixed(1)}%`);
        console.log(`   Remaining: ${5000 - count} currencies\n`);

        if (count >= 5000) {
            console.log('✅ All 5000 currencies have been synced!');
        } else {
            const pagesNeeded = Math.ceil((5000 - count) / 250);
            console.log(`ℹ️  To complete the sync:`);
            console.log(`   - Run 'node sync-currencies.js' again`);
            console.log(`   - Approximately ${pagesNeeded} more pages needed`);
            console.log(`   - The script will skip existing records automatically\n`);
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
};

checkProgress();
