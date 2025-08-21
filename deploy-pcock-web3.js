const Web3 = require('web3').default || require('web3');
const fs = require('fs');
const solc = require('solc');
const path = require('path');
require('dotenv').config();

// Configuration
const RPC_URL = 'https://rpc.pulsechain.com';
let PRIVATE_KEY = process.env.PRIVATE_KEY || '27b58696769804b277c405f11608e4534a1cf3415ff7cbb9a6f052872a9f52d3';
// Ensure private key has 0x prefix
if (!PRIVATE_KEY.startsWith('0x')) {
    PRIVATE_KEY = '0x' + PRIVATE_KEY;
}

// Contract addresses (existing infrastructure)
const HASHER_ADDRESS = '0x5Aa1eE340a2E9F199f068DB35a855956429067cf';
const VERIFIER_ADDRESS = '0x165A378540d26F1f9BEB97F30670B5B8Eb3f8aD5';
const PCOCK_ADDRESS = '0xc10A4Ed9b4042222d69ff0B374eddd47ed90fC1F';

// Pool configuration
const DENOMINATION = '10000000000000000000000'; // 10,000 PCOCK (with 18 decimals)
const MERKLE_TREE_HEIGHT = 20;

async function compileContract() {
    console.log('Compiling ERC20Tornado_PCOCK contract...');
    
    // Read contract files
    const tornadoSource = fs.readFileSync(path.join(__dirname, 'contracts', 'Tornado.sol'), 'utf8');
    const erc20TornadoSource = fs.readFileSync(path.join(__dirname, 'contracts', 'ERC20Tornado_PCOCK.sol'), 'utf8');
    const merkleTreeSource = fs.readFileSync(path.join(__dirname, 'contracts', 'MerkleTreeWithHistory.sol'), 'utf8');
    
    const input = {
        language: 'Solidity',
        sources: {
            'contracts/Tornado.sol': { content: tornadoSource },
            'contracts/ERC20Tornado_PCOCK.sol': { content: erc20TornadoSource },
            'contracts/MerkleTreeWithHistory.sol': { content: merkleTreeSource }
        },
        settings: {
            optimizer: {
                enabled: true,
                runs: 200
            },
            outputSelection: {
                '*': {
                    '*': ['abi', 'evm.bytecode']
                }
            }
        }
    };
    
    // Import interfaces and OpenZeppelin
    input.sources['IVerifier.sol'] = {
        content: `// SPDX-License-Identifier: MIT
pragma solidity ^0.7.0;
interface IVerifier {
    function verifyProof(bytes memory _proof, uint256[6] memory _input) external returns (bool);
}`
    };
    
    input.sources['IHasher.sol'] = {
        content: `// SPDX-License-Identifier: MIT
pragma solidity ^0.7.0;
interface IHasher {
    function MiMCSponge(uint256 in_xL, uint256 in_xR) external pure returns (uint256 xL, uint256 xR);
}`
    };
    
    input.sources['@openzeppelin/contracts/utils/ReentrancyGuard.sol'] = {
        content: `// SPDX-License-Identifier: MIT
pragma solidity ^0.7.0;
abstract contract ReentrancyGuard {
    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED = 2;
    uint256 private _status;
    constructor() { _status = _NOT_ENTERED; }
    modifier nonReentrant() {
        require(_status != _ENTERED, "ReentrancyGuard: reentrant call");
        _status = _ENTERED;
        _;
        _status = _NOT_ENTERED;
    }
}`
    };
    
    const output = JSON.parse(solc.compile(JSON.stringify(input)));
    
    if (output.errors) {
        output.errors.forEach(err => {
            if (err.severity === 'error') {
                console.error('Compilation error:', err.message);
            } else if (err.severity === 'warning') {
                console.log('Warning:', err.message);
            }
        });
        if (output.errors.some(err => err.severity === 'error')) {
            throw new Error('Compilation failed');
        }
    }
    
    const contract = output.contracts['contracts/ERC20Tornado_PCOCK.sol']['ERC20Tornado_PCOCK'];
    return {
        abi: contract.abi,
        bytecode: '0x' + contract.evm.bytecode.object
    };
}

