// Relayer-based withdrawal handler
// This replaces the direct contract call when using a relayer

async function executeRelayerWithdrawal(noteInput, recipientAddress) {
    try {
        // Step 1: Get relayer selection
        const relayerInfo = window.relayerUI ? window.relayerUI.getSelectedRelayer() : null;
        
        if (!relayerInfo || !relayerInfo.url) {
            throw new Error('No relayer selected or relayer URL not configured');
        }

        // Ensure we have the correct relayer address
        if (!relayerInfo.address || relayerInfo.address === '0x0000000000000000000000000000000000000000') {
            relayerInfo.address = '0x968DD9f833C58C0ADa629eF8f60180C7fEeF78d3'; // Your actual relayer address
        }

        console.log('Using relayer:', relayerInfo);
        console.log('Relayer URL:', relayerInfo.url);
        console.log('Full submission URL:', `${relayerInfo.url}/v1/tornadoWithdraw`);
        
        // Step 2: Generate proof with relayer fee
        showLoading(true, 'Generating zero-knowledge proof for relayer...');
        
        // Call the backend to generate proof with relayer parameters
        const proofResponse = await fetch('/api/withdraw', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                note: noteInput,
                recipient: recipientAddress,
                useRelayer: true,
                relayerAddress: relayerInfo.address
            })
        });

        if (!proofResponse.ok) {
            const error = await proofResponse.json();
            throw new Error(error.error || 'Failed to generate proof');
        }

        const proofData = await proofResponse.json();
        console.log('Proof generated for relayer submission');

        // Step 3: Submit to relayer (NO WALLET SIGNATURE REQUIRED)
        showLoading(true, 'Submitting to relayer (no signature required)...');

        console.log('Submitting to relayer at:', `${relayerInfo.url}/v1/tornadoWithdraw`);

        // Add timeout to prevent hanging
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minute timeout

        const relayerResponse = await fetch(`${relayerInfo.url}/v1/tornadoWithdraw`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                proof: proofData.proof,
                args: proofData.args,
                contract: proofData.contractAddress,
                denomination: getDenominationFromNote(noteInput)
            }),
            signal: controller.signal
        }).finally(() => clearTimeout(timeoutId));

        if (!relayerResponse.ok) {
            // Handle rate limiting specifically
            if (relayerResponse.status === 429) {
                const retryAfter = relayerResponse.headers.get('Retry-After') || '60';
                throw new Error(`Rate limit exceeded. Please wait ${retryAfter} seconds before trying again.`);
            }
            
            // Try to parse error response
            let errorMessage = 'Relayer submission failed';
            try {
                const error = await relayerResponse.json();
                errorMessage = error.error || error.message || errorMessage;
            } catch (e) {
                // If response is not JSON, use status text
                errorMessage = relayerResponse.statusText || errorMessage;
            }
            throw new Error(errorMessage);
        }

        const relayerResult = await relayerResponse.json();
        console.log('Relayer job created:', relayerResult.jobId);

        // Step 4: Monitor job status
        showLoading(true, 'Relayer processing transaction...');
        const finalResult = await monitorRelayerJob(relayerInfo.url, relayerResult.jobId);

        return {
            success: true,
            transactionHash: finalResult.txHash,
            relayerUsed: true,
            relayerAddress: relayerInfo.address,
            jobId: relayerResult.jobId
        };

    } catch (error) {
        console.error('Relayer withdrawal error:', error);
        throw error;
    }
}

// Monitor relayer job status
async function monitorRelayerJob(relayerUrl, jobId) {
    const maxAttempts = 60; // 60 attempts, 2 seconds each = 2 minutes max
    let attempts = 0;

    while (attempts < maxAttempts) {
        try {
            const response = await fetch(`${relayerUrl}/v1/jobs/${jobId}`);
            const jobStatus = await response.json();

            console.log(`Job ${jobId} status:`, jobStatus.status);

            if (jobStatus.status === 'completed') {
                return {
                    success: true,
                    txHash: jobStatus.txHash
                };
            } else if (jobStatus.status === 'failed') {
                console.error('Job failed with error:', jobStatus.error);
                // IMPORTANT: Return immediately on failure, don't continue the loop
                throw new Error(jobStatus.error || 'Relayer job failed');
            }

            // Wait 2 seconds before next check
            await new Promise(resolve => setTimeout(resolve, 2000));
            attempts++;

            // Update loading message
            if (attempts % 5 === 0) {
                showLoading(true, `Relayer processing... (${attempts * 2}s elapsed)`);
            }

        } catch (error) {
            console.error('Error checking job status:', error);
            // Re-throw the error immediately to stop the loop
            // This includes job failures and network errors
            throw error;
        }
    }

    throw new Error('Transaction processing timeout');
}

