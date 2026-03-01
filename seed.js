require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

const seedDatabase = async () => {
    try {
        const mongoUri = process.env.MONGO_URI/prosignal;
        console.log('Connecting to MongoDB for seeding at:', mongoUri);

        await mongoose.connect(mongoUri);
        console.log('✅ Connected to MongoDB');

        // Create a seed user
        const seedEmail = 'test@signology.com';
        const existingUser = await User.findOne({ email: seedEmail });

        if (existingUser) {
            console.log('ℹ️ Seed user already exists. Skipping insertion.');
        } else {
            const newUser = new User({
                email: seedEmail,
                password: 'password123'
            });
            await newUser.save();
            console.log('✅ Seed user created: test@signology.com / password123');
        }

        console.log('🚀 Database is now fully initialized with a "users" collection.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Seeding Error:', error.message);
        process.exit(1);
    }
};

seedDatabase();
