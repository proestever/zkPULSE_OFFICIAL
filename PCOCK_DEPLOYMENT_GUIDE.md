# PCOCK Token Tornado Pool Deployment Guide

## Overview
This guide walks through deploying a Tornado Cash mixer pool for PCOCK (PulseChain Peacock) tokens with a 10,000 PCOCK denomination.

## Token Information
- **Token Name**: PulseChain Peacock
- **Symbol**: PCOCK
- **Contract**: `0xc10A4Ed9b4042222d69ff0B374eddd47ed90fC1F`
- **Decimals**: 18
- **Denomination**: 10,000 PCOCK per deposit

## Deployment Steps

### 1. Deploy the PCOCK Tornado Contract

```bash
npx hardhat run scripts/deploy-pcock-10k.js --network pulsechain
```

This will:
- Deploy the `ERC20Tornado_PCOCK` contract
- Configure it for 10,000 PCOCK deposits
- Save deployment info to `deployment-pcock-10k.json`

### 2. Verify the Contract

```bash
npx hardhat run scripts/verify-pcock-10k.js --network pulsechain
```

This will verify the contract on Otterscan/Sourcify.

### 3. Test the Deployment

#### Test Deposit
```bash
npx hardhat run scripts/test-pcock-deposit.js --network pulsechain
```

This will:
- Check your PCOCK balance
- Approve the Tornado contract to spend PCOCK
- Make a test deposit
- Generate and save a withdrawal note

#### Test Withdrawal
```bash
NOTE='tornado-pcock-10k-369-0x...' RECIPIENT='0xYourAddress' npx hardhat run scripts/withdraw-pcock.js --network pulsechain
```

## Frontend Integration

### 1. Update Frontend Configuration

After deployment, update `frontend/config-pcock.js` with the deployed contract address:

```javascript
pools: {
    '10K': {
        address: 'YOUR_DEPLOYED_CONTRACT_ADDRESS',
        denomination: '10000',
        decimals: 18,
        deploymentBlock: YOUR_DEPLOYMENT_BLOCK
    }
}
```

### 2. Add Token Support to UI

The frontend needs these updates:
- Token selector dropdown
- PCOCK balance display
- Approval flow before deposits
- Updated note format for PCOCK

## Contract Architecture

### ERC20Tornado_PCOCK Contract

The contract inherits from the base `Tornado` contract and adds:
- Token transfer handling for deposits
- Token transfer handling for withdrawals
- Approval checking

Key functions:
- `deposit(bytes32 _commitment)` - Deposits 10,000 PCOCK
- `withdraw(...)` - Withdraws 10,000 PCOCK with ZK proof

### Security Features

1. **Same security as PLS pools**:
   - Uses same Hasher (MiMC Sponge)
   - Uses same Verifier (Groth16)
   - No admin keys or backdoors

2. **Token-specific security**:
   - Requires explicit approval before deposits
   - Cannot steal more than approved amount
   - Refunds go in PLS (for gas compensation)

## Gas Costs (Estimated)

- **Approval**: ~50,000 gas
- **Deposit**: ~1,100,000 gas
- **Withdrawal**: ~400,000 gas

## Important Notes

1. **Approval Required**: Users must approve the Tornado contract to spend their PCOCK before depositing

2. **Note Format**: PCOCK notes use the format:
   ```
   tornado-pcock-10k-369-0x[64 bytes of hex]
   ```

3. **Anonymity Set**: Privacy increases as more users deposit into the pool

4. **Fixed Denomination**: Only 10,000 PCOCK deposits are allowed (no custom amounts)

## Troubleshooting

### "Transfer failed" on deposit
- Ensure user has approved the contract
- Check user has sufficient PCOCK balance

### "Invalid note format" on withdrawal
- Ensure note starts with `tornado-pcock-10k-369-`
- Check you're on the correct network (PulseChain)

### "Root is not valid" on withdrawal
- Wait a few blocks after depositing
- Ensure you're using the correct contract

## Next Steps

1. Deploy the contract
2. Verify on Otterscan
3. Update frontend configuration
4. Test with small amounts first
5. Announce to PCOCK community

## Support

For issues or questions:
- Check the deployment logs in `deployment-pcock-10k.json`
- Verify contract interactions on Otterscan
- Ensure all addresses and amounts are correct