const express = require('express');
const router = express.Router();
const Country = require('../models/Country');
const City = require('../models/City');

// Get all countries
router.get('/countries', async (req, res) => {
    try {
        // Sort by name
        const countries = await Country.find().sort({ name: 1 });
        res.json({
            success: true,
            data: countries
        });
    } catch (error) {
        console.error('Error fetching countries:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Get cities by country ID or Code
router.get('/cities/:countryId', async (req, res) => {
    try {
        const { countryId } = req.params;
        let query = {};

        // Check if countryId is a valid ObjectId, otherwise treat as code (e.g., PK)
        if (countryId.match(/^[0-9a-fA-F]{24}$/)) {
            query.country = countryId;
        } else {
            // Find country by code first
            const country = await Country.findOne({ code: countryId.toUpperCase() });
            if (!country) {
                return res.status(404).json({ success: false, message: 'Country not found' });
            }
            query.country = country._id;
        }

        const cities = await City.find(query).sort({ name: 1 });
        res.json({
            success: true,
            data: cities
        });
    } catch (error) {
        console.error('Error fetching cities:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

module.exports = router;
