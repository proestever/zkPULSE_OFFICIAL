// Complete Configuration for all Tornado Cash denominations on PulseChain
const CONFIG = {
    // Network settings
    chainId: 369,
    chainName: 'PulseChain',
    rpcUrl: 'https://rpc.pulsechain.com',
    explorerUrl: 'https://otter.pulsechain.com',
    
    // All deployed contracts with Pedersen hashing and ZK proofs
    contracts: {
        '1': {
            address: '0xad04f4Eef94Efc3a698e70324b3F96e44703f70B',
            amount: '1',
            displayName: '1 PLS',
            badge: 'TEST'
        },
        '1M': {
            address: '0x65d1D748b4d513756cA179049227F6599D803594',
            amount: '1000000',
            displayName: '1M PLS',
            badge: null
        },
        '10M': {
            address: '0x21349F435c703F933eBF2bb2A5aB2d716e00b205',
            amount: '10000000',
            displayName: '10M PLS',
            badge: null
        },
        '100M': {
            address: '0x2443ccEef2D2803A97A12f5A9AA7db3BEc154B73',
            amount: '100000000',
            displayName: '100M PLS',
            badge: null
        },
        '1B': {
            address: '0x282476B716146eAAbCfBDd339e527903deFD969b',
            amount: '1000000000',
            displayName: '1B PLS',
            badge: 'MAX'
        }
    },
    
    // Supporting contracts
    hasher: '0xd5b22901019013cAFba598ddECE7810Ad2D7C5c6',
    verifier: '0x03A4d603d17EB5EA3Ef06B8eE7863fF8336a3065',
    
    // Contract ABI (same for all Tornado instances)
    tornadoABI: [
        {
            "inputs": [{"internalType": "bytes32", "name": "_commitment", "type": "bytes32"}],
            "name": "deposit",
            "outputs": [],
            "stateMutability": "payable",
            "type": "function"
        },
        {
            "inputs": [
                {"internalType": "bytes", "name": "_proof", "type": "bytes"},
                {"internalType": "bytes32", "name": "_root", "type": "bytes32"},
                {"internalType": "bytes32", "name": "_nullifierHash", "type": "bytes32"},
                {"internalType": "address payable", "name": "_recipient", "type": "address"},
                {"internalType": "address payable", "name": "_relayer", "type": "address"},
                {"internalType": "uint256", "name": "_fee", "type": "uint256"},
                {"internalType": "uint256", "name": "_refund", "type": "uint256"}
            ],
            "name": "withdraw",
            "outputs": [],
            "stateMutability": "payable",
            "type": "function"
        },
        {
            "anonymous": false,
            "inputs": [
                {"indexed": true, "internalType": "bytes32", "name": "commitment", "type": "bytes32"},
                {"indexed": false, "internalType": "uint32", "name": "leafIndex", "type": "uint32"},
                {"indexed": false, "internalType": "uint256", "name": "timestamp", "type": "uint256"}
            ],
            "name": "Deposit",
            "type": "event"
        },
        {
            "anonymous": false,
            "inputs": [
                {"indexed": false, "internalType": "address", "name": "to", "type": "address"},
                {"indexed": false, "internalType": "bytes32", "name": "nullifierHash", "type": "bytes32"},
                {"indexed": true, "internalType": "address", "name": "relayer", "type": "address"},
                {"indexed": false, "internalType": "uint256", "name": "fee", "type": "uint256"}
            ],
            "name": "Withdrawal",
            "type": "event"
        },
        {
            "inputs": [{"internalType": "bytes32", "name": "", "type": "bytes32"}],
            "name": "commitments",
            "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [],
            "name": "denomination",
            "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [],
            "name": "currentRootIndex",
            "outputs": [{"internalType": "uint32", "name": "", "type": "uint32"}],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [{"internalType": "bytes32", "name": "_root", "type": "bytes32"}],
            "name": "isKnownRoot",
            "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [{"internalType": "bytes32", "name": "_nullifierHash", "type": "bytes32"}],
            "name": "isSpent",
            "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
            "stateMutability": "view",
            "type": "function"
        }
    ]
};

// Make available globally
window.CONFIG = CONFIG;