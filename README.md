# 🌀 zkPULSE - Privacy Protocol for PulseChain

<div align="center">

  [![PulseChain](https://img.shields.io/badge/PulseChain-Native-00ff41)](https://pulsechain.com)
  [![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
  [![Website](https://img.shields.io/badge/Website-zkpulse.io-00ff41)](https://zkpulse.io)
  [![GitHub](https://img.shields.io/badge/GitHub-zkPULSE__OFFICIAL-181717?logo=github)](https://github.com/proestever/zkPULSE_OFFICIAL)

  **Zero-Knowledge Privacy Protocol for PulseChain**

  [Website](https://zkpulse.io) • [Documentation](https://docs.zkpulse.io) • [Twitter](https://twitter.com/zkpulse)
</div>

---

## 🔐 Overview

zkPULSE is a decentralized, non-custodial privacy protocol built natively on PulseChain. Using advanced zero-knowledge proof technology, zkPULSE enables completely private transactions while maintaining the security and transparency of blockchain technology.

## ✨ Key Features

### 🎭 **Complete Privacy**
- Anonymous transactions using zk-SNARKs technology
- No link between deposit and withdrawal addresses
- Enhanced privacy through relayer network

### 🔒 **Non-Custodial**
- You maintain full control of your funds
- No trusted third parties
- Decentralized architecture

### ⚡ **PulseChain Optimized**
- Native PulseChain integration
- Fast transaction processing
- Low gas fees

### 🔥 **Deflationary Tokenomics**
- zkPULSE token burns with every transaction
- Burn address: `0x0000000000000000000000000000000000000369`
- Token contract: `0x8De9077B619DcBdA28edda4b8dC16538a59EFb49`

## 🚀 Getting Started

### Prerequisites

- Node.js v16 or higher
- npm or yarn package manager
- MetaMask or compatible Web3 wallet
- PulseChain network configured

### Installation

1. **Clone the repository:**
```bash
git clone https://github.com/proestever/zkPULSE_OFFICIAL.git
cd zkPULSE_OFFICIAL
```

2. **Install dependencies:**
```bash
npm install
```

3. **Configure environment:**
```bash
cp .env.example .env
# Edit .env with your configuration
# NEVER commit your .env file!
```

4. **Start the application:**
```bash
npm start
```

The application will be available at `http://localhost:8888`

### Development Commands

```bash
# Development server with hot reload
npm run dev

# Production server
npm run production

# Pre-cache blockchain events
npm run precache

# Run tests
npm test
```

## 💰 Supported Denominations

zkPULSE supports multiple pool sizes for flexible privacy options:

| Pool Size | Amount |
|-----------|--------|
| Small | 1 Million PLS |
| Medium | 10 Million PLS |
| Large | 100 Million PLS |
| Whale | 1 Billion PLS |

## 🏗️ Architecture

```
zkPULSE_OFFICIAL/
├── contracts/        # Smart contracts
│   ├── zkPulseRouter.sol
│   ├── Tornado.sol
│   └── Verifier.sol
├── frontend/         # Web interface
│   ├── index.html
│   ├── app-complete.js
│   └── unified-server.js
├── build/           # Compiled contracts & circuits
├── branding/        # zkPULSE brand assets
└── cache/          # Event cache for performance
```

## 🛠️ Technology Stack

- **Smart Contracts**: Solidity ^0.7.0
- **Zero-Knowledge Proofs**: Circom, SnarkJS, WebSnark
- **Frontend**: HTML5, JavaScript, Web3.js
- **Backend**: Node.js, Express.js
- **Blockchain**: PulseChain
- **Caching**: Server-side event caching for instant stats

## 📊 Network Statistics

Real-time protocol statistics available:
- Total Value Locked (TVL)
- Deposits per denomination
- Withdrawal count
- zkPULSE tokens burned
- Anonymity set size

## 🔧 Advanced Features

### Relayer Network
- Automated withdrawal processing
- Gas abstraction for enhanced privacy
- Multiple relayer redundancy
- Custom relayer support

### Performance Optimizations
- Server-side stats caching (<100ms load time)
- Event pre-caching system
- PulseScan API integration
- Optimized contract interactions

## 🤝 Contributing

We welcome contributions to zkPULSE! Please follow these steps:

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/YourFeature`)
3. Commit your changes (`git commit -m 'Add YourFeature'`)
4. Push to the branch (`git push origin feature/YourFeature`)
5. Open a Pull Request

Please ensure:
- Code follows existing style conventions
- All tests pass
- No sensitive data in commits
- Clear commit messages

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## ⚠️ Security

### Audit Status
- Core contracts based on audited Tornado Cash codebase
- Additional audits pending

### Best Practices
- Always verify contract addresses
- Never share your note/proof
- Use VPN for additional privacy
- Wait before withdrawing for larger anonymity set

### Bug Bounty
Coming soon - Details at [zkpulse.io/security](https://zkpulse.io/security)

### Security Contact
security@zkpulse.io

**IMPORTANT**: This is experimental software. Use at your own risk.

## 🔗 Official Links

- **Website**: [https://zkpulse.io](https://zkpulse.io)
- **GitHub**: [https://github.com/proestever/zkPULSE_OFFICIAL](https://github.com/proestever/zkPULSE_OFFICIAL)
- **Documentation**: [https://docs.zkpulse.io](https://docs.zkpulse.io)
- **Twitter**: [@zkpulse](https://twitter.com/zkpulse)
- **Telegram**: [t.me/zkpulse](https://t.me/zkpulse)
- **Discord**: [discord.gg/zkpulse](https://discord.gg/zkpulse)

## 🙏 Acknowledgments

- Built on cryptographic foundations of Tornado Cash
- Powered by PulseChain ecosystem
- Community-driven development
- Special thanks to all contributors

---

<div align="center">
  <h3>🌀 zkPULSE - Privacy for PulseChain 🌀</h3>
  <p>Made with 💚 by the zkPULSE Team</p>

  <p>
    <a href="https://zkpulse.io">Website</a> •
    <a href="https://github.com/proestever/zkPULSE_OFFICIAL">GitHub</a> •
    <a href="https://twitter.com/zkpulse">Twitter</a>
  </p>
</div>