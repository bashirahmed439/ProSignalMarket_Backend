const mongoose = require('mongoose');

const citySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    country: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Country',
        required: true
    },
    lat: Number,
    lng: Number
}, { timestamps: true });

// Compound index to ensure city names are unique per country
citySchema.index({ name: 1, country: 1 }, { unique: true });

module.exports = mongoose.model('City', citySchema);