async function deployContract() {
    if (!PRIVATE_KEY) {
        console.error('Please set PRIVATE_KEY environment variable');
        process.exit(1);
    }
    
    console.log('===========================================');
    console.log('DEPLOYING PCOCK 10K TORNADO POOL');
    console.log('===========================================\n');
    
    // Initialize web3
    const web3 = new Web3(RPC_URL);
    const account = web3.eth.accounts.privateKeyToAccount(PRIVATE_KEY);
    web3.eth.accounts.wallet.add(account);
    web3.eth.defaultAccount = account.address;
    
    console.log('Deploying from account:', account.address);
    
    // Check balance
    const balance = await web3.eth.getBalance(account.address);
    console.log('Account balance:', web3.utils.fromWei(balance, 'ether'), 'PLS\n');
    
    // Compile contract
    const { abi, bytecode } = await compileContract();
    console.log('Contract compiled successfully\n');
    
    // Create contract instance
    const ERC20Tornado = new web3.eth.Contract(abi);
    
    // Deploy contract
    console.log('Deploying PCOCK 10K Tornado Pool...');
    console.log('Parameters:');
    console.log('  Verifier:', VERIFIER_ADDRESS);
    console.log('  Hasher:', HASHER_ADDRESS);
    console.log('  Denomination:', '10,000 PCOCK');
    console.log('  Merkle Tree Height:', MERKLE_TREE_HEIGHT);
    console.log('  Token:', PCOCK_ADDRESS);
    console.log('');
    
    const deployTx = ERC20Tornado.deploy({
        data: bytecode,
        arguments: [
            VERIFIER_ADDRESS,
            HASHER_ADDRESS,
            DENOMINATION,
            MERKLE_TREE_HEIGHT,
            PCOCK_ADDRESS
        ]
    });
    
    const gas = await deployTx.estimateGas();
    console.log('Estimated gas:', gas.toString());
    
    const gasPrice = await web3.eth.getGasPrice();
    console.log('Gas price:', web3.utils.fromWei(gasPrice.toString(), 'gwei'), 'gwei');
    
    // Convert to strings for calculation
    const gasString = gas.toString();
    const gasPriceString = gasPrice.toString();
    const txCost = web3.utils.fromWei((BigInt(gasString) * BigInt(gasPriceString)).toString(), 'ether');
    console.log('Estimated deployment cost:', txCost, 'PLS\n');
    
    // Send deployment transaction
    const tornado = await deployTx.send({
        from: account.address,
        gas: Math.floor(Number(gasString) * 1.2), // Add 20% buffer
        gasPrice: gasPriceString
    });
    
    console.log('\n✅ PCOCK 10K Tornado Pool deployed!');
    console.log('Contract address:', tornado.options.address);
    console.log('Transaction hash:', tornado.transactionHash);
    
    // Save deployment info
    const deploymentInfo = {
        network: 'PulseChain',
        chainId: 369,
        token: 'PCOCK (PulseChain Peacock)',
        tokenAddress: PCOCK_ADDRESS,
        denomination: '10000',
        decimals: 18,
        contracts: {
            tornado_PCOCK_10K: tornado.options.address,
            hasher: HASHER_ADDRESS,
            verifier: VERIFIER_ADDRESS
        },
        deploymentBlock: await web3.eth.getBlockNumber(),
        timestamp: new Date().toISOString(),
        deployer: account.address
    };
    
    fs.writeFileSync(
        'deployment-pcock-10k.json',
        JSON.stringify(deploymentInfo, null, 2)
    );
    
    console.log('\n📄 Deployment info saved to deployment-pcock-10k.json');
    
    // Save ABI
    fs.writeFileSync(
        'abi-pcock-tornado.json',
        JSON.stringify(abi, null, 2)
    );
    
    console.log('📄 ABI saved to abi-pcock-tornado.json');
    
    console.log('\n===========================================');
    console.log('DEPLOYMENT COMPLETE!');
    console.log('===========================================');
    console.log('\nNEXT STEPS:');
    console.log('1. Verify the contract on Otterscan');
    console.log('2. Update frontend configuration with address:', tornado.options.address);
    console.log('3. Test deposit and withdrawal');
    
    return tornado.options.address;
}

// Run deployment
deployContract()
    .then(() => process.exit(0))
    .catch(error => {
        console.error('Deployment failed:', error);
        process.exit(1);
    });