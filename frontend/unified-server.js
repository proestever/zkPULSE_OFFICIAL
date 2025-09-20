const express = require('express');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');
const fsPromises = require('fs').promises;
const circomlib = require('circomlib');
const snarkjs = require('snarkjs');
const bigInt = snarkjs.bigInt;
const MerkleTree = require('fixed-merkle-tree');
const { Web3 } = require('web3');
const buildGroth16 = require('websnark/src/groth16');
const websnarkUtils = require('websnark/src/utils');
const { relayerConfig, calculateRelayerFee, getActiveRelayers } = require('./relayer-config');
const { getWeb3Instance } = require('./rpc-config');
const eventCache = require('./event-cache');
const dotenv = require('dotenv');
dotenv.config();

const app = express();
const PORT = process.env.PORT || 8888;

// Middleware
app.use(express.json());

// Proxy relayer requests in production
if (process.env.NODE_ENV === 'production') {
    const { createProxyMiddleware } = require('http-proxy-middleware');

    // Proxy /relayer requests to internal relayer service on port 4000
    app.use('/relayer', createProxyMiddleware({
        target: 'http://localhost:4000',
        changeOrigin: true,
        pathRewrite: {
            '^/relayer': '' // Remove /relayer prefix when forwarding
        },
        onError: (err, req, res) => {
            console.error('Relayer proxy error:', err);
            res.status(500).json({ error: 'Relayer service unavailable' });
        }
    }));
}

app.use(express.static(__dirname));
app.use('/build', express.static(path.join(__dirname, '..', 'build')));
app.use('/branding', express.static(path.join(__dirname, '..', 'branding')));

// Web3 setup - Will be initialized with working RPC
let web3;

// All deployed contracts
const CONTRACTS = {
    '1': '0xad04f4Eef94Efc3a698e70324b3F96e44703f70B',
    '1M': '0x65d1D748b4d513756cA179049227F6599D803594',
    '10M': '0x21349F435c703F933eBF2bb2A5aB2d716e00b205',
    '100M': '0x2443ccEef2D2803A97A12f5A9AA7db3BEc154B73',
    '1B': '0x282476B716146eAAbCfBDd339e527903deFD969b'
};

// Global variables
let circuit, proving_key, groth16;
const MERKLE_TREE_HEIGHT = 20;

// Initialize circuits
async function initCircuits() {
    circuit = require('../build/circuits/withdraw.json');
    proving_key = fs.readFileSync(path.join(__dirname, '../build/circuits/withdraw_proving_key.bin')).buffer;
    groth16 = await buildGroth16();
    console.log('✅ ZK circuits initialized');
}

/** Generate random number of specified byte length */
const rbigint = nbytes => snarkjs.bigInt.leBuff2int(crypto.randomBytes(nbytes));

/** Compute pedersen hash */
const pedersenHash = data => circomlib.babyJub.unpackPoint(circomlib.pedersenHash.hash(data))[0];

/** BigNumber to hex string of specified length */
function toHex(number, length = 32) {
    const str = number instanceof Buffer ? number.toString('hex') : bigInt(number).toString(16);
    return '0x' + str.padStart(length * 2, '0');
}

/**
 * Create deposit object from secret and nullifier
 * EXACTLY matching pulsechain-tornado.js
 */
function createDeposit({ nullifier, secret }) {
    const deposit = { nullifier, secret };
    deposit.preimage = Buffer.concat([deposit.nullifier.leInt2Buff(31), deposit.secret.leInt2Buff(31)]);
    deposit.commitment = pedersenHash(deposit.preimage);
    deposit.commitmentHex = toHex(deposit.commitment);
    deposit.nullifierHash = pedersenHash(deposit.nullifier.leInt2Buff(31));
    deposit.nullifierHex = toHex(deposit.nullifierHash);
    return deposit;
}

/**
 * Parse Tornado note
 * Updated to handle all denominations including 1M, 10M, 100M, 1B
 */
function parseNote(noteString) {
    const noteRegex = /tornado-(?<currency>\w+)-(?<amount>[\d.]+[MB]?)-(?<netId>\d+)-0x(?<note>[0-9a-fA-F]{124})/g;
    const match = noteRegex.exec(noteString);
    if (!match) {
        throw new Error('The note has invalid format');
    }

    const buf = Buffer.from(match.groups.note, 'hex');
    const nullifier = bigInt.leBuff2int(buf.slice(0, 31));
    const secret = bigInt.leBuff2int(buf.slice(31, 62));
    const deposit = createDeposit({ nullifier, secret });
    const netId = Number(match.groups.netId);

    return { currency: match.groups.currency, amount: match.groups.amount, netId, deposit };
}

