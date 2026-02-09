const mongoose = require('mongoose');

const currencySchema = new mongoose.Schema({
    coingeckoId: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    symbol: {
        type: String,
        required: true,
        trim: true,
        uppercase: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    image: {
        type: String,
        trim: true
    },
    currentPrice: {
        type: Number
    },
    marketCap: {
        type: Number
    },
    marketCapRank: {
        type: Number
    },
    lastUpdated: {
        type: Date,
        default: Date.now
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Index for faster searching by symbol
currencySchema.index({ symbol: 1 });

module.exports = mongoose.model('Currency', currencySchema);
