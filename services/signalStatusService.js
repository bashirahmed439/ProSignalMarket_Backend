const Signal = require('../models/Signal');

const SignalStatusService = {
    /**
     * Updates the status of a signal based on the current market price.
     * @param {Object} signal - The Mongoose signal document.
     * @param {Number} currentPrice - The latest price from CoinGecko.
     */
    async updateSignalStatus(signal, currentPrice) {
        if (!currentPrice || signal.status === 'failure') return signal;

        // Convert string targets to numbers for comparison
        const stopLoss = parseFloat(signal.stopLoss);
        const tpTargets = signal.tpList.map(tp => parseFloat(tp));
        const direction = signal.direction.toUpperCase();

        let updated = false;
        let newStatus = signal.status;
        let hitSL = signal.hitSL;
        const hitTargets = [...(signal.hitTargets || [])];

        // 1. Check Stop Loss
        if (direction === 'BUY') {
            if (currentPrice <= stopLoss) {
                hitSL = true;
                newStatus = 'failure';
                updated = true;
            }
        } else if (direction === 'SELL') {
            if (currentPrice >= stopLoss) {
                hitSL = true;
                newStatus = 'failure';
                updated = true;
            }
        }

        // 2. Check Take Profits (only if SL not hit)
        if (!hitSL) {
            tpTargets.forEach((tp, index) => {
                if (hitTargets.includes(index)) return; // Already hit

                if (direction === 'BUY') {
                    if (currentPrice >= tp) {
                        hitTargets.push(index);
                        newStatus = 'success';
                        updated = true;
                    }
                } else if (direction === 'SELL') {
                    if (currentPrice <= tp) {
                        hitTargets.push(index);
                        newStatus = 'success';
                        updated = true;
                    }
                }
            });
        }

        // 3. Update last price
        if (signal.lastPrice !== currentPrice) {
            signal.lastPrice = currentPrice;
            updated = true;
        }

        if (updated) {
            signal.status = newStatus;
            signal.hitSL = hitSL;
            signal.hitTargets = hitTargets.sort((a, b) => a - b);
            await signal.save();
        }

        return signal;
    },

    /**
     * Batch update statuses for multiple signals
     */
    async updateMultipleStatuses(signals, prices) {
        const promises = signals.map(signal => {
            const price = prices[signal.coinPair];
            if (price) {
                return this.updateSignalStatus(signal, price);
            }
            return Promise.resolve(signal);
        });
        return Promise.all(promises);
    }
};

module.exports = SignalStatusService;
