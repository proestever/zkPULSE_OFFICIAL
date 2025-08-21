const Web3 = require('web3').default || require('web3');

const RPC_URL = 'https://rpc.pulsechain.com';
const PCOCK_TORNADO = '0x5915Dc6C5a3D2F06DB93bc763334D2e8F5D1A8C3';
const COMMITMENT = '0x02e990c5f3a6e61efb53739715d1a32ea32a46a826b895af7c658f36ca1ac965';

async function checkEvents() {
    const web3 = new Web3(RPC_URL);
    
    const abi = [
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
            "inputs": [{"name": "_commitment", "type": "bytes32"}],
            "name": "commitments",
            "outputs": [{"name": "", "type": "bool"}],
            "stateMutability": "view",
            "type": "function"
        }
    ];
    
    const tornado = new web3.eth.Contract(abi, PCOCK_TORNADO);
    
    // Check commitment exists
    const exists = await tornado.methods.commitments(COMMITMENT).call();
    console.log('Commitment exists in contract:', exists);
    
    // Get latest block
    const latestBlock = await web3.eth.getBlockNumber();
    console.log('Latest block:', latestBlock);
    
    // Try different block ranges
    console.log('\nSearching for deposit events...');
    
    const ranges = [
        { from: 0, to: 'latest' },
        { from: 22600000, to: 'latest' },
        { from: 22610000, to: 'latest' },
        { from: latestBlock - 10000, to: 'latest' }
    ];
    
    for (const range of ranges) {
        console.log(`\nChecking blocks ${range.from} to ${range.to}`);
        try {
            const events = await tornado.getPastEvents('Deposit', {
                fromBlock: range.from,
                toBlock: range.to
            });
            
            console.log(`Found ${events.length} deposit events`);
            
            if (events.length > 0) {
                events.forEach((e, i) => {
                    console.log(`Event ${i}:`, {
                        commitment: e.returnValues.commitment,
                        leafIndex: e.returnValues.leafIndex,
                        block: e.blockNumber,
                        tx: e.transactionHash
                    });
                    
                    if (e.returnValues.commitment.toLowerCase() === COMMITMENT.toLowerCase()) {
                        console.log('✅ FOUND OUR DEPOSIT!');
                    }
                });
                break;
            }
        } catch (err) {
            console.log('Error:', err.message);
        }
    }
    
    // Try getting transaction that created the deposit
    console.log('\n=== Searching for deposit transaction ===');
    
    // The deposit was likely in a recent block, let's scan
    const depositMethod = '0xa98b1c41'; // deposit method ID
    
    for (let block = latestBlock; block > latestBlock - 100; block--) {
        const blockData = await web3.eth.getBlock(block, true);
        if (blockData && blockData.transactions) {
            for (const tx of blockData.transactions) {
                if (tx.to && tx.to.toLowerCase() === PCOCK_TORNADO.toLowerCase()) {
                    if (tx.input && tx.input.startsWith(depositMethod)) {
                        console.log('Found deposit tx:', tx.hash, 'in block', block);
                        
                        // Get receipt
                        const receipt = await web3.eth.getTransactionReceipt(tx.hash);
                        if (receipt.logs && receipt.logs.length > 0) {
                            for (const log of receipt.logs) {
                                if (log.topics && log.topics[0] === '0xa945e51eec50ab98c161376f0db4cf2aeba3ec92755fe2fcd388bdbbb80ff196') {
                                    // Deposit event
                                    const commitment = log.topics[1];
                                    if (commitment.toLowerCase() === COMMITMENT.toLowerCase()) {
                                        console.log('✅ FOUND DEPOSIT TRANSACTION!');
                                        console.log('Block:', block);
                                        console.log('Tx:', tx.hash);
                                        console.log('Leaf Index:', web3.utils.hexToNumber('0x' + log.data.slice(2, 66)));
                                        return { block, tx: tx.hash };
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

checkEvents().catch(console.error);