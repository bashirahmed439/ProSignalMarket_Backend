require('dotenv').config();
const mongoose = require('mongoose');
const TraceLog = require('./models/TraceLog');

async function testLogger() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB');

        // Check if there are any logs (trigger a few if needed by running the server separately)
        const logsCount = await TraceLog.countDocuments();
        console.log(`Current Trace Logs count: ${logsCount}`);

        if (logsCount > 0) {
            const latestLog = await TraceLog.findOne().sort({ timestamp: -1 });
            console.log('Latest Trace Log Sample:');
            console.log(JSON.stringify(latestLog, null, 2));
        } else {
            console.log('No logs found yet. Please make some requests to the API first.');

            // Create a manual log entry to test the model
            const manualLog = new TraceLog({
                method: 'GET',
                url: '/api/test-manual',
                statusCode: 200,
                ip: '127.0.0.1',
                userAgent: 'Manual Test Script',
                timestamp: new Date()
            });
            await manualLog.save();
            console.log('✅ Created a manual log entry for testing.');

            const logsCountNew = await TraceLog.countDocuments();
            console.log(`Updated Trace Logs count: ${logsCountNew}`);
        }

    } catch (error) {
        console.error('❌ Error during verification:', error);
    } finally {
        await mongoose.disconnect();
    }
}

testLogger();
