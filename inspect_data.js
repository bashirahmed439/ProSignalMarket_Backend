require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

const checkData = async () => {
    try {
        const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/signology';
        await mongoose.connect(mongoUri);
        const user = await User.findOne({ profileImage: { $ne: null } });
        if (user) {
            console.log('User found with image:');
            console.log('ID:', user._id);
            console.log('profileImage start:', user.profileImage.substring(0, 50));
            console.log('profileImage length:', user.profileImage.length);
        } else {
            console.log('No user found with a profile image.');
        }
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

checkData();
