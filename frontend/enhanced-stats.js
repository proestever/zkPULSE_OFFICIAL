// Enhanced statistics with active/withdrawn tracking and local storage
async function updateEnhancedStats() {
    console.log('Updating enhanced Tornado Cash statistics...');
    
    // Show loading state for all stats
    const denominations = ['1M', '10M', '100M', '1B', 'total'];
    denominations.forEach(denom => {
        const element = document.getElementById(`deposits-${denom}`);
        if (element) {
            element.innerHTML = '<span class="loading-dots">Loading</span>';
        }
    });
    
    // Initialize web3 if not already done
    if (typeof web3 === 'undefined' || !web3) {
        if (typeof Web3 !== 'undefined') {
            window.web3 = new Web3('https://rpc.pulsechain.com');
        } else {
            setTimeout(updateEnhancedStats, 2000);
            return;
        }
    }

    const contracts = {
        '1M': '0x65d1D748b4d513756cA179049227F6599D803594',
        '10M': '0x21349F435c703F933eBF2bb2A5aB2d716e00b205',
        '100M': '0x2443ccEef2D2803A97A12f5A9AA7db3BEc154B73',
        '1B': '0x282476B716146eAAbCfBDd339e527903deFD969b'
    };

    // Enhanced ABI with withdrawal events
    const enhancedABI = [
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
        },
        {
            "inputs": [],
            "name": "nextIndex",
            "outputs": [{"internalType": "uint32", "name": "", "type": "uint32"}],
            "stateMutability": "view",
            "type": "function"
        }
    ];

    // Get last known deposit index from localStorage
    const lastKnownDeposits = JSON.parse(localStorage.getItem('tornadoLastDeposits') || '{}');
    const newDeposits = {};
    
    let totalDeposits = 0;
    let totalWithdrawals = 0;
    let totalActive = 0;
    let totalBalance = 0;

    for (const [denom, address] of Object.entries(contracts)) {
        try {
            const contract = new web3.eth.Contract(enhancedABI, address);
            
            // Get total deposits
            let depositCount = 0;
            try {
                depositCount = await contract.methods.nextIndex().call();
                depositCount = parseInt(depositCount);
            } catch (e) {
                // Fallback to events
                const depositEvents = await contract.getPastEvents('Deposit', {
                    fromBlock: 0,
                    toBlock: 'latest'
                });
                depositCount = depositEvents.length;
            }
            
            // Get withdrawals count
            let withdrawalCount = 0;
            try {
                const withdrawalEvents = await contract.getPastEvents('Withdrawal', {
                    fromBlock: 0,
                    toBlock: 'latest'
                });
                withdrawalCount = withdrawalEvents.length;
            } catch (e) {
                console.warn(`Could not fetch withdrawals for ${denom}`);
            }
            
            // Calculate active deposits (not withdrawn)
            const activeDeposits = depositCount - withdrawalCount;
            
            // Check for new deposits since last visit
            const lastCount = lastKnownDeposits[denom] || 0;
            const newCount = depositCount - lastCount;
            newDeposits[denom] = depositCount;
            
            // Update totals
            totalDeposits += depositCount;
            totalWithdrawals += withdrawalCount;
            totalActive += activeDeposits;
            
            // Get contract balance
            const balance = await web3.eth.getBalance(address);
            const balanceInPLS = parseFloat(web3.utils.fromWei(balance, 'ether'));
            totalBalance += balanceInPLS;
            
            // Update UI for this denomination
            const depositsElement = document.getElementById(`deposits-${denom}`);
            if (depositsElement) {
                let statusText = `${depositCount} deposits`;
                if (newCount > 0 && lastCount > 0) {
                    statusText += ` <span style="color: #00ff88;">+${newCount} new</span>`;
                }
                depositsElement.innerHTML = statusText;
            }
            
            // Format balance
            let formattedBalance;
            if (balanceInPLS === 0) {
                formattedBalance = '0 PLS';
            } else if (denom === '1M') {
                formattedBalance = (balanceInPLS / 1000000).toFixed(2) + 'M PLS';
            } else if (denom === '10M') {
                formattedBalance = (balanceInPLS / 1000000).toFixed(1) + 'M PLS';
            } else if (denom === '100M') {
                formattedBalance = (balanceInPLS / 1000000).toFixed(0) + 'M PLS';
            } else if (denom === '1B') {
                formattedBalance = (balanceInPLS / 1000000000).toFixed(2) + 'B PLS';
            }
            
            const balanceElement = document.getElementById(`balance-${denom}`);
            if (balanceElement) {
                balanceElement.textContent = formattedBalance;
            }
            
            console.log(`${denom}: ${activeDeposits} active, ${depositCount} total, ${withdrawalCount} withdrawn`);
            
        } catch (error) {
            console.error(`Error fetching stats for ${denom}:`, error);
        }
    }

    // Update totals
    const totalDepositsElement = document.getElementById('deposits-total');
    if (totalDepositsElement) {
        let totalText = `${totalDeposits} total deposits`;
        totalDepositsElement.innerHTML = totalText;
    }
    
    // Format total balance
    let formattedTotal;
    if (totalBalance >= 1000000000) {
        formattedTotal = (totalBalance / 1000000000).toFixed(2) + 'B PLS';
    } else if (totalBalance >= 1000000) {
        formattedTotal = (totalBalance / 1000000).toFixed(2) + 'M PLS';
    } else {
        formattedTotal = totalBalance.toFixed(2) + ' PLS';
    }
    
    const totalBalanceElement = document.getElementById('balance-total');
    if (totalBalanceElement) {
        totalBalanceElement.textContent = formattedTotal;
    }
    
    // Save current deposit counts to localStorage
    localStorage.setItem('tornadoLastDeposits', JSON.stringify(newDeposits));
    
    // Show notification if there are new deposits - DISABLED
    // const totalNewDeposits = Object.values(newDeposits).reduce((a, b) => a + b, 0) - 
    //                          Object.values(lastKnownDeposits).reduce((a, b) => a + b, 0);
    // 
    // if (totalNewDeposits > 0 && Object.keys(lastKnownDeposits).length > 0) {
    //     showNewDepositsNotification(totalNewDeposits);
    // }
}

// Show notification for new deposits
function showNewDepositsNotification(count) {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, rgba(0, 255, 65, 0.2) 0%, rgba(0, 184, 47, 0.2) 100%);
        border: 2px solid #00ff88;
        border-radius: 10px;
        padding: 15px 20px;
        color: #00ff88;
        font-weight: 600;
        z-index: 10000;
        animation: slideIn 0.5s ease;
    `;
    notification.innerHTML = `🎉 ${count} new deposit${count > 1 ? 's' : ''} since your last visit!`;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.5s ease';
        setTimeout(() => notification.remove(), 500);
    }, 5000);
}

// Add CSS animations
if (!document.getElementById('enhanced-stats-styles')) {
    const style = document.createElement('style');
    style.id = 'enhanced-stats-styles';
    style.innerHTML = `
        @keyframes slideIn {
            from { transform: translateX(400px); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(400px); opacity: 0; }
        }
    `;
    document.head.appendChild(style);
}

// Replace the old updateAllStats with enhanced version
window.updateAllStats = updateEnhancedStats;

// Initialize on page load
window.addEventListener('load', () => {
    setTimeout(() => {
        console.log('Starting enhanced stats updater...');
        updateEnhancedStats();
        // Refresh every 30 seconds
        setInterval(updateEnhancedStats, 30000);
    }, 2000);
});