// zkPulse Relayer Server - SECURED VERSION
// This server acts as a relayer for privacy-preserving withdrawals

const express = require('express');
const cors = require('cors');
const { Web3 } = require('web3');
const dotenv = require('dotenv');
const { v4: uuidv4 } = require('uuid');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const { body, validationResult } = require('express-validator');

dotenv.config();

const app = express();

// Security: Use helmet for security headers
app.use(helmet({
    contentSecurityPolicy: false, // We'll handle CSP separately for API
    crossOriginEmbedderPolicy: false
}));

// Security: Configure CORS properly
const allowedOrigins = process.env.ALLOWED_ORIGINS ? 
    process.env.ALLOWED_ORIGINS.split(',') : 
    ['http://localhost:8888', 'http://localhost:3000'];

app.use(cors({
    origin: function(origin, callback) {
        // Allow requests with no origin (like mobile apps or Postman)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));

// Security: Limit request size
app.use(express.json({ limit: '1mb' }));

// Security: Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Apply rate limiting to all routes
app.use(limiter);

// Stricter rate limiting for withdrawal endpoint
const withdrawLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // Limit each IP to 10 withdrawal requests per windowMs
    message: 'Too many withdrawal requests, please try again later.',
});

// Configuration
const config = {
    port: process.env.RELAYER_PORT || 4000,
    rpcUrl: process.env.RPC_URL || 'https://rpc.pulsechain.com',
    privateKey: process.env.RELAYER_PRIVATE_KEY, // Required: Relayer's private key
    relayerAddress: process.env.RELAYER_ADDRESS, // Required: Relayer's address
    
    // Fee configuration (percentage)
    fees: {
        "1": 0.75,
        "1M": 0.5,
        "10M": 0.4,
        "100M": 0.3,
        "1B": 0.25
    },
    
    // Minimum fees in PLS
    minFees: {
        "1": 100,
        "1M": 5000,
        "10M": 10000,
        "100M": 20000,
        "1B": 50000
    },

    // Contract addresses - VALIDATED
    contracts: {
        "1": "0xad04f4Eef94Efc3a698e70324b3F96e44703f70B",
        "1M": "0x65d1D748b4d513756cA179049227F6599D803594",
        "10M": "0x21349F435c703F933eBF2bb2A5aB2d716e00b205",
        "100M": "0x2443ccEef2D2803A97A12f5A9AA7db3BEc154B73",
        "1B": "0x282476B716146eAAbCfBDd339e527903deFD969b"
    },

    // Gas limits
    gasLimits: {
        withdraw: 350000
    }
};

// Check if relayer is configured
if (!config.privateKey || !config.relayerAddress) {
    console.error('ERROR: RELAYER_PRIVATE_KEY and RELAYER_ADDRESS must be set in .env file');
    console.log('\nTo set up the relayer:');
    console.log('1. Create a .env file in the relayer directory');
    console.log('2. Add the following lines:');
    console.log('   RELAYER_PRIVATE_KEY=your_private_key_here');
    console.log('   RELAYER_ADDRESS=your_relayer_address_here');
    console.log('   RPC_URL=https://rpc.pulsechain.com (optional)');
    console.log('   RELAYER_PORT=4000 (optional)');
    console.log('   ALLOWED_ORIGINS=https://yourdomain.com,https://app.yourdomain.com (optional)');
    process.exit(1);
}

// Initialize Web3 (v4 syntax)
const web3 = new Web3(config.rpcUrl);
const account = web3.eth.accounts.privateKeyToAccount(config.privateKey);
web3.eth.accounts.wallet.add(account);
web3.eth.defaultAccount = account.address;

// Job queue to track withdrawal requests
const jobs = new Map();

// Tornado contract ABI (withdrawal function)
const tornadoABI = [
    {
        "inputs": [
            {"internalType": "bytes", "name": "_proof", "type": "bytes"},
            {"internalType": "bytes32", "name": "_root", "type": "bytes32"},
            {"internalType": "bytes32", "name": "_nullifierHash", "type": "bytes32"},
            {"internalType": "address payable", "name": "_recipient", "type": "address"},
            {"internalType": "address payable", "name": "_relayer", "type": "address"},
            {"internalType": "uint256", "name": "_fee", "type": "uint256"},
            {"internalType": "uint256", "name": "_refund", "type": "uint256"}
        ],
        "name": "withdraw",
        "outputs": [],
        "stateMutability": "payable",
        "type": "function"
    }
];

// Calculate fee for withdrawal
function calculateFee(denomination, gasPrice) {
    const denominationValue = {
        "1": 1,
        "1M": 1000000,
        "10M": 10000000,
        "100M": 100000000,
        "1B": 1000000000
    };

    const amount = denominationValue[denomination] || 1000000;
    const feePercent = config.fees[denomination] || 0.5;
    
    // Calculate percentage-based fee
    let fee = Math.floor(amount * (feePercent / 100));
    
    // Ensure minimum fee
    const minFee = config.minFees[denomination] || 5000;
    fee = Math.max(fee, minFee);
    
    // Add gas cost estimate (convert BigInt to regular number for calculation)
    const gasPriceNum = Number(gasPrice);
    const estimatedGasCost = gasPriceNum * config.gasLimits.withdraw;
    fee = Math.max(fee, estimatedGasCost * 1.2); // 20% buffer for gas
    
    return fee;
}

// Validation helper
function isValidEthereumAddress(address) {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
}

function isValidHex(hex) {
    return /^0x[a-fA-F0-9]+$/.test(hex);
}

// API Routes

// Health check
app.get('/status', (req, res) => {
    res.json({
        status: 'active',
        relayerAddress: config.relayerAddress,
        supportedDenominations: Object.keys(config.contracts),
        fees: config.fees,
        minFees: config.minFees,
        network: 'pulsechain',
        chainId: 369,
        version: '1.0.0-secure'
    });
});

// Get fee estimate
app.get('/v1/tornadoFee', 
    [
        // Input validation
        body('currency').optional().isIn(['pls', 'PLS']),
        body('amount').optional().isIn(['1', '1M', '10M', '100M', '1B']),
        body('operation').optional().equals('withdraw')
    ],
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }

            const { currency, amount, operation } = req.query;
            
            if (currency !== 'pls' || operation !== 'withdraw') {
                return res.status(400).json({ error: 'Unsupported operation' });
            }

            const gasPrice = await web3.eth.getGasPrice();
            const fee = calculateFee(amount, gasPrice);

            res.json({
                fee: fee.toString(),
                feePercent: config.fees[amount] || 0.5,
                gasPrice: gasPrice.toString(),
                relayerAddress: config.relayerAddress
            });
        } catch (error) {
            console.error('Error calculating fee:', error.message);
            res.status(500).json({ error: 'Failed to calculate fee' });
        }
    }
);

