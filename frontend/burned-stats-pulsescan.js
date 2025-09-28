// PulseScan API-based burned token stats
class BurnedTokenStatsPulseScan {
    constructor() {
        this.zkPULSE_TOKEN = '0x8De9077B619DcBdA28edda4b8dC16538a59EFb49';
        this.BURN_ADDRESSES = [
            '0x0000000000000000000000000000000000000369', // 369 burn address
            '0x0000000000000000000000000000000000000000', // Zero address
            '0x000000000000000000000000000000000000dEaD', // Dead address
            '0x0000000000000000000000000000000000000001'  // Address(1)
        ];

        this.cachedValue = null;
        this.lastFetchTime = 0;
        this.cacheTimeout = 300000; // 5 minute cache (API calls are limited)

        // PulseScan API endpoints
        this.PULSESCAN_API = 'https://api.scan.pulsechain.com/api';
        this.API_KEY = 'free'; // Using free tier
    }

    async getBurnedAmount() {
        // Return cached value if still valid
        if (this.cachedValue && (Date.now() - this.lastFetchTime < this.cacheTimeout)) {
            return this.cachedValue;
        }

        try {
            // Method 1: Try to get token holders from PulseScan
            const holders = await this.fetchTokenHolders();

            if (holders && holders.length > 0) {
                const burnedAmount = this.calculateBurnedFromHolders(holders);

                this.cachedValue = {
                    amount: burnedAmount,
                    formatted: this.formatAmount(burnedAmount),
                    source: 'pulsescan',
                    exists: true
                };
                this.lastFetchTime = Date.now();
                return this.cachedValue;
            }

            // Method 2: Try direct balance check via PulseScan API
            const directBalance = await this.fetchDirectBalances();
            if (directBalance > 0) {
                this.cachedValue = {
                    amount: directBalance,
                    formatted: this.formatAmount(directBalance),
                    source: 'pulsescan-balance',
                    exists: true
                };
                this.lastFetchTime = Date.now();
                return this.cachedValue;
            }

            // Method 3: Fallback to estimation
            return await this.estimateFromStats();

        } catch (error) {
            // Return last known value or estimation
            if (this.cachedValue) {
                return this.cachedValue;
            }
            return await this.estimateFromStats();
        }
    }

    async fetchTokenHolders() {
        try {
            // PulseScan API endpoint for token holders
            const url = `${this.PULSESCAN_API}?module=token&action=getTokenHolders` +
                       `&contractaddress=${this.zkPULSE_TOKEN}` +
                       `&page=1&offset=100` +
                       `&apikey=${this.API_KEY}`;

            const response = await fetch(url);
            if (!response.ok) return null;

            const data = await response.json();

            if (data.status === '1' && data.result) {
                return data.result;
            }

            return null;
        } catch (error) {
            return null;
        }
    }

    async fetchDirectBalances() {
        try {
            let totalBurned = 0;

            // Check each burn address
            for (const burnAddress of this.BURN_ADDRESSES) {
                const url = `${this.PULSESCAN_API}?module=account&action=tokenbalance` +
                           `&contractaddress=${this.zkPULSE_TOKEN}` +
                           `&address=${burnAddress}` +
                           `&tag=latest` +
                           `&apikey=${this.API_KEY}`;

                try {
                    const response = await fetch(url);
                    if (response.ok) {
                        const data = await response.json();
                        if (data.status === '1' && data.result) {
                            // Convert from wei (assuming 18 decimals)
                            const balance = parseFloat(data.result) / 1e18;
                            totalBurned += balance;
                        }
                    }
                } catch (err) {
                    // Continue to next address
                }

                // Small delay to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 200));
            }

            return totalBurned;
        } catch (error) {
            return 0;
        }
    }

    calculateBurnedFromHolders(holders) {
        let totalBurned = 0;

        for (const holder of holders) {
            // Check if holder address is one of the burn addresses
            const holderAddress = holder.address?.toLowerCase();

            for (const burnAddr of this.BURN_ADDRESSES) {
                if (holderAddress === burnAddr.toLowerCase()) {
                    // Parse balance (usually in wei with 18 decimals)
                    const balance = parseFloat(holder.balance || holder.value || '0');
                    const decimals = parseInt(holder.decimals || '18');
                    const amount = balance / Math.pow(10, decimals);
                    totalBurned += amount;
                }
            }
        }

        return totalBurned;
    }

    async estimateFromStats() {
        try {
            // Fetch protocol stats and estimate burned amount
            const response = await fetch('/api/stats');
            if (!response.ok) throw new Error('Stats API failed');

            const stats = await response.json();
            const totalDeposits = stats.total.deposits || 0;

            // Estimate: 0.3% average fee, 50% of fees are burned
            const estimatedBurned = totalDeposits * 0.003 * 0.5 * 1000000; // In PLS

            return {
                amount: estimatedBurned,
                formatted: this.formatAmount(estimatedBurned) + ' (est)',
                source: 'estimation',
                exists: false,
                isEstimate: true
            };
        } catch (error) {
            return {
                amount: 0,
                formatted: '0.00',
                source: 'error',
                exists: false
            };
        }
    }

    formatAmount(amount) {
        if (amount >= 1000000) {
            return (amount / 1000000).toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }) + 'M';
        } else if (amount >= 1000) {
            return (amount / 1000).toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }) + 'K';
        } else {
            return amount.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            });
        }
    }

    // Alternative: Use Web3 with proper error handling
    async getDirectWeb3Balance(web3) {
        if (!web3) return 0;

        let totalBurned = 0;

        for (const burnAddress of this.BURN_ADDRESSES) {
            try {
                const minimalABI = [{
                    "inputs": [{"name": "account", "type": "address"}],
                    "name": "balanceOf",
                    "outputs": [{"name": "", "type": "uint256"}],
                    "stateMutability": "view",
                    "type": "function"
                }];

                const contract = new web3.eth.Contract(minimalABI, this.zkPULSE_TOKEN);
                const balance = await contract.methods.balanceOf(burnAddress).call();

                // Convert from wei
                const amount = parseFloat(web3.utils.fromWei(balance, 'ether'));
                totalBurned += amount;

            } catch (err) {
                // Continue to next address
            }
        }

        return totalBurned;
    }
}

// Create singleton instance
const burnedStatsPulseScan = new BurnedTokenStatsPulseScan();

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = burnedStatsPulseScan;
}