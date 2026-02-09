const express = require('express');
const router = express.Router();
const Commodity = require('../models/Commodity');

/**
 * @swagger
 * /api/commodities:
 *   get:
 *     summary: Search commodities
 *     tags: [Commodities]
 *     parameters:
 *       - in: query
 *         name: query
 *         schema:
 *           type: string
 *         description: Search query for symbol or name
 *     responses:
 *       200:
 *         description: List of commodities
 */
router.get('/', async (req, res) => {
    try {
        const { query } = req.query;
        let filter = { isActive: true };

        if (query) {
            const searchRegex = new RegExp(query, 'i');
            filter.$or = [
                { symbol: searchRegex },
                { name: searchRegex }
            ];
        }

        const commodities = await Commodity.find(filter)
            .sort({ symbol: 1 });

        res.json(commodities);
    } catch (error) {
        console.error('Error fetching commodities:', error);
        res.status(500).json({ message: 'Failed to fetch commodities' });
    }
});

module.exports = router;
