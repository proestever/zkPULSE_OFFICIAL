# PCOCK Tornado Contract Verification Details

## Contract Information
- **Contract Address:** `0x8bc66368b7d900eFE1E9431B832D6A26Ee7D55c3`
- **Network:** PulseChain (Chain ID: 369)
- **Contract Name:** `ERC20Tornado_PCOCK`

## Verification on Otterscan/Sourcify

### Step 1: Go to Otterscan
https://otter.pulsechain.com/address/0x8bc66368b7d900eFE1E9431B832D6A26Ee7D55c3

### Step 2: Click "Contract" Tab → "Verify and Publish"

### Step 3: Enter These Details

#### Compiler Settings:
- **Compiler Version:** `v0.7.6+commit.7338295f`
- **EVM Version:** `istanbul`
- **Optimization:** `Enabled`
- **Optimization Runs:** `200`

#### Constructor Arguments (ABI-Encoded):
```
0x000000000000000000000000165a378540d26f1f9beb97f30670b5b8eb3f8ad50000000000000000000000005aa1ee340a2e9f199f068db35a855956429067cf0000000000000000000000000000000000000000021e19e0c9bab2400000000000000000000000000000000000000000000000000000000000000000000014000000000000000000000000c10a4ed9b4042222d69ff0b374eddd47ed90fc1f
```

#### Constructor Arguments (Decoded):
1. **_verifier:** `0x165A378540d26F1f9BEB97F30670B5B8Eb3f8aD5`
2. **_hasher:** `0x5Aa1eE340a2E9F199f068DB35a855956429067cf`
3. **_denomination:** `10000000000000000000000` (10,000 * 10^18)
4. **_merkleTreeHeight:** `20`
5. **_token:** `0xc10A4Ed9b4042222d69ff0B374eddd47ed90fC1F`

### Step 4: Source Code
Use the flattened contract from: `contracts/ERC20Tornado_PCOCK_flattened.sol`

Copy the ENTIRE contents of that file and paste it into the source code field.

## Alternative: Using Sourcify Directly

### Via API:
```bash
curl -X POST https://sourcify.dev/server/verify/369 \
  -F "address=0x8bc66368b7d900eFE1E9431B832D6A26Ee7D55c3" \
  -F "chain=369" \
  -F "files=@ERC20Tornado_PCOCK_flattened.sol" \
  -F "compilerVersion=0.7.6" \
  -F "optimization=1" \
  -F "runs=200"
```

### Via Web Interface:
1. Go to: https://sourcify.dev/
2. Select "Verify Contract"
3. Network: PulseChain (369)
4. Contract Address: `0x8bc66368b7d900eFE1E9431B832D6A26Ee7D55c3`
5. Upload: `ERC20Tornado_PCOCK_flattened.sol`
6. Submit

## Manual Verification Details

### Metadata JSON:
```json
{
  "compiler": {
    "version": "0.7.6+commit.7338295f"
  },
  "language": "Solidity",
  "output": {
    "abi": [...],
    "devdoc": {
      "kind": "dev",
      "methods": {},
      "version": 1
    },
    "userdoc": {
      "kind": "user",
      "methods": {},
      "version": 1
    }
  },
  "settings": {
    "compilationTarget": {
      "ERC20Tornado_PCOCK.sol": "ERC20Tornado_PCOCK"
    },
    "evmVersion": "istanbul",
    "libraries": {},
    "metadata": {
      "bytecodeHash": "ipfs"
    },
    "optimizer": {
      "enabled": true,
      "runs": 200
    },
    "remappings": []
  },
  "sources": {
    "ERC20Tornado_PCOCK.sol": {
      "keccak256": "0x[hash]",
      "license": "MIT",
      "urls": []
    }
  },
  "version": 1
}
```

## Verification Checklist

✅ **Before Verification:**
- [ ] Contract is deployed at `0x8bc66368b7d900eFE1E9431B832D6A26Ee7D55c3`
- [ ] You have the flattened source code
- [ ] Compiler version is exactly `0.7.6`
- [ ] Optimization is enabled with 200 runs
- [ ] Constructor arguments are correct

✅ **What to Expect:**
- Verification should complete within 1-2 minutes
- Once verified, the contract code will be visible on Otterscan
- Users can read the contract and verify it's legitimate

## Common Issues & Solutions

### "Bytecode doesn't match"
- Ensure optimization is set to exactly 200 runs
- Use the flattened version, not the original
- Check compiler version is exactly 0.7.6

### "Constructor arguments invalid"
- Use the ABI-encoded version provided above
- Don't include 0x prefix if the form doesn't expect it

### "Source code compilation failed"
- Make sure you copied the ENTIRE flattened contract
- Check for any missing brackets or semicolons

## Support

If verification fails, try:
1. Double-check all settings match exactly
2. Try using Remix to verify (compile and check bytecode matches)
3. Use the Sourcify API directly

## Contract Functions to Verify

Once verified, users can see these main functions:
- `deposit(bytes32 _commitment)` - Deposit 10,000 PCOCK
- `withdraw(...)` - Withdraw with ZK proof
- `token()` - Returns PCOCK address
- `denomination()` - Returns 10,000 * 10^18
- `verifier()` - Returns verifier contract
- `hasher()` - Returns hasher contract