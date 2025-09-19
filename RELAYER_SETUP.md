# Relayer Setup Guide

## Overview

The zkPULSE protocol has two relayer options:

1. **Public Relayers** (default) - External relayers that handle withdrawals for a fee
2. **Local Relayer** (for development/self-hosting) - Run your own relayer

## Current Setup

### In Development (with localhost RPC)
- **Primary**: Local relayer at `http://localhost:4000` (if configured)
- **Fallback**: Public relayer at `https://development-zkpulse-1.onrender.com`

### In Production
- **Primary**: Public relayer at `https://development-zkpulse-1.onrender.com`
- **Future**: Additional public relayers can be added to `relayer-config.js`

## Running Your Own Local Relayer

### 1. Create a Relayer Wallet

First, you need a dedicated wallet for the relayer:

```bash
# Option 1: Use any wallet to generate a new account
# Option 2: Use Web3 to generate:
node -e "const {Web3} = require('web3'); const w = new Web3(); const a = w.eth.accounts.create(); console.log('Address:', a.address); console.log('Private Key:', a.privateKey);"
```

**IMPORTANT**:
- Fund this wallet with PLS for gas fees (recommended: at least 10,000 PLS)
- Keep the private key secure and never commit it to git

### 2. Configure the Relayer

Edit `relayer/.env`:

```env
# Your relayer wallet's private key (starts with 0x)
RELAYER_PRIVATE_KEY=0x_your_private_key_here

# Your relayer wallet's address
RELAYER_ADDRESS=0x_your_address_here

# Local PulseChain node
RPC_URL=http://localhost:8545

# Relayer port
RELAYER_PORT=4000
```

### 3. Install Relayer Dependencies

```bash
cd relayer
npm install
cd ..
```

### 4. Start Both Services

**Option A: Start Together (Recommended)**

Windows:
```bash
start-with-relayer.bat
```

Linux/Mac:
```bash
chmod +x start-with-relayer.sh
./start-with-relayer.sh
```

**Option B: Start Separately**

Terminal 1 - Start Relayer:
```bash
cd relayer
npm start
```

Terminal 2 - Start Main App:
```bash
npm start
```

### 5. Verify Setup

1. Check relayer status:
```bash
curl http://localhost:4000/status
```

2. Check available relayers in app:
```bash
curl http://localhost:8888/api/relayers
```

## Relayer Fee Structure

The relayer charges fees to cover gas costs and provide a service:

| Amount | Fee % | Min Fee (PLS) |
|--------|-------|---------------|
| 1 PLS | 0.75% | 100 |
| 1M PLS | 0.5% | 5,000 |
| 10M PLS | 0.4% | 10,000 |
| 100M PLS | 0.3% | 20,000 |
| 1B PLS | 0.25% | 50,000 |

## How Withdrawals Work

### Without Relayer (Direct)
1. User generates ZK proof
2. User submits withdrawal transaction directly
3. User pays gas fees
4. User's address is linked to withdrawal

### With Relayer (Privacy)
1. User generates ZK proof
2. User sends proof to relayer
3. Relayer submits transaction and pays gas
4. Relayer takes fee from withdrawal amount
5. User receives funds minus fee
6. User's address remains private

## Monitoring Your Relayer

### Check Balance
```javascript
// Check relayer wallet balance
const balance = await web3.eth.getBalance(RELAYER_ADDRESS);
console.log('Relayer balance:', web3.utils.fromWei(balance, 'ether'), 'PLS');
```

### View Logs
- Main app logs: Console output
- Relayer logs: Separate console window/terminal
- Transaction history: Check on PulseChain explorer

## Troubleshooting

### Relayer Won't Start
- Ensure `RELAYER_PRIVATE_KEY` and `RELAYER_ADDRESS` are set in `relayer/.env`
- Check that the private key is valid (starts with 0x, 64 hex chars after)
- Verify the address matches the private key

### Insufficient Funds Error
- Add more PLS to your relayer wallet
- Recommended minimum: 10,000 PLS

### Connection Issues
- Ensure PulseChain node is running on localhost:8545
- Check firewall settings
- Verify `.env` configuration in both root and relayer directories

### Relayer Not Showing in App
- Check that relayer is running: `curl http://localhost:4000/status`
- Verify `NODE_ENV` is not set to 'production'
- Check browser console for errors

## Production Deployment

For production, you should:

1. Use a dedicated server for the relayer
2. Set up proper monitoring and alerts
3. Implement rate limiting and DDoS protection
4. Use environment variables for all sensitive data
5. Set up automated wallet funding alerts
6. Consider running multiple relayers for redundancy

## Security Notes

- **Never share your relayer private key**
- **Never commit `.env` files to git**
- Keep relayer wallet separate from personal funds
- Monitor for unusual activity
- Set up withdrawal limits if needed
- Use a hardware wallet for large relayer operations

## API Endpoints

### Relayer Server (Port 4000)

- `GET /status` - Check relayer status
- `GET /v1/tornadoFee` - Get current fees
- `POST /v1/tornadoWithdraw` - Submit withdrawal
- `GET /v1/jobs/:id` - Check job status

### Main App (Port 8888)

- `GET /api/relayers` - List available relayers
- `GET /api/relayer-fee` - Calculate fees
- `POST /api/withdraw` - Generate withdrawal proof