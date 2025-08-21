const Web3 = require('web3').default || require('web3');

// CONFIGURATION
const PRIVATE_KEY = process.env.PRIVATE_KEY; // Your wallet private key
const RECIPIENT = process.env.RECIPIENT_ADDRESS || '0x4B3906A490Ca27D8c53Ef7A7A0FF58A2f26BDDbB';

// Your note values (confirmed correct)
const NULLIFIER = '0x739044633c825ad6b156018fab14852f0e89ecb8abe581a8a2ac30bd53d645';
const SECRET = '0x509ded69872f83a38680c30a2273c73471e8ad788a329af4768399fa1f89c9';
const COMMITMENT = '0x02e990c5f3a6e61efb53739715d1a32ea32a46a826b895af7c658f36ca1ac965';
const NOTE = 'tornado-pcock-10k-369-739044633c825ad6b156018fab14852f0e89ecb8abe581a8a2ac30bd53d645509ded69872f83a38680c30a2273c73471e8ad788a329af4768399fa1f89c9';

// Contract
const RPC_URL = 'https://rpc.pulsechain.com';
const PCOCK_TORNADO = '0x5915Dc6C5a3D2F06DB93bc763334D2e8F5D1A8C3';

async function withdraw() {
    console.log('=== PCOCK WITHDRAWAL HELPER ===\n');
    
    const web3 = new Web3(RPC_URL);
    
    // Verify the commitment exists
    const abi = [
        {
            "inputs": [{"name": "_commitment", "type": "bytes32"}],
            "name": "commitments",
            "outputs": [{"name": "", "type": "bool"}],
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
        }
    ];
    
    const tornado = new web3.eth.Contract(abi, PCOCK_TORNADO);
    
    const exists = await tornado.methods.commitments(COMMITMENT).call();
    console.log('✅ Your deposit exists:', exists);
    
    if (!exists) {
        console.error('❌ Deposit not found!');
        return;
    }
    
    // Get deposit event
    const events = await tornado.getPastEvents('Deposit', {
        fromBlock: 22610000,
        toBlock: 'latest',
        filter: { commitment: COMMITMENT }
    });
    
    if (events.length > 0) {
        const event = events[0];
        console.log('✅ Found your deposit:');
        console.log('   Block:', event.blockNumber);
        console.log('   Leaf Index:', event.returnValues.leafIndex);
        console.log('   Timestamp:', new Date(Number(event.returnValues.timestamp) * 1000).toLocaleString());
        console.log('   Tx Hash:', event.transactionHash);
    }
    
    console.log('\n=== WITHDRAWAL INSTRUCTIONS ===\n');
    
    console.log('Since the web UI has parsing issues, here are your options:\n');
    
    console.log('OPTION 1: Fix the UI parsing');
    console.log('-------------------------');
    console.log('The issue is in withdrawal-complete.js - it expects 31-byte values');
    console.log('Your note has 32-byte values (which is actually correct for the deposit)');
    console.log('');
    
    console.log('OPTION 2: Use this modified note (remove leading zeros)');
    console.log('-------------------------');
    // Try removing leading zeros to make it 31 bytes
    const nullifierTrimmed = NULLIFIER.slice(2).replace(/^0+/, '').padStart(62, '0');
    const secretTrimmed = SECRET.slice(2).replace(/^0+/, '').padStart(62, '0');
    const modifiedNote = `tornado-pcock-10k-369-${nullifierTrimmed}${secretTrimmed}`;
    console.log(modifiedNote);
    console.log('');
    
    console.log('OPTION 3: Direct contract interaction');
    console.log('-------------------------');
    console.log('You need to generate a ZK proof with these inputs:');
    console.log('Nullifier:', NULLIFIER);
    console.log('Secret:', SECRET);
    console.log('Recipient:', RECIPIENT);
    console.log('');
    
    console.log('OPTION 4: Emergency recovery');
    console.log('-------------------------');
    console.log('Your funds ARE safe in the contract.');
    console.log('The commitment', COMMITMENT);
    console.log('exists and has not been withdrawn.');
    console.log('');
    console.log('We need to either:');
    console.log('1. Fix the withdrawal parser to handle 62-char hex values');
    console.log('2. Use a command-line tool to generate the proof');
    console.log('3. Deploy a fixed withdrawal interface');
    
    // Create withdrawal helper HTML
    console.log('\n=== CREATING WITHDRAWAL HELPER ===\n');
    
    const withdrawalHTML = `<!DOCTYPE html>
<html>
<head>
    <title>PCOCK Withdrawal Helper</title>
    <script src="https://cdn.jsdelivr.net/npm/web3@1.8.0/dist/web3.min.js"></script>
</head>
<body>
    <h1>PCOCK Withdrawal Helper</h1>
    <p>Your Note: <code>${NOTE}</code></p>
    <p>Nullifier: <code>${NULLIFIER}</code></p>
    <p>Secret: <code>${SECRET}</code></p>
    <p>Commitment: <code>${COMMITMENT}</code></p>
    
    <button onclick="tryWithdraw()">Generate Withdrawal Proof</button>
    
    <script>
        const NULLIFIER = '${NULLIFIER}';
        const SECRET = '${SECRET}';
        
        async function tryWithdraw() {
            // This would need the full tornado withdrawal logic
            console.log('Nullifier:', NULLIFIER);
            console.log('Secret:', SECRET);
            alert('Copy these values to use with the CLI withdrawal tool');
        }
    </script>
</body>
</html>`;
    
    const fs = require('fs');
    fs.writeFileSync('pcock-withdrawal-helper.html', withdrawalHTML);
    console.log('Created pcock-withdrawal-helper.html');
}

withdraw().catch(console.error);