const axios = require('axios');
const NodeCache = require('node-cache');

// Cache prices for 60 seconds
const priceCache = new NodeCache({ stdTTL: 60 });

const COINGECKO_MAP = {
    'BTC/USDT': 'bitcoin',
    'ETH/USDT': 'ethereum',
    'SOL/USDT': 'solana',
    'XRP/USDT': 'ripple',
    'BNB/USDT': 'binancecoin',
    'ADA/USDT': 'cardano',
    'DOGE/USDT': 'dogecoin',
    'DOT/USDT': 'polkadot',
    'MATIC/USDT': 'matic-network',
    'TRX/USDT': 'tron',
    'AVAX/USDT': 'avalanche-2',
    'LINK/USDT': 'chainlink',
    'SHIB/USDT': 'shiba-inu',
    'LTC/USDT': 'litecoin',
    'BCH/USDT': 'bitcoin-cash',
    'UNI/USDT': 'uniswap',
    'NEAR/USDT': 'near',
    'APT/USDT': 'aptos',
    'ARB/USDT': 'arbitrum',
    'OP/USDT': 'optimism'
};

const PriceService = {
    /**
     * Get price for a coin pair (e.g. "BTC/USDT")
     */
    async getPrice(coinPair) {
        const id = COINGECKO_MAP[coinPair?.toUpperCase()];
        if (!id) return null;

        const cachedPrice = priceCache.get(id);
        if (cachedPrice) return cachedPrice;

        try {
            const response = await axios.get(`https://api.coingecko.com/api/v3/simple/price`, {
                params: {
                    ids: id,
                    vs_currencies: 'usd'
                }
            });

            const price = response.data[id]?.usd;
            if (price) {
                priceCache.set(id, price);
                return price;
            }
            return null;
        } catch (error) {
            console.error(`Error fetching price for ${id}:`, error.message);
            return null;
        }
    },

    /**
     * Get prices for multiple coin pairs
     */
    async getMultiplePrices(coinPairs) {
        const ids = [...new Set(coinPairs
            .map(pair => COINGECKO_MAP[pair?.toUpperCase()])
            .filter(id => !!id))];

        if (ids.length === 0) return {};

        // Check cache for all
        const result = {};
        const missingIds = [];

        ids.forEach(id => {
            const cached = priceCache.get(id);
            if (cached) {
                result[id] = cached;
            } else {
                missingIds.push(id);
            }
        });

        if (missingIds.length > 0) {
            try {
                // Fetch missing from API
                const response = await axios.get(`https://api.coingecko.com/api/v3/simple/price`, {
                    params: {
                        ids: missingIds.join(','),
                        vs_currencies: 'usd'
                    }
                });

                Object.entries(response.data).forEach(([id, data]) => {
                    const price = data.usd;
                    if (price) {
                        priceCache.set(id, price);
                        result[id] = price;
                    }
                });
            } catch (error) {
                console.error('Error fetching multiple prices:', error.message);
            }
        }

        // Map back to original coin pairs
        const finalPrices = {};
        coinPairs.forEach(pair => {
            const id = COINGECKO_MAP[pair?.toUpperCase()];
            if (id && result[id]) {
                finalPrices[pair] = result[id];
            }
        });

        return finalPrices;
    }
};

module.exports = PriceService;
