const mongoose = require('mongoose');

const ForexPairSchema = new mongoose.Schema({
    pair: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    base: {
        type: String,
        required: true,
        trim: true
    },
    quote: {
        type: String,
        required: true,
        trim: true
    },
    base_icon: {
        type: String,
        required: true
    },
    quote_icon: {
        type: String,
        required: true
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('ForexPair', ForexPairSchema);
