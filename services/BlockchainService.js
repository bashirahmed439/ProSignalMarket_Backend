const axios = require('axios');

class BlockchainService {
    constructor() {
        this.tronScanApi = 'https://apilist.tronscan.org/api';
        this.etherscanApi = 'https://api.etherscan.io/api';
        this.etherScanApiKey = process.env.ETHERSCAN_API_KEY || '';
    }

    /**
     * Verify TRC20 Transaction (USDT on Tron)
     * @param {string} txHash 
     * @param {number} expectedAmount 
     * @param {string} expectedAddress 
     */
    async verifyTRC20(txHash, expectedAmount, expectedAddress) {
        try {
            const response = await axios.get(`${this.tronScanApi}/transaction-info?hash=${txHash}`);
            const data = response.data;

            if (!data || !data.contractRet) {
                return { valid: false, reason: 'Transaction not found on TronScan' };
            }

            if (data.contractRet !== 'SUCCESS') {
                return { valid: false, reason: 'Transaction failed on-chain' };
            }

            // Check for USDT transfer
            const transfer = data.tokenTransferInfo;
            if (!transfer || transfer.symbol !== 'USDT') {
                return { valid: false, reason: 'Not a USDT transfer' };
            }

            // Check Recipient
            if (transfer.to_address !== expectedAddress) {
                return {
                    valid: false,
                    reason: `Recipient mismatch. Expected ${expectedAddress}, got ${transfer.to_address}`
                };
            }

            // Check Amount (USDT has 6 decimals)
            const actualAmount = parseFloat(transfer.amount_str) / 1000000;
            // Allow small float difference
            if (Math.abs(actualAmount - expectedAmount) > 0.1) {
                return {
                    valid: false,
                    reason: `Amount mismatch. Expected ${expectedAmount}, got ${actualAmount}`
                };
            }

            return { valid: true, details: { amount: actualAmount, from: transfer.from_address } };

        } catch (error) {
            console.error('TRC20 Verification Error:', error.message);
            return { valid: false, reason: 'Error connecting to TronScan API' };
        }
    }

    /**
     * Verify ERC20 Transaction (USDT on Ethereum)
     * @param {string} txHash 
     * @param {number} expectedAmount 
     * @param {string} expectedAddress 
     */
    async verifyERC20(txHash, expectedAmount, expectedAddress) {
        try {
            // Note: This relies on Etherscan API which needs a key for reliable usage
            if (!this.etherScanApiKey) {
                return { valid: false, reason: 'Etherscan API Key not configured' };
            }

            const response = await axios.get(`${this.etherscanApi}?module=account&action=tokentx&contractaddress=0xdac17f958d2ee523a2206206994597c13d831ec7&txhash=${txHash}&apikey=${this.etherScanApiKey}`);
            const data = response.data;

            if (data.status !== '1' || !data.result || data.result.length === 0) {
                return { valid: false, reason: 'Transaction not found or invalid on Etherscan' };
            }

            const tx = data.result[0];

            // Check Recipient (case insensitive)
            if (tx.to.toLowerCase() !== expectedAddress.toLowerCase()) {
                return {
                    valid: false,
                    reason: `Recipient mismatch. Expected ${expectedAddress}, got ${tx.to}`
                };
            }

            // Check Amount (USDT has 6 decimals on Eth as well)
            const actualAmount = parseFloat(tx.value) / 1000000;
            if (Math.abs(actualAmount - expectedAmount) > 0.1) {
                return {
                    valid: false,
                    reason: `Amount mismatch. Expected ${expectedAmount}, got ${actualAmount}`
                };
            }

            return { valid: true, details: { amount: actualAmount, from: tx.from } };

        } catch (error) {
            console.error('ERC20 Verification Error:', error.message);
            return { valid: false, reason: 'Error connecting to Etherscan API' };
        }
    }
}

module.exports = new BlockchainService();
