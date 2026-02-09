const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
const Signal = require('../models/Signal');
const Subscription = require('../models/Subscription');
const Transaction = require('../models/Transaction');
const mongoose = require('mongoose');

const SignalPurchase = require('../models/SignalPurchase');
const BlockchainService = require('../services/BlockchainService');

// @route   POST /api/payment/unlock-signal
// @desc    Unlock a Pay-Per-Signal
// @access  Private
router.post('/unlock-signal', auth, async (req, res) => {
    try {
        const { signalId } = req.body;
        const buyerId = req.user.userId;

        const signal = await Signal.findById(signalId);
        if (!signal) {
            throw new Error('Signal not found');
        }

        if (signal.monetizationType !== 'PayPerSignal' && signal.monetizationType !== 'Free') {
            throw new Error('This signal cannot be unlocked via this method');
        }

        const buyer = await User.findById(buyerId);
        if (!buyer) {
            throw new Error('Buyer not found');
        }

        if (signal.provider.toString() === buyerId) {
            throw new Error('You cannot purchase your own signal');
        }

        // Check if already purchased (Old way + New way)
        const alreadyPurchased = await SignalPurchase.findOne({ signal: signalId, buyer: buyerId });
        if (alreadyPurchased || (signal.purchasedBy && signal.purchasedBy.includes(buyerId))) {
            throw new Error('You have already unlocked this signal');
        }

        const seller = await User.findById(signal.provider);
        if (!seller) {
            throw new Error('Signal provider not found');
        }

        // Handle Payment for PayPerSignal
        if (signal.monetizationType === 'PayPerSignal') {
            if (buyer.walletBalance < signal.price) {
                throw new Error('Insufficient wallet balance');
            }

            // Deduct from buyer
            buyer.walletBalance -= signal.price;
            await buyer.save();

            // Credit to seller
            seller.walletBalance += signal.price;
            await seller.save();

            // Record Transaction
            const transaction = new Transaction({
                type: 'SignalPurchase',
                payer: buyerId,
                payee: seller._id,
                amount: signal.price,
                referenceId: signal._id,
                referenceModel: 'Signal',
                status: 'completed'
            });
            await transaction.save();
        }

        // Unlock signal: Create SignalPurchase record (Free or Paid)
        const purchase = new SignalPurchase({
            signal: signal._id,
            buyer: buyerId,
            provider: seller._id,
            pricePaid: signal.monetizationType === 'Free' ? 0 : signal.price
        });
        await purchase.save();

        // Update Signal stats
        if (!signal.purchasedBy.includes(buyerId)) {
            signal.purchasedBy.push(buyerId);
        }
        signal.purchasedCount = (signal.purchasedCount || 0) + 1;
        await signal.save();

        res.json({ success: true, message: 'Signal unlocked successfully', signal });

    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// @route   POST /api/payment/subscribe
// @desc    Subscribe to a provider's tier
// @access  Private
router.post('/subscribe', auth, async (req, res) => {
    try {
        const { providerId, planName } = req.body;
        const subscriberId = req.user.userId;

        const provider = await User.findById(providerId);
        if (!provider) {
            throw new Error('Provider not found');
        }

        if (providerId === subscriberId) {
            throw new Error('You cannot subscribe to yourself');
        }

        const plan = provider.creatorProfile.subscriptionPlans.find(p => p.name === planName);
        if (!plan) {
            throw new Error('Subscription plan not found');
        }

        const subscriber = await User.findById(subscriberId);
        if (!subscriber) {
            throw new Error('Subscriber not found');
        }

        if (subscriber.walletBalance < plan.price) {
            throw new Error('Insufficient wallet balance');
        }

        // Check active subscription
        const existingSub = await Subscription.findOne({
            subscriber: subscriberId,
            provider: providerId,
            isActive: true,
            endDate: { $gt: new Date() }
        });

        if (existingSub) {
            throw new Error('You already have an active subscription with this provider');
        }

        // Deduct from subscriber
        subscriber.walletBalance -= plan.price;
        await subscriber.save();

        // Credit to provider
        provider.walletBalance += plan.price;
        await provider.save();

        // Create Subscription
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + (plan.durationDays || 30));

        const subscription = new Subscription({
            subscriber: subscriberId,
            provider: providerId,
            planName: plan.name,
            pricePaid: plan.price,
            startDate: new Date(),
            endDate: endDate,
            isActive: true
        });
        await subscription.save();

        // Record Transaction
        const transaction = new Transaction({
            type: 'Subscription',
            payer: subscriberId,
            payee: providerId,
            amount: plan.price,
            referenceId: subscription._id,
            referenceModel: 'Subscription',
            status: 'completed'
        });
        await transaction.save();

        res.json({ success: true, message: 'Subscribed successfully', subscription });

    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// @route   GET /api/payment/history
// @desc    Get user's transaction history
// @access  Private
router.get('/history', auth, async (req, res) => {
    try {
        const userId = req.user.userId;
        const transactions = await Transaction.find({
            $or: [{ payer: userId }, { payee: userId }]
        })
            .populate('referenceId')
            .sort({ createdAt: -1 })
            .limit(20);

        res.json({ success: true, transactions });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @route   POST /api/payment/admin/approve-deposit
// @desc    Approve a pending deposit (Admin only - simulated)
// @access  Private
router.post('/admin/approve-deposit', auth, async (req, res) => {
    try {
        const { transactionId } = req.body;
        // In real app: Check if req.user.role === 'admin'

        const transaction = await Transaction.findById(transactionId);
        if (!transaction) {
            throw new Error('Transaction not found');
        }

        if (transaction.type !== 'Deposit') {
            throw new Error('Transaction is not a deposit');
        }

        if (transaction.status === 'completed') {
            throw new Error('Transaction already completed');
        }

        const user = await User.findById(transaction.payer);
        if (!user) {
            throw new Error('User not found');
        }

        // Credit User
        user.walletBalance += transaction.amount;
        await user.save();

        // Update Transaction
        transaction.status = 'completed';
        await transaction.save();

        res.json({ success: true, message: 'Deposit approved and wallet credited', transaction });

    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// @route   GET /api/payment/deposit-info
// @desc    Get deposit wallet addresses and network info
// @access  Private
router.get('/deposit-info', auth, async (req, res) => {
    try {
        res.json({
            success: true,
            depositInfo: {
                TRC20: {
                    address: process.env.TRC20_WALLET_ADDRESS || 'TJi7g2k5DemoWalletAddressTRC20',
                    network: 'TRC20',
                    currency: 'USDT',
                    confirmations: 1
                },
                ERC20: {
                    address: process.env.ERC20_WALLET_ADDRESS || '0xDemoWalletAddressERC20',
                    network: 'ERC20',
                    currency: 'USDT',
                    confirmations: 12
                }
            }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @route   POST /api/payment/withdraw
// @desc    Request a withdrawal (Sellers only)
// @access  Private
router.post('/withdraw', auth, async (req, res) => {
    try {
        const { amount, destinationAddress, network } = req.body;
        const userId = req.user.userId;

        if (!amount || amount <= 0) throw new Error('Invalid amount');
        if (!destinationAddress) throw new Error('Destination address is required');

        const user = await User.findById(userId);
        if (!user) throw new Error('User not found');

        // Only sellers can withdraw (business logic choice, adjust if needed)
        // if (user.userType !== 'seller') throw new Error('Only sellers can withdraw funds');

        if (user.walletBalance < parseFloat(amount)) {
            throw new Error('Insufficient wallet balance');
        }

        // Deduct balance immediately
        user.walletBalance -= parseFloat(amount);
        await user.save();

        const transaction = new Transaction({
            type: 'Withdrawal',
            payer: userId,
            amount: parseFloat(amount),
            currency: 'USDT',
            network: network || 'TRC20',
            destinationAddress: destinationAddress,
            status: 'pending'
        });

        await transaction.save();

        res.json({
            success: true,
            message: 'Withdrawal request submitted',
            transaction
        });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

module.exports = router;

// @route   GET /api/payment/admin/pending-deposits
// @desc    Get all pending deposits (Admin only)
// @access  Private
router.get('/admin/pending-deposits', auth, async (req, res) => {
    try {
        // In real app: check admin role
        const transactions = await Transaction.find({
            type: 'Deposit',
            status: 'pending'
        })
            .populate('payer', 'firstName lastName email profileImage')
            .sort({ createdAt: -1 });

        res.json({ success: true, transactions });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @route   GET /api/payment/admin/deposits
// @desc    Get all deposits (Admin only)
// @access  Private
router.get('/admin/deposits', auth, async (req, res) => {
    try {
        // In real app: check admin role
        const transactions = await Transaction.find({
            type: 'Deposit'
        })
            .populate('payer', 'firstName lastName email profileImage')
            .sort({ createdAt: -1 });

        res.json({ success: true, transactions });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @route   GET /api/payment/admin/transactions/:userId
// @desc    Get all transactions for a specific user (Admin only)
// @access  Private
router.get('/admin/transactions/:userId', auth, async (req, res) => {
    try {
        const { userId } = req.params;
        const { type } = req.query; // 'Deposit' or 'Withdrawal'

        let query = {
            $or: [{ payer: userId }, { payee: userId }]
        };

        if (type) {
            query.type = type;
        }

        const transactions = await Transaction.find(query)
            .sort({ createdAt: -1 });

        res.json({ success: true, transactions });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @route   POST /api/payment/admin/verify-tx
// @desc    Verify a deposit transaction on-chain (Admin only)
// @access  Private
router.post('/admin/verify-tx', auth, async (req, res) => {
    try {
        const { transactionId } = req.body;
        // In real app: Check if req.user.role === 'admin'

        const transaction = await Transaction.findById(transactionId);
        if (!transaction) {
            throw new Error('Transaction not found');
        }

        if (transaction.type !== 'Deposit') {
            throw new Error('Transaction is not a deposit');
        }

        let verificationResult;

        if (transaction.network === 'TRC20') {
            const expectedAddress = process.env.TRC20_WALLET_ADDRESS || 'TJi7g2k5DemoWalletAddressTRC20';
            verificationResult = await BlockchainService.verifyTRC20(
                transaction.txHash,
                transaction.amount,
                expectedAddress
            );
        } else if (transaction.network === 'ERC20') {
            const expectedAddress = process.env.ERC20_WALLET_ADDRESS || '0xDemoWalletAddressERC20';
            verificationResult = await BlockchainService.verifyERC20(
                transaction.txHash,
                transaction.amount,
                expectedAddress
            );
        } else {
            throw new Error(`Unsupported network: ${transaction.network}`);
        }

        res.json({ success: true, verification: verificationResult });

    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// @route   POST /api/payment/admin/reject-deposit
// @desc    Reject a pending deposit (Admin only)
// @access  Private
router.post('/admin/reject-deposit', auth, async (req, res) => {
    try {
        const { transactionId, reason } = req.body;
        // In real app: Check if req.user.role === 'admin'

        const transaction = await Transaction.findById(transactionId);
        if (!transaction) {
            throw new Error('Transaction not found');
        }

        if (transaction.type !== 'Deposit') {
            throw new Error('Transaction is not a deposit');
        }

        if (transaction.status !== 'pending') {
            throw new Error('Transaction is not pending');
        }

        // Update Transaction
        transaction.status = 'failed'; // or 'rejected'
        transaction.rejectionReason = reason || 'No reason provided';
        await transaction.save();

        res.json({ success: true, message: 'Deposit rejected', transaction });

    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// @route   POST /api/payment/deposit
// @desc    Submit a crypto deposit request
// @access  Private
router.post('/deposit', auth, async (req, res) => {
    try {
        const { amount, TXHash, network, proofImage } = req.body;
        // Note: Frontend might send TXHash or txHash, let's normalize
        const txHash = TXHash || req.body.txHash;

        const userId = req.user.userId;

        if (!amount || amount <= 0) {
            throw new Error('Invalid amount');
        }

        if (!txHash) {
            throw new Error('Transaction hash is required');
        }

        const user = await User.findById(userId);
        if (!user) {
            throw new Error('User not found');
        }

        // Check if txHash already exists to prevent duplicates
        // Check if txHash already exists to prevent duplicates (Case Insensitive)
        const existingTx = await Transaction.findOne({
            txHash: { $regex: new RegExp(`^${txHash}$`, 'i') }
        });
        if (existingTx) {
            throw new Error('This transaction hash has already been submitted');
        }

        // Create Deposit Transaction (Pending)
        const transaction = new Transaction({
            type: 'Deposit',
            payer: userId,
            amount: parseFloat(amount),
            currency: 'USDT',
            paymentMethod: 'Crypto',
            network: network || 'TRC20',
            txHash: txHash,
            proofImage: proofImage || null, // Optional if user doesn't upload
            status: 'pending' // Pending verification
        });

        await transaction.save();

        res.json({
            success: true,
            message: 'Deposit submitted successfully. Please wait for confirmation.',
            transaction
        });

    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});
