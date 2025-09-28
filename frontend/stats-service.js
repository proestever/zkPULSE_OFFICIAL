const { Web3 } = require('web3');
const fs = require('fs').promises;
const path = require('path');

class StatsService {
    constructor() {
        this.web3 = null;
        this.statsCache = null;
        this.cacheTimeout = 60000; // 1 minute cache
        this.lastCacheTime = 0;
        this.isUpdating = false;

        this.contracts = {
            '1M': '0x65d1D748b4d513756cA179049227F6599D803594',
            '10M': '0x21349F435c703F933eBF2bb2A5aB2d716e00b205',
            '100M': '0x2443ccEef2D2803A97A12f5A9AA7db3BEc154B73',
            '1B': '0x282476B716146eAAbCfBDd339e527903deFD969b'
        };

        this.abi = [
            {
                "inputs": [],
                "name": "nextIndex",
                "outputs": [{"internalType": "uint32", "name": "", "type": "uint32"}],
                "stateMutability": "view",
                "type": "function"
            }
        ];

        // Stats file path for persistent caching
        this.statsFilePath = path.join(__dirname, '..', 'cache', 'network-stats.json');
    }

    async initialize(web3Instance) {
        this.web3 = web3Instance;

        // Try to load cached stats from file
        try {
            const cachedData = await fs.readFile(this.statsFilePath, 'utf8');
            const parsed = JSON.parse(cachedData);
            if (parsed && parsed.timestamp && (Date.now() - parsed.timestamp < 3600000)) { // 1 hour file cache
                this.statsCache = parsed.data;
                this.lastCacheTime = parsed.timestamp;
                console.log('Loaded stats from file cache');
            }
        } catch (error) {
            console.log('No valid stats cache found, will fetch fresh data');
        }
    }

    async getStats(forceRefresh = false) {
        // Return cached stats if still valid and not forcing refresh
        if (!forceRefresh && this.statsCache && (Date.now() - this.lastCacheTime < this.cacheTimeout)) {
            return this.statsCache;
        }

        // If already updating, wait and return cached data
        if (this.isUpdating) {
            return this.statsCache || this.getEmptyStats();
        }

        this.isUpdating = true;

        try {
            const stats = {
                denominations: {},
                total: {
                    deposits: 0,
                    withdrawals: 0,
                    active: 0,
                    balance: '0',
                    balanceFormatted: '0 PLS'
                },
                lastUpdate: Date.now()
            };

            let totalBalance = 0;

            // Fetch stats for each denomination in parallel
            const promises = Object.entries(this.contracts).map(async ([denom, address]) => {
                try {
                    const contract = new this.web3.eth.Contract(this.abi, address);

                    // Get deposit count and balance in parallel
                    const [depositCount, balance] = await Promise.all([
                        contract.methods.nextIndex().call().then(count => parseInt(count)).catch(() => 0),
                        this.web3.eth.getBalance(address)
                    ]);

                    const balanceInPLS = parseFloat(this.web3.utils.fromWei(balance, 'ether'));

                    // Format balance based on denomination
                    let formattedBalance;
                    if (balanceInPLS === 0) {
                        formattedBalance = '0 PLS';
                    } else if (denom === '1M') {
                        formattedBalance = (balanceInPLS / 1000000).toFixed(2) + 'M PLS';
                    } else if (denom === '10M') {
                        formattedBalance = (balanceInPLS / 1000000).toFixed(1) + 'M PLS';
                    } else if (denom === '100M') {
                        formattedBalance = (balanceInPLS / 1000000).toFixed(0) + 'M PLS';
                    } else if (denom === '1B') {
                        formattedBalance = (balanceInPLS / 1000000000).toFixed(2) + 'B PLS';
                    }

                    stats.denominations[denom] = {
                        deposits: depositCount,
                        withdrawals: 0, // We'll skip withdrawal counting for speed
                        active: depositCount,
                        balance: balanceInPLS.toString(),
                        balanceFormatted: formattedBalance,
                        address: address
                    };

                    // Update totals
                    stats.total.deposits += depositCount;
                    totalBalance += balanceInPLS;

                } catch (error) {
                    console.error(`Error fetching stats for ${denom}:`, error.message);
                    stats.denominations[denom] = {
                        deposits: 0,
                        withdrawals: 0,
                        active: 0,
                        balance: '0',
                        balanceFormatted: '0 PLS',
                        address: address,
                        error: true
                    };
                }
            });

            await Promise.all(promises);

            // Format total balance
            if (totalBalance >= 1000000000) {
                stats.total.balanceFormatted = (totalBalance / 1000000000).toFixed(2) + 'B PLS';
            } else if (totalBalance >= 1000000) {
                stats.total.balanceFormatted = (totalBalance / 1000000).toFixed(2) + 'M PLS';
            } else {
                stats.total.balanceFormatted = totalBalance.toFixed(2) + ' PLS';
            }
            stats.total.balance = totalBalance.toString();
            stats.total.active = stats.total.deposits - stats.total.withdrawals;

            // Update cache
            this.statsCache = stats;
            this.lastCacheTime = Date.now();

            // Save to file cache asynchronously (don't wait)
            this.saveToFileCache(stats).catch(err =>
                console.error('Failed to save stats cache:', err)
            );

            return stats;

        } catch (error) {
            console.error('Error fetching network stats:', error);
            return this.statsCache || this.getEmptyStats();
        } finally {
            this.isUpdating = false;
        }
    }

    async saveToFileCache(stats) {
        try {
            const cacheData = {
                timestamp: Date.now(),
                data: stats
            };
            await fs.mkdir(path.dirname(this.statsFilePath), { recursive: true });
            await fs.writeFile(this.statsFilePath, JSON.stringify(cacheData, null, 2));
        } catch (error) {
            console.error('Error saving stats to file:', error);
        }
    }

    getEmptyStats() {
        return {
            denominations: {
                '1M': { deposits: 0, withdrawals: 0, active: 0, balance: '0', balanceFormatted: '0 PLS' },
                '10M': { deposits: 0, withdrawals: 0, active: 0, balance: '0', balanceFormatted: '0 PLS' },
                '100M': { deposits: 0, withdrawals: 0, active: 0, balance: '0', balanceFormatted: '0 PLS' },
                '1B': { deposits: 0, withdrawals: 0, active: 0, balance: '0', balanceFormatted: '0 PLS' }
            },
            total: {
                deposits: 0,
                withdrawals: 0,
                active: 0,
                balance: '0',
                balanceFormatted: '0 PLS'
            },
            lastUpdate: Date.now()
        };
    }
}

module.exports = StatsService;