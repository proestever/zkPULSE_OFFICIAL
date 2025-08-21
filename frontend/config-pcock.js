// PCOCK Token Tornado Configuration
const PCOCK_CONFIG = {
    token: {
        address: '0xc10A4Ed9b4042222d69ff0B374eddd47ed90fC1F',
        symbol: 'PCOCK',
        name: 'PulseChain Peacock',
        decimals: 18,
        logo: 'https://tokens.app.pulsex.com/images/tokens/0xc10A4Ed9b4042222d69ff0B374eddd47ed90fC1F.png'
    },
    
    pools: {
        '10K': {
            address: '0x5915Dc6C5a3D2F06DB93bc763334D2e8F5D1A8C3',
            denomination: '10000',
            decimals: 18,
            deploymentBlock: 22610000
        }
    },
    
    // Shared infrastructure (same as PLS pools)
    hasher: '0x5Aa1eE340a2E9F199f068DB35a855956429067cf',
    verifier: '0x165A378540d26F1f9BEB97F30670B5B8Eb3f8aD5',
    
    // ABI for ERC20 token interactions
    tokenABI: [
        {
            "inputs": [{"name": "owner", "type": "address"}],
            "name": "balanceOf",
            "outputs": [{"name": "", "type": "uint256"}],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [
                {"name": "spender", "type": "address"},
                {"name": "amount", "type": "uint256"}
            ],
            "name": "approve",
            "outputs": [{"name": "", "type": "bool"}],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "inputs": [
                {"name": "owner", "type": "address"},
                {"name": "spender", "type": "address"}
            ],
            "name": "allowance",
            "outputs": [{"name": "", "type": "uint256"}],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [],
            "name": "decimals",
            "outputs": [{"name": "", "type": "uint8"}],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [],
            "name": "symbol",
            "outputs": [{"name": "", "type": "string"}],
            "stateMutability": "view",
            "type": "function"
        }
    ],
    
    // ABI for ERC20 Tornado interactions
    tornadoABI: [
        {
            "inputs": [{"name": "_commitment", "type": "bytes32"}],
            "name": "deposit",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "inputs": [
                {"name": "_proof", "type": "bytes"},
                {"name": "_root", "type": "bytes32"},
                {"name": "_nullifierHash", "type": "bytes32"},
                {"name": "_recipient", "type": "address"},
                {"name": "_relayer", "type": "address"},
                {"name": "_fee", "type": "uint256"},
                {"name": "_refund", "type": "uint256"}
            ],
            "name": "withdraw",
            "outputs": [],
            "stateMutability": "payable",
            "type": "function"
        },
        {
            "inputs": [],
            "name": "denomination",
            "outputs": [{"name": "", "type": "uint256"}],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [],
            "name": "token",
            "outputs": [{"name": "", "type": "address"}],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "anonymous": false,
            "inputs": [
                {"indexed": true, "name": "commitment", "type": "bytes32"},
                {"indexed": false, "name": "leafIndex", "type": "uint32"},
                {"indexed": false, "name": "timestamp", "type": "uint256"}
            ],
            "name": "Deposit",
            "type": "event"
        },
        {
            "anonymous": false,
            "inputs": [
                {"indexed": false, "name": "to", "type": "address"},
                {"indexed": false, "name": "nullifierHash", "type": "bytes32"},
                {"indexed": true, "name": "relayer", "type": "address"},
                {"indexed": false, "name": "fee", "type": "uint256"}
            ],
            "name": "Withdrawal",
            "type": "event"
        }
    ]
};

// Export for use in frontend
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PCOCK_CONFIG;
}