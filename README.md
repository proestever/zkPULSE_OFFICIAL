# ZK Pulse - Privacy Mixer for PulseChain

![ZK Pulse Logo](https://i.ibb.co/wZqLV5gf/zkpulse-full-logo.png)

## 🔒 Privacy for PulseChain using Zero-Knowledge Proofs

ZK Pulse is a non-custodial privacy solution for PulseChain based on the battle-tested Tornado Cash protocol. It uses zk-SNARKs to break the on-chain link between deposit and withdrawal addresses.

## ✨ Features

- **Complete Privacy**: Zero-knowledge proofs ensure transaction unlinkability
- **Non-Custodial**: You control your funds at all times
- **Multiple Denominations**: 1M, 10M, 100M, and 1B PLS pools
- **No Admin Keys**: Fully decentralized with no backdoors
- **Verified Contracts**: All contracts verified on Otterscan
- **User-Friendly Interface**: Simple deposit and withdrawal process

## 🚀 Quick Start

### Prerequisites

- Node.js v14+ and npm
- MetaMask or Web3 wallet
- PLS for deposits and gas fees

### Installation

```bash
# Clone the repository
git clone https://github.com/proestever/zkpulse.git
cd zkpulse

# Install dependencies
npm install

# Create .env file
echo "PORT=3000" > .env

# Start the server
npm start
```

The application will be available at `http://localhost:3000`

## 📜 Smart Contracts

### Deployed Contract Addresses (PulseChain Mainnet)

| Contract | Address | Purpose |
|----------|---------|---------|
| **Hasher** | `0x5Aa1eE340a2E9F199f068DB35a855956429067cf` | MiMC Sponge hasher |
| **Verifier** | `0x165A378540d26F1f9BEB97F30670B5B8Eb3f8aD5` | ZK proof verification |
| **1 PLS Test** | `0xad04f4Eef94Efc3a698e70324b3F96e44703f70B` | Test pool |
| **1M PLS** | `0x65d1D748b4d513756cA179049227F6599D803594` | 1 million PLS pool |
| **10M PLS** | `0x21349F435c703F933eBF2bb2A5aB2d716e00b205` | 10 million PLS pool |
| **100M PLS** | `0x2443ccEef2D2803A97A12f5A9AA7db3BEc154B73` | 100 million PLS pool |
| **1B PLS** | `0x282476B716146eAAbCfBDd339e527903deFD969b` | 1 billion PLS pool |

All contracts are verified on [Otterscan](https://otter.pulsechain.com)

## 🔧 Configuration

### Network Settings

Configure your Web3 wallet for PulseChain:

- **Network Name**: PulseChain
- **RPC URL**: https://rpc.pulsechain.com
- **Chain ID**: 369
- **Currency Symbol**: PLS
- **Block Explorer**: https://otter.pulsechain.com

### Environment Variables

Create a `.env` file in the root directory:

```env
PORT=3000
NODE_ENV=production
```

## 📖 How to Use

### Making a Deposit

1. Connect your Web3 wallet
2. Select a denomination (1M, 10M, 100M, or 1B PLS)
3. Click "Deposit" and confirm the transaction
4. **SAVE YOUR NOTE** - This is required to withdraw your funds

### Making a Withdrawal

1. Switch to the "Withdraw" tab
2. Paste your deposit note
3. Enter the recipient address (use a fresh address for maximum privacy)
4. Click "Withdraw" and confirm the transaction

### Privacy Best Practices

- Wait before withdrawing (recommended: 10+ deposits after yours)
- Use different addresses for deposits and withdrawals
- Clear browser data between sessions
- Use VPN or Tor for additional privacy
- Never share your deposit notes

## 🔐 Security

- **Audited**: Based on audited Tornado Cash contracts
- **Non-custodial**: Smart contracts never hold custody
- **No admin keys**: Contracts are immutable
- **Open source**: All code is verifiable
- **Client-side**: All sensitive operations happen in your browser

## 📁 Project Structure

```
zkpulse/
├── frontend/           # Web interface
│   ├── index.html     # Main application
│   ├── docs.html      # Documentation page
│   └── *.js           # Application logic
├── contracts/         # Smart contracts
│   ├── ETHTornado.sol
│   ├── Tornado.sol
│   ├── MerkleTreeWithHistory.sol
│   └── Verifier.sol
├── circuits/          # ZK circuits
│   └── build/         # Compiled circuits
├── docs/              # Documentation
└── package.json       # Dependencies
```

## 🛠️ Development

### Running Locally

```bash
# Install dependencies
npm install

# Start development server with auto-reload
npm run dev
```

### Building for Production

The application is ready for production deployment. Simply:

1. Set up a server (VPS, cloud instance, etc.)
2. Install Node.js
3. Clone this repository
4. Run `npm install`
5. Start with `npm start` or use PM2 for process management

### Using PM2 (Recommended for Production)

```bash
# Install PM2
npm install -g pm2

# Start the application
pm2 start frontend/unified-server.js --name zkpulse

# Save PM2 configuration
pm2 save
pm2 startup
```

## 📊 Technical Details

- **Cryptography**: Groth16 zk-SNARKs
- **Hash Function**: Pedersen (via MiMC Sponge)
- **Merkle Tree Height**: 20 (supports 2^20 deposits)
- **Field**: BN254 elliptic curve
- **Dependencies**: snarkjs 0.1.20, circomlib 0.0.20

## ⚠️ Disclaimer

This is experimental software. Use at your own risk. Always:
- Save multiple backups of deposit notes
- Test with small amounts first
- Understand the risks of using privacy tools
- Follow local regulations

## 📄 License

MIT License - see LICENSE file for details

## 🤝 Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 🔗 Links

- **Website**: [Coming Soon]
- **Documentation**: Access via the app interface
- **PulseChain**: https://pulsechain.com
- **Block Explorer**: https://otter.pulsechain.com

## 💬 Support

For issues and questions:
- Check the in-app documentation
- Review the troubleshooting guide
- Open an issue on GitHub

---

**Built with ❤️ for the PulseChain community**

*Based on the Tornado Cash protocol*
