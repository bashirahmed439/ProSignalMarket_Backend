const mongoose = require('mongoose');

const CommoditySchema = new mongoose.Schema({
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
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Index for searching
CommoditySchema.index({ name: 'text', symbol: 'text' });

module.exports = mongoose.model('Commodity', CommoditySchema);
