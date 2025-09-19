#!/usr/bin/env node

/**
 * Pre-cache script to build event cache on server startup
 * This runs in background and builds cache for all contracts
 */

const { Web3 } = require('web3');
const eventCache = require('./event-cache');
const { getWeb3Instance } = require('./rpc-config');

// Contract addresses
const CONTRACTS = {
    '1': '0xad04f4Eef94Efc3a698e70324b3F96e44703f70B',
    '1M': '0x65d1D748b4d513756cA179049227F6599D803594',
    '10M': '0x21349F435c703F933eBF2bb2A5aB2d716e00b205',
    '100M': '0x2443ccEef2D2803A97A12f5A9AA7db3BEc154B73',
    '1B': '0x282476B716146eAAbCfBDd339e527903deFD969b'
};

async function precacheContract(web3, contractAddress, denomination) {
    console.log(`\n[Pre-cache] Starting cache build for ${denomination} PLS contract...`);

    try {
        const contractJson = require('../build/contracts/ETHTornado.json');
        const tornado = new web3.eth.Contract(contractJson.abi, contractAddress);

        // Get current block
        const currentBlock = Number(await web3.eth.getBlockNumber());
        console.log(`[Pre-cache] Current block: ${currentBlock}`);

        // Load existing cache or start fresh
        const cached = eventCache.loadCache(contractAddress);
        let events = cached.events || [];
        let fromBlock = cached.lastBlock ? cached.lastBlock + 1 : 24200000;

        if (fromBlock >= currentBlock) {
            console.log(`[Pre-cache] ${denomination} already up to date!`);
            return;
        }

        console.log(`[Pre-cache] Fetching events from block ${fromBlock} to ${currentBlock}`);

        // Fetch in small chunks to avoid timeouts
        const chunkSize = process.env.NODE_ENV === 'production' ? 10000 : 50000;
        let fetchedCount = 0;

        for (let start = fromBlock; start <= currentBlock; start += chunkSize) {
            const end = Math.min(start + chunkSize - 1, currentBlock);

            try {
                console.log(`[Pre-cache] Fetching blocks ${start}-${end} for ${denomination}...`);
                const chunkEvents = await tornado.getPastEvents('Deposit', {
                    fromBlock: start,
                    toBlock: end
                });

                if (chunkEvents.length > 0) {
                    events.push(...chunkEvents);
                    fetchedCount += chunkEvents.length;
                    console.log(`[Pre-cache] Found ${chunkEvents.length} events in this chunk`);
                }

                // Save progress periodically
                if (fetchedCount > 0 && fetchedCount % 100 === 0) {
                    eventCache.saveCache(contractAddress, events, end);
                    console.log(`[Pre-cache] Saved ${events.length} total events for ${denomination}`);
                }

                // Small delay to avoid rate limits on public RPCs
                if (process.env.NODE_ENV === 'production') {
                    await new Promise(resolve => setTimeout(resolve, 500));
                }

            } catch (error) {
                console.error(`[Pre-cache] Error fetching ${start}-${end} for ${denomination}:`, error.message);
                // Continue with next chunk
            }
        }

        // Save final cache
        eventCache.saveCache(contractAddress, events, currentBlock);
        console.log(`[Pre-cache] ✅ Completed ${denomination}: ${events.length} total events cached`);

    } catch (error) {
        console.error(`[Pre-cache] Failed to cache ${denomination}:`, error);
    }
}

async function buildAllCaches() {
    console.log('===========================================');
    console.log('🚀 Starting event pre-cache process...');
    console.log('This will build caches for all contracts');
    console.log('===========================================\n');

    try {
        // Initialize Web3
        const web3 = await getWeb3Instance();
        console.log('[Pre-cache] Web3 initialized successfully\n');

        // Process each contract sequentially to avoid overwhelming RPC
        for (const [denomination, address] of Object.entries(CONTRACTS)) {
            await precacheContract(web3, address, denomination);

            // Delay between contracts
            if (process.env.NODE_ENV === 'production') {
                console.log('[Pre-cache] Waiting before next contract...');
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }

        console.log('\n===========================================');
        console.log('✅ Pre-cache complete! All contracts cached.');
        console.log('===========================================');

    } catch (error) {
        console.error('[Pre-cache] Fatal error:', error);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    buildAllCaches().then(() => {
        console.log('\n[Pre-cache] Exiting...');
        process.exit(0);
    }).catch(error => {
        console.error('[Pre-cache] Unexpected error:', error);
        process.exit(1);
    });
}

module.exports = { buildAllCaches, precacheContract };