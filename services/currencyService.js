const axios = require('axios');
const Currency = require('../models/Currency');

const currencyService = {
    /**
     * Fetch coins from CoinGecko and store/update them in the database.
     * @param {number} perPage Number of coins per page (default 250)
     * @param {number} totalPages Number of pages to fetch (default 1)
     */
    async syncCurrencies(perPage = 250, totalPages = 1) {
        let totalStats = {
            count: 0,
            upserted: 0,
            modified: 0
        };

        for (let page = 1; page <= totalPages; page++) {
            let retries = 0;
            const maxRetries = 3;

            while (retries <= maxRetries) {
                try {
                    console.log(`[CurrencySync] Fetching page ${page}/${totalPages} (${perPage} coins)...`);
                    const url = `https://api.coingecko.com/api/v3/coins/markets` +
                        `?vs_currency=usd&order=market_cap_desc&per_page=${perPage}&page=${page}`;

                    const response = await axios.get(url);
                    const coins = response.data;

                    if (!Array.isArray(coins) || coins.length === 0) {
                        console.log(`[CurrencySync] No more coins found at page ${page}.`);
                        return totalStats;
                    }

                    const operations = coins.map(coin => ({
                        updateOne: {
                            filter: { coingeckoId: coin.id },
                            update: {
                                $setOnInsert: {
                                    coingeckoId: coin.id,
                                    symbol: coin.symbol,
                                    name: coin.name,
                                    image: coin.image,
                                    currentPrice: coin.current_price,
                                    marketCap: coin.market_cap,
                                    marketCapRank: coin.market_cap_rank,
                                    lastUpdated: new Date()
                                }
                            },
                            upsert: true
                        }
                    }));

                    const result = await Currency.bulkWrite(operations);
                    console.log(`[CurrencySync] Page ${page} synced. New records: ${result.upsertedCount}`);

                    totalStats.count += coins.length;
                    totalStats.upserted += result.upsertedCount;
                    totalStats.modified += result.modifiedCount;

                    // Success - break retry loop
                    break;
                } catch (error) {
                    if (error.response?.status === 429) {
                        retries++;
                        if (retries > maxRetries) {
                            console.error(`[CurrencySync] Rate limit hit at page ${page}. Max retries reached.`);
                            console.log(`[CurrencySync] Progress saved. Run again later to continue from page ${page}.`);
                            return totalStats;
                        }
                        const backoffDelay = 60000 * retries; // 1 min, 2 min, 3 min
                        console.log(`[CurrencySync] Rate limit hit. Waiting ${backoffDelay / 1000}s before retry ${retries}/${maxRetries}...`);
                        await new Promise(resolve => setTimeout(resolve, backoffDelay));
                    } else {
                        console.error(`[CurrencySync] Error syncing page ${page}:`, error.message);
                        throw error;
                    }
                }
            }

            // Delay between successful pages
            if (page < totalPages) {
                const delay = 15000; // 15 seconds delay
                console.log(`[CurrencySync] Waiting ${delay}ms for next page...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }

        console.log(`[CurrencySync] Sync complete. Total processed: ${totalStats.count}, Total new: ${totalStats.upserted}`);
        return totalStats;
    }
};

module.exports = currencyService;
