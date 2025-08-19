# Complete Contract Verification Guide - All Tornado Cash Contracts

This guide covers verification for **ALL 7 CONTRACTS** in your Tornado Cash PulseChain deployment.

---

## 📋 Contract Overview

### Core System Contracts (Shared by all denominations):
1. **Hasher Contract** - MiMC Sponge hasher for Pedersen commitments
2. **Verifier Contract** - Groth16 proof verifier from trusted setup

### Tornado Pool Contracts (One per denomination):
3. **1 PLS Test Pool** - Test denomination
4. **1M PLS Pool** - 1 million PLS denomination  
5. **10M PLS Pool** - 10 million PLS denomination
6. **100M PLS Pool** - 100 million PLS denomination
7. **1B PLS Pool** - 1 billion PLS denomination

---

## 🔍 Contract Details & Verification

### 1. HASHER CONTRACT
**Address**: `0x5Aa1eE340a2E9F199f068DB35a855956429067cf`  
**Type**: MiMCSponge Implementation  
**Verification Status**: Special (Circom-generated)

The Hasher is a special contract generated from Circom circuits. It implements the MiMC sponge function used for Pedersen hashing.

**To Verify**:
1. This is bytecode-only deployment (no Solidity source)
2. The bytecode can be verified against the build artifact in `/build/Hasher.json`
3. View on Otterscan: https://otter.pulsechain.com/address/0x5Aa1eE340a2E9F199f068DB35a855956429067cf

---

### 2. VERIFIER CONTRACT  
**Address**: `0x165A378540d26F1f9BEB97F30670B5B8Eb3f8aD5`  
**Source**: `/contracts/Verifier.sol`  
**Compiler**: Solidity 0.7.6, Optimizer ON (200 runs)

**To Verify**:
1. Go to: https://otter.pulsechain.com/address/0x165A378540d26F1f9BEB97F30670B5B8Eb3f8aD5?tab=contract
2. Click "Verify & Publish"
3. Upload `/contracts/Verifier.sol`
4. Compiler settings: v0.7.6, Optimizer: Yes (200 runs)
5. No constructor arguments needed

---

### 3. ETHTornado - 1 PLS TEST POOL
**Address**: `0xad04f4Eef94Efc3a698e70324b3F96e44703f70B`  
**Denomination**: 1 PLS (1000000000000000000 wei)

**Constructor Arguments (no 0x)**:
```
000000000000000000000000165a378540d26f1f9beb97f30670b5b8eb3f8ad50000000000000000000000005aa1ee340a2e9f199f068db35a855956429067cf0000000000000000000000000000000000000000000000000de0b6b3a76400000000000000000000000000000000000000000000000000000000000000000014
```

**Verification Link**: https://otter.pulsechain.com/address/0xad04f4Eef94Efc3a698e70324b3F96e44703f70B?tab=contract

---

### 4. ETHTornado - 1M PLS POOL
**Address**: `0x65d1D748b4d513756cA179049227F6599D803594`  
**Denomination**: 1,000,000 PLS (1000000000000000000000000 wei)

**Constructor Arguments (no 0x)**:
```
000000000000000000000000165a378540d26f1f9beb97f30670b5b8eb3f8ad50000000000000000000000005aa1ee340a2e9f199f068db35a855956429067cf00000000000000000000000000000000000000000000d3c21bcecceda10000000000000000000000000000000000000000000000000000000000000000000014
```

**Verification Link**: https://otter.pulsechain.com/address/0x65d1D748b4d513756cA179049227F6599D803594?tab=contract

---

### 5. ETHTornado - 10M PLS POOL
**Address**: `0x21349F435c703F933eBF2bb2A5aB2d716e00b205`  
**Denomination**: 10,000,000 PLS (10000000000000000000000000 wei)

**Constructor Arguments (no 0x)**:
```
000000000000000000000000165a378540d26f1f9beb97f30670b5b8eb3f8ad50000000000000000000000005aa1ee340a2e9f199f068db35a855956429067cf000000000000000000000000000000000000000000084595161401484a0000000000000000000000000000000000000000000000000000000000000000000014
```

**Verification Link**: https://otter.pulsechain.com/address/0x21349F435c703F933eBF2bb2A5aB2d716e00b205?tab=contract

---

### 6. ETHTornado - 100M PLS POOL
**Address**: `0x2443ccEef2D2803A97A12f5A9AA7db3BEc154B73`  
**Denomination**: 100,000,000 PLS (100000000000000000000000000 wei)

**Constructor Arguments (no 0x)**:
```
000000000000000000000000165a378540d26f1f9beb97f30670b5b8eb3f8ad50000000000000000000000005aa1ee340a2e9f199f068db35a855956429067cf00000000000000000000000000000000000000000052b7d2dcc80cd2e40000000000000000000000000000000000000000000000000000000000000000000014
```

**Verification Link**: https://otter.pulsechain.com/address/0x2443ccEef2D2803A97A12f5A9AA7db3BEc154B73?tab=contract

---

### 7. ETHTornado - 1B PLS POOL  
**Address**: `0x282476B716146eAAbCfBDd339e527903deFD969b`  
**Denomination**: 1,000,000,000 PLS (1000000000000000000000000000 wei)

**Constructor Arguments (no 0x)**:
```
000000000000000000000000165a378540d26f1f9beb97f30670b5b8eb3f8ad50000000000000000000000005aa1ee340a2e9f199f068db35a855956429067cf0000000000000000000000000000000000000000033b2e3c9fd0803ce80000000000000000000000000000000000000000000000000000000000000000000014
```