/**
 * Helper function to fetch events in smaller chunks if needed
 */
async function fetchInSmallChunks(tornado, fromBlock, toBlock, chunkSize) {
    const events = [];
    // Use smaller chunks for production/public RPCs to avoid rate limits
    const actualChunkSize = process.env.NODE_ENV === 'production' ? 25000 : chunkSize;

    for (let start = fromBlock; start <= toBlock; start += actualChunkSize) {
        const end = Math.min(start + actualChunkSize - 1, toBlock);
        try {
            const chunkEvents = await tornado.getPastEvents('Deposit', {
                fromBlock: start,
                toBlock: end
            });
            events.push(...chunkEvents);

            // Add small delay in production to avoid rate limits
            if (process.env.NODE_ENV === 'production') {
                await new Promise(resolve => setTimeout(resolve, 200));
            }
        } catch (err) {
            console.error(`Failed to fetch ${start}-${end}, skipping...`);
        }
    }
    return events;
}

/**
 * Generate merkle proof for withdrawal
 */
async function generateMerkleProof(deposit, contractAddress) {
    const contractJson = require('../build/contracts/ETHTornado.json');
    const tornado = new web3.eth.Contract(contractJson.abi, contractAddress);

    console.log('Fetching deposit events...');
    const startTime = Date.now();

    // Use cached events for MUCH faster loading
    const currentBlockBigInt = await web3.eth.getBlockNumber();
    const currentBlock = Number(currentBlockBigInt);

    let events;

    try {
        // Try to use cache first (will be instant after first load)
        events = await eventCache.getCachedEvents(contractAddress, tornado, currentBlock);
        console.log(`Loaded ${events.length} events from cache in ${Date.now() - startTime}ms`);
    } catch (cacheError) {
        console.log('Cache miss, fetching events directly...');

        // Fallback to direct fetching if cache fails
        events = [];
        const DEPLOYMENT_BLOCK = 24200000;

        // Parallel fetch strategy for known active ranges
        const activeRanges = [
            { from: 24200000, to: 24299999 },  // Main activity range
            { from: 24300000, to: 24399999 },  // Secondary activity
            { from: 24400000, to: currentBlock } // Recent activity
        ];

        try {
            console.log('Fast-fetching events from known active ranges...');

            // Fetch all ranges in parallel for speed
            const promises = activeRanges.map(range => {
                const fromBlock = Math.max(range.from, DEPLOYMENT_BLOCK);
                const toBlock = Math.min(range.to, currentBlock);

                if (fromBlock <= toBlock) {
                    console.log(`Fetching block range ${fromBlock}-${toBlock}...`);
                    return tornado.getPastEvents('Deposit', {
                        fromBlock: fromBlock,
                        toBlock: toBlock
                    }).catch(err => {
                        console.error(`Error fetching ${fromBlock}-${toBlock}, retrying in chunks...`);
                        // Fallback to smaller chunks if range is too large
                        const fallbackChunkSize = process.env.NODE_ENV === 'production' ? 25000 : 100000;
                        return fetchInSmallChunks(tornado, fromBlock, toBlock, fallbackChunkSize);
                    });
                }
                return Promise.resolve([]);
            });

            // Wait for all parallel fetches
            const results = await Promise.all(promises);

            // Combine and sort events
            for (const chunkEvents of results) {
                events.push(...chunkEvents);
            }

            console.log(`Fetched ${events.length} events in parallel`);

            // Save to cache for next time
            try {
                eventCache.saveCache(contractAddress, events, currentBlock);
            } catch (e) {
                console.error('Failed to save cache:', e);
            }
        } catch (error) {
            console.error('Error fetching events:', error);
            throw new Error('Failed to fetch deposit events. Try again.');
        }
    }

    console.log(`Total ${events.length} events ready in ${Date.now() - startTime}ms`);
    
    const leaves = events
        .sort((a, b) => Number(a.returnValues.leafIndex) - Number(b.returnValues.leafIndex))
        .map(e => e.returnValues.commitment);
    
    const tree = new MerkleTree(MERKLE_TREE_HEIGHT, leaves);
    
    // Find our deposit
    const depositEvent = events.find(e => e.returnValues.commitment === deposit.commitmentHex);
    if (!depositEvent) {
        throw new Error('Deposit not found in the tree');
    }
    
    const leafIndex = Number(depositEvent.returnValues.leafIndex);
    console.log('Found deposit at leaf index:', leafIndex);
    
    // Get merkle proof
    const { pathElements, pathIndices } = tree.path(leafIndex);
    return { pathElements, pathIndices, root: tree.root() };
}

