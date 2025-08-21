const Web3 = require('web3').default || require('web3');
const snarkjs = require('snarkjs');
const bigInt = snarkjs.bigInt;
const crypto = require('crypto');
const circomlib = require('circomlib');
const merkleTree = require('fixed-merkle-tree');
const websnarkUtils = require('websnark/src/utils');
const { toWei, fromWei } = require('web3-utils');

// CONFIGURATION - FILL IN YOUR DETAILS
const PRIVATE_KEY = process.env.PRIVATE_KEY; // Your wallet private key
const RECIPIENT_ADDRESS = process.env.RECIPIENT_ADDRESS || ''; // Where to send the PCOCK

// Your note details (we verified these are correct)
const NULLIFIER = '0x739044633c825ad6b156018fab14852f0e89ecb8abe581a8a2ac30bd53d645';
const SECRET = '0x509ded69872f83a38680c30a2273c73471e8ad788a329af4768399fa1f89c9';
const COMMITMENT = '0x02e990c5f3a6e61efb53739715d1a32ea32a46a826b895af7c658f36ca1ac965';

// Contract details
const RPC_URL = 'https://rpc.pulsechain.com';
const PCOCK_TORNADO_ADDRESS = '0x5915Dc6C5a3D2F06DB93bc763334D2e8F5D1A8C3';
const PCOCK_TOKEN_ADDRESS = '0xc10A4Ed9b4042222d69ff0B374eddd47ed90fC1F';
const MERKLE_TREE_HEIGHT = 20;

// Circuit files (we'll try to use the existing ones)
const CIRCUIT_PATH = './build/circuits/withdraw.json';
const PROVING_KEY_PATH = './build/circuits/withdraw_proving_key.bin';

