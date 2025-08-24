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

const app = express();
const PORT = process.env.PORT || 8888;

// Middleware
app.use(express.json());
app.use(express.static(__dirname));
app.use('/build', express.static(path.join(__dirname, '..', 'build')));
app.use('/branding', express.static(path.join(__dirname, '..', 'branding')));

// Web3 setup - Using WebSocket for faster event fetching
const web3 = new Web3(new Web3.providers.WebsocketProvider('wss://rpc-pulsechain.g4mm4.io'));

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
 * Generate merkle proof for withdrawal
 */
async function generateMerkleProof(deposit, contractAddress) {
    const contractJson = require('../build/contracts/ETHTornado.json');
    const tornado = new web3.eth.Contract(contractJson.abi, contractAddress);
    
    console.log('Fetching deposit events via WebSocket...');
    const startTime = Date.now();
    
    // Get all deposit events - WebSocket is much faster for this
    const events = await tornado.getPastEvents('Deposit', { 
        fromBlock: 0, 
        toBlock: 'latest' 
    });
    
    console.log(`Fetched ${events.length} events in ${Date.now() - startTime}ms`);
    
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
async function generateProof({ deposit, recipient, contractAddress }) {
    const { root, pathElements, pathIndices } = await generateMerkleProof(deposit, contractAddress);
    
    // Prepare circuit input
    const input = {
        // Public inputs
        root: root,
        nullifierHash: deposit.nullifierHash,
        recipient: bigInt(recipient),
        relayer: bigInt(0),
        fee: bigInt(0),
        refund: bigInt(0),
        
        // Private inputs
        nullifier: deposit.nullifier,
        secret: deposit.secret,
        pathElements: pathElements,
        pathIndices: pathIndices
    };
    
    console.log('Generating SNARK proof...');
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

// Storage directory for wallet deposits
const DEPOSITS_DIR = path.join(__dirname, 'wallet-deposits');

// Ensure deposits directory exists
async function ensureDepositsDir() {
    try {
        await fsPromises.access(DEPOSITS_DIR);
    } catch {
        await fsPromises.mkdir(DEPOSITS_DIR, { recursive: true });
    }
}

// Save deposit for wallet
async function saveDepositForWallet(walletAddress, depositData) {
    await ensureDepositsDir();
    const walletFile = path.join(DEPOSITS_DIR, `${walletAddress.toLowerCase()}.json`);
    
    let walletDeposits = [];
    try {
        const existing = await fsPromises.readFile(walletFile, 'utf8');
        walletDeposits = JSON.parse(existing);
    } catch {
        // File doesn't exist yet
    }
    
    walletDeposits.push({
        ...depositData,
        timestamp: new Date().toISOString(),
        status: 'pending'
    });
    
    await fsPromises.writeFile(walletFile, JSON.stringify(walletDeposits, null, 2));
    return depositData;
}

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
        
        console.log('Generated commitment:', deposit.commitmentHex);
        console.log('Note:', noteString.substring(0, 50) + '...');
        
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

// API endpoint for withdrawal with full ZK proof
app.post('/api/withdraw', async (req, res) => {
    try {
        const { note, recipient } = req.body;
        console.log('Processing ZK withdrawal...');
        console.log('Note:', note ? note.substring(0, 50) + '...' : 'none');
        
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
        console.log('Commitment:', deposit.commitmentHex);
        
        // Check if deposit exists
        const contractJson = require('../build/contracts/ETHTornado.json');
        const tornado = new web3.eth.Contract(contractJson.abi, contractAddress);
        const commitment = await tornado.methods.commitments(deposit.commitmentHex).call();
        
        if (!commitment) {
            throw new Error('Deposit not found in contract. Make sure you used the correct note.');
        }
        
        // Generate proof
        const { proof, args } = await generateProof({ 
            deposit, 
            recipient: recipient || '0x0000000000000000000000000000000000000000',
            contractAddress
        });
        
        console.log('✅ ZK proof generated successfully');
        
        // Return proof data for frontend to execute
        res.json({
            proof,
            args,
            contractAddress,
            commitment: deposit.commitmentHex,
            nullifierHash: deposit.nullifierHex,
            success: true,
            message: 'ZK proof generated. Ready to withdraw.'
        });
        
    } catch (error) {
        console.error('Error processing withdrawal:', error);
        res.status(500).json({ error: error.message });
    }
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok',
        network: 'PulseChain',
        contracts: CONTRACTS,
        zkProofs: 'enabled',
        pedersen: 'enabled',
        compatible: 'CLI and Web fully compatible'
    });
});

// Serve index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// WebSocket reconnection handling
web3.currentProvider.on('connect', () => {
    console.log('✅ WebSocket connected to PulseChain');
});

web3.currentProvider.on('error', (error) => {
    console.error('WebSocket error:', error);
});

web3.currentProvider.on('end', () => {
    console.log('WebSocket disconnected, attempting to reconnect...');
    // Provider will auto-reconnect
});

// Initialize and start
async function start() {
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