const express = require('express');
const router = express.Router();
const Signal = require('../models/Signal');
const jwt = require('jsonwebtoken');
const auth = require('../middleware/auth');
const PriceService = require('../services/priceService');

/**
 * @swagger
 * /api/signals/trending:
 *   get:
 *     summary: Get top 5 most purchased signals
 *     tags: [Signals]
 *     responses:
 *       200:
 *         description: List of trending signals
 */
router.get('/trending', async (req, res) => {
    try {
        const signals = await Signal.find()
            .populate('provider', 'firstName lastName profileImage')
            .sort({ purchasedCount: -1 })
            .limit(5);

        const coins = [...new Set(signals.map(s => s.coinPair))];
        const prices = await PriceService.getMultiplePrices(coins);

        const processed = signals.map(s => {
            const obj = s.toObject();
            return {
                id: obj._id,
                coinPair: obj.coinPair,
                direction: obj.direction,
                currentPrice: prices[obj.coinPair] || null,
                provider: {
                    id: obj.provider?._id,
                    name: obj.provider ? `${obj.provider.firstName || ''} ${obj.provider.lastName || ''}`.trim() : 'Anonymous',
                    avatar: obj.provider?.profileImage
                },
                purchasedCount: obj.purchasedCount || obj.purchasedBy?.length || 0,
                status: obj.status,
                price: obj.price
            };
        });

        res.json(processed);
    } catch (error) {
        console.error('Trending signals error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

/**
 * @swagger
 * /api/signals:
 *   get:
 *     summary: Get all signals
 *     tags: [Signals]
 *     responses:
 *       200:
 *         description: List of signals
 */
const SignalPurchase = require('../models/SignalPurchase');
const Subscription = require('../models/Subscription');

router.get('/', async (req, res) => {
    // Optional auth: try to decode token if present, but don't fail if not
    let userId = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            userId = decoded.userId;
        } catch (err) {
            // Invalid token, treat as guest
        }
    }
    try {
        const { category, provider } = req.query;
        let query = {};
        if (category) query.category = category;
        if (provider) query.provider = provider;

        const signals = await Signal.find(query)
            .populate('provider', 'firstName lastName profileImage')
            .sort({ createdAt: -1 });

        // If guest, everything is locked
        if (!userId) {
            const guestSignals = signals.map(signal => {
                const signalObj = signal.toObject();
                return {
                    _id: signalObj._id,
                    provider: signalObj.provider,
                    coinPair: signalObj.coinPair,
                    category: signalObj.category,
                    direction: signalObj.direction,
                    monetizationType: signalObj.monetizationType,
                    price: signalObj.price,
                    isLocked: true,
                    entryZone: '***',
                    tpList: ['***'],
                    stopLoss: '***',
                    confidence: signalObj.confidence,
                    reasoning: 'Login to view',
                    timeWindow: signalObj.timeWindow,
                    createdAt: signalObj.createdAt,
                    status: signalObj.status,
                    purchasedCount: (typeof signalObj.purchasedCount === 'number') ? signalObj.purchasedCount : (signalObj.purchasedBy?.length || 0)
                };
            });
            return res.json(guestSignals);
        }

        // Fetch user's active subscriptions
        const activeSubs = await Subscription.find({
            subscriber: userId,
            isActive: true,
            endDate: { $gt: new Date() }
        });

        // Fetch user's signal purchases
        const purchases = await SignalPurchase.find({ buyer: userId });
        const purchasedSignalIds = purchases.map(p => p.signal.toString());

        // Fetch prices for all signals
        const coinPairs = [...new Set(signals.map(s => s.coinPair))];
        const prices = await PriceService.getMultiplePrices(coinPairs);

        // Process signals to mask/lock content if not purchased/subscribed
        const processedSignals = await Promise.all(signals.map(async (signal) => {
            const signalObj = signal.toObject();
            const providerIdStr = signalObj.provider._id.toString();

            const pCount = (typeof signalObj.purchasedCount === 'number') ? signalObj.purchasedCount : (signalObj.purchasedBy?.length || 0);
            const currentPrice = prices[signalObj.coinPair] || null;

            // 1. If user is the provider, they see everything
            if (String(userId) === providerIdStr) {
                return {
                    ...signalObj,
                    currentPrice,
                    isLocked: false,
                    purchasedCount: pCount
                };
            }

            let hasAccess = false;

            // 2. Access Checks by Monetization Type
            if (signalObj.monetizationType === 'Free' || signalObj.monetizationType === 'PayPerSignal') {
                if (purchasedSignalIds.includes(signal._id.toString()) || (signalObj.purchasedBy && signalObj.purchasedBy.map(id => id.toString()).includes(userId))) {
                    hasAccess = true;
                }
            }
            // 4. Subscription: Check for active subscription
            else if (signalObj.monetizationType === 'Subscription') {
                const sub = activeSubs.find(s => s.provider.toString() === signalObj.provider._id.toString());
                if (sub) hasAccess = true;
            }
            // 5. Performance: Visible but might have future fee logic
            else if (signalObj.monetizationType === 'Performance') {
                // For now, allow viewing, fee is collected later
                hasAccess = true;
            }

            if (!hasAccess) {
                // Return 'Locked' version
                return {
                    _id: signalObj._id,
                    provider: signalObj.provider,
                    coinPair: signalObj.coinPair,
                    currentPrice,
                    category: signalObj.category,
                    direction: signalObj.direction,
                    monetizationType: signalObj.monetizationType,
                    price: signalObj.price, // Visible so they know how much to pay
                    requiredTier: signalObj.requiredTier,
                    performanceFee: signalObj.performanceFee, // Visible
                    isLocked: true,
                    // Reveal details as requested
                    entryZone: '***',
                    tpList: ['***'],
                    stopLoss: '***',
                    confidence: signalObj.confidence, // Teaser
                    reasoning: 'Unlock to view reasoning',
                    timeWindow: signalObj.timeWindow,
                    createdAt: signalObj.createdAt,
                    status: signalObj.status,
                    purchasedCount: pCount
                };
            }

            // Return full object but attach count and explicit isLocked status
            return {
                ...signalObj,
                currentPrice,
                isLocked: false,
                purchasedCount: pCount
            };
        }));

        res.json(processedSignals);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

router.post('/', auth, async (req, res) => {
    try {
        // Only allow sellers to create signals (provider role)
        if (req.user.userType?.toLowerCase() !== 'seller') {
            return res.status(403).json({ message: 'Forbidden: Only signal providers can create signals.' });
        }

        const newSignal = new Signal({
            ...req.body,
            provider: req.user.userId
        });

        const signal = await newSignal.save();
        res.status(201).json(signal);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

/**
 * @swagger
 * /api/signals/my-purchased:
 *   get:
 *     summary: Get user's purchased active signals
 *     tags: [Signals]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of purchased active signals
 */
router.get('/my-purchased', auth, async (req, res) => {
    try {
        const userId = req.user.userId;

        // 1. Fetch user's signal purchases
        const purchases = await SignalPurchase.find({ buyer: userId })
            .populate({
                path: 'signal',
                populate: {
                    path: 'provider',
                    select: 'firstName lastName profileImage'
                }
            })
            .sort({ purchaseDate: -1 });

        // 2. Filter for active (not expired) signals
        const activePurchased = purchases
            .filter(p => p.signal && !p.signal.expired)
            .map(p => {
                const signalObj = p.signal.toObject();
                return {
                    ...signalObj,
                    isLocked: false // User purchased these, so they are unlocked
                };
            });

        res.json(activePurchased);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});


/**
 * @swagger
 * /api/signals/{id}:
 *   get:
 *     summary: Get signal by ID
 *     tags: [Signals]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Signal data
 */
// ... (swagger docs)
router.get('/:id', auth, async (req, res) => {
    try {
        let signal = await Signal.findById(req.params.id).populate('provider', 'firstName lastName profileImage');
        if (!signal) return res.status(404).json({ message: 'Signal not found' });

        const userId = req.user.userId;
        const signalObj = signal.toObject();

        // 1. If user is the provider, they see everything
        if (signalObj.provider._id.toString() === userId) {
            return res.json({ ...signalObj, isLocked: false });
        }

        // 2. Free signals are visible
        if (signalObj.monetizationType === 'Free') {
            return res.json({ ...signalObj, isLocked: false });
        }

        let hasAccess = false;

        // 3. PayPerSignal: Check if purchased
        if (signalObj.monetizationType === 'PayPerSignal') {
            if (signalObj.purchasedBy.map(id => id.toString()).includes(userId)) {
                hasAccess = true;
            }
        }
        // 4. Subscription: Check for active subscription
        else if (signalObj.monetizationType === 'Subscription') {
            const sub = await Subscription.findOne({
                subscriber: userId,
                provider: signalObj.provider._id,
                isActive: true,
                endDate: { $gt: new Date() }
            });
            if (sub) hasAccess = true;
        }
        // 5. Performance
        else if (signalObj.monetizationType === 'Performance') {
            hasAccess = true;
        }

        if (hasAccess) {
            return res.json({
                ...signalObj,
                isLocked: false,
                purchasedCount: signalObj.purchasedBy?.length || 0
            });
        }
        // Return 'Locked' version
        return res.json({
            _id: signalObj._id,
            provider: signalObj.provider,
            coinPair: signalObj.coinPair,
            category: signalObj.category,
            direction: signalObj.direction,
            monetizationType: signalObj.monetizationType,
            price: signalObj.price,
            requiredTier: signalObj.requiredTier,
            isLocked: true,
            entryZone: '***',
            tpList: ['***'],
            stopLoss: '***',
            confidence: signalObj.confidence,
            reasoning: 'Unlock to view reasoning',
            purchasedCount: signalObj.purchasedBy?.length || 0
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

/**
 * @swagger
 * /api/signals/{id}:
 *   put:
 *     summary: Update signal (Owner only)
 *     tags: [Signals]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Signal updated successfully
 */
router.put('/:id', auth, async (req, res) => {
    try {
        let signal = await Signal.findById(req.params.id);
        if (!signal) return res.status(404).json({ message: 'Signal not found' });

        // Check ownership
        if (signal.provider.toString() !== req.user.userId) {
            return res.status(403).json({ message: 'Forbidden: You can only update your own signals.' });
        }

        signal = await Signal.findByIdAndUpdate(
            req.params.id,
            { $set: req.body },
            { new: true }
        );

        res.json(signal);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

/**
 * @swagger
 * /api/signals/{id}:
 *   delete:
 *     summary: Delete signal (Owner only)
 *     tags: [Signals]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Signal deleted successfully
 */
router.delete('/:id', auth, async (req, res) => {
    try {
        const signal = await Signal.findById(req.params.id);
        if (!signal) return res.status(404).json({ message: 'Signal not found' });

        // Check ownership
        if (signal.provider.toString() !== req.user.userId) {
            return res.status(403).json({ message: 'Forbidden: You can only delete your own signals.' });
        }

        await signal.remove();
        res.json({ message: 'Signal removed' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});



module.exports = router;
