let web3;
let userAccount;
let selectedDenomination = null;
let currentTab = 'deposit';
let currentBottomTab = null; // No tab active by default
let isTransactionPending = false; // Prevent double transactions

// Initialize app
window.addEventListener('load', async () => {
    await initWeb3();
    
    // Initialize deposit tracker UI
    if (window.depositTracker) {
        window.depositTracker.updateUI();
    }
    
    // Stats are initialized by enhanced-stats.js automatically
    // No need to call updateStats here
    
    // Update burned tokens display
    updateBurnedTokens();
    
    // Removed duplicate stats interval - handled by enhanced-stats.js
    setInterval(updateBurnedTokens, 300000); // Update burned tokens every 5 minutes
});

async function initWeb3() {
    try {
        // Handle multiple wallet extensions gracefully
        if (typeof window.ethereum !== 'undefined') {
            web3 = new Web3(window.ethereum);
            
            // Don't auto-connect, wait for user to click connect
            updateUI();
        } else {
            showMessage('Please install MetaMask or another Web3 wallet', 'warning');
        }
    } catch (error) {
        // Handle conflicts from multiple wallet extensions
        console.warn('Wallet initialization error (possibly multiple wallets installed):', error.message);
        if (window.ethereum) {
            // Try to use ethereum object even if there was an error
            web3 = new Web3(window.ethereum);
            updateUI();
        } else {
            showMessage('Wallet conflict detected. Please disable extra wallet extensions.', 'warning');
        }
    }
}

// Connect wallet function
async function connectWallet() {
    if (typeof window.ethereum === 'undefined') {
        showMessage('Please install MetaMask or another Web3 wallet', 'warning');
        return;
    }
    
    try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        userAccount = accounts[0];
        
        // Save wallet connection state
        localStorage.setItem('walletConnected', 'true');
        localStorage.setItem('lastWalletAddress', userAccount);
        
        const chainId = await web3.eth.getChainId();
        await checkNetwork(chainId);
        
        // Update wallet button
        updateWalletButton();
        
        window.ethereum.on('accountsChanged', (accounts) => {
            if (accounts.length === 0) {
                userAccount = null;
                showMessage('Wallet disconnected', 'warning');
            } else {
                userAccount = accounts[0];
                showMessage('Wallet address changed', 'success');
            }
            updateWalletButton();
            updateUI();
        });
            
            window.ethereum.on('chainChanged', (chainId) => {
                window.location.reload();
            });
            
            updateUI();
            
            // No server checking - everything is local for privacy
        } catch (error) {
            console.error('User denied account access:', error);
            showMessage('Please connect your wallet to continue', 'warning');
        }
}

// Disconnect wallet function
async function disconnectWallet() {
    userAccount = null;
    // Clear wallet persistence
    localStorage.removeItem('walletConnected');
    localStorage.removeItem('lastWalletAddress');
    updateWalletButton();
    updateUI();
    showMessage('Wallet disconnected', 'info');
}

// Toggle wallet connect/disconnect
function toggleWallet() {
    if (userAccount) {
        disconnectWallet();
    } else {
        connectWallet();
    }
}

// Update wallet button display
async function updateWalletButton() {
    const button = document.getElementById('walletButton');
    const buttonText = document.getElementById('walletButtonText');
    
    if (userAccount) {
        button.classList.add('connected');
        buttonText.innerHTML = `${userAccount.substring(0, 6)}...${userAccount.substring(38)}`;
        
        // Fetch and display balance
        try {
            const balance = await web3.eth.getBalance(userAccount);
            const balanceInPLS = parseFloat(web3.utils.fromWei(balance, 'ether'));
            const formattedBalance = balanceInPLS.toLocaleString('en-US', { 
                minimumFractionDigits: 2, 
                maximumFractionDigits: 4 
            });
            
            // Add balance below address with green dot
            buttonText.innerHTML = `
                <div><span style="display: inline-block; width: 8px; height: 8px; background: #00ff41; border-radius: 50%; margin-right: 8px; box-shadow: 0 0 10px #00ff41; animation: pulse 2s infinite;"></span>${userAccount.substring(0, 6)}...${userAccount.substring(38)}</div>
                <div style="font-size: 11px; color: #00ff41; margin-top: 2px;">${formattedBalance} PLS</div>
            `;
        } catch (error) {
            console.error('Error fetching balance:', error);
            buttonText.textContent = `${userAccount.substring(0, 6)}...${userAccount.substring(38)}`;
        }
    } else {
        button.classList.remove('connected');
        buttonText.textContent = 'Connect Wallet';
    }
}

