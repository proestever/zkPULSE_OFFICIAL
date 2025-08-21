const Web3 = require('web3').default || require('web3');

const RPC_URL = 'https://rpc.pulsechain.com';
const TORNADO_ADDRESS = '0x5915Dc6C5a3D2F06DB93bc763334D2e8F5D1A8C3';
const PCOCK_ADDRESS = '0xc10A4Ed9b4042222d69ff0B374eddd47ed90fC1F';

async function verifyNewDeployment() {
    console.log('===========================================');
    console.log('VERIFYING NEW PCOCK TORNADO DEPLOYMENT');
    console.log('===========================================\n');
    
    const web3 = new Web3(RPC_URL);
    
    // Check if contract exists
    const code = await web3.eth.getCode(TORNADO_ADDRESS);
    if (code === '0x' || code === '0x0') {
        console.error('❌ No contract found at address:', TORNADO_ADDRESS);
        return;
    }
    
    console.log('✅ Contract deployed at:', TORNADO_ADDRESS);
    console.log('   Bytecode size:', (code.length - 2) / 2, 'bytes\n');
    
    // Get contract instance
    const abi = [
        {
            "inputs": [],
            "name": "token",
            "outputs": [{"name": "", "type": "address"}],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [],
            "name": "denomination",
            "outputs": [{"name": "", "type": "uint256"}],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [],
            "name": "verifier",
            "outputs": [{"name": "", "type": "address"}],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [],
            "name": "hasher",
            "outputs": [{"name": "", "type": "address"}],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [],
            "name": "levels",
            "outputs": [{"name": "", "type": "uint32"}],
            "stateMutability": "view",
            "type": "function"
        }
    ];
    
    const tornado = new web3.eth.Contract(abi, TORNADO_ADDRESS);
    
    // Verify configuration
    console.log('Contract Configuration:');
    
    try {
        const token = await tornado.methods.token().call();
        console.log('✅ Token:', token);
        console.log('   Expected:', PCOCK_ADDRESS);
        console.log('   Match:', token.toLowerCase() === PCOCK_ADDRESS.toLowerCase() ? '✅' : '❌');
        
        const denomination = await tornado.methods.denomination().call();
        console.log('\n✅ Denomination:', web3.utils.fromWei(denomination.toString(), 'ether'), 'PCOCK');
        console.log('   Expected: 10,000 PCOCK');
        console.log('   Match:', denomination.toString() === '10000000000000000000000' ? '✅' : '❌');
        
        const verifier = await tornado.methods.verifier().call();
        console.log('\n✅ Verifier:', verifier);
        console.log('   Expected: 0x165A378540d26F1f9BEB97F30670B5B8Eb3f8aD5');
        console.log('   Match:', verifier.toLowerCase() === '0x165A378540d26F1f9BEB97F30670B5B8Eb3f8aD5'.toLowerCase() ? '✅' : '❌');
        
        const hasher = await tornado.methods.hasher().call();
        console.log('\n✅ Hasher:', hasher);
        console.log('   Expected: 0x5Aa1eE340a2E9F199f068DB35a855956429067cf');
        console.log('   Match:', hasher.toLowerCase() === '0x5Aa1eE340a2E9F199f068DB35a855956429067cf'.toLowerCase() ? '✅' : '❌');
        
        const levels = await tornado.methods.levels().call();
        console.log('\n✅ Merkle Tree Height:', levels.toString());
        console.log('   Expected: 20');
        console.log('   Match:', levels.toString() === '20' ? '✅' : '❌');
        
    } catch (error) {
        console.error('Error reading contract:', error.message);
    }
    
    console.log('\n===========================================');
    console.log('VERIFICATION COMPLETE!');
    console.log('===========================================');
    console.log('\n🎉 New PCOCK Tornado Contract:');
    console.log('Address:', TORNADO_ADDRESS);
    console.log('Explorer: https://otter.pulsechain.com/address/' + TORNADO_ADDRESS);
    console.log('\n📝 To verify on Sourcify:');
    console.log('1. Use file: ERC20Tornado_PCOCK_FINAL.sol');
    console.log('2. Compiler: 0.7.6');
    console.log('3. Optimization: Yes (200 runs)');
    console.log('4. Constructor args from PCOCK_VERIFICATION_DATA.json');
}

verifyNewDeployment().catch(console.error);