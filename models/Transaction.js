const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['SignalPurchase', 'Subscription', 'PerformanceFee', 'Deposit', 'Withdrawal'],
        required: true
    },
    payer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    payee: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User' // Null for system deposits/withdrawals
    },
    amount: {
        type: Number,
        required: true
    },
    currency: {
        type: String,
        default: 'USDT'
    },
    referenceId: {
        type: mongoose.Schema.Types.ObjectId,
        refPath: 'referenceModel'
    },
    referenceModel: {
        type: String,
        enum: ['Signal', 'Subscription', 'External'],
        default: 'Signal'
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'completed', 'failed'],
        default: 'pending'
    },
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    approvedAt: {
        type: Date
    },
    completedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    completedAt: {
        type: Date
    },
    // Crypto Deposit Fields
    txHash: {
        type: String,
        unique: true, // Prevent duplicates at DB level
        sparse: true, // Allow null/undefined for non-crypto transactions
        trim: true
    },
    proofImage: {
        type: String, // Base64 string
    },
    rejectionReason: {
        type: String, // Reason for rejection
    },
    paymentMethod: {
        type: String, // 'Crypto', 'Card'
    },
    network: {
        type: String, // e.g. 'TRC20', 'ERC20'
    },
    destinationAddress: {
        type: String, // For Withdrawals
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

transactionSchema.index({ payer: 1, type: 1 });
transactionSchema.index({ payee: 1, type: 1 });

module.exports = mongoose.model('Transaction', transactionSchema);
