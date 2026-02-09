const express = require('express');
const router = express.Router();
const Currency = require('../models/Currency');

/**
 * @route GET /api/currencies/search
 * @desc Search currencies by symbol or name
 * @query q - search query (optional)
 * @query limit - number of results (default 50)
 */
router.get('/', async (req, res) => {
    try {
        const currencies = await Currency.find({}).sort({ marketCapRank: 1 });
        res.json({
            success: true,
            count: currencies.length,
            data: currencies
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch currencies',
            error: error.message
        });
    }
});

/**
 * @route GET /api/currencies/search
 * @desc Search currencies by symbol or name
 * @query q - search query (optional)
 * @query limit - number of results (default 50)
 */
router.get('/search', async (req, res) => {
    try {
        const { q = '', limit = 50 } = req.query;

        let query = {};

        if (q && q.trim()) {
            // Search by symbol or name (case-insensitive)
            query = {
                $or: [
                    { symbol: { $regex: q.trim(), $options: 'i' } },
                    { name: { $regex: q.trim(), $options: 'i' } }
                ]
            };
        }

        const currencies = await Currency.find(query)
            .select('coingeckoId symbol name image currentPrice marketCapRank')
            .sort({ marketCapRank: 1 }) // Sort by market cap rank (lower is better)
            .limit(parseInt(limit));

        res.json({
            success: true,
            count: currencies.length,
            data: currencies
        });
    } catch (error) {
        console.error('[Currency Search Error]:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to search currencies',
            error: error.message
        });
    }
});

/**
 * @route GET /api/currencies/:id
 * @desc Get a single currency by ID
 */
router.get('/:id', async (req, res) => {
    try {
        const currency = await Currency.findById(req.params.id);

        if (!currency) {
            return res.status(404).json({
                success: false,
                message: 'Currency not found'
            });
        }

        res.json({
            success: true,
            data: currency
        });
    } catch (error) {
        console.error('[Currency Get Error]:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get currency',
            error: error.message
        });
    }
});

module.exports = router;