/**
 * Generate SNARK proof for withdrawal
 */
async function generateProof({ deposit, recipient, contractAddress, relayerAddress = null, fee = 0 }) {
    const { root, pathElements, pathIndices } = await generateMerkleProof(deposit, contractAddress);
    
    // Prepare circuit input
    const input = {
        // Public inputs
        root: root,
        nullifierHash: deposit.nullifierHash,
        recipient: bigInt(recipient),
        relayer: bigInt(relayerAddress || 0),
        fee: bigInt(fee || 0),
        refund: bigInt(0),
        
        // Private inputs
        nullifier: deposit.nullifier,
        secret: deposit.secret,
        pathElements: pathElements,
        pathIndices: pathIndices
    };
    
    console.log('\n========== Generating SNARK proof ==========');
    console.log('Contract:', contractAddress);
    console.log('Recipient:', recipient);
    if (relayerAddress) {
        console.log('Relayer address:', relayerAddress);
        console.log('Relayer fee (wei):', fee);
        console.log('Relayer fee (PLS):', fee / 1e18);
    }
    console.log('Merkle root:', toHex(root));
    // Sensitive data - not logged for privacy
    console.time('Proof generation');
    
    const proofData = await websnarkUtils.genWitnessAndProve(groth16, input, circuit, proving_key);
    const { proof } = websnarkUtils.toSolidityInput(proofData);
    
    console.timeEnd('Proof generation');
    
    const args = [
        toHex(input.root),
        toHex(input.nullifierHash),
        toHex(input.recipient, 20),
        toHex(input.relayer, 20),
        toHex(input.fee),
        toHex(input.refund)
    ];
    
    return { proof, args };
}

// PRIVACY PROTECTION: All deposit storage functions have been removed.
// NO SERVER-SIDE STORAGE of sensitive deposit data.
// All deposit tracking is handled client-side only to ensure complete privacy.
// This is critical for maintaining the privacy guarantees of the mixer.

// API endpoint for deposit (NO wallet tracking for privacy)
app.post('/api/deposit', async (req, res) => {
    // PRIVACY NOTE: This endpoint ONLY generates the cryptographic commitment
    // using Pedersen hash. NO DATA IS STORED on the server.
    // The note is sent back to the client and saved ONLY in their browser.
    try {
        const { amount: reqAmount } = req.body;
        
        console.log('Generating Pedersen deposit (no server storage)...');
        
        const deposit = createDeposit({ 
            nullifier: rbigint(31), 
            secret: rbigint(31) 
        });
        
        const note = toHex(deposit.preimage, 62);
        let amount = reqAmount || '1';
        
        // Ensure amount uses letter suffix format for consistency
        if (amount === '1000000' || amount === '1M') amount = '1M';
        else if (amount === '10000000' || amount === '10M') amount = '10M';
        else if (amount === '100000000' || amount === '100M') amount = '100M';
        else if (amount === '1000000000' || amount === '1B') amount = '1B';
        
        const noteString = `tornado-pls-${amount}-369-${note}`;
        
        // Privacy protection: Not logging sensitive commitment or note data
        
        // Prepare response data
        const responseData = {
            commitment: deposit.commitmentHex,
            noteHex: note.substring(2),
            nullifierHash: deposit.nullifierHex,
            note: noteString,
            preimageHex: note.substring(2) // For frontend compatibility
        };
        
        // NO SERVER STORAGE for maximum privacy
        // Everything is handled client-side
        console.log('✅ Deposit generated (not stored on server)');
        
        res.json(responseData);
    } catch (error) {
        console.error('Error generating deposit:', error);
        res.status(500).json({ error: error.message });
    }
});

// DISABLED FOR PRIVACY - No server storage of deposits
// API endpoint to get pending deposits for a wallet
/*
app.get('/api/deposits/:walletAddress', async (req, res) => {
    try {
        await ensureDepositsDir();
        const { walletAddress } = req.params;
        const walletFile = path.join(DEPOSITS_DIR, `${walletAddress.toLowerCase()}.json`);
        
        let deposits = [];
        try {
            const data = await fsPromises.readFile(walletFile, 'utf8');
            deposits = JSON.parse(data);
        } catch {
            // No deposits yet
        }
        
        // Filter to only pending deposits
        const pending = deposits.filter(d => d.status === 'pending');
        
        res.json(pending);
    } catch (error) {
        console.error('Error fetching deposits:', error);
        res.status(500).json({ error: error.message });
    }
});
*/

