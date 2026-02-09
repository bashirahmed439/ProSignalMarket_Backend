const mongoose = require('mongoose');

const countrySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true
    },
    code: {
        type: String, // ISO Code e.g., PK, US
        required: true,
        uppercase: true
    },
    phoneCode: {
        type: String, // e.g., +92
        required: true
    },
    nidName: {
        type: String,
        default: 'National ID'
    },
    nidLength: {
        type: Number,
        default: 15
    },
    flag: {
        type: String // Optional: Emoji or URL
    }
}, { timestamps: true });

module.exports = mongoose.model('Country', countrySchema);
