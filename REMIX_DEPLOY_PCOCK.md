# Deploy PCOCK Tornado Pool via Remix

## Quick Deploy Instructions

### 1. Open Remix IDE
Go to: https://remix.ethereum.org

### 2. Create New File
Create a new file called `ERC20Tornado_PCOCK.sol` and paste the entire contents from:
`contracts/ERC20Tornado_PCOCK_flattened.sol`

### 3. Compile
- Select compiler version: `0.7.6`
- Enable optimization: 200 runs
- Click "Compile ERC20Tornado_PCOCK.sol"

### 4. Deploy
Switch to the "Deploy & Run Transactions" tab

#### Network Setup:
- Environment: "Injected Provider - MetaMask"
- Make sure you're on PulseChain (Chain ID: 369)

#### Constructor Parameters:
```
_verifier: 0x165A378540d26F1f9BEB97F30670B5B8Eb3f8aD5
_hasher: 0x5Aa1eE340a2E9F199f068DB35a855956429067cf
_denomination: 10000000000000000000000
_merkleTreeHeight: 20
_token: 0xc10A4Ed9b4042222d69ff0B374eddd47ed90fC1F
```

#### Deploy Steps:
1. Select `ERC20Tornado_PCOCK` contract
2. Enter the constructor parameters above
3. Click "transact"
4. Confirm in MetaMask
5. Wait for deployment

### 5. Save the Contract Address
Once deployed, copy the contract address and save it!

Example: `0x... (your deployed contract address)`

### 6. Verify on Otterscan

Go to: https://otter.pulsechain.com

1. Search for your contract address
2. Click "Contract" tab
3. Click "Verify and Publish"
4. Select:
   - Compiler: v0.7.6
   - Optimization: Yes (200 runs)
   - Enter the flattened source code
5. Submit for verification

## Constructor Parameters Explained

- **_verifier**: `0x165A378540d26F1f9BEB97F30670B5B8Eb3f8aD5`
  - The Groth16 proof verifier (shared infrastructure)

- **_hasher**: `0x5Aa1eE340a2E9F199f068DB35a855956429067cf`
  - The MiMC Sponge hasher (shared infrastructure)

- **_denomination**: `10000000000000000000000`
  - 10,000 PCOCK (10000 * 10^18)

- **_merkleTreeHeight**: `20`
  - Supports up to 2^20 deposits

- **_token**: `0xc10A4Ed9b4042222d69ff0B374eddd47ed90fC1F`
  - PCOCK token contract address

## After Deployment

1. **Save Deployment Info**:
```json
{
  "token": "PCOCK",
  "pool": "10K",
  "contract": "YOUR_DEPLOYED_ADDRESS",
  "network": "PulseChain",
  "deployedAt": "CURRENT_DATE"
}
```

2. **Update Frontend Config**:
Edit `frontend/config-pcock.js`:
```javascript
pools: {
    '10K': {
        address: 'YOUR_DEPLOYED_ADDRESS',
        denomination: '10000',
        decimals: 18,
        deploymentBlock: DEPLOYMENT_BLOCK_NUMBER
    }
}
```

3. **Test the Contract**:
- Make a test deposit with a small amount
- Verify the deposit event is emitted
- Test withdrawal with the note

## Gas Estimates
- Deployment: ~5,000,000 gas
- At 1 gwei: ~0.005 PLS
- At 10 gwei: ~0.05 PLS

## Important Notes

⚠️ **Before Mainnet Deployment**:
1. Test on a testnet first if available
2. Double-check all parameters
3. Ensure you have enough PLS for gas
4. Save the contract address immediately after deployment

## Troubleshooting

### "Out of gas" error
- Increase gas limit to 6,000,000

### "Invalid parameters" error
- Double-check all addresses are correct
- Ensure denomination has exactly 22 digits (10000 + 18 zeros)

### Contract not verifying
- Make sure you're using the flattened version
- Compiler must be exactly 0.7.6
- Optimization must be enabled with 200 runs