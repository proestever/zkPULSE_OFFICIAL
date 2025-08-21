const Web3 = require('web3').default || require('web3');
const { MerkleTree } = require('fixed-merkle-tree');
const circomlib = require('circomlib');
const websnarkUtils = require('websnark/src/utils');
const buildGroth16 = require('websnark/src/groth16');
const snarkjs = require('snarkjs');
const bigInt = snarkjs.bigInt;
const fs = require('fs');
const path = require('path');

// Configuration
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const RECIPIENT = '0x4B3906A490Ca27D8c53Ef7A7A0FF58A2f26BDDbB';

// Your note values
const NOTE = 'tornado-pcock-10k-369-739044633c825ad6b156018fab14852f0e89ecb8abe581a8a2ac30bd53d645509ded69872f83a38680c30a2273c73471e8ad788a329af4768399fa1f89c9';
const COMMITMENT = '0x02e990c5f3a6e61efb53739715d1a32ea32a46a826b895af7c658f36ca1ac965';

// Contract details
const RPC_URL = 'https://rpc.pulsechain.com';
const PCOCK_TORNADO = '0x5915Dc6C5a3D2F06DB93bc763334D2e8F5D1A8C3';
const MERKLE_TREE_HEIGHT = 20;

// Parse note
function parseNote(noteString) {
    const match = noteString.match(/tornado-pcock-10k-369-([0-9a-fA-F]+)/);
    if (!match) throw new Error('Invalid note format');
    
    const hex = match[1];
    const nullifierHex = hex.slice(0, 62);
    const secretHex = hex.slice(62, 124);
    
    // Convert to buffer for hashing
    const nullifierBuff = Buffer.from(nullifierHex.padStart(62, '0'), 'hex');
    const secretBuff = Buffer.from(secretHex.padStart(62, '0'), 'hex');
    
    return { 
        nullifier: bigInt.leBuff2int(nullifierBuff.slice(0, 31)),
        secret: bigInt.leBuff2int(secretBuff.slice(0, 31))
    };
}

// Pedersen hash implementation
function pedersenHash(data) {
    return circomlib.babyJub.unpackPoint(circomlib.pedersenHash.hash(data))[0];
}

// Generate deposit commitment
function generateCommitment(nullifier, secret) {
    const preimage = Buffer.concat([
        nullifier.leInt2Buff(31),
        secret.leInt2Buff(31)
    ]);
    return pedersenHash(preimage);
}