async function directWithdraw() {
    if (!PRIVATE_KEY) {
        console.error('❌ Please set PRIVATE_KEY environment variable');
        process.exit(1);
    }
    
    if (!RECIPIENT_ADDRESS) {
        console.error('❌ Please set RECIPIENT_ADDRESS environment variable');
        process.exit(1);
    }
    
    console.log('=== DIRECT PCOCK WITHDRAWAL ===\n');
    
    const web3 = new Web3(new Web3.providers.HttpProvider(RPC_URL));
    
    // Add account
    const account = web3.eth.accounts.privateKeyToAccount(PRIVATE_KEY);
    web3.eth.accounts.wallet.add(account);
    web3.eth.defaultAccount = account.address;
    
    console.log('Using account:', account.address);
    console.log('Recipient:', RECIPIENT_ADDRESS);
    console.log('Contract:', PCOCK_TORNADO_ADDRESS);
    
    // Contract ABI
    const tornadoABI = [
        {
            "inputs": [{"name": "_commitment", "type": "bytes32"}],
            "name": "commitments",
            "outputs": [{"name": "", "type": "bool"}],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [],
            "name": "getLastRoot",
            "outputs": [{"name": "", "type": "bytes32"}],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [{"name": "_root", "type": "bytes32"}],
            "name": "isKnownRoot",
            "outputs": [{"name": "", "type": "bool"}],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [{"name": "_nullifierHash", "type": "bytes32"}],
            "name": "isSpent",
            "outputs": [{"name": "", "type": "bool"}],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [],
            "name": "currentRootIndex",
            "outputs": [{"name": "", "type": "uint32"}],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [{"name": "", "type": "uint256"}],
            "name": "roots",
            "outputs": [{"name": "", "type": "bytes32"}],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [
                {"name": "_proof", "type": "bytes"},
                {"name": "_root", "type": "bytes32"},
                {"name": "_nullifierHash", "type": "bytes32"},
                {"name": "_recipient", "type": "address"},
                {"name": "_relayer", "type": "address"},
                {"name": "_fee", "type": "uint256"},
                {"name": "_refund", "type": "uint256"}
            ],
            "name": "withdraw",
            "outputs": [],
            "stateMutability": "payable",
            "type": "function"
        },
        {
            "anonymous": false,
            "inputs": [
                {"indexed": true, "name": "commitment", "type": "bytes32"},
                {"indexed": false, "name": "leafIndex", "type": "uint32"},
                {"indexed": false, "name": "timestamp", "type": "uint256"}
            ],
            "name": "Deposit",
            "type": "event"
        }
    ];
    
    const tornado = new web3.eth.Contract(tornadoABI, PCOCK_TORNADO_ADDRESS);
    
    // Verify commitment exists
    const commitmentExists = await tornado.methods.commitments(COMMITMENT).call();
    console.log('\n✅ Commitment exists:', commitmentExists);
    
    if (!commitmentExists) {
        console.error('❌ Commitment not found in contract!');
        process.exit(1);
    }
    
    // Get all deposits to build merkle tree
    console.log('\nFetching all deposits to build merkle tree...');
    const events = await tornado.getPastEvents('Deposit', {
        fromBlock: 22610000,
        toBlock: 'latest'
    });
    
    console.log('Found', events.length, 'deposits');
    
    // Find our deposit
    let leafIndex = -1;
    const leaves = events
        .sort((a, b) => a.returnValues.leafIndex - b.returnValues.leafIndex)
        .map((e, i) => {
            const leaf = e.returnValues.commitment;
            if (leaf.toLowerCase() === COMMITMENT.toLowerCase()) {
                leafIndex = i;
                console.log('✅ Found our deposit at index:', i);
            }
            return leaf;
        });
    
    if (leafIndex === -1) {
        console.error('❌ Could not find our commitment in events!');
        process.exit(1);
    }
    
    // Get the current root
    const currentRootIndex = await tornado.methods.currentRootIndex().call();
    const root = await tornado.methods.roots(currentRootIndex).call();
    console.log('Current root:', root);
    
    // Verify root is known
    const isKnown = await tornado.methods.isKnownRoot(root).call();
    console.log('Root is known:', isKnown);
    
    // Calculate nullifier hash
    const nullifier = bigInt(NULLIFIER);
    const nullifierHash = circomlib.pedersenHash.hash(nullifier.leInt2Buff(31));
    const nullifierHashHex = '0x' + nullifierHash.toString(16).padStart(64, '0');
    
    console.log('\nNullifier hash:', nullifierHashHex);
    
    // Check if already spent
    const isSpent = await tornado.methods.isSpent(nullifierHashHex).call();
    if (isSpent) {
        console.error('❌ This note has already been spent!');
        process.exit(1);
    }
    console.log('✅ Note not yet spent');
    
    // Try to generate proof (this might fail without circuit files)
    console.log('\n=== GENERATING WITHDRAWAL PROOF ===');
    
    try {
        // Build merkle tree
        const tree = new merkleTree.MerkleTree(MERKLE_TREE_HEIGHT, leaves);
        const merkleProof = tree.proof(leafIndex);
        
        // Prepare circuit inputs
        const input = {
            // Public inputs
            root: root,
            nullifierHash: nullifierHashHex,
            recipient: bigInt(RECIPIENT_ADDRESS.slice(2), 16),
            relayer: bigInt(0),
            fee: bigInt(0),
            refund: bigInt(0),
            
            // Private inputs
            nullifier: nullifier,
            secret: bigInt(SECRET),
            pathElements: merkleProof.pathElements,
            pathIndices: merkleProof.pathIndices
        };
        
        console.log('Circuit inputs prepared');
        
        // Load circuit
        const circuit = require(CIRCUIT_PATH);
        const provingKey = fs.readFileSync(PROVING_KEY_PATH);
        
        // Generate proof
        console.log('Generating proof...');
        const proofData = await websnarkUtils.genWitnessAndProve(
            await circomlib.unstringifyBigInts(circuit),
            await circomlib.unstringifyBigInts(provingKey),
            circomlib.stringifyBigInts(input)
        );
        
        const { proof } = websnarkUtils.toSolidityInput(proofData);
        
        console.log('✅ Proof generated!');
        
        // Execute withdrawal
        console.log('\n=== EXECUTING WITHDRAWAL ===');
        
        const tx = await tornado.methods.withdraw(
            proof,
            root,
            nullifierHashHex,
            RECIPIENT_ADDRESS,
            '0x0000000000000000000000000000000000000000', // No relayer
            '0', // No fee
            '0'  // No refund
        ).send({
            from: account.address,
            gas: 500000,
            gasPrice: web3.utils.toWei('50', 'gwei'),
            value: '0'
        });
        
        console.log('✅ Withdrawal successful!');
        console.log('Transaction hash:', tx.transactionHash);
        console.log('View on explorer: https://otter.pulsechain.com/tx/' + tx.transactionHash);
        
    } catch (error) {
        console.error('\n❌ Proof generation failed:', error.message);
        console.log('\n=== ALTERNATIVE: MANUAL STEPS ===');
        console.log('Since automatic proof generation failed, you need to:');
        console.log('\n1. Create a simple Node.js script with these values:');
        console.log('   Nullifier:', NULLIFIER);
        console.log('   Secret:', SECRET);
        console.log('   Leaf Index:', leafIndex);
        console.log('   Root:', root);
        console.log('\n2. Or try using the web interface with this exact note:');
        console.log('tornado-pcock-10k-369-' + NULLIFIER.slice(2) + SECRET.slice(2));
        console.log('\n3. Or we can try a simpler approach...');
        
        // Try creating raw transaction data
        console.log('\n=== RAW TRANSACTION DATA ===');
        const withdrawData = tornado.methods.withdraw(
            '0x', // Empty proof - will fail but shows format
            root,
            nullifierHashHex,
            RECIPIENT_ADDRESS,
            '0x0000000000000000000000000000000000000000',
            '0',
            '0'
        ).encodeABI();
        
        console.log('Withdrawal function data:', withdrawData);
        console.log('\nYou need a valid proof to complete withdrawal.');
    }
}

// Run the withdrawal
directWithdraw().catch(console.error);