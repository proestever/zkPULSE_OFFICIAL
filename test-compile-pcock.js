const fs = require('fs');
const path = require('path');
const solc = require('solc');

console.log('Testing PCOCK contract compilation...\n');

try {
    // Read the main contract
    const contractPath = path.join(__dirname, 'contracts', 'ERC20Tornado_PCOCK.sol');
    const contractSource = fs.readFileSync(contractPath, 'utf8');
    
    console.log('✓ Found ERC20Tornado_PCOCK.sol');
    
    // Read dependencies
    const tornadoPath = path.join(__dirname, 'contracts', 'Tornado.sol');
    const tornadoSource = fs.readFileSync(tornadoPath, 'utf8');
    console.log('✓ Found Tornado.sol');
    
    const merklePath = path.join(__dirname, 'contracts', 'MerkleTreeWithHistory.sol');
    const merkleSource = fs.readFileSync(merklePath, 'utf8');
    console.log('✓ Found MerkleTreeWithHistory.sol');
    
    console.log('\nCompiling contracts...');
    
    const input = {
        language: 'Solidity',
        sources: {
            'ERC20Tornado_PCOCK.sol': { content: contractSource },
            'Tornado.sol': { content: tornadoSource },
            'MerkleTreeWithHistory.sol': { content: merkleSource },
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
            outputSelection: {
                '*': {
                    '*': ['abi', 'evm.bytecode', 'evm.deployedBytecode']
                }
            }
        }
    };
    
    const output = JSON.parse(solc.compile(JSON.stringify(input)));
    
    // Check for errors
    if (output.errors) {
        let hasErrors = false;
        output.errors.forEach(err => {
            if (err.severity === 'error') {
                console.error('❌ Error:', err.formattedMessage);
                hasErrors = true;
            } else if (err.severity === 'warning') {
                console.log('⚠️  Warning:', err.formattedMessage);
            }
        });
        
        if (hasErrors) {
            throw new Error('Compilation failed with errors');
        }
    }
    
    // Check if contract was compiled
    if (!output.contracts['ERC20Tornado_PCOCK.sol'] || 
        !output.contracts['ERC20Tornado_PCOCK.sol']['ERC20Tornado_PCOCK']) {
        throw new Error('Contract not found in compilation output');
    }
    
    const contract = output.contracts['ERC20Tornado_PCOCK.sol']['ERC20Tornado_PCOCK'];
    
    console.log('\n✅ Compilation successful!');
    console.log('\nContract details:');
    console.log('  ABI methods:', contract.abi.filter(x => x.type === 'function').length);
    console.log('  Bytecode size:', contract.evm.bytecode.object.length / 2, 'bytes');
    console.log('  Deployed bytecode size:', contract.evm.deployedBytecode.object.length / 2, 'bytes');
    
    // Save ABI for reference
    fs.writeFileSync(
        'abi-pcock-tornado.json',
        JSON.stringify(contract.abi, null, 2)
    );
    console.log('\n📄 ABI saved to abi-pcock-tornado.json');
    
    console.log('\n✅ Contract is ready for deployment!');
    
} catch (error) {
    console.error('\n❌ Compilation test failed:', error.message);
    process.exit(1);
}