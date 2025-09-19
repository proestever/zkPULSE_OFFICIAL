# ZK PULSE - Local Setup & Deployment Guide

## Prerequisites

1. **Local PulseChain Node**
   - Must be running with:
     - HTTP RPC on port 8545: `http://localhost:8545`
     - WebSocket on port 8546: `ws://localhost:8546`

2. **Node.js** (v14 or higher)
3. **npm** (v6 or higher)

## Quick Start - Local Development

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
The `.env` file is already configured for local node. If you need to change ports:
```env
RPC_URL=http://localhost:8545
WSS_URL=ws://localhost:8546
PORT=8888
```

### 3. Start the Server

**Windows:**
```bash
start-local.bat
```

**Linux/Mac:**
```bash
chmod +x start-local.sh
./start-local.sh
```

**Or directly:**
```bash
npm start
```

### 4. Access the Application
Open your browser to: `http://localhost:8888`

## Features

- ✅ Full privacy mixer functionality
- ✅ Zero-knowledge proofs (ZK-SNARKs)
- ✅ Support for 5 denominations: 1, 1M, 10M, 100M, 1B PLS
- ✅ Automatic RPC endpoint fallback
- ✅ WebSocket support for fast event fetching
- ✅ Client-side deposit tracking (no server storage)

## RPC Configuration

The application automatically tries RPC endpoints in this order:

1. **Local node** (localhost:8545/8546)
2. **Public fallbacks** (if local fails):
   - rpc.pulsechain.com
   - pulsechain-rpc.publicnode.com
   - rpc-pulsechain.g4mm4.io

## Deployment Options

### Option 1: Deploy to VPS/Cloud Server

1. **Clone the repository to your server**
```bash
git clone <your-repo>
cd Pulsechain_Tornado_Cash_zkPULSE
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment**
Edit `.env` to use public RPC endpoints if no local node:
```env
RPC_URL=https://rpc.pulsechain.com
WSS_URL=wss://ws.pulsechain.com
PORT=80
NODE_ENV=production
CORS_ORIGIN=https://your-domain.com
```

4. **Use PM2 for production**
```bash
npm install -g pm2
pm2 start frontend/unified-server.js --name zkpulse
pm2 save
pm2 startup
```

### Option 2: Deploy to Render.com

The project includes `render.yaml` for easy deployment:

1. Push code to GitHub
2. Connect repository to Render
3. Render will auto-deploy using the config

### Option 3: Deploy to Vercel

1. **Create `vercel.json`:**
```json
{
  "builds": [
    {
      "src": "frontend/unified-server.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "frontend/unified-server.js"
    }
  ]
}
```

2. **Deploy:**
```bash
npm install -g vercel
vercel
```

### Option 4: Docker Deployment

1. **Create Dockerfile:**
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 8888
CMD ["node", "frontend/unified-server.js"]
```

2. **Build and run:**
```bash
docker build -t zkpulse .
docker run -p 8888:8888 zkpulse
```

## Security Configuration

### For Production:

1. **Update CORS settings** in `.env`:
```env
CORS_ORIGIN=https://your-domain.com
```

2. **Use HTTPS** with reverse proxy (nginx/Apache)

3. **Set proper environment:**
```env
NODE_ENV=production
```

## Testing the Deployment

1. **Check health endpoint:**
```bash
curl http://localhost:8888/api/health
```

2. **Test deposit generation:**
```bash
curl -X POST http://localhost:8888/api/deposit \
  -H "Content-Type: application/json" \
  -d '{"amount": "1"}'
```

## Troubleshooting

### Connection Issues
- Ensure your PulseChain node is fully synced
- Check firewall settings for ports 8545/8546
- Verify `.env` configuration

### WebSocket Errors
- The app will automatically fallback to HTTP RPC
- Check WebSocket port is open (8546)

### Memory Issues
- Increase Node.js memory: `node --max-old-space-size=4096 frontend/unified-server.js`

## Smart Contract Addresses

All contracts are deployed on PulseChain (Chain ID: 369):

- 1 PLS: `0xad04f4Eef94Efc3a698e70324b3F96e44703f70B`
- 1M PLS: `0x65d1D748b4d513756cA179049227F6599D803594`
- 10M PLS: `0x21349F435c703F933eBF2bb2A5aB2d716e00b205`
- 100M PLS: `0x2443ccEef2D2803A97A12f5A9AA7db3BEc154B73`
- 1B PLS: `0x282476B716146eAAbCfBDd339e527903deFD969b`

## Support

For issues or questions, please open an issue on GitHub.