const fs = require('fs');
const path = require('path');
const solc = require('solc');
const Web3 = require('web3').default || require('web3');

async function diagnose() {
    console.log('Diagnosing verification issue...\n');
    
    const web3 = new Web3('https://rpc.pulsechain.com');
    const DEPLOYED_ADDRESS = '0x8bc66368b7d900eFE1E9431B832D6A26Ee7D55c3';
    
    // Get deployed bytecode
    const deployedBytecode = await web3.eth.getCode(DEPLOYED_ADDRESS);
    console.log('Deployed bytecode length:', (deployedBytecode.length - 2) / 2, 'bytes');
    
    // Try compiling the flattened version
    const flattenedSource = fs.readFileSync(path.join(__dirname, 'contracts', 'ERC20Tornado_PCOCK_flattened.sol'), 'utf8');
    
    const input = {
        language: 'Solidity',
        sources: {
            'ERC20Tornado_PCOCK_flattened.sol': { content: flattenedSource }
        },
        settings: {
            optimizer: {
                enabled: true,
                runs: 200
            },
            evmVersion: 'istanbul',
            outputSelection: {
                '*': {
                    '*': ['*']
                }
            }
        }
    };
    
    console.log('Compiling flattened contract...');
    const output = JSON.parse(solc.compile(JSON.stringify(input)));
    
    if (output.errors) {
        output.errors.forEach(err => {
            if (err.severity === 'error') {
                console.error('Compilation error:', err.message);
            }
        });
    }
    
    const contract = output.contracts['ERC20Tornado_PCOCK_flattened.sol']['ERC20Tornado_PCOCK'];
    const compiledBytecode = '0x' + contract.evm.deployedBytecode.object;
    
    console.log('Compiled bytecode length:', (compiledBytecode.length - 2) / 2, 'bytes');
    
    // Compare first 100 chars
    console.log('\nFirst 100 chars comparison:');
    console.log('Deployed:', deployedBytecode.substring(0, 100));
    console.log('Compiled:', compiledBytecode.substring(0, 100));
    
    // Check if they match
    if (deployedBytecode === compiledBytecode) {
        console.log('\n✅ BYTECODES MATCH!');
    } else {
        console.log('\n❌ BYTECODES DO NOT MATCH');
        
        // Find first difference
        for (let i = 0; i < Math.min(deployedBytecode.length, compiledBytecode.length); i++) {
            if (deployedBytecode[i] !== compiledBytecode[i]) {
                console.log(`First difference at position ${i}:`);
                console.log(`Deployed: ${deployedBytecode.substring(i, i+10)}`);
                console.log(`Compiled: ${compiledBytecode.substring(i, i+10)}`);
                break;
            }
        }
        
        // Check metadata hash at the end
        const deployedEnd = deployedBytecode.substring(deployedBytecode.length - 100);
        const compiledEnd = compiledBytecode.substring(compiledBytecode.length - 100);
        console.log('\nLast 100 chars (metadata):');
        console.log('Deployed:', deployedEnd);
        console.log('Compiled:', compiledEnd);
    }
    
    // Try different compiler versions
    console.log('\n\nTrying exact compiler settings from deployment...');
    
    // This was the exact input used during deployment
    const deploymentInput = {
        language: 'Solidity',
        sources: {
            'contracts/ERC20Tornado_PCOCK.sol': { 
                content: fs.readFileSync(path.join(__dirname, 'contracts', 'ERC20Tornado_PCOCK.sol'), 'utf8')
            },
            'contracts/Tornado.sol': { 
                content: fs.readFileSync(path.join(__dirname, 'contracts', 'Tornado.sol'), 'utf8')
            },
            'contracts/MerkleTreeWithHistory.sol': { 
                content: fs.readFileSync(path.join(__dirname, 'contracts', 'MerkleTreeWithHistory.sol'), 'utf8')
            },
            'IVerifier.sol': {
                content: `// SPDX-License-Identifier: MIT
pragma solidity ^0.7.0;
interface IVerifier {
    function verifyProof(bytes memory _proof, uint256[6] memory _input) external returns (bool);
}`
            },
            'IHasher.sol': {
                content: `// SPDX-License-Identifier: MIT
pragma solidity ^0.7.0;
interface IHasher {
    function MiMCSponge(uint256 in_xL, uint256 in_xR) external pure returns (uint256 xL, uint256 xR);
}`
            },
            '@openzeppelin/contracts/utils/ReentrancyGuard.sol': {
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
            }
        },
        settings: {
            optimizer: {
                enabled: true,
                runs: 200
            },
            evmVersion: 'istanbul',
            outputSelection: {
                '*': {
                    '*': ['*']
                }
            }
        }
    };
    
    const deploymentOutput = JSON.parse(solc.compile(JSON.stringify(deploymentInput)));
    const deploymentContract = deploymentOutput.contracts['contracts/ERC20Tornado_PCOCK.sol']['ERC20Tornado_PCOCK'];
    const deploymentCompiledBytecode = '0x' + deploymentContract.evm.deployedBytecode.object;
    
    console.log('Deployment method bytecode length:', (deploymentCompiledBytecode.length - 2) / 2, 'bytes');
    
    if (deployedBytecode === deploymentCompiledBytecode) {
        console.log('✅ DEPLOYMENT METHOD MATCHES!');
        
        // Save the exact source for verification
        fs.writeFileSync('exact-verification-input.json', JSON.stringify(deploymentInput, null, 2));
        console.log('\nExact verification input saved to exact-verification-input.json');
    } else {
        console.log('❌ Deployment method also does not match');
    }
}

diagnose().catch(console.error);