require('dotenv').config();
const mongoose = require('mongoose');

const checkFields = async () => {
    try {
        const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/signology';
        await mongoose.connect(mongoUri);
        const db = mongoose.connection.db;
        const users = await db.collection('users').find({}).limit(5).toArray();

        users.forEach((u, i) => {
            console.log(`User ${i}:`, Object.keys(u).filter(k => k.toLowerCase().includes('image')));
            if (u.profileImage) console.log(`  profileImage type: ${typeof u.profileImage}, length: ${u.profileImage.length}`);
            if (u.Profileimage) console.log(`  Profileimage type: ${typeof u.Profileimage}, length: ${u.Profileimage.length}`);
        });
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

checkFields();
