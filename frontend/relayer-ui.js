// Relayer UI Component
// This component handles relayer selection and display in the withdrawal interface

// Initialize relayer UI
async function initRelayerUI() {
    // Add relayer toggle to withdrawal section
    const withdrawSection = document.querySelector('.withdraw-section');
    if (!withdrawSection) return;

    // Create relayer UI container
    const relayerContainer = document.createElement('div');
    relayerContainer.className = 'relayer-container';
    relayerContainer.innerHTML = `
        <div class="relayer-toggle">
            <label class="switch">
                <input type="checkbox" id="useRelayer" onchange="toggleRelayer()">
                <span class="slider round"></span>
            </label>
            <span class="relayer-label">Use Relayer (Privacy Enhanced)</span>
            <span class="info-icon" title="Relayers submit your withdrawal transaction for you, protecting your IP address and ensuring the recipient address has no direct connection to your wallet">ℹ️</span>
        </div>
        
        <div id="relayerOptions" class="relayer-options" style="display: none;">
            <div class="relayer-selection">
                <label>Select Relayer:</label>
                <select id="relayerSelect" onchange="updateRelayerInfo()">
                    <option value="">Loading relayers...</option>
                </select>
            </div>
            
            <div class="relayer-info" id="relayerInfo">
                <div class="info-row">
                    <span class="info-label">Fee:</span>
                    <span class="info-value" id="relayerFee">-</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Status:</span>
                    <span class="info-value" id="relayerStatus">-</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Gas Speed:</span>
                    <select id="gasSpeed" onchange="updateRelayerFee()">
                        <option value="slow">Slow (0.8x)</option>
                        <option value="standard" selected>Standard (1x)</option>
                        <option value="fast">Fast (1.3x)</option>
                        <option value="instant">Instant (2x)</option>
                    </select>
                </div>
                <div class="info-row">
                    <span class="info-label">You will receive:</span>
                    <span class="info-value highlight" id="netAmount">-</span>
                </div>
            </div>
            
            <div class="relayer-warning">
                ⚠️ Note: Using a relayer incurs a small fee but significantly enhances privacy
            </div>
        </div>
    `;

    // Insert after recipient input
    const recipientInput = document.querySelector('#recipientAddress');
    if (recipientInput && recipientInput.parentElement) {
        recipientInput.parentElement.after(relayerContainer);
    }

    // Add styles
    addRelayerStyles();
    
    // Load relayers
    await loadRelayers();
}

// Add CSS styles for relayer UI
function addRelayerStyles() {
    const style = document.createElement('style');
    style.textContent = `
        .relayer-container {
            margin: 20px 0;
            padding: 20px;
            background: rgba(255, 255, 255, 0.05);
            border-radius: 12px;
            border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .relayer-toggle {
            display: flex;
            align-items: center;
            gap: 15px;
            margin-bottom: 15px;
        }

        .switch {
            position: relative;
            display: inline-block;
            width: 50px;
            height: 24px;
        }

        .switch input {
            opacity: 0;
            width: 0;
            height: 0;
        }

        .slider {
            position: absolute;
            cursor: pointer;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: #ccc;
            transition: .4s;
        }

        .slider.round {
            border-radius: 24px;
        }

        .slider.round:before {
            border-radius: 50%;
        }

        .slider:before {
            position: absolute;
            content: "";
            height: 18px;
            width: 18px;
            left: 3px;
            bottom: 3px;
            background-color: white;
            transition: .4s;
        }

        input:checked + .slider {
            background-color: #4CAF50;
        }

        input:checked + .slider:before {
            transform: translateX(26px);
        }

        .relayer-label {
            font-weight: 500;
            color: #fff;
        }

        .info-icon {
            cursor: help;
            opacity: 0.7;
        }

        .relayer-options {
            animation: fadeIn 0.3s ease-in;
        }

        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
        }

        .relayer-selection {
            margin-bottom: 15px;
        }

        .relayer-selection label {
            display: block;
            margin-bottom: 8px;
            font-weight: 500;
            color: #ddd;
        }

        .relayer-selection select,
        #gasSpeed {
            width: 100%;
            padding: 10px;
            border-radius: 8px;
            border: 1px solid rgba(255, 255, 255, 0.2);
            background: rgba(255, 255, 255, 0.1);
            color: #fff;
            font-size: 14px;
        }

        .relayer-info {
            background: rgba(0, 0, 0, 0.2);
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 15px;
        }

        .info-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
        }

        .info-row:last-child {
            margin-bottom: 0;
            padding-top: 10px;
            border-top: 1px solid rgba(255, 255, 255, 0.1);
        }

        .info-label {
            color: #aaa;
            font-size: 14px;
        }

        .info-value {
            color: #fff;
            font-weight: 500;
        }

        .info-value.highlight {
            color: #4CAF50;
            font-size: 18px;
        }

        .relayer-warning {
            background: rgba(255, 193, 7, 0.1);
            border: 1px solid rgba(255, 193, 7, 0.3);
            padding: 10px;
            border-radius: 8px;
            color: #ffc107;
            font-size: 13px;
        }

        #gasSpeed {
            width: auto;
            min-width: 120px;
        }
    `;
    document.head.appendChild(style);
}

