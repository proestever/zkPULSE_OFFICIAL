// Enhanced app with token support (PLS and PCOCK)
let web3;
let userAccount = null;
let selectedDenomination = null;
let selectedToken = 'PLS'; // Default to PLS

// Token configurations
const TOKENS = {
    PLS: {
        symbol: 'PLS',
        name: 'PulseChain',
        address: null, // Native token
        decimals: 18,
        logo: 'https://tokens.app.pulsex.com/images/tokens/0xA1077a294dDE1B09bB078844df40758a5D0f9a27.png',
        isNative: true,
        pools: window.CONFIG // From config-all-denominations.js
    },
    PCOCK: {
        symbol: 'PCOCK',
        name: 'PulseChain Peacock',
        address: '0xc10A4Ed9b4042222d69ff0B374eddd47ed90fC1F',
        decimals: 18,
        logo: 'https://tokens.app.pulsex.com/images/tokens/0xc10A4Ed9b4042222d69ff0B374eddd47ed90fC1F.png',
        isNative: false,
        pools: {
            '10K': {
                address: '0x5915Dc6C5a3D2F06DB93bc763334D2e8F5D1A8C3',
                abi: window.PCOCK_CONFIG ? window.PCOCK_CONFIG.tornadoABI : null
            }
        }
    }
};

// Initialize token selector
function initializeTokenSelector() {
    // Add token selector to UI
    const tokenSelectorHTML = `
        <div style="text-align: center; margin-bottom: 20px;">
            <div style="display: inline-flex; gap: 10px; padding: 5px; background: rgba(10, 10, 10, 0.5); border-radius: 10px; border: 1px solid rgba(0, 255, 65, 0.2);">
                <button class="token-btn active" onclick="selectToken('PLS')" id="token-PLS" style="display: flex; align-items: center; gap: 8px; padding: 10px 20px; background: rgba(0, 255, 65, 0.1); border: 1px solid #00ff41; border-radius: 8px; color: #00ff41; cursor: pointer; transition: all 0.3s;">
                    <img src="${TOKENS.PLS.logo}" alt="PLS" style="width: 20px; height: 20px;">
                    PLS
                </button>
                <button class="token-btn" onclick="selectToken('PCOCK')" id="token-PCOCK" style="display: flex; align-items: center; gap: 8px; padding: 10px 20px; background: transparent; border: 1px solid rgba(0, 255, 65, 0.3); border-radius: 8px; color: #a0a0a0; cursor: pointer; transition: all 0.3s;">
                    <img src="${TOKENS.PCOCK.logo}" alt="PCOCK" style="width: 20px; height: 20px;">
                    PCOCK
                </button>
            </div>
        </div>
    `;
    
    // Insert token selector before denomination grid
    const depositTab = document.getElementById('depositTab');
    const denominationTitle = depositTab.querySelector('h3');
    denominationTitle.insertAdjacentHTML('beforebegin', tokenSelectorHTML);
}

// Select token function
function selectToken(token) {
    selectedToken = token;
    selectedDenomination = null; // Reset denomination
    
    // Update UI
    document.querySelectorAll('.token-btn').forEach(btn => {
        btn.classList.remove('active');
        btn.style.background = 'transparent';
        btn.style.borderColor = 'rgba(0, 255, 65, 0.3)';
        btn.style.color = '#a0a0a0';
    });
    
    const activeBtn = document.getElementById(`token-${token}`);
    activeBtn.classList.add('active');
    activeBtn.style.background = 'rgba(0, 255, 65, 0.1)';
    activeBtn.style.borderColor = '#00ff41';
    activeBtn.style.color = '#00ff41';
    
    // Update denomination cards
    updateDenominationCards();
    
    // Update balance display if connected
    if (userAccount) {
        updateBalanceDisplay();
    }
}

