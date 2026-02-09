const mongoose = require('mongoose');

const StockSchema = new mongoose.Schema({
    symbol: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        uppercase: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    country: {
        type: String,
        default: 'PK',
        trim: true,
        uppercase: true
    },
    exchange: {
        type: String,
        default: 'PSX',
        trim: true,
        uppercase: true
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Compound index for searching within a country/exchange
StockSchema.index({ symbol: 1, country: 1 });
StockSchema.index({ name: 'text', symbol: 'text' });

module.exports = mongoose.model('Stock', StockSchema);