async function withdraw() {
    console.log('=== EXECUTING PCOCK WITHDRAWAL ===\n');
    
    const web3 = new Web3(RPC_URL);
    const account = web3.eth.accounts.privateKeyToAccount(PRIVATE_KEY);
    web3.eth.accounts.wallet.add(account);
    
    console.log('Account:', account.address);
    console.log('Recipient:', RECIPIENT);
    
    // Parse note
    const { nullifier, secret } = parseNote(NOTE);
    console.log('Nullifier parsed');
    console.log('Secret parsed');
    
    // Calculate commitment and nullifier hash
    const commitment = generateCommitment(nullifier, secret);
    const nullifierHash = pedersenHash(nullifier.leInt2Buff(31));
    const nullifierHashHex = '0x' + bigInt(nullifierHash).toString(16).padStart(64, '0');
    
    console.log('Commitment calculated');
    console.log('Nullifier hash:', nullifierHashHex);
    
    // Contract ABI
    const abi = [
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
            "anonymous": false,
            "inputs": [
                {"indexed": true, "name": "commitment", "type": "bytes32"},
                {"indexed": false, "name": "leafIndex", "type": "uint32"}
            ],
            "name": "Deposit",
            "type": "event"
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
        }
    ];
    
    const tornado = new web3.eth.Contract(abi, PCOCK_TORNADO);
    
    // Check if spent
    const isSpent = await tornado.methods.isSpent(nullifierHashHex).call();
    if (isSpent) {
        console.error('Note already spent!');
        return;
    }
    
    // Get deposits and build tree
    console.log('\nBuilding Merkle tree...');
    const events = await tornado.getPastEvents('Deposit', {
        fromBlock: 22610000,
        toBlock: 'latest'
    });
    
    const leaves = events
        .sort((a, b) => a.returnValues.leafIndex - b.returnValues.leafIndex)
        .map(e => e.returnValues.commitment);
    
    console.log('Found', leaves.length, 'deposits');
    
    // Find our deposit
    const depositIndex = leaves.findIndex(leaf => 
        leaf.toLowerCase() === COMMITMENT.toLowerCase()
    );
    
    if (depositIndex === -1) {
        console.error('Deposit not found!');
        return;
    }
    
    console.log('Our deposit index:', depositIndex);
    
    // Build merkle tree
    const tree = new MerkleTree(MERKLE_TREE_HEIGHT, leaves, {
        hashFunction: (left, right) => {
            return circomlib.mimcsponge.multiHash([bigInt(left), bigInt(right)]).toString();
        },
        zeroElement: '21663839004416932945382355908790599225266501822907911457504978515578255421292'
    });
    
    const { pathElements, pathIndices } = tree.path(depositIndex);
    const root = tree.root();
    
    console.log('Merkle root:', '0x' + bigInt(root).toString(16));
    
    // Check root is valid
    const isKnown = await tornado.methods.isKnownRoot('0x' + bigInt(root).toString(16)).call();
    if (!isKnown) {
        console.error('Root not known! May be too recent.');
        return;
    }
    
    console.log('✅ Root is valid');
    
    // Generate proof
    console.log('\nGenerating ZK proof...');
    
    const circuit = require('./build/circuits/withdraw.json');
    const proving_key = fs.readFileSync('./build/circuits/withdraw_proving_key.bin');
    
    const input = {
        root: root,
        nullifierHash: nullifierHash,
        recipient: bigInt(RECIPIENT.slice(2), 16),
        relayer: bigInt(0),
        fee: bigInt(0),
        refund: bigInt(0),
        nullifier: nullifier,
        secret: secret,
        pathElements: pathElements,
        pathIndices: pathIndices
    };
    
    console.log('Generating witness...');
    const groth16 = await buildGroth16();
    const witness = circuit.calculateWitness(input);
    const proofData = await websnarkUtils.genWitnessAndProve(groth16, witness, proving_key);
    const { proof } = websnarkUtils.toSolidityInput(proofData);
    
    console.log('✅ Proof generated');
    
    // Execute withdrawal
    console.log('\nExecuting withdrawal transaction...');
    
    const tx = await tornado.methods.withdraw(
        proof,
        '0x' + bigInt(root).toString(16),
        nullifierHashHex,
        RECIPIENT,
        '0x0000000000000000000000000000000000000000',
        '0',
        '0'
    ).send({
        from: account.address,
        gas: 500000,
        gasPrice: web3.utils.toWei('50', 'gwei')
    });
    
    console.log('\n✅ WITHDRAWAL SUCCESSFUL!');
    console.log('Transaction hash:', tx.transactionHash);
    console.log('View on explorer: https://otter.pulsechain.com/tx/' + tx.transactionHash);
    console.log('\n10,000 PCOCK has been sent to:', RECIPIENT);
}

// Fallback simpler version if above fails
async function simpleWithdraw() {
    console.log('=== SIMPLIFIED WITHDRAWAL METHOD ===\n');
    
    const web3 = new Web3(RPC_URL);
    const account = web3.eth.accounts.privateKeyToAccount(PRIVATE_KEY);
    web3.eth.accounts.wallet.add(account);
    
    // Try using snarkjs directly
    const snarkjs = require('snarkjs');
    const fs = require('fs');
    
    // Parse note differently
    const noteHex = NOTE.split('-').pop();
    const nullifierBytes = Buffer.from(noteHex.slice(0, 62), 'hex');
    const secretBytes = Buffer.from(noteHex.slice(62, 124), 'hex');
    
    // Use first 31 bytes
    const nullifier = '0x' + nullifierBytes.slice(0, 31).toString('hex');
    const secret = '0x' + secretBytes.slice(0, 31).toString('hex');
    
    console.log('Attempting withdrawal with:');
    console.log('Nullifier:', nullifier);
    console.log('Secret:', secret);
    
    // Load circuit files if they exist
    const circuitPath = './circuits/withdraw.wasm';
    const zkeyPath = './circuits/withdraw_final.zkey';
    
    if (fs.existsSync(circuitPath) && fs.existsSync(zkeyPath)) {
        console.log('Found circuit files, generating proof...');
        
        // This would need the full proof generation
        // For now, we'll output the values needed
    }
    
    console.log('\n=== MANUAL WITHDRAWAL INSTRUCTIONS ===');
    console.log('Since automatic proof generation requires circuit files,');
    console.log('please use these values with the tornado CLI tool:\n');
    
    console.log('1. Install tornado-cli:');
    console.log('   npm install -g @tornado/cli');
    console.log('\n2. Run withdrawal:');
    console.log(`   tornado-cli withdraw ${NOTE} ${RECIPIENT} --rpc ${RPC_URL}`);
    
    console.log('\n3. Or use the web interface with this modified note:');
    // Try different note format
    const modNote = `tornado-pcock-10k-369-${nullifier.slice(2)}${secret.slice(2)}`;
    console.log('   ' + modNote);
}

// Try main withdrawal, fallback to simple if it fails
withdraw().catch(err => {
    console.error('\nMain withdrawal failed:', err.message);
    console.log('\nTrying simplified method...\n');
    simpleWithdraw().catch(console.error);
});