// Update denomination cards based on selected token
function updateDenominationCards() {
    const gridContainer = document.querySelector('.denomination-grid');
    const tokenConfig = TOKENS[selectedToken];
    
    if (selectedToken === 'PLS') {
        // Show PLS denominations
        gridContainer.innerHTML = `
            <div class="denomination-card" onclick="selectDenomination('1M')">
                <div class="denomination-amount">1M</div>
                <div class="denomination-label">PLS <img src="${tokenConfig.logo}" alt="PLS" class="pls-logo"></div>
            </div>
            <div class="denomination-card" onclick="selectDenomination('10M')">
                <div class="denomination-amount">10M</div>
                <div class="denomination-label">PLS <img src="${tokenConfig.logo}" alt="PLS" class="pls-logo"></div>
            </div>
            <div class="denomination-card" onclick="selectDenomination('100M')">
                <div class="denomination-amount">100M</div>
                <div class="denomination-label">PLS <img src="${tokenConfig.logo}" alt="PLS" class="pls-logo"></div>
            </div>
            <div class="denomination-card" onclick="selectDenomination('1B')">
                <div class="denomination-amount">1B</div>
                <div class="denomination-label">PLS <img src="${tokenConfig.logo}" alt="PLS" class="pls-logo"></div>
            </div>
        `;
    } else if (selectedToken === 'PCOCK') {
        // Show PCOCK denomination (only 10K available)
        gridContainer.innerHTML = `
            <div class="denomination-card" onclick="selectDenomination('10K')" style="grid-column: span 2;">
                <div class="denomination-amount">10K</div>
                <div class="denomination-label">PCOCK <img src="${tokenConfig.logo}" alt="PCOCK" class="pls-logo"></div>
            </div>
        `;
    }
}

// Update balance display
async function updateBalanceDisplay() {
    if (!userAccount || !web3) return;
    
    const tokenConfig = TOKENS[selectedToken];
    let balance;
    
    if (tokenConfig.isNative) {
        // Get PLS balance
        balance = await web3.eth.getBalance(userAccount);
        balance = web3.utils.fromWei(balance, 'ether');
    } else {
        // Get PCOCK balance
        const tokenABI = [
            {
                "inputs": [{"name": "account", "type": "address"}],
                "name": "balanceOf",
                "outputs": [{"name": "", "type": "uint256"}],
                "stateMutability": "view",
                "type": "function"
            }
        ];
        
        const tokenContract = new web3.eth.Contract(tokenABI, tokenConfig.address);
        const rawBalance = await tokenContract.methods.balanceOf(userAccount).call();
        balance = web3.utils.fromWei(rawBalance, 'ether');
    }
    
    // Display balance
    const balanceDisplay = document.getElementById('balanceDisplay');
    if (!balanceDisplay) {
        const walletBtn = document.getElementById('walletButton');
        walletBtn.insertAdjacentHTML('afterend', `
            <div id="balanceDisplay" style="position: fixed; top: 60px; right: 20px; background: rgba(10, 10, 10, 0.7); padding: 8px 16px; border-radius: 8px; border: 1px solid rgba(0, 255, 65, 0.2); color: #00ff41; font-size: 12px;">
                Balance: ${parseFloat(balance).toFixed(2)} ${tokenConfig.symbol}
            </div>
        `);
    } else {
        balanceDisplay.textContent = `Balance: ${parseFloat(balance).toFixed(2)} ${tokenConfig.symbol}`;
    }
}

