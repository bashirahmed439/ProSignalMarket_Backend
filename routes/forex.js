const express = require('express');
const router = express.Router();
const ForexPair = require('../models/ForexPair');

// Get all active forex pairs
router.get('/', async (req, res) => {
    try {
        const pairs = await ForexPair.find({ isActive: true });
        res.json(pairs);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Seed forex pairs
router.post('/seed', async (req, res) => {
    try {
        const initialPairs = [
            {
                pair: "EUR/USD",
                base: "EUR",
                quote: "USD",
                base_icon: "https://flagcdn.com/w80/eu.png",
                quote_icon: "https://flagcdn.com/w80/us.png"
            },
            {
                pair: "USD/JPY",
                base: "USD",
                quote: "JPY",
                base_icon: "https://flagcdn.com/w80/us.png",
                quote_icon: "https://flagcdn.com/w80/jp.png"
            },
            {
                pair: "GBP/USD",
                base: "GBP",
                quote: "USD",
                base_icon: "https://flagcdn.com/w80/gb.png",
                quote_icon: "https://flagcdn.com/w80/us.png"
            },
            {
                pair: "USD/CHF",
                base: "USD",
                quote: "CHF",
                base_icon: "https://flagcdn.com/w80/us.png",
                quote_icon: "https://flagcdn.com/w80/ch.png"
            },
            {
                pair: "AUD/USD",
                base: "AUD",
                quote: "USD",
                base_icon: "https://flagcdn.com/w80/au.png",
                quote_icon: "https://flagcdn.com/w80/us.png"
            },
            {
                pair: "USD/CAD",
                base: "USD",
                quote: "CAD",
                base_icon: "https://flagcdn.com/w80/us.png",
                quote_icon: "https://flagcdn.com/w80/ca.png"
            },
            {
                pair: "NZD/USD",
                base: "NZD",
                quote: "USD",
                base_icon: "https://flagcdn.com/w80/nz.png",
                quote_icon: "https://flagcdn.com/w80/us.png"
            }
        ];

        // Clear existing and insert new
        await ForexPair.deleteMany({});
        await ForexPair.insertMany(initialPairs);

        res.json({ message: 'Forex pairs seeded successfully', count: initialPairs.length });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
