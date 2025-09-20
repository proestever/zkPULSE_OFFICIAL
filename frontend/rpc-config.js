const dotenv = require('dotenv');
dotenv.config();

// PulseChain RPC endpoints - Using working public RPCs
const RPC_ENDPOINTS = {
    primary: [
        'https://rpc.pulsechain.com',        // Primary public RPC
        'https://pulsechain-rpc.publicnode.com',
        'https://rpc-pulsechain.g4mm4.io',
        'https://rpc.gigatheminter.com'      // Your RPC as fallback
    ],
    websocket: [
        'wss://ws.pulsechain.com',           // Primary WebSocket
        'wss://pulsechain-rpc.publicnode.com',
        'wss://rpc-pulsechain.g4mm4.io',
        'wss://rpc.gigatheminter.com:8443'     // Your WebSocket as fallback
    ]
};

// Test an RPC endpoint
async function testRpcEndpoint(url) {
    const { Web3 } = require('web3');
    try {
        const provider = url.startsWith('ws')
            ? new Web3.providers.WebsocketProvider(url, {
                reconnect: {
                    auto: true,
                    delay: 5000,
                    maxAttempts: 5,
                    onTimeout: false
                },
                timeout: 30000
            })
            : new Web3.providers.HttpProvider(url, {
                timeout: 10000
            });

        const web3 = new Web3(provider);
        const blockNumber = await web3.eth.getBlockNumber();
        console.log(`✅ RPC endpoint ${url} is working (block: ${blockNumber})`);

        // Clean up WebSocket connection
        if (url.startsWith('ws') && provider.disconnect) {
            provider.disconnect();
        }

        return { success: true, url, blockNumber };
    } catch (error) {
        console.log(`❌ RPC endpoint ${url} failed:`, error.message);
        return { success: false, url, error: error.message };
    }
}

// Find a working RPC endpoint
async function findWorkingRpcEndpoint(isWebSocket = false) {
    const endpoints = isWebSocket ? RPC_ENDPOINTS.websocket : RPC_ENDPOINTS.primary;

    // Check if environment variable is set
    const envUrl = isWebSocket ? process.env.WSS_URL : process.env.RPC_URL;
    if (envUrl) {
        const result = await testRpcEndpoint(envUrl);
        if (result.success) {
            return envUrl;
        }
        console.log(`Environment RPC URL failed, trying alternatives...`);
    }

    // Test each endpoint
    for (const url of endpoints) {
        const result = await testRpcEndpoint(url);
        if (result.success) {
            return url;
        }
    }

    throw new Error(`No working ${isWebSocket ? 'WebSocket' : 'HTTP'} RPC endpoints found`);
}

// Get Web3 instance with fallback
async function getWeb3Instance(preferWebSocket = false) {
    const { Web3 } = require('web3');

    // Try HTTP first (more reliable for queries)
    try {
        const httpUrl = await findWorkingRpcEndpoint(false);
        console.log(`Using HTTP RPC: ${httpUrl}`);
        return new Web3(new Web3.providers.HttpProvider(httpUrl, {
            timeout: 30000
        }));
    } catch (httpError) {
        console.log('HTTP RPC failed, trying WebSocket...');
    }

    // Fallback to WebSocket if HTTP fails
    try {
        const wsUrl = await findWorkingRpcEndpoint(true);
        console.log(`Using WebSocket RPC: ${wsUrl}`);
        return new Web3(new Web3.providers.WebsocketProvider(wsUrl, {
            reconnect: {
                auto: true,
                delay: 5000,
                maxAttempts: 10,
                onTimeout: false
            },
            timeout: 30000,
            clientConfig: {
                keepalive: true,
                keepaliveInterval: 60000
            }
        }));
    } catch (wsError) {
        throw new Error('No working RPC endpoints found (tried both HTTP and WebSocket)');
    }
}

module.exports = {
    RPC_ENDPOINTS,
    testRpcEndpoint,
    findWorkingRpcEndpoint,
    getWeb3Instance
};
