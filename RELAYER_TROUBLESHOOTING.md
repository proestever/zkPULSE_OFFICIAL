# Relayer Troubleshooting Guide

## Issues Fixed

### 1. Missing Gas Price Variable
**Problem**: The relayer server was using an undefined `gasPrice` variable at line 272.
**Fix**: Added code to fetch current gas price before sending transaction.

### 2. Generic Error Messages
**Problem**: Errors showed "Error happened while trying to execute a function inside a smart contract" without details.
**Fix**: Added detailed error logging and user-friendly error messages.

### 3. Fee Calculation Issues
**Problem**: Fee calculation was in PLS but contract expects wei.
**Fix**: Convert fee from PLS to wei (multiply by 10^18) before passing to contract.

### 4. BigInt Type Error
**Problem**: "Cannot mix BigInt and other types" when calculating gas limit.
**Fix**: Convert BigInt to number before multiplication.

### 5. UI Display Issues
**Problem**: Fee displayed as scientific notation, explorer links to wrong site.
**Fix**: Convert wei back to PLS for display, use otter.pulsechain.com for explorer.

## Common Error Causes & Solutions

### "Invalid proof: The zero-knowledge proof verification failed"
**Causes:**
- Mismatch between proof generation parameters and contract expectations
- Wrong relayer address in proof vs actual relayer
- Incorrect fee amount in proof

**Solutions:**
1. Verify relayer address matches in:
   - `.env` file (`RELAYER_ADDRESS`)
   - `relayer-config.js` 
   - Proof generation parameters

2. Check fee calculation is consistent across:
   - Frontend (`calculateRelayerFee`)
   - Backend proof generation
   - Relayer server

### "This note has already been withdrawn"
**Cause:** The nullifier has been spent already.
**Solution:** Use a different note or verify the note hasn't been withdrawn.

### "Invalid merkle root"
**Causes:**
- Deposit is too recent (not enough confirmations)
- Wrong contract address
- Corrupted note

**Solutions:**
1. Wait for more block confirmations (typically 100+ blocks)
2. Verify correct contract address for denomination
3. Check note format is valid

### "Gas estimation failed"
**Causes:**
- Contract would revert due to invalid proof
- Insufficient balance in relayer account
- Network connectivity issues

**Solutions:**
1. Check relayer has sufficient PLS balance
2. Verify proof parameters match exactly
3. Check RPC endpoint is working

## Debugging Steps

### 1. Start Relayer Server with Verbose Logging
```bash
cd relayer
node relayer-server.js
```
Watch console output for detailed error messages.

### 2. Check Browser Console
Open Developer Tools (F12) and monitor console for:
- Proof generation parameters
- Relayer communication errors
- Job status updates

### 3. Verify Configuration

#### Check .env file in relayer directory:
```
RELAYER_PRIVATE_KEY=your_private_key_here
RELAYER_ADDRESS=0x968DD9f833C58C0ADa629eF8f60180C7fEeF78d3
RPC_URL=https://rpc.pulsechain.com
RELAYER_PORT=4000
```

#### Verify relayer has sufficient balance:
- Needs PLS for gas fees
- Recommended minimum: 100,000 PLS

### 4. Test Relayer Health
```bash
curl http://localhost:4000/status
```

Should return:
```json
{
  "status": "active",
  "relayerAddress": "0x968DD9f833C58C0ADa629eF8f60180C7fEeF78d3",
  "supportedDenominations": ["1", "1M", "10M", "100M", "1B"],
  "network": "pulsechain"
}
```

### 5. Monitor Job Status
After submitting withdrawal, check job status:
```bash
curl http://localhost:4000/v1/jobs/{jobId}
```

## Key Points to Remember

1. **Proof parameters must match exactly**:
   - Relayer address in proof MUST match actual relayer
   - Fee in proof MUST match what relayer expects
   - All values must be properly formatted (BigInt, hex strings)

2. **Always check logs**:
   - Relayer server console shows detailed errors
   - Browser console shows frontend issues
   - Enhanced logging now shows exact parameter mismatches

3. **Common mistakes**:
   - Using wrong relayer address
   - Incorrect fee calculations
   - Not waiting for deposit confirmations
   - Insufficient relayer balance

## Testing Procedure

1. **Start fresh**:
   ```bash
   # Terminal 1: Start unified server
   cd frontend
   node unified-server.js
   
   # Terminal 2: Start relayer
   cd relayer
   node relayer-server.js
   ```

2. **Make a small test deposit** (1 PLS denomination)

3. **Wait for confirmations** (100+ blocks recommended)

4. **Test withdrawal with relayer**:
   - Enable "Use Relayer" checkbox
   - Monitor both server consoles
   - Check browser console for errors

5. **If it fails**, check:
   - Error messages in relayer console (now more detailed)
   - Job status endpoint response
   - Proof generation parameters in unified-server console

## Contact Support
If issues persist after following this guide:
1. Save console logs from both servers
2. Note the exact error message
3. Record the job ID if available
4. Check transaction hash on PulseChain explorer