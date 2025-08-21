const Web3 = require('web3').default || require('web3');
const crypto = require('crypto');
const { MerkleTree } = require('fixed-merkle-tree');

// CONFIGURATION
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const RECIPIENT = process.env.RECIPIENT || '0x4B3906A490Ca27D8c53Ef7A7A0FF58A2f26BDDbB';

// Your note values (verified from contract)
const NOTE = 'tornado-pcock-10k-369-739044633c825ad6b156018fab14852f0e89ecb8abe581a8a2ac30bd53d645509ded69872f83a38680c30a2273c73471e8ad788a329af4768399fa1f89c9';
const COMMITMENT = '0x02e990c5f3a6e61efb53739715d1a32ea32a46a826b895af7c658f36ca1ac965';

// Contract details
const RPC_URL = 'https://rpc.pulsechain.com';
const PCOCK_TORNADO = '0x5915Dc6C5a3D2F06DB93bc763334D2e8F5D1A8C3';
const PCOCK_TOKEN = '0xc10A4Ed9b4042222d69ff0B374eddd47ed90fC1F';

// Field size for BN254 curve
const FIELD_SIZE = BigInt('21888242871839275222246405745257275088548364400416034343698204186575808495617');

// Parse note - handling the 62+62 char format
function parseNote(noteString) {
    const match = noteString.match(/tornado-pcock-10k-369-([0-9a-fA-F]+)/);
    if (!match) throw new Error('Invalid note format');
    
    const hex = match[1];
    console.log('Note hex length:', hex.length);
    
    // Parse as 62+62 characters
    const nullifierHex = hex.slice(0, 62);
    const secretHex = hex.slice(62, 124);
    
    const nullifier = BigInt('0x' + nullifierHex) % FIELD_SIZE;
    const secret = BigInt('0x' + secretHex) % FIELD_SIZE;
    
    return { nullifier, secret, nullifierHex, secretHex };
}

// Simple hash function for nullifier
function hashNullifier(nullifier) {
    const web3 = new Web3();
    const hash = web3.utils.soliditySha3({ t: 'uint256', v: nullifier.toString() });
    return BigInt(hash) % FIELD_SIZE;
}

