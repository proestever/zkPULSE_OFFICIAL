// Integrated relayer endpoints for the unified server
const { v4: uuidv4 } = require('uuid');
const Web3 = require('web3');
const { getWeb3Instance } = require('./rpc-config');

// Store for active jobs
const activeJobs = new Map();

// Tornado Cash contract ABI (withdrawal function only)
const TORNADO_ABI = [
    {
        "inputs": [
            {
                "internalType": "bytes",
                "name": "_proof",
                "type": "bytes"
            },
            {
                "internalType": "bytes32",
                "name": "_root",
                "type": "bytes32"
            },
            {
                "internalType": "bytes32",
                "name": "_nullifierHash",
                "type": "bytes32"
            },
            {
                "internalType": "address payable",
                "name": "_recipient",
                "type": "address"
            },
            {
                "internalType": "address payable",
                "name": "_relayer",
                "type": "address"
            },
            {
                "internalType": "uint256",
                "name": "_fee",
                "type": "uint256"
            },
            {
                "internalType": "uint256",
                "name": "_refund",
                "type": "uint256"
            }
        ],
        "name": "withdraw",
        "outputs": [],
        "stateMutability": "payable",
        "type": "function"
    }
];

// Contract addresses
const CONTRACTS = {
    '1': '0xad04f4Eef94Efc3a698e70324b3F96e44703f70B',
    '1M': '0x65d1D748b4d513756cA179049227F6599D803594',
    '10M': '0x21349F435c703F933eBF2bb2A5aB2d716e00b205',
    '100M': '0x2443ccEef2D2803A97A12f5A9AA7db3BEc154B73',
    '1B': '0x282476B716146eAAbCfBDd339e527903deFD969b'
};

// Relayer configuration
const RELAYER_CONFIG = {
    address: '0x968DD9f833C58C0ADa629eF8f60180C7fEeF78d3',
    privateKey: process.env.RELAYER_PRIVATE_KEY,
    fees: {
        '1': { percent: 0.75, min: 100 },
        '1M': { percent: 0.5, min: 5000 },
        '10M': { percent: 0.4, min: 10000 },
        '100M': { percent: 0.3, min: 20000 },
        '1B': { percent: 0.25, min: 50000 }
    }
};

// Add relayer endpoints to Express app
function addRelayerEndpoints(app) {
    // Health check
    app.get('/relayer/status', (req, res) => {
        res.json({
            status: 'operational',
            relayerAddress: RELAYER_CONFIG.address,
            network: 'PulseChain',
            version: '1.0.0',
            uptime: process.uptime(),
            activeJobs: activeJobs.size
        });
    });

    // Get relayer fee
    app.get('/relayer/v1/tornadoFee', (req, res) => {
        const { currency, amount } = req.query;

        const feeConfig = RELAYER_CONFIG.fees[amount] || RELAYER_CONFIG.fees['1M'];
        const denominationValue = {
            '1': 1,
            '1M': 1000000,
            '10M': 10000000,
            '100M': 100000000,
            '1B': 1000000000
        }[amount] || 1000000;

        const fee = Math.max(
            Math.floor(denominationValue * feeConfig.percent / 100),
            feeConfig.min
        );

        res.json({
            fee: (BigInt(fee) * BigInt(10 ** 18)).toString(),
            gasPrice: 'standard',
            percentage: feeConfig.percent
        });
    });

    // Submit withdrawal
    app.post('/relayer/v1/tornadoWithdraw', async (req, res) => {
        const jobId = uuidv4();
        console.log(`========== Processing withdrawal job ${jobId} ==========`);

        try {
            const { proof, args, contract, denomination } = req.body;

            if (!proof || !args || !contract) {
                return res.status(400).json({ error: 'Missing required parameters' });
            }

            // Store job
            activeJobs.set(jobId, {
                status: 'processing',
                createdAt: Date.now()
            });

            // Return job ID immediately
            res.json({
                jobId,
                status: 'processing',
                message: 'Withdrawal job created'
            });

            // Process withdrawal asynchronously
            processWithdrawal(jobId, { proof, args, contract, denomination }).catch(err => {
                console.error(`Job ${jobId} failed:`, err);
                activeJobs.set(jobId, {
                    status: 'failed',
                    error: err.message,
                    completedAt: Date.now()
                });
            });

        } catch (error) {
            console.error('Error creating withdrawal job:', error);
            res.status(500).json({ error: error.message });
        }
    });

    // Check job status
    app.get('/relayer/v1/jobs/:jobId', (req, res) => {
        const { jobId } = req.params;
        const job = activeJobs.get(jobId);

        if (!job) {
            return res.status(404).json({ error: 'Job not found' });
        }

        res.json({
            jobId,
            status: job.status,
            txHash: job.txHash,
            error: job.error,
            createdAt: job.createdAt,
            completedAt: job.completedAt
        });
    });
}