async function checkNetwork(chainId) {
    if (parseInt(chainId) === CONFIG.chainId) {
        return true;
    } else {
        showMessage(`⚠️ Wrong network! Please switch to ${CONFIG.chainName}`, 'warning');
        
        try {
            await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: '0x' + CONFIG.chainId.toString(16) }],
            });
        } catch (switchError) {
            if (switchError.code === 4902) {
                try {
                    await window.ethereum.request({
                        method: 'wallet_addEthereumChain',
                        params: [{
                            chainId: '0x' + CONFIG.chainId.toString(16),
                            chainName: CONFIG.chainName,
                            nativeCurrency: CONFIG.currency,
                            rpcUrls: [CONFIG.rpcUrl],
                            blockExplorerUrls: [CONFIG.explorerUrl]
                        }],
                    });
                } catch (addError) {
                    console.error('Failed to add network:', addError);
                }
            }
        }
        return false;
    }
}

function updateUI() {
    const depositBtn = document.getElementById('depositBtn');
    const withdrawBtn = document.getElementById('withdrawBtn');
    
    if (userAccount && selectedDenomination) {
        depositBtn.disabled = false;
        const displayName = CONFIG.contracts[selectedDenomination].displayName;
        depositBtn.textContent = `Deposit ${displayName}`;
    } else if (userAccount) {
        depositBtn.disabled = true;
        depositBtn.textContent = 'Select an amount';
    } else {
        depositBtn.disabled = true;
        depositBtn.textContent = 'Connect Wallet First';
    }
    
    // Check if relayer is enabled - if so, no wallet needed for withdrawal
    const useRelayer = document.getElementById('useRelayer');
    const isRelayerEnabled = useRelayer && useRelayer.checked;
    
    if (isRelayerEnabled) {
        // Relayer mode - no wallet needed
        withdrawBtn.disabled = false;
        withdrawBtn.textContent = 'Withdraw (via Relayer)';
    } else if (userAccount) {
        // Direct withdrawal - wallet connected
        withdrawBtn.disabled = false;
        withdrawBtn.textContent = 'Withdraw';
    } else {
        // Direct withdrawal - wallet not connected
        withdrawBtn.disabled = true;
        withdrawBtn.textContent = 'Connect Wallet First';
    }
}

function switchTab(tab) {
    currentTab = tab;
    const tabs = document.querySelectorAll('.tab');
    tabs.forEach(t => t.classList.remove('active'));
    
    if (tab === 'deposit') {
        tabs[0].classList.add('active');
        document.getElementById('depositTab').classList.remove('hidden');
        document.getElementById('withdrawTab').classList.add('hidden');
    } else {
        tabs[1].classList.add('active');
        document.getElementById('depositTab').classList.add('hidden');
        document.getElementById('withdrawTab').classList.remove('hidden');
    }
    
    clearMessages();
}

