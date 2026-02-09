const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    password: {
        type: String,
        required: function () {
            return !this.googleId;
        }
    },
    googleId: {
        type: String,
        unique: true,
        sparse: true
    },
    firstName: {
        type: String,
        trim: true
    },
    lastName: {
        type: String,
        trim: true
    },
    cnic: {
        type: String,
        trim: true,
        unique: true,
        sparse: true,
        // Allow empty string to be saved as null to satisfy sparse/unique
        set: v => v === "" ? null : v,
        validate: {
            validator: function (v) {
                if (!v) return true; // null or empty (after set) is fine
                return v.length >= 8 && v.length <= 20;
            },
            message: 'National ID/CNIC must be between 8 and 20 characters'
        }
    },
    phoneNumber: {
        type: String,
        trim: true
    },
    countryCode: {
        type: String,
        trim: true
    },
    country: {
        type: String,
        trim: true
    },
    city: {
        type: String,
        trim: true
    },
    address: {
        type: String,
        trim: true
    },
    verificationStatus: {
        type: String,
        enum: ['unverified', 'pending', 'verified'],
        default: 'unverified'
    },
    isBanned: {
        type: Boolean,
        default: false
    },
    banReason: {
        type: String,
        default: null
    },
    lastLogin: {
        type: Date
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    profileImage: {
        type: String,
        default: null
    },
    resetPasswordOTP: {
        type: String,
        default: null
    },
    resetPasswordExpires: {
        type: Date,
        default: null
    },
    emailVerificationToken: {
        type: String,
        default: null
    },
    emailVerificationExpires: {
        type: Date,
        default: null
    },
    userType: {
        type: String,
        enum: ['seller', 'buyer', 'admin'],
        required: true,
        default: 'buyer'
    },
    walletBalance: {
        type: Number,
        default: 0
    },
    creatorProfile: {
        subscriptionPlans: [{
            name: { type: String, required: true }, // e.g., "Basic", "Pro", "VIP"
            price: { type: Number, required: true }, // Variable pricing: 10, 50, 100 USDT
            durationDays: { type: Number, default: 30 },
            perks: [String]
        }],
        performanceFeePercent: {
            type: Number,
            min: 0,
            max: 100,
            default: 0
        },
        bio: { type: String, trim: true },
        tradingStrategy: { type: String, trim: true },
        specialization: { type: String, trim: true } // e.g., "Scalping", "Swing Trading", "Price Action"
    },
    favorites: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Signal'
    }]
});

// Hash password before saving
userSchema.pre('save', async function () {
    if (!this.isModified('password')) return;
    this.password = await bcrypt.hash(this.password, 10);
});

// Method to compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