// Override deposit function for token support
async function deposit() {
    if (!userAccount || !selectedDenomination) {
        showMessage('Please connect wallet and select an amount', 'error');
        return;
    }
    
    const tokenConfig = TOKENS[selectedToken];
    
    try {
        showLoading(true);
        
        if (tokenConfig.isNative) {
            // Handle PLS deposit (existing logic)
            await depositPLS();
        } else {
            // Handle PCOCK deposit
            await depositToken();
        }
        
    } catch (error) {
        console.error('Deposit error:', error);
        showMessage('Deposit failed: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

// Deposit PCOCK or other tokens
async function depositToken() {
    const tokenConfig = TOKENS[selectedToken];
    const poolConfig = tokenConfig.pools[selectedDenomination];
    
    if (!poolConfig) {
        showMessage('Invalid pool configuration', 'error');
        return;
    }
    
    // Token ABI for approval
    const tokenABI = [
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
        }
    ];
    
    // Tornado ABI for deposit
    const tornadoABI = [
        {
            "inputs": [{"name": "_commitment", "type": "bytes32"}],
            "name": "deposit",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        }
    ];
    
    const tokenContract = new web3.eth.Contract(tokenABI, tokenConfig.address);
    const tornadoContract = new web3.eth.Contract(tornadoABI, poolConfig.address);
    
    // Check denomination amount
    const amount = selectedDenomination === '10K' ? '10000' : '0';
    const amountWei = web3.utils.toWei(amount, 'ether');
    
    // Check allowance
    const allowance = await tokenContract.methods.allowance(userAccount, poolConfig.address).call();
    
    if (BigInt(allowance) < BigInt(amountWei)) {
        showMessage('Approving PCOCK spending...', 'info');
        
        // Approve token spending
        const approveTx = await tokenContract.methods.approve(poolConfig.address, amountWei).send({
            from: userAccount
        });
        
        console.log('Approval TX:', approveTx.transactionHash);
        showMessage('Approval successful! Now depositing...', 'success');
    }
    
    // Generate commitment
    const deposit = window.tornadoAPI.generateDeposit();
    const commitment = '0x' + deposit.commitment.toString(16).padStart(64, '0');
    
    // Make deposit
    const depositTx = await tornadoContract.methods.deposit(commitment).send({
        from: userAccount
    });
    
    console.log('Deposit TX:', depositTx.transactionHash);
    
    // Generate note
    const note = `tornado-${selectedToken.toLowerCase()}-${selectedDenomination.toLowerCase()}-369-${deposit.noteHex}`;
    
    // Save to tracker
    window.depositTracker.addDeposit({
        note: note,
        commitment: commitment,
        amount: selectedDenomination,
        token: selectedToken,
        timestamp: Date.now(),
        txHash: depositTx.transactionHash,
        contract: poolConfig.address
    });
    
    // Display note
    document.getElementById('noteText').textContent = note;
    document.getElementById('depositNote').classList.remove('hidden');
    
    showMessage(`Successfully deposited ${amount} ${selectedToken}! Save your note!`, 'success');
}

// Deposit PLS (existing function)
async function depositPLS() {
    // Use existing PLS deposit logic from app-complete.js
    const poolAddress = window.CONFIG[selectedDenomination];
    const denomination = window.CONFIG[selectedDenomination + '_AMOUNT'];
    
    const deposit = window.tornadoAPI.generateDeposit();
    const commitment = '0x' + deposit.commitment.toString(16).padStart(64, '0');
    
    const tx = await web3.eth.sendTransaction({
        from: userAccount,
        to: poolAddress,
        value: denomination,
        data: web3.eth.abi.encodeFunctionCall({
            name: 'deposit',
            type: 'function',
            inputs: [{type: 'bytes32', name: '_commitment'}]
        }, [commitment])
    });
    
    const note = `tornado-pls-${selectedDenomination.toLowerCase()}-369-${deposit.noteHex}`;
    
    window.depositTracker.addDeposit({
        note: note,
        commitment: commitment,
        amount: selectedDenomination,
        token: 'PLS',
        timestamp: Date.now(),
        txHash: tx.transactionHash,
        contract: poolAddress
    });
    
    document.getElementById('noteText').textContent = note;
    document.getElementById('depositNote').classList.remove('hidden');
    
    showMessage(`Successfully deposited ${selectedDenomination} PLS! Save your note!`, 'success');
}

// Initialize on page load
window.addEventListener('load', () => {
    initializeTokenSelector();
    
    // Override the existing selectDenomination function
    window.selectDenomination = function(denom) {
        selectedDenomination = denom;
        
        // Update UI
        document.querySelectorAll('.denomination-card').forEach(card => {
            card.classList.remove('selected');
        });
        event.currentTarget.classList.add('selected');
        
        // Update button
        updateDepositButton();
    };
    
    // Update deposit button based on selection
    window.updateDepositButton = function() {
        const btn = document.getElementById('depositBtn');
        if (!userAccount) {
            btn.textContent = 'Connect Wallet First';
            btn.disabled = true;
        } else if (!selectedDenomination) {
            btn.textContent = 'Select Amount';
            btn.disabled = true;
        } else {
            const tokenConfig = TOKENS[selectedToken];
            if (tokenConfig.isNative) {
                btn.textContent = `Deposit ${selectedDenomination} ${tokenConfig.symbol}`;
            } else {
                btn.textContent = `Deposit ${selectedDenomination} ${tokenConfig.symbol}`;
            }
            btn.disabled = false;
        }
    };
});

// Export for global access
window.selectToken = selectToken;
window.deposit = deposit;