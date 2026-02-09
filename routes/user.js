const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Signal = require('../models/Signal');
const Subscription = require('../models/Subscription');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const auth = require('../middleware/auth');

// Multer Config
const storage = multer.memoryStorage();

const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // Increased to 10MB as mobile photos are often > 2MB
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png/;
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        if (mimetype && extname) {
            return cb(null, true);
        }
        console.error('Multer Rejection: Invalid file type', { mimetype, extname, originalname: file.originalname });
        cb(new Error('Only images (jpeg, jpg, png) are allowed.'));
    }
});

// Middleware to verify token - MOVED TO middleware/auth.js

/**
 * @swagger
 * /api/user/leaderboard:
 *   get:
 *     summary: Get top signal providers ranked by win rate
 *     tags: [User]
 *     responses:
 *       200:
 *         description: List of top providers
 */
router.get('/leaderboard', async (req, res) => {
    try {
        const sellers = await User.find({ userType: 'seller' }).select('firstName lastName profileImage');

        const leaderboard = await Promise.all(sellers.map(async (seller) => {
            const signals = await Signal.find({ provider: seller._id });
            const totalSignals = signals.length;
            const successCount = signals.filter(s => s.status === 'success').length;
            const failureCount = signals.filter(s => s.status === 'failure').length;

            let winRate = 0;
            if (totalSignals > 0) {
                winRate = Math.round((successCount / totalSignals) * 100);
            }

            return {
                id: seller._id,
                name: `${seller.firstName || ''} ${seller.lastName || ''}`.trim() || 'Anonymous',
                signals: totalSignals,
                winRate: `${winRate}%`,
                winRateValue: winRate, // for sorting
                avatar: seller.profileImage
            };
        }));

        // Sort by win rate value descending, then by signal count
        leaderboard.sort((a, b) => {
            if (b.winRateValue !== a.winRateValue) {
                return b.winRateValue - a.winRateValue;
            }
            return b.signals - a.signals;
        });

        // Add rank
        const rankedLeaderboard = leaderboard.map((provider, index) => ({
            ...provider,
            rank: index + 1
        }));

        res.json(rankedLeaderboard);
    } catch (error) {
        console.error('Leaderboard error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});
router.get('/profile', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId).select('-password');
        if (!user) return res.status(404).json({ message: 'User not found' });

        const userObj = user.toObject();

        if (user.userType === 'seller') {
            const subscribersCount = await Subscription.countDocuments({
                provider: user._id,
                isActive: true,
                endDate: { $gt: new Date() }
            });
            console.log(`[DEBUG] Seller ${user._id} has ${subscribersCount} subscribers.`);
            userObj.stats = { subscribersCount };
        } else {
            console.log(`[DEBUG] User ${user._id} is type: ${user.userType}, skipping subscriber count.`);
        }

        res.json(userObj);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

/**
 * @swagger
 * /api/user/profile:
 *   put:
 *     summary: Update user profile
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               cnic:
 *                 type: string
 *               phoneNumber:
 *                 type: string
 *               countryCode:
 *                 type: string
 *               country:
 *                 type: string
 *               city:
 *                 type: string
 *               address:
 *                 type: string
 *     responses:
 *       200:
 *         description: User profile updated successfully
 */
router.put('/profile', auth, async (req, res) => {
    try {
        const updates = req.body;
        // Prevent updating sensitive fields directly if needed (e.g., email, password)
        delete updates.email;
        delete updates.password;

        // If CNIC is provided, check uniqueness (excluding current user)
        if (updates.cnic) {
            const existingUser = await User.findOne({ cnic: updates.cnic, _id: { $ne: req.user.userId } });
            if (existingUser) {
                return res.status(400).json({ message: 'CNIC already in use.' });
            }
        }

        // Set status to pending if it was unverified and user is submitting details
        // straightforward logic: if submitting data, assume they want verification
        // But for now, let's just update the fields.
        if (updates.cnic && updates.phoneNumber) {
            updates.verificationStatus = 'pending';
        }

        const user = await User.findByIdAndUpdate(
            req.user.userId,
            { $set: updates },
            { new: true, runValidators: true }
        ).select('-password');

        res.json(user);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

/**
 * @swagger
 * /api/user/profile-image:
 *   post:
 *     summary: Upload profile image
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               profileImage:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Profile image uploaded successfully
 *       400:
 *         description: No file uploaded or invalid file
 *       500:
 *         description: Server error
 */
router.post('/profile-image', auth, upload.single('profileImage'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }



        // Convert buffer to Base64 string
        const base64Image = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;

        // Use findByIdAndUpdate to store the Base64 string directly in the database
        const updatedUser = await User.findByIdAndUpdate(
            req.user.userId,
            { $set: { profileImage: base64Image } },
            { new: true, runValidators: false }
        ).select('-password');

        res.json({
            message: 'Profile image updated successfully in database',
            user: updatedUser,
            imageUrl: base64Image // This is now a Data URL
        });
    } catch (error) {
        console.error('Profile Image Upload Error:', error);
        res.status(500).json({
            message: 'Server error during image upload to database',
            details: error.message,
            stack: error.stack
        });
    }
});


/**
 * @swagger
 * /api/user/public-profile/{id}:
 *   get:
 *     summary: Get public profile of a signal provider
 *     tags: [User]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Provider public profile
 */
router.get('/public-profile/:id', async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('firstName lastName profileImage verificationStatus creatorProfile createdAt');
        if (!user) return res.status(404).json({ message: 'User not found' });

        const signals = await Signal.find({ provider: user._id }).sort({ createdAt: -1 });
        const totalSignals = signals.length;
        const successCount = signals.filter(s => s.status === 'success').length;
        const failureCount = signals.filter(s => s.status === 'failure').length;

        let winRate = 0;
        if (totalSignals > 0) {
            winRate = Math.round((successCount / totalSignals) * 100);
        }

        // Check if current requester is subscribed (if token present)
        let isSubscribed = false;
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];

            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                const currentUserId = decoded.userId;

                const activeSub = await Subscription.findOne({
                    subscriber: currentUserId,
                    provider: user._id,
                    isActive: true,
                    endDate: { $gt: new Date() }
                });
                if (activeSub) isSubscribed = true;

                // Store currentUserId for signal access check
                req.currentUserId = currentUserId;
            } catch (err) {
                // Invalid token, just proceed as not subscribed
            }
        }

        // Count active subscribers
        const subscribersCount = await Subscription.countDocuments({
            provider: user._id,
            isActive: true,
            endDate: { $gt: new Date() }
        });

        res.json({
            id: user._id,
            name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Anonymous',
            avatar: user.profileImage,
            verificationStatus: user.verificationStatus,
            joinedAt: user.createdAt,
            stats: {
                totalSignals,
                winRate: `${winRate}%`,
                successCount,
                failureCount,
                subscribersCount
            },
            bio: user.creatorProfile?.bio || '',
            tradingStrategy: user.creatorProfile?.tradingStrategy || '',
            specialization: user.creatorProfile?.specialization || '',
            isSubscribed,
            subscriptionPlans: user.creatorProfile?.subscriptionPlans || [],
            recentSignals: signals.slice(0, 10).map(s => {
                const signalObj = s.toObject();
                let hasAccess = false;

                // 1. Owner has access
                if (req.currentUserId && req.currentUserId.toString() === user._id.toString()) {
                    hasAccess = true;
                }
                // 2. Free/Performance signals are visible
                else if (signalObj.monetizationType === 'Free' || signalObj.monetizationType === 'Performance') {
                    hasAccess = true;
                }
                // 3. Check for active subscription
                else if (signalObj.monetizationType === 'Subscription' && isSubscribed) {
                    hasAccess = true;
                }
                // 4. PayPerSignal: Check if purchased
                else if (signalObj.monetizationType === 'PayPerSignal' && req.currentUserId) {
                    if (signalObj.purchasedBy && signalObj.purchasedBy.map(id => id.toString()).includes(req.currentUserId.toString())) {
                        hasAccess = true;
                    }
                }

                if (!hasAccess) {
                    return {
                        id: s._id,
                        coinPair: s.coinPair,
                        direction: s.direction,
                        status: s.status,
                        createdAt: s.createdAt,
                        monetizationType: s.monetizationType,
                        price: s.price, // Include price for UI
                        isLocked: true,
                        entryZone: '***',
                        tpList: ['***'],
                        stopLoss: '***',
                        reasoning: 'Unlock to view reasoning'
                    };
                }

                return {
                    id: s._id,
                    coinPair: s.coinPair,
                    direction: s.direction,
                    status: s.status,
                    createdAt: s.createdAt,
                    monetizationType: s.monetizationType,
                    price: s.price,
                    isLocked: false,
                    entryZone: s.entryZone,
                    tpList: s.tpList,
                    stopLoss: s.stopLoss,
                    reasoning: s.reasoning
                };
            })
        });
    } catch (error) {
        console.error('Public profile error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

/**
 * @swagger
 * /api/user/favorites:
 *   get:
 *     summary: Get user's favorite signals
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 */
router.get('/favorites', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId).populate({
            path: 'favorites',
            populate: {
                path: 'provider',
                select: 'firstName lastName profileImage'
            }
        });
        res.json(user.favorites || []);
    } catch (error) {
        console.error('Get favorites error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

/**
 * @swagger
 * /api/user/favorites/toggle:
 *   post:
 *     summary: Toggle signal favorite status
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               signalId: { type: string }
 */
router.post('/favorites/toggle', auth, async (req, res) => {
    try {
        const { signalId } = req.body;
        const user = await User.findById(req.user.userId);

        const index = user.favorites.indexOf(signalId);
        if (index > -1) {
            user.favorites.splice(index, 1);
            await user.save();
            res.json({ isFavorite: false });
        } else {
            user.favorites.push(signalId);
            await user.save();
            res.json({ isFavorite: true });
        }
    } catch (error) {
        console.error('Toggle favorite error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

/**
 * @swagger
 * /api/user/follow:
 *   post:
 *     summary: Follow a provider (Free Subscription)
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [providerId]
 *             properties:
 *               providerId: { type: string }
 *     responses:
 *       200:
 *         description: Followed successfully
 */
router.post('/follow', auth, async (req, res) => {
    try {
        const { providerId } = req.body;
        const subscriberId = req.user.userId;

        if (providerId === subscriberId) {
            return res.status(400).json({ message: 'You cannot follow yourself' });
        }

        const provider = await User.findById(providerId);
        if (!provider) {
            return res.status(404).json({ message: 'Provider not found' });
        }

        // Check for existing active subscription
        const existingSub = await Subscription.findOne({
            subscriber: subscriberId,
            provider: providerId,
            isActive: true,
            endDate: { $gt: new Date() }
        });

        if (existingSub) {
            return res.status(400).json({ message: 'You are already following or subscribed to this provider' });
        }

        // Create Free Subscription (Follower)
        // Set a very long duration (e.g., 100 years)
        const endDate = new Date();
        endDate.setFullYear(endDate.getFullYear() + 100);

        const subscription = new Subscription({
            subscriber: subscriberId,
            provider: providerId,
            planName: 'Follower',
            pricePaid: 0,
            startDate: new Date(),
            endDate: endDate,
            isActive: true
        });

        await subscription.save();

        res.json({ success: true, message: 'Followed successfully', subscription });

    } catch (error) {
        console.error('Follow error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
