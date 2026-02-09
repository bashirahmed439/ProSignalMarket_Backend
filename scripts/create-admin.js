const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User');

// Load env vars
const path = require('path');
dotenv.config({ path: path.join(__dirname, '../.env') });

const createAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        const adminEmail = 'admin@signalogy.com';
        const password = 'admin'; // Simple password for development

        // Check if exists
        let admin = await User.findOne({ email: adminEmail });

        if (admin) {
            console.log('Admin user already exists');
            admin.userType = 'admin'; // Ensure role is admin
            await admin.save();
            console.log('Updated existing user role to admin');
        } else {
            admin = new User({
                firstName: 'Admin',
                lastName: 'User',
                email: adminEmail,
                password: password,
                userType: 'admin'
            });
            await admin.save();
            console.log('Created new Admin user');
        }

        console.log(`\n-----------------------------------`);
        console.log(`Login Credentials:`);
        console.log(`Email: ${adminEmail}`);
        console.log(`Password: ${password}`);
        console.log(`-----------------------------------\n`);

        process.exit(0);
    } catch (error) {
        console.error('Error creating admin:', error);
        process.exit(1);
    }
};

createAdmin();