// Get denomination from note
function getDenominationFromNote(note) {
    const match = note.match(/tornado-(?:pls|pcock)-([\dMBK]+)-/i);
    if (match) {
        const amount = match[1];
        // Normalize to our standard format
        if (amount === '1000000' || amount === '1m') return '1M';
        if (amount === '10000000' || amount === '10m') return '10M';
        if (amount === '100000000' || amount === '100m') return '100M';
        if (amount === '1000000000' || amount === '1b') return '1B';
        return amount.toUpperCase();
    }
    return '1M'; // Default
}

// Override the main withdraw function to check for relayer usage
const originalWithdraw = window.withdraw;

window.withdraw = async function() {
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

    // Check if relayer is enabled
    const useRelayer = document.getElementById('useRelayer') && document.getElementById('useRelayer').checked;
    
    if (useRelayer) {
        console.log('Using relayer for withdrawal');
        
        const withdrawBtn = document.getElementById('withdrawBtn');
        const originalBtnText = withdrawBtn ? withdrawBtn.innerText : 'Withdraw';
        
        try {
            if (withdrawBtn) {
                withdrawBtn.disabled = true;
                withdrawBtn.innerText = 'Processing via Relayer...';
            }
            
            clearMessages();
            
            // Execute relayer withdrawal (NO WALLET SIGNATURE NEEDED)
            const result = await executeRelayerWithdrawal(noteInput, recipientAddress);
            
            // Display success
            showMessage(`
                <div style="text-align: left;">
                    <h3 style="color: #00ff41; margin-bottom: 10px;">✅ Withdrawal Successful via Relayer!</h3>
                    <p><strong>Transaction Hash:</strong></p>
                    <p style="word-break: break-all; font-family: monospace; font-size: 12px; background: rgba(0,0,0,0.3); padding: 8px; border-radius: 4px;">
                        <a href="https://otter.pulsechain.com/tx/${result.transactionHash}" target="_blank" style="color: #00ff41;">
                            ${result.transactionHash}
                        </a>
                    </p>
                    <p style="margin-top: 10px; color: #aaa;">
                        <small>Relayer: ${result.relayerAddress}</small><br>
                        <small>Job ID: ${result.jobId}</small>
                    </p>
                </div>
            `, 'success');
            
            // Clear inputs
            document.getElementById('withdrawNote').value = '';
            document.getElementById('recipientAddress').value = '';
            
            // Fire success event
            window.dispatchEvent(new CustomEvent('withdrawalSuccess', {
                detail: {
                    note: noteInput,
                    recipient: recipientAddress,
                    transactionHash: result.transactionHash,
                    relayerUsed: true
                }
            }));
            
        } catch (error) {
            console.error('Relayer withdrawal failed:', error);
            showMessage(`Error: ${error.message}`, 'error');
        } finally {
            if (withdrawBtn) {
                withdrawBtn.disabled = false;
                withdrawBtn.innerText = originalBtnText;
            }
            showLoading(false);
        }
    } else {
        // Use original withdrawal function (direct contract call)
        console.log('Using direct withdrawal (no relayer)');
        if (originalWithdraw) {
            return originalWithdraw.apply(this, arguments);
        }
    }
};

// Helper function to show loading
function showLoading(show, message = 'Processing...') {
    const loadingDiv = document.getElementById('loading');
    if (loadingDiv) {
        if (show) {
            loadingDiv.classList.remove('hidden');
            const msgElement = loadingDiv.querySelector('p');
            if (msgElement) {
                msgElement.textContent = message;
            }
        } else {
            loadingDiv.classList.add('hidden');
        }
    }
}

// Helper function to show messages
function showMessage(message, type = 'info') {
    const messagesDiv = document.getElementById('messages');
    if (messagesDiv) {
        messagesDiv.innerHTML = `
            <div class="message ${type}" style="margin: 20px 0; padding: 15px; border-radius: 8px; 
                 background: ${type === 'error' ? 'rgba(255,0,0,0.1)' : type === 'success' ? 'rgba(0,255,65,0.1)' : 'rgba(255,193,7,0.1)'};
                 border: 1px solid ${type === 'error' ? '#ff0000' : type === 'success' ? '#00ff41' : '#ffc107'};">
                ${message}
            </div>
        `;
    }
}

// Helper function to clear messages
function clearMessages() {
    const messagesDiv = document.getElementById('messages');
    if (messagesDiv) {
        messagesDiv.innerHTML = '';
    }
}

console.log('Relayer withdrawal handler loaded');