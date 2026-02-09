const mongoose = require('mongoose');

const signalPurchaseSchema = new mongoose.Schema({
    signal: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Signal',
        required: true
    },
    buyer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    provider: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // The seller
        required: true
    },
    pricePaid: {
        type: Number,
        required: true
    },
    currency: {
        type: String,
        default: 'USDT'
    },
    purchaseDate: {
        type: Date,
        default: Date.now
    },
    status: {
        type: String,
        enum: ['completed', 'refunded'],
        default: 'completed'
    }
});

// Index for fast lookups: verifying if a user bought a signal
signalPurchaseSchema.index({ signal: 1, buyer: 1 }, { unique: true });

module.exports = mongoose.model('SignalPurchase', signalPurchaseSchema);
