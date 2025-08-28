# zkPulse Relayer Setup

## Overview

The zkPulse relayer allows users to withdraw funds through an intermediary, enhancing privacy by breaking the on-chain link between the withdrawal transaction and the user's wallet address.

## Features

✅ **Full Privacy**: Relayer submits transactions on behalf of users  
✅ **Compatible Contracts**: Works with existing deployed zkPulse contracts  
✅ **Fee Management**: Automatic fee calculation based on gas costs and denomination  
✅ **Job Queue**: Track withdrawal status with job IDs  
✅ **Multiple Denominations**: Supports all zkPulse pools (1, 1M, 10M, 100M, 1B PLS)  

## Quick Setup

### 1. Install Dependencies

```bash
cd relayer
npm install
```

### 2. Configure Environment

Copy the example environment file and edit it:

```bash
cp .env.example .env
```

Edit `.env` with your relayer credentials:

```env
RELAYER_PRIVATE_KEY=your_private_key_here
RELAYER_ADDRESS=your_relayer_address_here
RPC_URL=wss://ws.pulsechain.com
RELAYER_PORT=4000
```

⚠️ **IMPORTANT**: 
- Keep your private key secret and secure
- Ensure your relayer address has sufficient PLS for gas fees
- The relayer will receive fees from withdrawals

### 3. Start the Relayer

```bash
npm start
```

For development with auto-reload:
```bash
npm run dev
```

## API Endpoints

### Health Check
```
GET /status
```
Returns relayer status and configuration.

### Get Fee Estimate
```
GET /v1/tornadoFee?currency=pls&amount=1M&operation=withdraw
```
Returns the fee for a withdrawal operation.

### Submit Withdrawal
```
POST /v1/tornadoWithdraw
```
Body:
```json
{
  "proof": "0x...",
  "args": ["0x...", "0x...", ...],
  "contract": "0x...",
  "denomination": "1M"
}
```

### Check Job Status
```
GET /v1/jobs/{jobId}
```
Returns the status of a withdrawal job.

## Fee Structure

Default fees (configurable in relayer-server.js):
- 1 PLS: 0.75%
- 1M PLS: 0.5%
- 10M PLS: 0.4%
- 100M PLS: 0.3%
- 1B PLS: 0.25%

Minimum fees ensure gas costs are covered:
- 1 PLS: 100 PLS minimum
- 1M PLS: 5,000 PLS minimum
- 10M PLS: 10,000 PLS minimum
- 100M PLS: 20,000 PLS minimum
- 1B PLS: 50,000 PLS minimum

## Frontend Integration

The main zkPulse application already includes relayer support. Users can:

1. Toggle "Use Relayer" when withdrawing
2. Select from available relayers
3. Choose gas speed (affects fee)
4. See the net amount they'll receive

### Adding Your Relayer to the Frontend

Edit `frontend/relayer-config.js` and add your relayer:

```javascript
relayers: [
    {
        name: "Your Relayer Name",
        address: "0xYourRelayerAddress",
        url: "https://your-relayer-domain.com",
        fee: 0.5, // Your fee percentage
        status: "active",
        gasPrice: "standard",
        rating: 5,
        uptime: 99.9,
        supportedDenominations: ["1M", "10M", "100M", "1B"]
    }
]
```

## Security Considerations

1. **Private Key Security**: Never expose your relayer's private key
2. **Fund Management**: Keep sufficient PLS in your relayer address
3. **Rate Limiting**: Consider implementing rate limiting for production
4. **HTTPS**: Use HTTPS in production with proper SSL certificates
5. **Monitoring**: Monitor your relayer for unusual activity

## Running in Production

### Using PM2

```bash
npm install -g pm2
pm2 start relayer-server.js --name zkpulse-relayer
pm2 save
pm2 startup
```

### Using Docker

Create a Dockerfile:

```dockerfile
FROM node:18
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 4000
CMD ["node", "relayer-server.js"]
```

Build and run:

```bash
docker build -t zkpulse-relayer .
docker run -d -p 4000:4000 --env-file .env zkpulse-relayer
```

## Monitoring

Monitor your relayer:
- Check logs: `pm2 logs zkpulse-relayer`
- Monitor status: `pm2 status`
- Check balance: Ensure relayer has sufficient PLS

## Troubleshooting

### Common Issues

1. **"RELAYER_PRIVATE_KEY not set"**: Configure your .env file
2. **"Insufficient funds"**: Add PLS to your relayer address
3. **"Transaction failed"**: Check gas prices and limits
4. **WebSocket errors**: Verify RPC URL is accessible

### Debug Mode

Enable debug logging by setting:
```env
DEBUG=true
```

## Support

For issues or questions about the relayer:
1. Check the main zkPulse documentation
2. Review the smart contract code
3. Open an issue on GitHub

## License

MIT License - See main project LICENSE file