function switchBottomTab(tab) {
    const tabs = document.querySelectorAll('.bottom-tab');
    const historyTab = document.getElementById('historyTab');
    const statsTab = document.getElementById('statsTab');
    
    // If clicking the same tab, toggle it off
    if (currentBottomTab === tab) {
        currentBottomTab = null;
        tabs[0].classList.remove('active');
        tabs[1].classList.remove('active');
        historyTab.classList.add('hidden');
        statsTab.classList.add('hidden');
        return;
    }
    
    currentBottomTab = tab;
    tabs[0].classList.remove('active');
    tabs[1].classList.remove('active');
    
    if (tab === 'history') {
        tabs[0].classList.add('active');
        historyTab.classList.remove('hidden');
        statsTab.classList.add('hidden');
        
        // Update UI when showing history
        if (window.depositTracker) {
            window.depositTracker.updateUI();
        }
    } else {
        tabs[1].classList.add('active');
        historyTab.classList.add('hidden');
        statsTab.classList.remove('hidden');
        
        // Update stats when showing stats tab
        if (typeof displayPLSStats === 'function') {
            displayPLSStats();
        }
        // Stats updates handled by enhanced-stats.js scheduled interval
    }
}

function selectDenomination(denom) {
    selectedDenomination = denom;
    
    const cards = document.querySelectorAll('.denomination-card');
    cards.forEach(card => card.classList.remove('selected'));
    
    // Find and select the card for this denomination
    cards.forEach(card => {
        const amount = card.querySelector('.denomination-amount').textContent;
        if ((denom === '1' && amount === '1') ||
            (denom === '1M' && amount === '1M') ||
            (denom === '10M' && amount === '10M') ||
            (denom === '100M' && amount === '100M') ||
            (denom === '1B' && amount === '1B')) {
            card.classList.add('selected');
        }
    });
    
    updateUI();
}

