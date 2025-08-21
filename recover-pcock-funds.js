const Web3 = require('web3').default || require('web3');
const snarkjs = require('snarkjs');
const circomlib = require('circomlib');
const merkleTree = require('fixed-merkle-tree');

// Your note
const YOUR_NOTE = 'tornado-pcock-10k-369-739044633c825ad6b156018fab14852f0e89ecb8abe581a8a2ac30bd53d645509ded69872f83a38680c30a2273c73471e8ad788a329af4768399fa1f89c9';
const YOUR_RECIPIENT = process.env.RECIPIENT_ADDRESS || ''; // Set your withdrawal address
const PRIVATE_KEY = process.env.PRIVATE_KEY;

// Configuration
const RPC_URL = 'https://rpc.pulsechain.com';
const PCOCK_TORNADO_ADDRESS = '0x5915Dc6C5a3D2F06DB93bc763334D2e8F5D1A8C3';
const PCOCK_TOKEN_ADDRESS = '0xc10A4Ed9b4042222d69ff0B374eddd47ed90fC1F';

async function recoverFunds() {
    if (!YOUR_RECIPIENT) {
        console.error('Please set RECIPIENT_ADDRESS environment variable');
        process.exit(1);
    }
    
    const web3 = new Web3(RPC_URL);
    
    console.log('=== PCOCK RECOVERY ===');
    console.log('Parsing your note...');
    
    // Extract hex part
    const parts = YOUR_NOTE.split('-');
    const hexNote = parts[parts.length - 1];
    
    console.log('Note hex length:', hexNote.length);
    
    // Your note is 128 chars, parse as 64+64
    const nullifierHex = hexNote.slice(0, 64);
    const secretHex = hexNote.slice(64, 128);
    
    console.log('Nullifier:', nullifierHex);
    console.log('Secret:', secretHex);
    
    const nullifier = BigInt('0x' + nullifierHex);
    const secret = BigInt('0x' + secretHex);
    
    // Calculate commitment using pedersen hash
    const pedersenHash = (data) => {
        return circomlib.babyJub.unpackPoint(circomlib.pedersenHash.hash(data))[0];
    };
    
    const preimage = Buffer.concat([
        Buffer.from(nullifier.toString(16).padStart(64, '0'), 'hex').slice(0, 31),
        Buffer.from(secret.toString(16).padStart(64, '0'), 'hex').slice(0, 31)
    ]);
    
    const commitment = pedersenHash(preimage);
    const commitmentHex = '0x' + commitment.toString(16).padStart(64, '0');
    
    console.log('Calculated commitment:', commitmentHex);
    
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
    
    const tornado = new web3.eth.Contract(abi, PCOCK_TORNADO_ADDRESS);
    
    // Check if commitment exists
    const exists = await tornado.methods.commitments(commitmentHex).call();
    console.log('Commitment exists in contract:', exists);
    
    if (!exists) {
        console.log('\n⚠️  Commitment not found!');
        console.log('This might mean the commitment calculation is different.');
        console.log('Checking recent deposits...\n');
        
        // Get all deposits
        const events = await tornado.getPastEvents('Deposit', {
            fromBlock: 22610000,
            toBlock: 'latest'
        });
        
        console.log('Found', events.length, 'total deposits');
        if (events.length > 0) {
            console.log('Last deposit commitment:', events[events.length - 1].returnValues.commitment);
            console.log('Your calculated commitment:', commitmentHex);
        }
    }
    
    // Get current root
    const root = await tornado.methods.getLastRoot().call();
    console.log('Current merkle root:', root);
    
    console.log('\n=== MANUAL WITHDRAWAL INSTRUCTIONS ===');
    console.log('Since proof generation requires the circuit files, you can:');
    console.log('1. Use the web interface with the withdrawal fix deployed');
    console.log('2. Or use this data for manual withdrawal:\n');
    
    console.log('Contract:', PCOCK_TORNADO_ADDRESS);
    console.log('Your note:', YOUR_NOTE);
    console.log('Nullifier:', '0x' + nullifierHex);
    console.log('Secret:', '0x' + secretHex);
    console.log('Commitment:', commitmentHex);
    console.log('Recipient:', YOUR_RECIPIENT);
    
    // Try alternative parsing if first attempt failed
    if (!exists) {
        console.log('\n=== TRYING ALTERNATIVE PARSING ===');
        
        // Try treating as 31-byte values
        const nullifier31 = hexNote.slice(0, 62);
        const secret31 = hexNote.slice(62, 124);
        
        const nullifierAlt = BigInt('0x' + nullifier31);
        const secretAlt = BigInt('0x' + secret31);
        
        const preimageAlt = Buffer.concat([
            Buffer.from(nullifierAlt.toString(16).padStart(62, '0'), 'hex').slice(0, 31),
            Buffer.from(secretAlt.toString(16).padStart(62, '0'), 'hex').slice(0, 31)
        ]);
        
        const commitmentAlt = pedersenHash(preimageAlt);
        const commitmentHexAlt = '0x' + commitmentAlt.toString(16).padStart(64, '0');
        
        console.log('Alternative commitment:', commitmentHexAlt);
        
        const existsAlt = await tornado.methods.commitments(commitmentHexAlt).call();
        console.log('Alternative exists:', existsAlt);
        
        if (existsAlt) {
            console.log('\n✅ Found using alternative parsing!');
            console.log('Use these values:');
            console.log('Nullifier:', '0x' + nullifier31);
            console.log('Secret:', '0x' + secret31);
        }
    }
    
    // Check token balance in contract
    const tokenABI = [
        {
            "inputs": [{"name": "account", "type": "address"}],
            "name": "balanceOf",
            "outputs": [{"name": "", "type": "uint256"}],
            "stateMutability": "view",
            "type": "function"
        }
    ];
    
    const token = new web3.eth.Contract(tokenABI, PCOCK_TOKEN_ADDRESS);
    const balance = await token.methods.balanceOf(PCOCK_TORNADO_ADDRESS).call();
    console.log('\nContract PCOCK balance:', web3.utils.fromWei(balance, 'ether'), 'PCOCK');
}

recoverFunds().catch(console.error);