// Submit withdrawal - WITH VALIDATION AND RATE LIMITING
app.post('/v1/tornadoWithdraw',
    withdrawLimiter, // Apply stricter rate limiting
    [
        // Comprehensive input validation
        body('proof').isString().custom(value => isValidHex(value)).withMessage('Invalid proof format'),
        body('args').isArray({ min: 6, max: 6 }).withMessage('Args must be array of 6 elements'),
        body('args.*').isString().custom(value => isValidHex(value)).withMessage('Invalid hex in args'),
        body('contract').isString().custom(value => isValidEthereumAddress(value)).withMessage('Invalid contract address'),
        body('denomination').isIn(['1', '1M', '10M', '100M', '1B']).withMessage('Invalid denomination')
    ],
    async (req, res) => {
        try {
            // Check validation results
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ 
                    error: 'Validation failed', 
                    details: errors.array() 
                });
            }

            const { proof, args, contract, denomination } = req.body;

            // Additional security: Verify contract is in our whitelist
            if (!Object.values(config.contracts).includes(contract)) {
                return res.status(400).json({ error: 'Contract address not whitelisted' });
            }

            // Additional security: Verify expected contract for denomination
            if (config.contracts[denomination] !== contract) {
                return res.status(400).json({ error: 'Contract does not match denomination' });
            }

            // Create job ID
            const jobId = uuidv4();
            
            // Store job (sanitized - no sensitive data in initial storage)
            jobs.set(jobId, {
                id: jobId,
                status: 'pending',
                contract,
                denomination,
                timestamp: Date.now(),
                ip: req.ip // Track IP for security monitoring
            });

            // Process withdrawal asynchronously (pass full data separately)
            processWithdrawal(jobId, proof, args, contract, denomination);

            res.json({
                jobId,
                status: 'pending',
                message: 'Withdrawal request submitted'
            });
        } catch (error) {
            console.error('Error submitting withdrawal:', error.message);
            res.status(500).json({ error: 'Failed to submit withdrawal' });
        }
    }
);

// Check job status
app.get('/v1/jobs/:jobId', (req, res) => {
    const { jobId } = req.params;
    
    // Validate job ID format
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(jobId)) {
        return res.status(400).json({ error: 'Invalid job ID format' });
    }
    
    const job = jobs.get(jobId);

    if (!job) {
        return res.status(404).json({ error: 'Job not found' });
    }

    // Return sanitized job info (no sensitive data)
    res.json({
        id: job.id,
        status: job.status,
        txHash: job.txHash,
        error: job.error ? 'Transaction failed' : undefined, // Don't expose detailed errors
        timestamp: job.timestamp
    });
});

