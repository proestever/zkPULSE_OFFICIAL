const fs = require('fs');
const path = require('path');
const solc = require('solc');

console.log('Recompiling with exact settings used during deployment...\n');

// Read the exact sources used
const contractSource = fs.readFileSync(path.join(__dirname, 'contracts', 'ERC20Tornado_PCOCK.sol'), 'utf8');
const tornadoSource = fs.readFileSync(path.join(__dirname, 'contracts', 'Tornado.sol'), 'utf8');
const merkleSource = fs.readFileSync(path.join(__dirname, 'contracts', 'MerkleTreeWithHistory.sol'), 'utf8');

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
        evmVersion: 'istanbul',
        outputSelection: {
            '*': {
                '*': ['*']
            }
        }
    }
};

const output = JSON.parse(solc.compile(JSON.stringify(input)));

if (output.errors) {
    output.errors.forEach(err => {
        if (err.severity === 'error') {
            console.error('Error:', err.formattedMessage);
        }
    });
}

const contract = output.contracts['ERC20Tornado_PCOCK.sol']['ERC20Tornado_PCOCK'];

console.log('Compilation successful!');
console.log('Bytecode length:', contract.evm.bytecode.object.length / 2, 'bytes');
console.log('Deployed bytecode length:', contract.evm.deployedBytecode.object.length / 2, 'bytes');

// Save the exact JSON needed for verification
const verificationJson = {
    language: 'Solidity',
    sources: input.sources,
    settings: {
        optimizer: {
            enabled: true,
            runs: 200
        },
        evmVersion: 'istanbul',
        outputSelection: {
            '*': {
                '*': ['abi', 'evm.bytecode', 'evm.deployedBytecode', 'evm.methodIdentifiers', 'metadata']
            }
        },
        metadata: {
            bytecodeHash: 'ipfs'
        },
        libraries: {}
    }
};

fs.writeFileSync('verification-input.json', JSON.stringify(verificationJson, null, 2));
console.log('\nVerification input saved to verification-input.json');

// Also save metadata
const metadata = JSON.parse(contract.metadata);
fs.writeFileSync('contract-metadata.json', JSON.stringify(metadata, null, 2));
console.log('Metadata saved to contract-metadata.json');

// Compare with deployed
const deployedBytecode = fs.readFileSync('deployed-bytecode.txt', 'utf8');
const compiledDeployed = '0x' + contract.evm.deployedBytecode.object;

if (deployedBytecode.toLowerCase() === compiledDeployed.toLowerCase()) {
    console.log('\n✅ Bytecode matches deployed contract!');
} else {
    console.log('\n❌ Bytecode mismatch');
    console.log('Deployed length:', (deployedBytecode.length - 2) / 2);
    console.log('Compiled length:', (compiledDeployed.length - 2) / 2);
}