// API endpoint to mark deposit as completed
/*
app.post('/api/deposit/complete', async (req, res) => {
    try {
        await ensureDepositsDir();
        const { walletAddress, commitment, txHash } = req.body;
        
        const walletFile = path.join(DEPOSITS_DIR, `${walletAddress.toLowerCase()}.json`);
        
        let deposits = [];
        try {
            const data = await fsPromises.readFile(walletFile, 'utf8');
            deposits = JSON.parse(data);
        } catch {
            return res.json({ success: false, message: 'No deposits found' });
        }
        
        const deposit = deposits.find(d => d.commitment === commitment);
        
        if (deposit) {
            deposit.status = 'completed';
            deposit.txHash = txHash;
            deposit.completedAt = new Date().toISOString();
            
            await fsPromises.writeFile(walletFile, JSON.stringify(deposits, null, 2));
            console.log(`✅ Marked deposit as completed for ${walletAddress}`);
        }
        
        res.json({ success: true });
    } catch (error) {
        console.error('Error marking deposit complete:', error);
        res.status(500).json({ error: error.message });
    }
});
*/

// API endpoint for withdrawal with full ZK proof (with relayer support)
app.post('/api/withdraw', async (req, res) => {
    // Set longer timeout for production to account for proof generation
    if (process.env.NODE_ENV === 'production') {
        req.setTimeout(300000); // 5 minute timeout
        res.setTimeout(300000);
    }

    try {
        const { note, recipient, relayerAddress, useRelayer } = req.body;
        console.log('Processing ZK withdrawal...');
        // Privacy protection: Not logging note data
        console.log('Use relayer:', useRelayer);
        
        const { currency, amount, netId, deposit } = parseNote(note);
        
        if (netId !== 369) {
            throw new Error(`This note is for network ${netId}, but we're on PulseChain (369)`);
        }
        
        // Select contract based on amount
        let contractAddress;
        if (amount === '1') contractAddress = CONTRACTS['1'];
        else if (amount === '1M' || amount === '1000000') contractAddress = CONTRACTS['1M'];
        else if (amount === '10M' || amount === '10000000') contractAddress = CONTRACTS['10M'];
        else if (amount === '100M' || amount === '100000000') contractAddress = CONTRACTS['100M'];
        else if (amount === '1B' || amount === '1000000000') contractAddress = CONTRACTS['1B'];
        else throw new Error(`Invalid amount: ${amount}`);
        
        console.log('Using contract:', contractAddress);
        // Privacy protection: Not logging commitment data
        
        // Check if deposit exists
        const contractJson = require('../build/contracts/ETHTornado.json');
        const tornado = new web3.eth.Contract(contractJson.abi, contractAddress);
        const commitment = await tornado.methods.commitments(deposit.commitmentHex).call();
        
        if (!commitment) {
            throw new Error('Deposit not found in contract. Make sure you used the correct note.');
        }
        
        // Calculate fee if using relayer
        let fee = 0;
        let finalRelayerAddress = null;
        
        if (useRelayer && relayerAddress) {
            finalRelayerAddress = relayerAddress;
            // Normalize amount format for fee calculation
            let normalizedAmount = amount;
            if (amount === '1000000') normalizedAmount = '1M';
            else if (amount === '10000000') normalizedAmount = '10M';
            else if (amount === '100000000') normalizedAmount = '100M';
            else if (amount === '1000000000') normalizedAmount = '1B';
            
            fee = calculateRelayerFee(normalizedAmount, 'standard');
            console.log('Amount:', amount, '-> Normalized:', normalizedAmount);
            console.log('Calculated relayer fee:', fee, 'PLS');
            console.log('Relayer address:', finalRelayerAddress);
        }
        
        // Generate proof
        const { proof, args } = await generateProof({ 
            deposit, 
            recipient: recipient || '0x0000000000000000000000000000000000000000',
            contractAddress,
            relayerAddress: finalRelayerAddress,
            fee: fee
        });
        
        console.log('✅ ZK proof generated successfully');

        try {
            // Debug deposit object safely
            try {
                console.log('Deposit type:', typeof deposit);
                console.log('Deposit is null:', deposit === null);
                console.log('Deposit is undefined:', deposit === undefined);
                if (deposit) {
                    console.log('Has commitmentHex:', 'commitmentHex' in deposit);
                    console.log('Has nullifierHex:', 'nullifierHex' in deposit);
                }
            } catch (debugErr) {
                console.error('Error debugging deposit:', debugErr.message);
            }

            // Return proof data for frontend to execute
            const responseData = {
                proof,
                args,
                contractAddress,
                commitment: deposit.commitmentHex || 'not-available',
                nullifierHash: deposit.nullifierHex || 'not-available',
                success: true,
                message: 'ZK proof generated. Ready to withdraw.'
            };

            console.log('Building response data...');
            console.log('Response data size:', JSON.stringify(responseData).length, 'bytes');
            console.log('Sending proof response to frontend...');

            res.json(responseData);

            console.log('Response sent successfully');
        } catch (respError) {
            console.error('Error sending response:', respError);
            throw respError;
        }
        
    } catch (error) {
        console.error('Error processing withdrawal:', error);
        res.status(500).json({ error: error.message });
    }
});

