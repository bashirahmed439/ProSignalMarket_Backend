const express = require('express');
const router = express.Router();
const Stock = require('../models/Stock');

/**
 * @swagger
 * /api/stocks:
 *   get:
 *     summary: Search stocks
 *     tags: [Stocks]
 *     parameters:
 *       - in: query
 *         name: query
 *         schema:
 *           type: string
 *         description: Search query for symbol or name
 *       - in: query
 *         name: country
 *         schema:
 *           type: string
 *           default: PK
 *         description: Filter by country code (e.g. PK, US)
 *     responses:
 *       200:
 *         description: List of stocks matching criteria
 */
router.get('/', async (req, res) => {
    try {
        const { query, country } = req.query;
        let filter = { isActive: true };

        // Add country filter if provided, default to all if not (wait, plan said default PK, let's make it optional but default to PK if only query is strictly required?)
        // Actually, for "Add Signal", we want users to be able to search globally OR filter.
        // Let's support an explicit country filter. If not provided, search all?
        // Or default to PK since that is what we have.
        // The implementation plan said: "Search stocks by query (symbol or name) and optional country filter."

        if (country) {
            filter.country = country.toUpperCase();
        }

        if (query) {
            // Case-insensitive regex search on symbol or name
            const searchRegex = new RegExp(query, 'i');
            filter.$or = [
                { symbol: searchRegex },
                { name: searchRegex }
            ];
        }

        const stocks = await Stock.find(filter)
            .sort({ symbol: 1 });

        res.json(stocks);
    } catch (error) {
        console.error('Error fetching stocks:', error);
        res.status(500).json({ message: 'Failed to fetch stocks' });
    }
});

module.exports = router;