// Process withdrawal
async function processWithdrawal(jobId, proof, args, contractAddress, denomination) {
    const job = jobs.get(jobId);
    
    try {
        console.log(`\n========== Processing withdrawal job ${jobId} ==========`);
        console.log('Contract:', contractAddress);
        console.log('Denomination:', denomination);
        // Security: Don't log sensitive proof/args data
        console.log('Processing withdrawal...');
        job.status = 'processing';
        
        // Check web3 connection
        try {
            await web3.eth.getBlockNumber();
        } catch (connError) {
            console.error('RPC connection error');
            throw new Error('RPC connection failed');
        }

        // Parse arguments
        const [root, nullifierHash, recipient, relayerFromProof, feeFromProof, refund] = args;
        
        // Security: Verify relayer address matches
        if (relayerFromProof.toLowerCase() !== config.relayerAddress.toLowerCase()) {
            throw new Error('Relayer address mismatch');
        }
        
        // Use fee from proof
        const fee = feeFromProof;

        // Create contract instance
        const contract = new web3.eth.Contract(tornadoABI, contractAddress);

        // Build transaction
        const tx = contract.methods.withdraw(
            proof,
            root,
            nullifierHash,
            recipient,
            relayerFromProof,
            fee,
            refund || '0'
        );

        // Get current gas price
        const gasPrice = await web3.eth.getGasPrice();
        
        // Estimate gas
        let gasEstimate;
        try {
            gasEstimate = await tx.estimateGas({
                from: config.relayerAddress,
                value: 0
            });
            console.log('Gas estimate:', gasEstimate);
        } catch (estimateError) {
            console.error('Gas estimation failed');
            throw new Error('Transaction would revert');
        }

        // Send transaction
        console.log('Sending transaction...');
        const gasLimit = Math.floor(Number(gasEstimate) * 1.2);
        
        const receipt = await tx.send({
            from: config.relayerAddress,
            gas: gasLimit,
            gasPrice: gasPrice.toString(),
            value: 0
        });

        console.log(`Withdrawal successful: ${receipt.transactionHash}`);
        
        // Update job status
        job.status = 'completed';
        job.txHash = receipt.transactionHash;
        job.completedAt = Date.now();

    } catch (error) {
        console.error(`Withdrawal failed for job ${jobId}`);
        
        // Security: Store sanitized error message
        let userFriendlyError = 'Transaction failed';
        
        if (error.message.includes('revert')) {
            if (error.message.includes('already spent')) {
                userFriendlyError = 'Note already withdrawn';
            } else if (error.message.includes('merkle root')) {
                userFriendlyError = 'Invalid merkle root';
            } else if (error.message.includes('Fee exceeds')) {
                userFriendlyError = 'Fee too high';
            }
        } else if (error.message.includes('Relayer address mismatch')) {
            userFriendlyError = 'Invalid relayer configuration';
        }
        
        job.status = 'failed';
        job.error = userFriendlyError;
    }
}

// Cleanup old jobs (older than 24 hours)
setInterval(() => {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours

    for (const [jobId, job] of jobs.entries()) {
        if (now - job.timestamp > maxAge) {
            jobs.delete(jobId);
        }
    }
}, 60 * 60 * 1000); // Run every hour

// Error handling middleware
app.use((err, req, res, next) => {
    if (err.message === 'Not allowed by CORS') {
        return res.status(403).json({ error: 'CORS policy violation' });
    }
    console.error('Server error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(config.port, () => {
    console.log(`
    ========================================
    🌪️  zkPULSE RELAYER SERVER (SECURE)
    ========================================
    
    Running at: http://localhost:${config.port}
    Relayer Address: ${config.relayerAddress}
    Network: PulseChain
    RPC: ${config.rpcUrl}
    
    Security Features:
    ✅ Rate limiting enabled
    ✅ CORS protection configured
    ✅ Input validation active
    ✅ Security headers enabled
    ✅ Request size limits enforced
    
    Supported Denominations:
    ${Object.entries(config.contracts).map(([denom, addr]) => 
        `    - ${denom} PLS: ${addr}`
    ).join('\n')}
    
    Fee Structure:
    ${Object.entries(config.fees).map(([denom, fee]) => 
        `    - ${denom} PLS: ${fee}% (min: ${config.minFees[denom]} PLS)`
    ).join('\n')}
    
    API Endpoints:
    - GET  /status              - Health check
    - GET  /v1/tornadoFee       - Get fee estimate
    - POST /v1/tornadoWithdraw  - Submit withdrawal
    - GET  /v1/jobs/:jobId      - Check job status
    
    ========================================
    `);
});