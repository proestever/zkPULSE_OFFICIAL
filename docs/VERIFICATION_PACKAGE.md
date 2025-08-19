# Tornado Cash PulseChain Contract Verification Package

## Contract Files Available

### 1. Raw Solidity Files
- **Location**: `/contracts/` directory
- `ETHTornado.sol` - Main implementation contract
- `Tornado.sol` - Base abstract contract
- `MerkleTreeWithHistory.sol` - Merkle tree implementation
- `Verifier.sol` - ZK-SNARK verifier (auto-generated from circuits)

### 2. Flattened Contract
- **Location**: `/ETHTornado_flattened.sol`
- Contains all dependencies in a single file
- Ready for direct verification on Otterscan/Sourcify

### 3. Compiled Artifacts
- **Location**: `/build/contracts/`
- Contains ABI and bytecode for all contracts
- `ETHTornado.json` - Full compilation artifacts
- `Hasher.json` - MiMC hasher contract

## Deployed Contract Addresses (Current Active Deployment)

| Denomination | Contract Address | Verifier | Hasher |
|-------------|-----------------|----------|---------|
| **1 PLS (Test)** | `0xad04f4Eef94Efc3a698e70324b3F96e44703f70B` | `0x165A378540d26F1f9BEB97F30670B5B8Eb3f8aD5` | `0x5Aa1eE340a2E9F199f068DB35a855956429067cf` |
| **1M PLS** | `0x65d1D748b4d513756cA179049227F6599D803594` | Same as above | Same as above |
| **10M PLS** | `0x21349F435c703F933eBF2bb2A5aB2d716e00b205` | Same as above | Same as above |
| **100M PLS** | `0x2443ccEef2D2803A97A12f5A9AA7db3BEc154B73` | Same as above | Same as above |
| **1B PLS** | `0x282476B716146eAAbCfBDd339e527903deFD969b` | Same as above | Same as above |

## Compiler Settings (MUST MATCH EXACTLY)

```json
{
  "version": "0.7.6",
  "settings": {
    "optimizer": {
      "enabled": true,
      "runs": 200
    },
    "evmVersion": "istanbul"
  }
}
```

## Constructor Arguments for Each Contract

### Constructor Parameters (in order):
1. `_verifier`: Address of Verifier contract
2. `_hasher`: Address of Hasher contract  
3. `_denomination`: Amount in wei
4. `_merkleTreeHeight`: 20 (for all contracts)

### Encoded Constructor Arguments

#### 1 PLS Test Contract
```
Verifier: 0x165A378540d26F1f9BEB97F30670B5B8Eb3f8aD5
Hasher: 0x5Aa1eE340a2E9F199f068DB35a855956429067cf
Denomination: 1000000000000000000 (1 PLS in wei)
Tree Height: 20
```

#### 1M PLS Contract
```
Verifier: 0x165A378540d26F1f9BEB97F30670B5B8Eb3f8aD5
Hasher: 0x5Aa1eE340a2E9F199f068DB35a855956429067cf
Denomination: 1000000000000000000000000 (1M PLS in wei)
Tree Height: 20
```

#### 10M PLS Contract
```
Verifier: 0x165A378540d26F1f9BEB97F30670B5B8Eb3f8aD5
Hasher: 0x5Aa1eE340a2E9F199f068DB35a855956429067cf
Denomination: 10000000000000000000000000 (10M PLS in wei)
Tree Height: 20
```

#### 100M PLS Contract
```
Verifier: 0x165A378540d26F1f9BEB97F30670B5B8Eb3f8aD5
Hasher: 0x5Aa1eE340a2E9F199f068DB35a855956429067cf
Denomination: 100000000000000000000000000 (100M PLS in wei)
Tree Height: 20
```

#### 1B PLS Contract
```
Verifier: 0x165A378540d26F1f9BEB97F30670B5B8Eb3f8aD5
Hasher: 0x5Aa1eE340a2E9F199f068DB35a855956429067cf
Denomination: 1000000000000000000000000000 (1B PLS in wei)
Tree Height: 20
```

## Verification Steps on Otterscan

1. **Navigate to Contract**
   - Go to: `https://otter.pulsechain.com/address/[CONTRACT_ADDRESS]`
   - Click "Contract" tab
   - Click "Verify & Publish"

2. **Fill Verification Form**
   - **Compiler Type**: Solidity (Single file)
   - **Compiler Version**: v0.7.6+commit.7338295f
   - **Open Source License**: MIT

3. **Paste Flattened Code**
   - Copy entire contents of `/ETHTornado_flattened.sol`
   - Paste into contract code field

4. **Set Optimization**
   - **Optimization**: Yes
   - **Runs**: 200

5. **Add Constructor Arguments (ABI-encoded)**
   
   For each contract, encode the constructor arguments:
   
   Example for 1 PLS contract:
   ```
   000000000000000000000000165a378540d26f1f9beb97f30670b5b8eb3f8ad5
   0000000000000000000000005aa1ee340a2e9f199f068db35a855956429067cf
   0000000000000000000000000000000000000000000000000de0b6b3a7640000
   0000000000000000000000000000000000000000000000000000000000000014
   ```

6. **Submit Verification**
   - Click "Verify & Publish"
   - Wait for confirmation

## Alternative: Using Sourcify

1. **Prepare Files**
   - Use the flattened contract: `/ETHTornado_flattened.sol`
   - Or use source files with proper import structure

2. **Upload to Sourcify**
   - Go to: https://sourcify.dev/
   - Select PulseChain network (Chain ID: 369)
   - Upload contract files
   - Add metadata if available

## Getting ABI-Encoded Constructor Arguments

If you need to generate the exact encoded constructor arguments, you can use this method:

```javascript
// Using web3.js
const Web3 = require('web3');
const web3 = new Web3();

const constructorABI = {
  "inputs": [
    {"name": "_verifier", "type": "address"},
    {"name": "_hasher", "type": "address"},
    {"name": "_denomination", "type": "uint256"},
    {"name": "_merkleTreeHeight", "type": "uint32"}
  ],
  "type": "constructor"
};

// Example for 1M PLS contract
const encoded = web3.eth.abi.encodeParameters(
  ['address', 'address', 'uint256', 'uint32'],
  [
    '0x165A378540d26F1f9BEB97F30670B5B8Eb3f8aD5', // Verifier
    '0x5Aa1eE340a2E9F199f068DB35a855956429067cf', // Hasher
    '1000000000000000000000000',                  // 1M PLS in wei
    20                                             // Tree height
  ]
);
console.log(encoded);
```

## Files Included in This Package

1. `/contracts/` - Raw Solidity source files
2. `/ETHTornado_flattened.sol` - Flattened contract ready for verification
3. `/build/contracts/` - Compiled artifacts with ABI and bytecode
4. `/VERIFICATION_GUIDE.md` - Original verification guide
5. `/VERIFICATION_PACKAGE.md` - This comprehensive package

## Support

If verification fails:
1. Ensure compiler version matches exactly (0.7.6)
2. Ensure optimization settings match (enabled, 200 runs)
3. Check that constructor arguments are properly encoded
4. Try using the flattened contract file
5. Verify on the correct network (PulseChain, Chain ID: 369)

All contract source code and deployment information is available in this package for successful verification on Otterscan or Sourcify.