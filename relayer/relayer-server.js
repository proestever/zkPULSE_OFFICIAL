// zkPulse Relayer Server
// This server acts as a relayer for privacy-preserving withdrawals

const express = require('express');
const cors = require('cors');
const { Web3 } = require('web3');
const dotenv = require('dotenv');
const { v4: uuidv4 } = require('uuid');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

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

    // Contract addresses
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
    console.log('   RPC_URL=wss://ws.pulsechain.com (optional)');
    console.log('   RELAYER_PORT=4000 (optional)');
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
        chainId: 369
    });
});

// Get fee estimate
app.get('/v1/tornadoFee', async (req, res) => {
    try {
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
        console.error('Error calculating fee:', error);
        res.status(500).json({ error: 'Failed to calculate fee' });
    }
});

// Submit withdrawal
app.post('/v1/tornadoWithdraw', async (req, res) => {
    try {
        const { proof, args, contract, denomination } = req.body;

        // Validate inputs
        if (!proof || !args || !contract || !denomination) {
            return res.status(400).json({ error: 'Missing required parameters' });
        }

        // Create job ID
        const jobId = uuidv4();
        
        // Store job
        jobs.set(jobId, {
            id: jobId,
            status: 'pending',
            proof,
            args,
            contract,
            denomination,
            timestamp: Date.now()
        });

        // Process withdrawal asynchronously
        processWithdrawal(jobId, proof, args, contract, denomination);

        res.json({
            jobId,
            status: 'pending',
            message: 'Withdrawal request submitted'
        });
    } catch (error) {
        console.error('Error submitting withdrawal:', error);
        res.status(500).json({ error: 'Failed to submit withdrawal' });
    }
});

// Check job status
app.get('/v1/jobs/:jobId', (req, res) => {
    const { jobId } = req.params;
    const job = jobs.get(jobId);

    if (!job) {
        return res.status(404).json({ error: 'Job not found' });
    }

    res.json({
        id: job.id,
        status: job.status,
        txHash: job.txHash,
        error: job.error,
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
        console.log('Args:', JSON.stringify(args, null, 2));
        console.log('Proof length:', proof ? proof.length : 'null');
        job.status = 'processing';
        
        // Check web3 connection
        try {
            await web3.eth.getBlockNumber();
        } catch (connError) {
            console.error('RPC connection error:', connError.message);
            throw new Error('RPC connection failed. Please check network connectivity.');
        }

        // Parse arguments - args[3] is the relayer address, args[4] is the fee
        const [root, nullifierHash, recipient, relayerFromProof, feeFromProof, refund] = args;
        console.log('\nParsed arguments:');
        console.log('  Root:', root);
        console.log('  NullifierHash:', nullifierHash);
        console.log('  Recipient:', recipient);
        console.log('  Relayer from proof:', relayerFromProof);
        console.log('  Fee from proof:', feeFromProof);
        console.log('  Refund:', refund);
        
        // Verify relayer address matches
        if (relayerFromProof.toLowerCase() !== config.relayerAddress.toLowerCase()) {
            throw new Error(`Relayer address mismatch. Expected: ${config.relayerAddress}, Got: ${relayerFromProof}`);
        }
        
        // Use fee from proof (it was already calculated when proof was generated)
        const fee = feeFromProof;
        console.log('Using fee from proof:', fee);

        // Create contract instance
        const contract = new web3.eth.Contract(tornadoABI, contractAddress);

        // Build transaction - MUST use exact same parameters as in the proof
        const tx = contract.methods.withdraw(
            proof,
            root,
            nullifierHash,
            recipient,
            relayerFromProof,  // Use relayer address from proof
            fee,               // Use fee from proof
            refund || '0'
        );

        // Get current gas price
        const gasPrice = await web3.eth.getGasPrice();
        console.log('Current gas price:', gasPrice.toString());
        
        // Estimate gas
        let gasEstimate;
        try {
            gasEstimate = await tx.estimateGas({
                from: config.relayerAddress,
                value: 0
            });
            console.log('Gas estimate:', gasEstimate);
        } catch (estimateError) {
            console.error('\n❌ Gas estimation failed!');
            console.error('Error details:', estimateError);

            // Try to decode the revert reason
            if (estimateError.data) {
                console.error('Revert data:', estimateError.data);
            }

            if (estimateError.message) {
                console.error('Error message:', estimateError.message);

                if (estimateError.message.includes('already been spent')) {
                    console.error('⚠️  This note has already been withdrawn!');
                    throw new Error('Note already spent');
                } else if (estimateError.message.includes('cannot be found')) {
                    console.error('⚠️  Merkle root not found - deposit may not exist');
                    throw new Error('Invalid merkle root - deposit not found');
                } else if (estimateError.message.includes('Invalid withdraw proof')) {
                    console.error('⚠️  Proof verification failed');
                    throw new Error('Invalid proof');
                } else if (estimateError.message.includes('execution reverted')) {
                    console.error('⚠️  Contract execution would revert. Common causes:');
                    console.error('  1. Invalid proof parameters');
                    console.error('  2. Nullifier already spent (note already withdrawn)');
                    console.error('  3. Invalid merkle root (deposit not found)');
                    console.error('  4. Fee/relayer address mismatch with proof');
                    console.error('\nDebug info:');
                    console.error('  Contract:', contractAddress);
                    console.error('  Relayer:', config.relayerAddress);
                    console.error('  Fee from proof:', fee);
                    throw new Error('Transaction would revert - check note validity');
                }
            }

            throw new Error(`Gas estimation failed: ${estimateError.message || 'Unknown error'}`);
        }

        // Send transaction
        console.log('\nSending transaction...');
        console.log('  From:', config.relayerAddress);
        // Convert BigInt to number for gas calculation
        const gasLimit = Math.floor(Number(gasEstimate) * 1.2);
        console.log('  Gas limit:', gasLimit);
        console.log('  Gas price:', gasPrice.toString());
        
        const receipt = await tx.send({
            from: config.relayerAddress,
            gas: gasLimit, // 20% buffer already applied
            gasPrice: gasPrice.toString(),
            value: 0
        });

        console.log(`Withdrawal successful: ${receipt.transactionHash}`);
        
        // Update job status
        job.status = 'completed';
        job.txHash = receipt.transactionHash;
        job.completedAt = Date.now();

    } catch (error) {
        console.error(`\n========== Withdrawal failed for job ${jobId} ==========`);
        console.error('Error type:', error.constructor.name);
        console.error('Error message:', error.message);
        
        // Extract more meaningful error message
        let userFriendlyError = error.message;
        
        if (error.message.includes('execution reverted')) {
            if (error.message.includes('Invalid withdraw proof')) {
                userFriendlyError = 'Invalid proof: The zero-knowledge proof verification failed';
            } else if (error.message.includes('The note has been already spent')) {
                userFriendlyError = 'This note has already been withdrawn';
            } else if (error.message.includes('Cannot find your merkle root')) {
                userFriendlyError = 'Invalid merkle root: The deposit may be too recent or invalid';
            } else if (error.message.includes('Fee exceeds transfer value')) {
                userFriendlyError = 'Relayer fee is too high for this withdrawal';
            } else {
                userFriendlyError = 'Smart contract execution failed: ' + error.message;
            }
        }
        
        console.error('User-friendly error:', userFriendlyError);
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

// Start server
app.listen(config.port, () => {
    console.log(`
    ========================================
    🌪️  zkPULSE RELAYER SERVER
    ========================================
    
    Running at: http://localhost:${config.port}
    Relayer Address: ${config.relayerAddress}
    Network: PulseChain
    RPC: ${config.rpcUrl}
    
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