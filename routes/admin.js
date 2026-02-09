const express = require('express');
const router = express.Router();
const adminAuth = require('../middleware/adminAuth');
const Stock = require('../models/Stock');
const User = require('../models/User');
const Signal = require('../models/Signal');
const Transaction = require('../models/Transaction');
const ForexPair = require('../models/ForexPair');
const Currency = require('../models/Currency');
const Commodity = require('../models/Commodity');
// Note: We need a Withdrawal model, or Signal model if payments are there. 
// For now, I'll mock the withdrawals part or assume a simple Schema if not verified.
// checking task.md... "Implement Withdrawal Management" is a task.
// I'll assume I need to create a Withdrawal model too if it doesn't exist, OR just use Signals as "payments"?
// Realistically, "Withdrawals" implies a Seller withdrawing funds.
// Let's create a placeholder Withdrawal model in this step or next.

/**
 * @swagger
 * /api/admin/dashboard:
 *   get:
 *     summary: Get dashboard stats
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 */
router.get('/dashboard', adminAuth, async (req, res) => {
    try {
        const totalUsers = await User.countDocuments();
        const totalStocks = await Stock.countDocuments();
        // Mocking other stats
        const activeSignals = 142;
        const pendingWithdrawals = 5;

        res.json({
            stats: {
                totalUsers,
                totalStocks,
                activeSignals,
                pendingWithdrawals
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

/**
 * @swagger
 * /api/admin/stocks:
 *   post:
 *     summary: Add a new stock
 *     tags: [Admin]
 */
router.post('/stocks', adminAuth, async (req, res) => {
    try {
        const { symbol, name, country, exchange, isActive } = req.body;

        const stock = new Stock({
            symbol,
            name,
            country: country || 'PK',
            exchange: exchange || 'PSX',
            isActive: isActive !== undefined ? isActive : true
        });

        await stock.save();
        res.status(201).json(stock);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

router.put('/stocks/:id', adminAuth, async (req, res) => {
    try {
        const stock = await Stock.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(stock);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

router.delete('/stocks/:id', adminAuth, async (req, res) => {
    try {
        // Soft delete usually, but here we might actual delete or just set active=false
        await Stock.findByIdAndDelete(req.params.id);
        res.json({ message: 'Stock deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// =======================
// FOREX ADMIN ROUTES
// =======================

router.post('/forex', adminAuth, async (req, res) => {
    try {
        const { pair, base, quote, base_icon, quote_icon, isActive } = req.body;

        const forex = new ForexPair({
            pair,
            base,
            quote,
            base_icon,
            quote_icon,
            isActive: isActive !== undefined ? isActive : true
        });

        await forex.save();
        res.status(201).json(forex);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

router.put('/forex/:id', adminAuth, async (req, res) => {
    try {
        const forex = await ForexPair.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(forex);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

router.delete('/forex/:id', adminAuth, async (req, res) => {
    try {
        await ForexPair.findByIdAndDelete(req.params.id);
        res.json({ message: 'Forex pair deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// =======================
// CRYPTO (CURRENCY) ADMIN ROUTES
// =======================

router.post('/currencies', adminAuth, async (req, res) => {
    try {
        const { coingeckoId, symbol, name, image, isActive } = req.body;

        // CurrentPrice etc will be fetched by sync job ideally, but can be passed
        const currency = new Currency({
            coingeckoId,
            symbol,
            name,
            image,
            isActive: isActive !== undefined ? isActive : true
        });

        await currency.save();
        res.status(201).json(currency);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

router.put('/currencies/:id', adminAuth, async (req, res) => {
    try {
        const currency = await Currency.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(currency);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

router.delete('/currencies/:id', adminAuth, async (req, res) => {
    try {
        await Currency.findByIdAndDelete(req.params.id);
        res.json({ message: 'Currency deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// =======================
// COMMODITY ADMIN ROUTES
// =======================

router.post('/commodities', adminAuth, async (req, res) => {
    try {
        const { symbol, name, isActive } = req.body;

        const commodity = new Commodity({
            symbol,
            name,
            isActive: isActive !== undefined ? isActive : true
        });

        await commodity.save();
        res.status(201).json(commodity);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

router.put('/commodities/:id', adminAuth, async (req, res) => {
    try {
        const commodity = await Commodity.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(commodity);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

router.delete('/commodities/:id', adminAuth, async (req, res) => {
    try {
        await Commodity.findByIdAndDelete(req.params.id);
        res.json({ message: 'Commodity deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @route   GET /api/admin/withdrawals
// @desc    Get pending withdrawals
router.get('/withdrawals', adminAuth, async (req, res) => {
    try {
        const withdrawals = await Transaction.find({
            type: 'Withdrawal',
            status: { $in: ['pending', 'approved', 'failed', 'completed'] }
        })
            .populate('payer', 'firstName lastName email profileImage')
            .populate('approvedBy', 'firstName lastName')
            .populate('completedBy', 'firstName lastName')
            .sort({ createdAt: -1 });

        // Format for frontend
        const formatted = withdrawals.map(w => ({
            id: w._id,
            user: w.payer ? `${w.payer.firstName} ${w.payer.lastName}` : 'Unknown User',
            userImage: w.payer ? w.payer.profileImage : null,
            amount: w.amount,
            status: w.status,
            date: w.createdAt,
            destinationAddress: w.destinationAddress,
            network: w.network,
            approvedBy: w.approvedBy ? `${w.approvedBy.firstName} ${w.approvedBy.lastName}` : null,
            approvedAt: w.approvedAt,
            completedBy: w.completedBy ? `${w.completedBy.firstName} ${w.completedBy.lastName}` : null,
            completedAt: w.completedAt,
            txHash: w.txHash
        }));

        res.json(formatted);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @route   POST /api/admin/withdrawals/:id/approve
// @desc    Step 1: Admin Approves the withdrawal request
router.post('/withdrawals/:id/approve', adminAuth, async (req, res) => {
    try {
        const transaction = await Transaction.findById(req.params.id);

        if (!transaction) throw new Error('Transaction not found');
        if (transaction.type !== 'Withdrawal') throw new Error('Not a withdrawal');
        if (transaction.status !== 'pending') throw new Error('Transaction is not pending');

        transaction.status = 'approved';
        transaction.approvedBy = req.user._id;
        transaction.approvedAt = new Date();
        await transaction.save();

        res.json({ success: true, message: 'Withdrawal approved (Stage 1)' });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// @route   POST /api/admin/withdrawals/:id/complete
// @desc    Step 2: Admin Marks the withdrawal as Sent/Completed
router.post('/withdrawals/:id/complete', adminAuth, async (req, res) => {
    try {
        const { txHash } = req.body;
        const transaction = await Transaction.findById(req.params.id);

        if (!transaction) throw new Error('Transaction not found');
        if (transaction.type !== 'Withdrawal') throw new Error('Not a withdrawal');
        if (transaction.status !== 'approved') throw new Error('Transaction is not in approved state');

        transaction.status = 'completed';
        transaction.completedBy = req.user._id;
        transaction.completedAt = new Date();
        if (txHash) transaction.txHash = txHash;
        await transaction.save();

        res.json({ success: true, message: 'Withdrawal marked as completed (Stage 2)' });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// @route   POST /api/admin/withdrawals/:id/reject
// @desc    Reject withdrawal (Refunds user)
router.post('/withdrawals/:id/reject', adminAuth, async (req, res) => {
    try {
        const { reason } = req.body;
        const transaction = await Transaction.findById(req.params.id);

        if (!transaction) throw new Error('Transaction not found');
        if (transaction.type !== 'Withdrawal') throw new Error('Not a withdrawal');
        if (transaction.status !== 'pending') throw new Error('Transaction is not pending');

        const user = await User.findById(transaction.payer);
        if (user) {
            // Refund the amount
            user.walletBalance += transaction.amount;
            await user.save();
        }

        transaction.status = 'failed'; // Using 'failed' or 'rejected'
        transaction.rejectionReason = reason || 'Rejected by admin';
        await transaction.save();

        res.json({ success: true, message: 'Withdrawal rejected and funds refunded' });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// @route   GET /api/admin/users
// @desc    Get all users with stats
router.get('/users', adminAuth, async (req, res) => {
    try {
        const { role } = req.query;
        let query = {};
        if (role) {
            if (role === 'pro') {
                query.userType = 'seller'; // Map 'pro' to 'seller' if needed, or just use 'seller'
            } else {
                query.userType = role;
            }
        }

        const users = await User.find(query).select('-password').sort({ createdAt: -1 });

        // Calculate Signal Counts for each user
        // This could be optimized with aggregation but for now map is fine for moderate user base
        const usersWithStats = await Promise.all(users.map(async (user) => {
            const signalCount = await Signal.countDocuments({ provider: user._id });
            return {
                ...user.toObject(),
                signalCount
            };
        }));

        res.json({ success: true, users: usersWithStats });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @route   POST /api/admin/users/:id/ban
// @desc    Ban a user
router.post('/users/:id/ban', adminAuth, async (req, res) => {
    try {
        const { reason } = req.body;
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        user.isBanned = true;
        user.banReason = reason || 'Violation of terms';
        await user.save();

        res.json({ success: true, message: 'User banned successfully', user });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @route   POST /api/admin/users/:id/unban
// @desc    Unban a user
router.post('/users/:id/unban', adminAuth, async (req, res) => {
    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        user.isBanned = false;
        user.banReason = null;
        await user.save();

        res.json({ success: true, message: 'User unbanned successfully', user });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
