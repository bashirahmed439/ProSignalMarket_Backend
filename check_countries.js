require('dotenv').config();
const mongoose = require('mongoose');
const Country = require('./models/Country');

async function checkCountries() {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/signology');
        const countries = await Country.find();
        console.log(JSON.stringify(countries, null, 2));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
checkCountries();
