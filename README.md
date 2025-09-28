# zkPULSE - Privacy Protocol for PulseChain

Zero-knowledge privacy protocol enabling anonymous transactions on PulseChain.

## Features

- Privacy-preserving transactions using zero-knowledge proofs
- Support for native PLS and ERC20 tokens
- Built-in relayer for enhanced anonymity
- Multiple denomination pools for flexible privacy options

## Project Structure

```
zkPULSE_OFFICIAL/
├── contracts/        # Smart contracts (Tornado-based privacy pools)
├── frontend/         # Web interface with unified server
├── build/           # Compiled contracts and circuits
├── branding/        # Brand assets
└── cache/           # Event cache directory
```

## Quick Start

### Prerequisites
- Node.js v16+
- npm or yarn

### Installation

1. Clone the repository
```bash
git clone [repository-url]
cd zkPULSE_OFFICIAL
```

2. Install dependencies
```bash
npm install
```

3. Configure environment
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Start the application
```bash
npm start
```

### Development

```bash
# Start development server
npm run dev

# Run production server
npm run production

# Pre-cache events
npm run precache
```

## Deployment

```bash
# Production deployment
npm run production
```

## Core Components

### Smart Contracts
- **zkPULSE Router**: Main routing contract for deposits/withdrawals
- **Tornado Pools**: Privacy pools with Merkle tree verification
- **Verifier**: Zero-knowledge proof verification

### Frontend
- Web3 integration for PulseChain
- Deposit and withdrawal interface
- Transaction history tracking
- Unified server with built-in relayer functionality
- Event caching for improved performance

## Security

This protocol uses battle-tested Tornado Cash circuits and contracts adapted for PulseChain. Always verify contract addresses and use at your own risk.

## License

MIT License - See LICENSE file for details