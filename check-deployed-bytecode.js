const Web3 = require('web3').default || require('web3');
const fs = require('fs');

const RPC_URL = 'https://rpc.pulsechain.com';
const TORNADO_ADDRESS = '0x8bc66368b7d900eFE1E9431B832D6A26Ee7D55c3';

async function checkBytecode() {
    const web3 = new Web3(RPC_URL);
    
    // Get deployed bytecode
    const deployedCode = await web3.eth.getCode(TORNADO_ADDRESS);
    console.log('Deployed bytecode length:', (deployedCode.length - 2) / 2, 'bytes');
    console.log('Deployed bytecode hash:', web3.utils.keccak256(deployedCode));
    
    // Get creation transaction
    const txHash = '0x5aed669ebe3ca6a2db90bbc9a5f5de314fc9dc3af1acf883df6e5b2425972ea3';
    const tx = await web3.eth.getTransaction(txHash);
    console.log('\nDeployment transaction:');
    console.log('From:', tx.from);
    console.log('Gas:', tx.gas);
    console.log('Input length:', (tx.input.length - 2) / 2, 'bytes');
    
    // Save deployed bytecode for comparison
    fs.writeFileSync('deployed-bytecode.txt', deployedCode);
    console.log('\nDeployed bytecode saved to deployed-bytecode.txt');
    
    // Extract constructor args from input
    const compiledBytecodeLength = 18344; // From our compilation
    const constructorArgsStart = compiledBytecodeLength * 2 + 2; // multiply by 2 for hex, add 2 for 0x
    const constructorArgs = '0x' + tx.input.slice(constructorArgsStart);
    console.log('\nConstructor arguments:');
    console.log(constructorArgs);
    
    // Also check compiled bytecode from our test
    if (fs.existsSync('abi-pcock-tornado.json')) {
        const abi = JSON.parse(fs.readFileSync('abi-pcock-tornado.json', 'utf8'));
        console.log('\nCompiled ABI methods:', abi.filter(x => x.type === 'function').length);
    }
}

checkBytecode().catch(console.error);