async function withdraw() {
    console.log('=== PCOCK WITHDRAWAL - DIRECT METHOD ===\n');
    
    if (!PRIVATE_KEY) {
        console.error('Please set PRIVATE_KEY environment variable');
        return;
    }
    
    const web3 = new Web3(RPC_URL);
    const account = web3.eth.accounts.privateKeyToAccount(PRIVATE_KEY);
    web3.eth.accounts.wallet.add(account);
    
    console.log('Account:', account.address);
    console.log('Recipient:', RECIPIENT);
    console.log('Contract:', PCOCK_TORNADO);
    
    // Parse the note
    const { nullifier, secret, nullifierHex, secretHex } = parseNote(NOTE);
    console.log('\nParsed note:');
    console.log('Nullifier:', '0x' + nullifierHex);
    console.log('Secret:', '0x' + secretHex);
    
    // Calculate nullifier hash
    const nullifierHash = hashNullifier(nullifier);
    const nullifierHashHex = '0x' + nullifierHash.toString(16).padStart(64, '0');
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
            "inputs": [{"name": "_nullifierHash", "type": "bytes32"}],
            "name": "isSpent",
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
            "anonymous": false,
            "inputs": [
                {"indexed": true, "name": "commitment", "type": "bytes32"},
                {"indexed": false, "name": "leafIndex", "type": "uint32"},
                {"indexed": false, "name": "timestamp", "type": "uint256"}
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
    
    // Verify commitment exists
    const exists = await tornado.methods.commitments(COMMITMENT).call();
    console.log('\n✅ Commitment exists:', exists);
    
    if (!exists) {
        console.error('Commitment not found!');
        return;
    }
    
    // Check if already spent
    const isSpent = await tornado.methods.isSpent(nullifierHashHex).call();
    if (isSpent) {
        console.error('❌ Note already spent!');
        return;
    }
    console.log('✅ Not yet spent');
    
    // Get all deposits
    console.log('\nFetching deposits...');
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
            if (e.returnValues.commitment.toLowerCase() === COMMITMENT.toLowerCase()) {
                leafIndex = i;
                console.log('✅ Found our deposit at index:', i);
            }
            return e.returnValues.commitment;
        });
    
    if (leafIndex === -1) {
        console.error('Could not find deposit!');
        return;
    }
    
    // Get current root
    const root = await tornado.methods.getLastRoot().call();
    console.log('\nRoot:', root);
    
    console.log('\n=== WITHDRAWAL PREPARATION ===');
    console.log('\nTo complete withdrawal, you need to generate a ZK proof.');
    console.log('\nOption 1: Use the CLI tool with these values:');
    console.log('----------');
    console.log('export NOTE="' + NOTE + '"');
    console.log('export RECIPIENT="' + RECIPIENT + '"');
    console.log('export PRIVATE_KEY="' + (PRIVATE_KEY || 'YOUR_PRIVATE_KEY') + '"');
    console.log('node withdraw-with-proof.js');
    
    console.log('\nOption 2: Try the web interface with corrected note:');
    console.log('----------');
    // Try to format note correctly for web interface
    const correctedNote = `tornado-pcock-10k-369-${nullifierHex.padStart(62, '0')}${secretHex.padStart(62, '0')}`;
    console.log(correctedNote);
    
    console.log('\nOption 3: Manual proof generation:');
    console.log('----------');
    console.log('You need these inputs for proof generation:');
    console.log(JSON.stringify({
        nullifier: '0x' + nullifierHex,
        secret: '0x' + secretHex,
        commitmentIndex: leafIndex,
        merkleRoot: root,
        recipient: RECIPIENT,
        relayer: '0x0000000000000000000000000000000000000000',
        fee: '0',
        refund: '0'
    }, null, 2));
    
    // Create a helper HTML file
    const html = `<!DOCTYPE html>
<html>
<head>
    <title>PCOCK Withdrawal Helper</title>
    <style>
        body { font-family: monospace; padding: 20px; }
        .value { background: #f0f0f0; padding: 5px; margin: 5px 0; word-break: break-all; }
        button { padding: 10px 20px; margin: 10px 0; }
    </style>
</head>
<body>
    <h1>PCOCK Withdrawal Helper</h1>
    <h2>Your Deposit Details</h2>
    <p><strong>Status:</strong> ✅ 10,000 PCOCK confirmed in contract</p>
    <p><strong>Commitment:</strong></p>
    <div class="value">${COMMITMENT}</div>
    <p><strong>Leaf Index:</strong> ${leafIndex}</p>
    
    <h2>Withdrawal Instructions</h2>
    <p>Your note (copy this exactly):</p>
    <div class="value" id="note">${correctedNote}</div>
    <button onclick="copyNote()">Copy Note</button>
    
    <p>Recipient address:</p>
    <div class="value">${RECIPIENT}</div>
    
    <h2>Manual Withdrawal Values</h2>
    <p>If the web interface doesn't work, use these values:</p>
    <p><strong>Nullifier:</strong></p>
    <div class="value">0x${nullifierHex}</div>
    <p><strong>Secret:</strong></p>
    <div class="value">0x${secretHex}</div>
    <p><strong>Root:</strong></p>
    <div class="value">${root}</div>
    
    <script>
        function copyNote() {
            const note = document.getElementById('note').innerText;
            navigator.clipboard.writeText(note);
            alert('Note copied to clipboard!');
        }
    </script>
</body>
</html>`;
    
    const fs = require('fs');
    fs.writeFileSync('withdrawal-helper.html', html);
    console.log('\n✅ Created withdrawal-helper.html - open this in your browser');
    
    // Also save the values to a JSON file
    const withdrawalData = {
        note: correctedNote,
        originalNote: NOTE,
        commitment: COMMITMENT,
        nullifier: '0x' + nullifierHex,
        secret: '0x' + secretHex,
        nullifierHash: nullifierHashHex,
        leafIndex: leafIndex,
        merkleRoot: root,
        recipient: RECIPIENT,
        contractAddress: PCOCK_TORNADO,
        tokenAddress: PCOCK_TOKEN,
        amount: '10000 PCOCK'
    };
    
    fs.writeFileSync('withdrawal-data.json', JSON.stringify(withdrawalData, null, 2));
    console.log('✅ Saved withdrawal-data.json with all values');
}

withdraw().catch(console.error);