**Verification Link**: https://otter.pulsechain.com/address/0x282476B716146eAAbCfBDd339e527903deFD969b?tab=contract

---

## 📝 Step-by-Step Verification Process

### For Each ETHTornado Contract (Steps 3-7):

1. **Navigate to Contract on Otterscan**
   - Use the verification link provided above
   - Click "Contract" tab → "Verify & Publish"

2. **Fill Verification Form**
   - **Compiler Type**: Solidity (Single file)
   - **Compiler Version**: v0.7.6+commit.7338295f
   - **Open Source License**: MIT

3. **Paste Flattened Contract**
   - Copy entire contents from `/ETHTornado_flattened.sol`
   - Paste into the contract code field

4. **Configure Optimization**
   - **Optimization**: Yes
   - **Runs**: 200

5. **Add Constructor Arguments**
   - Copy the constructor arguments from above (WITHOUT the 0x prefix)
   - Paste into the constructor arguments field

6. **Submit**
   - Click "Verify & Publish"
   - Wait for confirmation

---

## ✅ Verification Checklist

Use this checklist to track your verification progress:

- [ ] **Hasher Contract** (`0x5Aa1eE340a2E9F199f068DB35a855956429067cf`)
  - Special bytecode verification - check on explorer
  
- [ ] **Verifier Contract** (`0x165A378540d26F1f9BEB97F30670B5B8Eb3f8aD5`)
  - Upload Verifier.sol
  - No constructor args needed
  
- [ ] **1 PLS Test Pool** (`0xad04f4Eef94Efc3a698e70324b3F96e44703f70B`)
  - Flattened contract + constructor args
  
- [ ] **1M PLS Pool** (`0x65d1D748b4d513756cA179049227F6599D803594`)
  - Flattened contract + constructor args
  
- [ ] **10M PLS Pool** (`0x21349F435c703F933eBF2bb2A5aB2d716e00b205`)
  - Flattened contract + constructor args
  
- [ ] **100M PLS Pool** (`0x2443ccEef2D2803A97A12f5A9AA7db3BEc154B73`)
  - Flattened contract + constructor args
  
- [ ] **1B PLS Pool** (`0x282476B716146eAAbCfBDd339e527903deFD969b`)
  - Flattened contract + constructor args

---

## 🔧 Compiler Settings (MUST MATCH EXACTLY)

```json
{
  "compiler": {
    "version": "0.7.6+commit.7338295f"
  },
  "settings": {
    "optimizer": {
      "enabled": true,
      "runs": 200
    },
    "evmVersion": "istanbul"
  }
}
```

---

## 📂 Required Files

All files needed for verification are in your project:

1. **Flattened Contract**: `/ETHTornado_flattened.sol`
2. **Verifier Source**: `/contracts/Verifier.sol`
3. **Build Artifacts**: `/build/contracts/` (for reference)
4. **Hasher Bytecode**: `/build/Hasher.json`

---

## 🚨 Common Issues & Solutions

### Issue: "Bytecode doesn't match"
**Solution**: Ensure you're using exact compiler settings (0.7.6, optimizer ON, 200 runs)

### Issue: "Constructor arguments invalid"
**Solution**: Use the arguments WITHOUT the 0x prefix from this guide

### Issue: "Contract already verified"
**Solution**: Great! Move to the next contract

### Issue: Hasher contract can't be verified with source
**Solution**: This is normal - Hasher is Circom-generated bytecode only

---

## 🎯 Benefits of Verification

Once all contracts are verified:
- ✅ Users can read the contract code directly on Otterscan
- ✅ Builds trust by showing no hidden functionality
- ✅ Allows users to interact directly through block explorer
- ✅ Shows professional deployment standards
- ✅ Enables other developers to fork/audit easily

---

## 📊 Verification Status Dashboard

After verification, all contracts should show:
- Green checkmark ✓ on Otterscan
- "Contract Source Code Verified" status
- Readable contract functions and events
- Decoded transaction data

---

## 🔗 Quick Links to All Contracts

**Core Infrastructure:**
- [Hasher](https://otter.pulsechain.com/address/0x5Aa1eE340a2E9F199f068DB35a855956429067cf)
- [Verifier](https://otter.pulsechain.com/address/0x165A378540d26F1f9BEB97F30670B5B8Eb3f8aD5)

**Tornado Pools:**
- [1 PLS Test](https://otter.pulsechain.com/address/0xad04f4Eef94Efc3a698e70324b3F96e44703f70B)
- [1M PLS](https://otter.pulsechain.com/address/0x65d1D748b4d513756cA179049227F6599D803594)
- [10M PLS](https://otter.pulsechain.com/address/0x21349F435c703F933eBF2bb2A5aB2d716e00b205)
- [100M PLS](https://otter.pulsechain.com/address/0x2443ccEef2D2803A97A12f5A9AA7db3BEc154B73)
- [1B PLS](https://otter.pulsechain.com/address/0x282476B716146eAAbCfBDd339e527903deFD969b)

---

## 📈 After Verification

Once all contracts are verified:
1. Share the verified contract addresses with your community
2. Update documentation to show "Verified on Otterscan" badges
3. Users can now deposit with full transparency
4. Consider adding verified contract badges to your UI

---

*This guide ensures complete transparency for all contracts in your Tornado Cash deployment.*