// API endpoint to get available relayers
app.get('/api/relayers', (req, res) => {
    const { denomination } = req.query;
    const relayers = getActiveRelayers(denomination);
    console.log('Serving relayers to frontend:', relayers.map(r => ({ name: r.name, url: r.url })));
    res.json(relayers);
});

// API endpoint to calculate relayer fee
app.get('/api/relayer-fee', (req, res) => {
    const { denomination, gasPrice = 'standard' } = req.query;
    const fee = calculateRelayerFee(denomination, gasPrice);
    res.json({ 
        fee: fee.toString(),
        denomination,
        gasPrice,
        feePercent: relayerConfig.feeStructure[denomination] || 0.5
    });
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok',
        network: 'PulseChain',
        contracts: CONTRACTS,
        zkProofs: 'enabled',
        pedersen: 'enabled',
        compatible: 'CLI and Web fully compatible',
        relayerSupport: 'enabled'
    });
});

// Serve index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Setup Web3 connection monitoring
function setupWeb3Monitoring() {
    // Only set up event listeners for WebSocket providers
    if (web3.currentProvider && web3.currentProvider.on && typeof web3.currentProvider.on === 'function') {
        try {
            web3.currentProvider.on('connect', () => {
                console.log('✅ Connected to PulseChain RPC');
            });

            web3.currentProvider.on('error', (error) => {
                console.error('RPC error:', error.message);
            });

            web3.currentProvider.on('end', () => {
                console.log('RPC disconnected, attempting to reconnect...');
                // Provider will auto-reconnect if WebSocket
            });
        } catch (e) {
            // HTTP providers don't support event listeners, which is fine
            console.log('Using HTTP provider (no event monitoring)');
        }
    } else {
        console.log('Using HTTP provider (no event monitoring)');
    }
}

// Initialize and start
async function start() {
    try {
        // Initialize Web3 with working RPC
        console.log('🔍 Finding working PulseChain RPC endpoint...');
        web3 = await getWeb3Instance(false); // Prefer HTTP for better reliability
        setupWeb3Monitoring();

        // Test connection
        const blockNumber = await web3.eth.getBlockNumber();
        const chainId = await web3.eth.getChainId();
        console.log(`✅ Connected to PulseChain (Chain ID: ${chainId}, Block: ${blockNumber})`);
    } catch (error) {
        console.error('Failed to connect to PulseChain:', error);
        process.exit(1);
    }

    await initCircuits();
    
    app.listen(PORT, () => {
        console.log(`
    ========================================
    🌪️  TORNADO CASH UNIFIED SERVER
    ========================================
    
    Running at: http://localhost:${PORT}
    Network: PulseChain (WebSocket)
    
    All Deployed Contracts:
    - 1 PLS:     ${CONTRACTS['1']}
    - 1M PLS:    ${CONTRACTS['1M']}
    - 10M PLS:   ${CONTRACTS['10M']}
    - 100M PLS:  ${CONTRACTS['100M']}
    - 1B PLS:    ${CONTRACTS['1B']}
    
    ✅ Full ZK-SNARK proof generation
    ✅ Pedersen hashing (matching CLI)
    ✅ Complete deposit/withdrawal support
    ✅ 100% compatible with pulsechain-tornado.js
    
    Deposits and withdrawals work exactly like the CLI!
    ========================================
        `);
    });
}

start();