# Sourcify Verification Instructions for PCOCK Tornado

## Contract Details
- **Address**: `0x8bc66368b7d900eFE1E9431B832D6A26Ee7D55c3`
- **Chain**: PulseChain (369)
- **Creation TX**: `0x5aed669ebe3ca6a2db90bbc9a5f5de314fc9dc3af1acf883df6e5b2425972ea3`

## Method 1: Standard JSON Input (Recommended)

1. Go to https://sourcify.dev/#/verifier
2. Select "PulseChain" (Chain 369)
3. Enter contract address: `0x8bc66368b7d900eFE1E9431B832D6A26Ee7D55c3`
4. Upload the file: `verification-input.json`
5. Click "Verify"

## Method 2: Multi-File Upload

Upload these files in this order:
1. `contracts/ERC20Tornado_PCOCK.sol`
2. `contracts/Tornado.sol`
3. `contracts/MerkleTreeWithHistory.sol`

With metadata:
- Compiler: `0.7.6`
- Optimization: `Yes`
- Runs: `200`
- EVM Version: `istanbul`

## Method 3: Etherscan-style Verification on Otterscan

Since the flattened version has issues, try multi-file verification:

1. Go to: https://otter.pulsechain.com/address/0x8bc66368b7d900eFE1E9431B832D6A26Ee7D55c3/contract

2. Click "Verify and Publish" → "Multi-file"

3. Main contract file: `ERC20Tornado_PCOCK.sol`

4. Upload all dependency files:
   - `ERC20Tornado_PCOCK.sol`
   - `Tornado.sol`
   - `MerkleTreeWithHistory.sol`

5. Settings:
   - Contract Name: `ERC20Tornado_PCOCK`
   - Compiler: `v0.7.6+commit.7338295f`
   - Optimization: `Yes` (200 runs)
   - EVM: `istanbul`

6. Constructor Arguments:
```
000000000000000000000000165a378540d26f1f9beb97f30670b5b8eb3f8ad50000000000000000000000005aa1ee340a2e9f199f068db35a855956429067cf0000000000000000000000000000000000000000021e19e0c9bab2400000000000000000000000000000000000000000000000000000000000000000000014000000000000000000000000c10a4ed9b4042222d69ff0b374eddd47ed90fc1f
```

## Method 4: Via Sourcify API

```bash
curl -X POST "https://sourcify.dev/server/verify/chosen-method" \
  -F "address=0x8bc66368b7d900eFE1E9431B832D6A26Ee7D55c3" \
  -F "chain=369" \
  -F "files=@verification-input.json" \
  -F "chosenContract=ERC20Tornado_PCOCK"
```

## Important Notes

The contract uses:
- External interface contracts (IHasher, IVerifier) that are already deployed
- OpenZeppelin's ReentrancyGuard (minimal version)
- Inheritance from Tornado base contract

The bytecode should match if:
1. Compiler version is exactly `0.7.6+commit.7338295f`
2. Optimization is enabled with exactly 200 runs
3. EVM version is `istanbul`
4. All source files are provided in correct structure

## If Verification Still Fails

The contract is working correctly on-chain. Users can still interact with it using:
- The verified ABI in `abi-pcock-tornado.json`
- Direct contract calls through web3
- Frontend interface once configured

The contract's functionality is proven by:
- Successful deployment
- Correct parameter verification
- Working token address, denomination, and infrastructure contracts