let web3;
let userAccount;
let selectedDenomination = null;
let currentTab = 'deposit';
let currentBottomTab = null; // No tab active by default
let isTransactionPending = false; // Prevent double transactions

// Initialize app
window.addEventListener('load', async () => {
    await initWeb3();
    updateStats();
    
    // Initialize deposit tracker UI
    if (window.depositTracker) {
        window.depositTracker.updateUI();
    }
    
    // Also call the new stats updater if it exists
    if (typeof updateAllStats === 'function') {
        setTimeout(updateAllStats, 1000);
    }
    setInterval(updateStats, 30000);
});

async function initWeb3() {
    if (typeof window.ethereum !== 'undefined') {
        web3 = new Web3(window.ethereum);
        
        // Don't auto-connect, wait for user to click connect
        updateUI();
    } else {
        showMessage('Please install MetaMask or another Web3 wallet', 'warning');
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
            
            // Add balance below address
            buttonText.innerHTML = `
                <div>${userAccount.substring(0, 6)}...${userAccount.substring(38)}</div>
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
    
    if (userAccount) {
        withdrawBtn.disabled = false;
        withdrawBtn.textContent = 'Withdraw';
    } else {
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
        } else if (typeof updateStats === 'function') {
            updateStats();
        }
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
        
        // Generate commitment using API (no wallet tracking for privacy)
        const depositData = await window.createDepositViaAPI(null, selectedDenomination);
        
        // Note is already generated and saved server-side!
        const note = depositData.note;
        console.log('Note generated and saved server-side:', note ? note.substring(0, 50) + '...' : 'none');
        
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
        
        console.log('Deposit data:', { commitment: depositData.commitment });
        
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
        
        console.log('Deposit transaction:', tx);
        
        // No server tracking - everything stays local for privacy
        
        // Note already exists from server generation, just use it
        
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
        
        updateStats();
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

// Check for pending deposits from server
async function checkPendingDeposits() {
    if (!userAccount) return;
    
    try {
        const pending = await getPendingDeposits(userAccount);
        
        if (pending.length > 0) {
            // Show recovery UI for server-stored deposits
            showServerPendingDeposits(pending);
        }
    } catch (error) {
        console.error('Error checking pending deposits:', error);
    }
}

// Show pending deposits from server
function showServerPendingDeposits(deposits) {
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
                You have ${deposits.length} deposit(s) saved on the server that haven't been completed.
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
                            <button onclick="copyServerNote('${d.note}')" style="
                                background: rgba(10, 10, 10, 0.7);
                                color: #ffc107;
                                border: 1px solid #ffc107;
                                padding: 5px 10px;
                                border-radius: 5px;
                                cursor: pointer;
                                font-size: 12px;
                                margin-right: 5px;
                            ">Copy Note</button>
                            <button onclick="saveServerNote('${d.note}', '${d.amount}')" style="
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
            <button onclick="dismissServerRecovery()" style="
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

// Helper functions for server recovery
window.copyServerNote = function(note) {
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

window.saveServerNote = function(note, amount) {
    const blob = new Blob([note], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tornado-recovery-${amount}-${Date.now()}.txt`;
    a.click();
};

window.dismissServerRecovery = function() {
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
        
        // Update stats
        updateStats();
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
                    console.log('Different wallet connected than last session');
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
            console.log('Could not auto-reconnect wallet:', error);
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