// Process withdrawal
async function processWithdrawal(jobId, { proof, args, contract, denomination }) {
    console.log(`Contract: ${contract}`);
    console.log(`Denomination: ${denomination}`);
    console.log(`Args:`, args);
    console.log(`Proof type:`, typeof proof);
    console.log(`Proof:`, proof ? (typeof proof === 'string' ? proof.substring(0, 100) + '...' : proof) : 'undefined');

    try {
        const web3 = await getWeb3Instance();

        // Check if we have the private key
        if (!RELAYER_CONFIG.privateKey) {
            throw new Error('Relayer private key not configured');
        }

        // Create contract instance
        const tornadoContract = new web3.eth.Contract(TORNADO_ABI, contract);

        // The proof should already be formatted by the backend (using websnarkUtils.toSolidityInput)
        // We just need to pass it directly to the contract
        let proofData = proof;

        console.log('Proof type:', typeof proof);
        console.log('Proof (first 100 chars):', proof ? proof.toString().substring(0, 100) + '...' : 'undefined');

        // Validate it's a hex string
        if (!proofData || typeof proofData !== 'string' || !proofData.startsWith('0x')) {
            console.error('Invalid proof format. Expected hex string starting with 0x, got:', typeof proofData);
            throw new Error('Invalid proof format - expected hex string');
        }

        // Build transaction
        const account = web3.eth.accounts.privateKeyToAccount(RELAYER_CONFIG.privateKey);
        web3.eth.accounts.wallet.add(account);
        web3.eth.defaultAccount = account.address;

        // Estimate gas
        console.log('Estimating gas...');
        const gasEstimate = await tornadoContract.methods.withdraw(
            proofData,
            args[0], // root
            args[1], // nullifierHash
            args[2], // recipient
            args[3], // relayer
            args[4], // fee
            args[5]  // refund
        ).estimateGas({ from: account.address });

        console.log(`Gas estimate: ${gasEstimate}`);

        // Get current gas price
        const gasPrice = await web3.eth.getGasPrice();
        const adjustedGasPrice = (BigInt(gasPrice) * BigInt(150)) / BigInt(100); // 1.5x

        // Send transaction
        console.log('Sending transaction...');
        const tx = await tornadoContract.methods.withdraw(
            proofData,
            args[0], // root
            args[1], // nullifierHash
            args[2], // recipient
            args[3], // relayer
            args[4], // fee
            args[5]  // refund
        ).send({
            from: account.address,
            gas: Math.floor(Number(gasEstimate) * 1.2),
            gasPrice: adjustedGasPrice.toString()
        });

        console.log(`Withdrawal successful: ${tx.transactionHash}`);

        // Update job status
        activeJobs.set(jobId, {
            status: 'completed',
            txHash: tx.transactionHash,
            completedAt: Date.now()
        });

    } catch (error) {
        console.error(`========== Withdrawal failed for job ${jobId} ==========`);
        console.error('Error:', error.message);

        activeJobs.set(jobId, {
            status: 'failed',
            error: error.message,
            completedAt: Date.now()
        });

        throw error;
    }
}

// Clean up old jobs periodically
setInterval(() => {
    const now = Date.now();
    const MAX_AGE = 60 * 60 * 1000; // 1 hour

    for (const [jobId, job] of activeJobs.entries()) {
        if (job.completedAt && (now - job.completedAt > MAX_AGE)) {
            activeJobs.delete(jobId);
        }
    }
}, 5 * 60 * 1000); // Every 5 minutes

module.exports = { addRelayerEndpoints };