async function deposit() {
    if (!userAccount || !selectedDenomination) return;
    
    // Prevent double transactions
    if (isTransactionPending) {
        showError('Transaction already in progress. Please wait...');
        return;
    }
    
    let pendingId = null;
    const depositBtn = document.getElementById('depositBtn');
    const originalBtnText = depositBtn.innerText;
    
    try {
        isTransactionPending = true;
        depositBtn.disabled = true;
        depositBtn.innerText = 'Transaction Pending...';
        
        clearMessages();
        showLoading(true, 'Generating deposit commitment...');
        
        const contractInfo = CONFIG.contracts[selectedDenomination];
        const contract = new web3.eth.Contract(CONFIG.tornadoABI, contractInfo.address);
        
        // Generate commitment using server's Pedersen hash (server doesn't store anything)
        // The server is needed for the cryptographic Pedersen hash that matches the contract
        const depositData = await window.createDepositViaAPI(null, selectedDenomination);
        const note = depositData.note;
        
        // Save to localStorage immediately for recovery
        const deposits = JSON.parse(localStorage.getItem('zkpulse_deposits') || '[]');
        deposits.push({
            note: note,
            amount: selectedDenomination,
            timestamp: Date.now(),
            commitment: depositData.commitment,
            status: 'pending'
        });
        localStorage.setItem('zkpulse_deposits', JSON.stringify(deposits));
        
        // Deposit generated (server computes hash but stores nothing)
        
        // Get deposit amount and calculate fee
        const amount = web3.utils.toWei(contractInfo.amount, 'ether');
        const feeAmount = BigInt(amount) * BigInt(5) / BigInt(1000); // 0.5% fee
        const totalAmount = BigInt(amount) + feeAmount;
        
        // zkPULSERouter contract address (fees go to BuyAndBurn)
        const ROUTER_ADDRESS = '0x48dad12eC79a666188d3Ca6a3FF3B6231B42e848';
        
        // Router ABI (only the function we need)
        const routerABI = [{
            "inputs": [
                {"name": "_tornado", "type": "address"},
                {"name": "_commitment", "type": "bytes32"}
            ],
            "name": "depositWithFee",
            "outputs": [],
            "stateMutability": "payable",
            "type": "function"
        }];
        
        // Check balance for total amount (deposit + fee)
        const balance = await web3.eth.getBalance(userAccount);
        if (BigInt(balance) < totalAmount) {
            const totalNeeded = web3.utils.fromWei(totalAmount.toString(), 'ether');
            throw new Error(`Insufficient balance. You need ${totalNeeded} PLS (includes 0.5% fee) to make this deposit.`);
        }
        
        // Don't log sensitive data
        // Processing deposit...
        
        // Update loading message before wallet interaction
        showLoading(true, 'Processing deposit with fee (single transaction)...');
        
        // Use router to deposit with fee in a single transaction
        const router = new web3.eth.Contract(routerABI, ROUTER_ADDRESS);
        const tx = await router.methods.depositWithFee(
            contractInfo.address,  // Tornado pool address
            depositData.commitment  // Commitment
        ).send({
            from: userAccount,
            value: totalAmount.toString(),  // Total amount including fee
            gas: 3000000  // 3M gas limit ensures transaction never fails (users only pay for actual gas used)
        });
        
        // Deposit transaction completed
        
        // Update localStorage with transaction hash
        const savedDeposits = JSON.parse(localStorage.getItem('zkpulse_deposits') || '[]');
        const depositIndex = savedDeposits.findIndex(d => d.commitment === depositData.commitment);
        if (depositIndex !== -1) {
            savedDeposits[depositIndex].status = 'completed';
            savedDeposits[depositIndex].txHash = tx.transactionHash;
            localStorage.setItem('zkpulse_deposits', JSON.stringify(savedDeposits));
        }
        
        // Display note
        document.getElementById('noteText').textContent = note;
        document.getElementById('depositNote').classList.remove('hidden');
        
        // Automatically download the note as a text file
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `tornado-deposit-${selectedDenomination}-${timestamp}.txt`;
        const fileContent = `TORNADO CASH DEPOSIT RECEIPT
========================================

Amount: ${contractInfo.displayName}
Contract: ${contractInfo.address}
Network: PulseChain (Chain ID: ${CONFIG.chainId})
Transaction: ${tx.transactionHash}
Date: ${new Date().toISOString()}

YOUR WITHDRAWAL NOTE (KEEP THIS SAFE!):
========================================
${note}

IMPORTANT:
- Save this file in a secure location
- You need this note to withdraw your funds
- Do not share this note with anyone
- If you lose this note, your funds cannot be recovered

To withdraw:
1. Go to http://localhost:8888
2. Click the "Withdraw" tab
3. Paste your note
4. Enter recipient address
5. Submit withdrawal

Explorer link:
${CONFIG.explorerUrl}/tx/${tx.transactionHash}
`;
        
        // Create and trigger download
        const blob = new Blob([fileContent], { type: 'text/plain' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        showMessage(`Successfully deposited ${contractInfo.displayName}! Your note has been downloaded as ${filename}`, 'success');
        
        // Fire deposit success event - this will trigger the deposit tracker to save it
        window.dispatchEvent(new CustomEvent('depositSuccess', {
            detail: {
                note: note,
                amount: contractInfo.displayName,
                contractAddress: contractInfo.address,
                transactionHash: tx.transactionHash,
                commitment: depositData.commitment,
                recipient: userAccount
            }
        }));
        
        // Stats update handled by scheduled interval (every 5 mins)
        updateWalletButton(); // Update balance after deposit
        
    } catch (error) {
        console.error('Deposit error:', error);
        showMessage(`Deposit failed: ${error.message}`, 'warning');
        
        // Check if there are any pending deposits on server to recover
        checkPendingDeposits();
    } finally {
        showLoading(false);
        isTransactionPending = false;
        depositBtn.disabled = false;
        depositBtn.innerText = originalBtnText;
    }
}

// Check for pending deposits from localStorage
function checkPendingDeposits() {
    if (!userAccount) return;
    
    try {
        const deposits = JSON.parse(localStorage.getItem('zkpulse_deposits') || '[]');
        const pending = deposits.filter(d => d.status === 'pending');
        
        if (pending.length > 0) {
            // Show recovery UI for locally-stored deposits
            showLocalPendingDeposits(pending);
        }
    } catch (error) {
        console.error('Error checking pending deposits:', error);
    }
}

// Show pending deposits from localStorage
function showLocalPendingDeposits(deposits) {
    const recoveryHtml = `
        <div id="serverRecoveryAlert" style="
            position: fixed;
            top: 80px;
            right: 20px;
            background: rgba(10, 10, 10, 0.9);
            border: 2px solid #ffc107;
            border-radius: 10px;
            padding: 15px;
            max-width: 400px;
            z-index: 9999;
            backdrop-filter: blur(10px);
            box-shadow: 0 0 30px rgba(255, 193, 7, 0.5);
        ">
            <h4 style="color: #ffc107; margin: 0 0 10px 0;">⚠️ Pending Deposits Found!</h4>
            <p style="color: #e0e0e0; font-size: 14px; margin-bottom: 15px;">
                You have ${deposits.length} deposit(s) saved locally that haven't been completed.
            </p>
            <div style="max-height: 300px; overflow-y: auto;">
                ${deposits.map(d => `
                    <div style="
                        background: rgba(255, 193, 7, 0.1);
                        border: 1px solid rgba(255, 193, 7, 0.3);
                        border-radius: 5px;
                        padding: 10px;
                        margin-bottom: 10px;
                    ">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <span style="color: #ffc107; font-weight: 600;">${d.amount} PLS</span>
                            <span style="color: #a0a0a0; font-size: 12px;">${new Date(d.timestamp).toLocaleString()}</span>
                        </div>
                        <div style="margin-top: 8px;">
                            <button onclick="copyLocalNote('${d.note}')" style="
                                background: rgba(10, 10, 10, 0.7);
                                color: #ffc107;
                                border: 1px solid #ffc107;
                                padding: 5px 10px;
                                border-radius: 5px;
                                cursor: pointer;
                                font-size: 12px;
                                margin-right: 5px;
                            ">Copy Note</button>
                            <button onclick="saveLocalNote('${d.note}', '${d.amount}')" style="
                                background: rgba(10, 10, 10, 0.7);
                                color: #00ff41;
                                border: 1px solid #00ff41;
                                padding: 5px 10px;
                                border-radius: 5px;
                                cursor: pointer;
                                font-size: 12px;
                            ">Save to File</button>
                        </div>
                    </div>
                `).join('')}
            </div>
            <button onclick="dismissLocalRecovery()" style="
                width: 100%;
                margin-top: 10px;
                background: rgba(10, 10, 10, 0.7);
                color: #a0a0a0;
                border: 1px solid #3a3a3a;
                padding: 8px;
                border-radius: 5px;
                cursor: pointer;
                font-size: 12px;
            ">Dismiss</button>
        </div>
    `;
    
    // Remove existing alert if any
    const existing = document.getElementById('serverRecoveryAlert');
    if (existing) existing.remove();
    
    // Add to page
    document.body.insertAdjacentHTML('beforeend', recoveryHtml);
}

// Helper functions for local recovery
window.copyLocalNote = function(note) {
    navigator.clipboard.writeText(note);
    const btn = event.target;
    const originalText = btn.textContent;
    btn.textContent = 'Copied!';
    btn.style.background = 'rgba(0, 255, 65, 0.2)';
    setTimeout(() => {
        btn.textContent = originalText;
        btn.style.background = 'rgba(10, 10, 10, 0.7)';
    }, 2000);
};

window.saveLocalNote = function(note, amount) {
    const blob = new Blob([note], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tornado-recovery-${amount}-${Date.now()}.txt`;
    a.click();
};

window.dismissLocalRecovery = function() {
    const alert = document.getElementById('serverRecoveryAlert');
    if (alert) alert.remove();
};

async function withdraw() {
    const noteInput = document.getElementById('withdrawNote').value;
    const recipientAddress = document.getElementById('recipientAddress').value;
    
    if (!noteInput || !recipientAddress) {
        showMessage('Please enter both note and recipient address', 'warning');
        return;
    }
    
    if (!web3.utils.isAddress(recipientAddress)) {
        showMessage('Invalid recipient address', 'warning');
        return;
    }
    
    // Prevent double transactions
    if (isTransactionPending) {
        showError('Transaction already in progress. Please wait...');
        return;
    }
    
    const withdrawBtn = document.getElementById('withdrawBtn');
    const originalBtnText = withdrawBtn ? withdrawBtn.innerText : 'Withdraw';
    
    try {
        isTransactionPending = true;
        if (withdrawBtn) {
            withdrawBtn.disabled = true;
            withdrawBtn.innerText = 'Transaction Pending...';
        }
        
        clearMessages();
        
        // Step 1: Generate proof (before any wallet interaction)
        showLoading(true, 'Generating zero-knowledge proof...');
        const proofData = await window.withdrawalComplete.generateWithdrawalProof(noteInput, recipientAddress);
        
        // Step 2: Execute transaction (wallet interaction)
        showLoading(true, 'Processing transaction...');
        const result = await window.withdrawalComplete.executeWithdrawalTransaction(proofData, noteInput, recipientAddress);
        
        // Display success
        window.withdrawalComplete.displayWithdrawalSuccess(result);
        
        // Fire withdrawal success event - this will trigger the deposit tracker to mark it as withdrawn
        window.dispatchEvent(new CustomEvent('withdrawalSuccess', {
            detail: {
                note: noteInput,
                recipient: recipientAddress,
                transactionHash: result.transactionHash,
                amount: result.amount
            }
        }));
        
        // Clear inputs
        document.getElementById('withdrawNote').value = '';
        document.getElementById('recipientAddress').value = '';
        
        // Stats update handled by scheduled interval (every 5 mins)
        updateWalletButton(); // Update balance after withdrawal
        
    } catch (error) {
        console.error('Withdraw error:', error);
        showMessage(`Withdrawal failed: ${error.message}`, 'warning');
    } finally {
        showLoading(false);
        isTransactionPending = false;
        if (withdrawBtn) {
            withdrawBtn.disabled = false;
            withdrawBtn.innerText = originalBtnText;
        }
    }
}

function copyNote() {
    const noteText = document.getElementById('noteText').textContent;
    navigator.clipboard.writeText(noteText).then(() => {
        showMessage('Note copied to clipboard!', 'success');
    });
}

async function updateStats() {
    if (!web3) return;
    
    try {
        let totalDeposits = 0;
        let totalBalance = BigInt(0);
        
        for (const [key, contractInfo] of Object.entries(CONFIG.contracts)) {
            const contract = new web3.eth.Contract(CONFIG.tornadoABI, contractInfo.address);
            
            const nextIndex = await contract.methods.nextIndex().call();
            totalDeposits += parseInt(nextIndex);
            
            const balance = await web3.eth.getBalance(contractInfo.address);
            totalBalance += BigInt(balance);
        }
        
        document.getElementById('totalDeposits').textContent = totalDeposits;
        document.getElementById('contractBalance').textContent = 
            (Number(totalBalance) / 1e18).toLocaleString(undefined, { maximumFractionDigits: 0 });
        
    } catch (error) {
        console.error('Error updating stats:', error);
    }
}

function showLoading(show, message = 'Processing transaction...') {
    const loading = document.getElementById('loading');
    if (show) {
        loading.classList.remove('hidden');
        // Update the loading message if there's a text element
        const loadingText = loading.querySelector('p');
        if (loadingText) {
            loadingText.textContent = message;
        }
    } else {
        loading.classList.add('hidden');
    }
}

function showMessage(message, type) {
    const messagesDiv = document.getElementById('messages');
    messagesDiv.innerHTML = `<div class="${type}">${message}</div>`;
}

function clearMessages() {
    document.getElementById('messages').innerHTML = '';
}

// Track if there's an active deposit in progress
let hasActiveDeposit = false;

// Auto-reconnect wallet on page load
window.addEventListener('DOMContentLoaded', async () => {
    // Check if wallet was previously connected
    const wasConnected = localStorage.getItem('walletConnected');
    const lastAddress = localStorage.getItem('lastWalletAddress');
    
    if (wasConnected === 'true' && window.ethereum) {
        try {
            // Try to reconnect silently
            const accounts = await window.ethereum.request({ 
                method: 'eth_accounts' 
            });
            
            if (accounts.length > 0) {
                userAccount = accounts[0];
                
                // Check if it's the same address
                if (lastAddress && userAccount.toLowerCase() !== lastAddress.toLowerCase()) {
                    // Different wallet connected than last session
                }
                
                const chainId = await web3.eth.getChainId();
                await checkNetwork(chainId);
                updateWalletButton();
                updateUI();
                
                // Set up event listeners
                window.ethereum.on('accountsChanged', (accounts) => {
                    if (accounts.length === 0) {
                        userAccount = null;
                        localStorage.removeItem('walletConnected');
                        localStorage.removeItem('lastWalletAddress');
                        showMessage('Wallet disconnected', 'warning');
                    } else {
                        userAccount = accounts[0];
                        localStorage.setItem('lastWalletAddress', userAccount);
                        showMessage('Wallet address changed', 'success');
                    }
                    updateWalletButton();
                    updateUI();
                });
                
                window.ethereum.on('chainChanged', (chainId) => {
                    window.location.reload();
                });
            }
        } catch (error) {
            // Could not auto-reconnect wallet - this is normal
            localStorage.removeItem('walletConnected');
            localStorage.removeItem('lastWalletAddress');
        }
    }
});

// Warning before page unload if there's an active deposit
window.addEventListener('beforeunload', (event) => {
    // Check if there's a note displayed that hasn't been saved
    const noteDisplay = document.querySelector('.note-display');
    const hasUnsavedNote = noteDisplay && !noteDisplay.classList.contains('hidden');
    
    // Check if there's an active deposit in progress
    if (hasActiveDeposit || hasUnsavedNote) {
        const message = 'WARNING: You have an active deposit or unsaved note. If you leave now, you may lose your funds!';
        event.preventDefault();
        event.returnValue = message;
        return message;
    }
});

// Track deposit state
const originalDeposit = window.deposit;
window.deposit = async function() {
    hasActiveDeposit = true;
    try {
        await originalDeposit();
    } finally {
        // Reset after deposit completes or fails
        setTimeout(() => {
            hasActiveDeposit = false;
        }, 5000);
    }
};

// Function to fetch and display burned zkPULSE tokens using PulseScan API
async function updateBurnedTokens() {
    const burnedElement = document.getElementById('burnedAmount');
    if (!burnedElement) return;

    try {
        // Primary method: Use PulseScan API
        if (typeof burnedStatsPulseScan !== 'undefined') {
            const result = await burnedStatsPulseScan.getBurnedAmount();
            if (result && result.formatted) {
                burnedElement.textContent = result.formatted;
                return;
            }
        }

        // Fallback method: Try direct Web3 if available
        if (web3 && typeof burnedStatsPulseScan !== 'undefined') {
            const directBalance = await burnedStatsPulseScan.getDirectWeb3Balance(web3);
            if (directBalance > 0) {
                burnedElement.textContent = burnedStatsPulseScan.formatAmount(directBalance);
                return;
            }
        }

        // Last resort: Simple estimation based on protocol stats
        try {
            const response = await fetch('/api/stats');
            if (response.ok) {
                const stats = await response.json();
                const totalDeposits = stats.total.deposits || 0;
                // Estimate: 0.3% average fee, assuming some portion is burned
                const estimatedBurned = totalDeposits * 0.003 * 500000; // Conservative PLS estimate

                if (estimatedBurned > 0) {
                    if (estimatedBurned >= 1000000) {
                        burnedElement.textContent = (estimatedBurned / 1000000).toFixed(2) + 'M (est)';
                    } else if (estimatedBurned >= 1000) {
                        burnedElement.textContent = (estimatedBurned / 1000).toFixed(2) + 'K (est)';
                    } else {
                        burnedElement.textContent = estimatedBurned.toFixed(0) + ' (est)';
                    }
                } else {
                    burnedElement.textContent = '0';
                }
            } else {
                burnedElement.textContent = '0';
            }
        } catch (err) {
            burnedElement.textContent = '0';
        }
    } catch (error) {
        // Complete silent fail - show 0
        burnedElement.textContent = '0';
    }
}

