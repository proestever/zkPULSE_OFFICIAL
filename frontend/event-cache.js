// Event Cache Manager
// Caches deposit events to avoid repeated RPC calls

const fs = require('fs');
const path = require('path');

class EventCache {
    constructor() {
        this.cacheDir = path.join(__dirname, '..', 'cache');
        this.cacheFile = path.join(this.cacheDir, 'events.json');
        this.memoryCache = null;
        this.lastBlock = 0;
        this.cacheExpiry = 60 * 1000; // 1 minute cache in memory
        this.lastCacheTime = 0;

        // Create cache directory if it doesn't exist
        if (!fs.existsSync(this.cacheDir)) {
            fs.mkdirSync(this.cacheDir, { recursive: true });
        }
    }

    // Load cached events from disk
    loadCache(contractAddress) {
        const contractCacheFile = path.join(this.cacheDir, `events_${contractAddress.toLowerCase()}.json`);

        try {
            if (fs.existsSync(contractCacheFile)) {
                const data = JSON.parse(fs.readFileSync(contractCacheFile, 'utf8'));
                console.log(`Loaded ${data.events.length} cached events for ${contractAddress} up to block ${data.lastBlock}`);
                return data;
            }
        } catch (error) {
            console.error('Error loading cache:', error);
        }

        return { events: [], lastBlock: 24200000 }; // Start from deployment block
    }

    // Save events to cache
    saveCache(contractAddress, events, lastBlock) {
        const contractCacheFile = path.join(this.cacheDir, `events_${contractAddress.toLowerCase()}.json`);

        try {
            // Convert BigInt values to strings for JSON serialization
            const serializedEvents = events.map(event => ({
                ...event,
                blockNumber: event.blockNumber?.toString(),
                returnValues: {
                    ...event.returnValues,
                    leafIndex: event.returnValues.leafIndex?.toString()
                }
            }));

            const data = {
                events: serializedEvents,
                lastBlock: lastBlock.toString ? lastBlock.toString() : lastBlock,
                timestamp: Date.now()
            };

            fs.writeFileSync(contractCacheFile, JSON.stringify(data));
            console.log(`Cached ${events.length} events for ${contractAddress} up to block ${lastBlock}`);
        } catch (error) {
            console.error('Error saving cache:', error);
        }
    }

    // Get events with caching
    async getCachedEvents(contractAddress, tornado, currentBlock) {
        // Check memory cache first
        const cacheKey = contractAddress.toLowerCase();
        if (this.memoryCache &&
            this.memoryCache[cacheKey] &&
            (Date.now() - this.lastCacheTime) < this.cacheExpiry) {
            console.log('Using memory cache for events');
            return this.memoryCache[cacheKey];
        }

        // Load from disk cache
        const cached = this.loadCache(contractAddress);
        let events = cached.events;
        let fromBlock = cached.lastBlock + 1;

        // Only fetch new events if there are new blocks
        if (fromBlock < currentBlock) {
            console.log(`Fetching new events from block ${fromBlock} to ${currentBlock}`);

            try {
                // Fetch only new events since last cache
                const newEvents = await this.fetchNewEvents(tornado, fromBlock, currentBlock);

                if (newEvents.length > 0) {
                    events = [...events, ...newEvents];
                    // Save updated cache
                    this.saveCache(contractAddress, events, currentBlock);
                }
            } catch (error) {
                console.error('Error fetching new events:', error);
                // Return cached events even if update fails
            }
        } else {
            console.log('Cache is up to date');
        }

        // Store in memory cache
        if (!this.memoryCache) {
            this.memoryCache = {};
        }
        this.memoryCache[cacheKey] = events;
        this.lastCacheTime = Date.now();

        return events;
    }

    // Fetch only new events efficiently
    async fetchNewEvents(tornado, fromBlock, toBlock) {
        const events = [];
        const chunkSize = process.env.NODE_ENV === 'production' ? 10000 : 50000;

        for (let start = fromBlock; start <= toBlock; start += chunkSize) {
            const end = Math.min(start + chunkSize - 1, toBlock);

            try {
                console.log(`Fetching events ${start}-${end}...`);
                const chunkEvents = await tornado.getPastEvents('Deposit', {
                    fromBlock: start,
                    toBlock: end
                });
                events.push(...chunkEvents);

                // Small delay for public RPCs
                if (process.env.NODE_ENV === 'production' && chunkEvents.length > 0) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
            } catch (error) {
                console.error(`Failed to fetch block ${start}-${end}:`, error.message);
                // Continue with next chunk
            }
        }

        return events;
    }

    // Clear cache for a specific contract
    clearCache(contractAddress) {
        const contractCacheFile = path.join(this.cacheDir, `events_${contractAddress.toLowerCase()}.json`);
        try {
            if (fs.existsSync(contractCacheFile)) {
                fs.unlinkSync(contractCacheFile);
            }
            if (this.memoryCache) {
                delete this.memoryCache[contractAddress.toLowerCase()];
            }
        } catch (error) {
            console.error('Error clearing cache:', error);
        }
    }
}

module.exports = new EventCache();