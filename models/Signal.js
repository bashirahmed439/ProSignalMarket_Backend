const mongoose = require('mongoose');

const signalSchema = new mongoose.Schema({
    provider: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    coinPair: {
        type: String,
        required: true,
        trim: true,
        uppercase: true
    },
    direction: {
        type: String,
        required: true,
        enum: ['BUY', 'SELL']
    },
    category: {
        type: String,
        required: true,
        enum: ['Crypto', 'Forex', 'Stocks', 'Commodities']
    },
    entryZone: {
        type: String,
        required: true
    },
    tpList: [{
        type: String,
        required: true
    }],
    stopLoss: {
        type: String,
        required: true
    },
    confidence: {
        type: Number,
        min: 1,
        max: 100,
        required: true
    },
    reasoning: {
        type: String,
        required: true
    },
    timeWindow: {
        type: String,
        required: true
    },
    isLocked: {
        type: Boolean,
        default: true
    },
    validFrom: {
        type: Date,
        required: true
    },
    validTo: {
        type: Date,
        required: true
    },
    expired: {
        type: Boolean,
        default: false
    },
    chartImage: {
        type: String, // Base64 or URL
        required: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    purchasedBy: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    purchasedCount: {
        type: Number,
        default: 0
    },
    status: {
        type: String,
        enum: ['active', 'success', 'failure'],
        default: 'active'
    },
    monetizationType: {
        type: String,
        enum: ['Free', 'PayPerSignal', 'Subscription', 'Performance'],
        default: 'Free',
        required: true
    },
    price: {
        type: Number, // Cost to unlock this specific signal (e.g. 10 USDT)
        default: 0
    },
    requiredTier: {
        type: String, // Name of the subscription tier required (e.g. "VIP")
        default: null
    },
    performanceFee: {
        type: Number, // Fee deducted if signal hits TP (e.g. 5 USDT)
        default: 0
    }
});

// Add index for faster queries by provider and category
signalSchema.index({ provider: 1, category: 1, monetizationType: 1 });

module.exports = mongoose.model('Signal', signalSchema);