// Toggle relayer options
function toggleRelayer() {
    const useRelayer = document.getElementById('useRelayer').checked;
    const relayerOptions = document.getElementById('relayerOptions');
    
    if (useRelayer) {
        relayerOptions.style.display = 'block';
        updateRelayerFee();
    } else {
        relayerOptions.style.display = 'none';
    }
}

// Load available relayers
async function loadRelayers() {
    try {
        const denomination = getCurrentDenomination();
        const response = await fetch(`/api/relayers?denomination=${denomination}`);
        const relayers = await response.json();
        
        const select = document.getElementById('relayerSelect');
        select.innerHTML = '';
        
        if (relayers.length === 0) {
            select.innerHTML = '<option value="">No relayers available</option>';
            return;
        }
        
        relayers.forEach((relayer, index) => {
            const option = document.createElement('option');
            option.value = index; // Use index as value
            option.textContent = `${relayer.name} (${relayer.fee}% fee, ${relayer.rating}★)`;
            option.dataset.relayerIndex = index;
            option.dataset.relayerAddress = relayer.address;
            select.appendChild(option);
        });
        
        // Store relayers data
        window.availableRelayers = relayers;
        
        // Select first relayer by default
        if (relayers.length > 0) {
            select.value = 0; // Select first index
            updateRelayerInfo();
        }
    } catch (error) {
        console.error('Error loading relayers:', error);
    }
}

// Update relayer info display
function updateRelayerInfo() {
    const select = document.getElementById('relayerSelect');
    const selectedOption = select.options[select.selectedIndex];
    
    if (!selectedOption || !window.availableRelayers) return;
    
    const relayerIndex = selectedOption.dataset.relayerIndex;
    const relayer = window.availableRelayers[relayerIndex];
    
    if (relayer) {
        document.getElementById('relayerStatus').textContent = 
            relayer.status === 'active' ? '🟢 Active' : '🔴 Offline';
        updateRelayerFee();
    }
}

// Update relayer fee calculation
async function updateRelayerFee() {
    try {
        const denomination = getCurrentDenomination();
        const gasSpeed = document.getElementById('gasSpeed').value;
        
        const response = await fetch(`/api/relayer-fee?denomination=${denomination}&gasSpeed=${gasSpeed}`);
        const data = await response.json();
        
        // Fee comes back in wei, need to convert to PLS for display
        const feeInWei = BigInt(data.fee);
        const feeInPLS = Number(feeInWei / BigInt(10 ** 18));
        
        const denominationValue = getDenominationValue(denomination);
        const netAmount = denominationValue - feeInPLS;
        
        document.getElementById('relayerFee').textContent = 
            `${formatPLS(feeInPLS)} PLS (${data.feePercent}%)`;
        document.getElementById('netAmount').textContent = 
            `${formatPLS(netAmount)} PLS`;
    } catch (error) {
        console.error('Error calculating fee:', error);
    }
}

// Get current denomination from the UI
function getCurrentDenomination() {
    // This should match your existing denomination selection logic
    const amountSelect = document.querySelector('input[name="amount"]:checked');
    if (amountSelect) {
        return amountSelect.value;
    }
    return '1M'; // Default
}

// Get denomination value in PLS
function getDenominationValue(denomination) {
    const values = {
        '1': 1,
        '1M': 1000000,
        '10M': 10000000,
        '100M': 100000000,
        '1B': 1000000000
    };
    return values[denomination] || 1000000;
}

// Format PLS amount for display
function formatPLS(amount) {
    if (amount >= 1000000000) {
        return (amount / 1000000000).toFixed(2) + 'B';
    } else if (amount >= 1000000) {
        return (amount / 1000000).toFixed(2) + 'M';
    } else if (amount >= 1000) {
        return (amount / 1000).toFixed(2) + 'K';
    }
    return amount.toString();
}

// Get selected relayer info for withdrawal
function getSelectedRelayer() {
    const useRelayer = document.getElementById('useRelayer').checked;
    
    if (!useRelayer) {
        return null;
    }
    
    const select = document.getElementById('relayerSelect');
    const selectedOption = select.options[select.selectedIndex];
    
    if (!selectedOption || !window.availableRelayers) {
        return null;
    }
    
    const relayerIndex = selectedOption.dataset.relayerIndex;
    const relayer = window.availableRelayers[relayerIndex];
    
    return {
        address: relayer.address,
        url: relayer.url,
        fee: relayer.fee,
        gasSpeed: document.getElementById('gasSpeed').value
    };
}

// Export functions for use in main app
window.relayerUI = {
    init: initRelayerUI,
    getSelectedRelayer: getSelectedRelayer,
    updateRelayerFee: updateRelayerFee,
    loadRelayers: loadRelayers
};

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initRelayerUI);
} else {
    initRelayerUI();
}