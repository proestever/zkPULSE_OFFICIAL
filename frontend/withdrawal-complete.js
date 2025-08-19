// Complete withdrawal functionality with ZK proofs

function parseNote(noteString) {
    try {
        const noteRegex = /tornado-pls-(\w+)-(\d+)-0x([0-9a-fA-F]+)/;
        const match = noteRegex.exec(noteString.trim());
        
        if (!match) {
            throw new Error('Invalid note format');
        }
        
        return {
            denomination: match[1],
            chainId: parseInt(match[2]),
            preimageHex: match[3]
        };
    } catch (error) {
        console.error('Error parsing note:', error);
        throw error;
    }
}

// Step 1: Generate proof (no wallet interaction)
async function generateWithdrawalProof(noteString, recipientAddress) {
    try {
        // Parse note to get denomination
        const noteData = parseNote(noteString);
        
        // Get contract address
        const contractInfo = CONFIG.contracts[noteData.denomination];
        if (!contractInfo) {
            throw new Error('Unknown denomination');
        }
        
        // Call API to generate proof
        const response = await fetch('/api/withdraw', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                note: noteString,
                recipient: recipientAddress,
                contractAddress: contractInfo.address
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to generate proof');
        }
        
        const proofData = await response.json();
        console.log('Proof generated:', proofData);
        
        return {
            proofData,
            contractInfo,
            noteData
        };
    } catch (error) {
        console.error('Proof generation error:', error);
        throw error;
    }
}

// Step 2: Execute transaction (wallet interaction)
async function executeWithdrawalTransaction(proofBundle, noteString, recipientAddress) {
    try {
        const { proofData, contractInfo } = proofBundle;
        
        // Create contract instance
        const contract = new web3.eth.Contract(CONFIG.tornadoABI, contractInfo.address);
        
        // Execute withdrawal transaction using the args array from proof generation
        let tx;
        if (proofData.success && proofData.args) {
            tx = await contract.methods.withdraw(
                proofData.proof,
                ...proofData.args  // Spread the args array [root, nullifierHash, recipient, relayer, fee, refund]
            ).send({
                from: userAccount,
                gas: 1000000
            });
        } else {
            // Fallback for old format
            tx = await contract.methods.withdraw(
                proofData.proof,
                proofData.root,
                proofData.nullifierHash,
                proofData.recipient,
                '0x0000000000000000000000000000000000000000',
                0,
                0
            ).send({
                from: userAccount,
                gas: 1000000
            });
        }
        
        return {
            success: true,
            transactionHash: tx.transactionHash,
            recipient: recipientAddress,
            amount: contractInfo.displayName
        };
        
    } catch (error) {
        console.error('Withdrawal execution error:', error);
        throw error;
    }
}

// Display success message
function displayWithdrawalSuccess(result) {
    const successHtml = `
        <div style="background: rgba(10, 10, 10, 0.8); border: 2px solid #00ff41; border-radius: 10px; padding: 20px; margin: 20px 0; backdrop-filter: blur(15px); -webkit-backdrop-filter: blur(15px); box-shadow: 0 0 30px rgba(0, 255, 65, 0.5), 0 0 60px rgba(0, 255, 65, 0.3), inset 0 0 20px rgba(0, 255, 65, 0.1); animation: pulseGreen 2s ease-in-out infinite;">
            <h3 style="color: #00ff41; margin: 0 0 15px 0; text-shadow: 0 0 10px rgba(0, 255, 65, 0.5);">✅ Withdrawal Successful!</h3>
            <p style="color: #e0e0e0;"><strong style="color: #00ff41;">Amount:</strong> ${result.amount}</p>
            <p style="color: #e0e0e0;"><strong style="color: #00ff41;">Recipient:</strong> ${result.recipient}</p>
            <p style="color: #e0e0e0;"><strong style="color: #00ff41;">Transaction:</strong> 
                <a href="${CONFIG.explorerUrl}/tx/${result.transactionHash}" target="_blank" style="color: #00ff41; text-decoration: none; border-bottom: 1px solid #00ff41; text-shadow: 0 0 5px rgba(0, 255, 65, 0.3);">
                    ${result.transactionHash.substring(0, 10)}...${result.transactionHash.substring(56)}
                </a>
            </p>
            <p style="margin-top: 15px; color: #00ff41; text-shadow: 0 0 5px rgba(0, 255, 65, 0.3);">
                Your funds have been successfully withdrawn with complete privacy!
            </p>
        </div>
    `;
    
    document.getElementById('messages').innerHTML = successHtml;
}

// Backward compatibility wrapper
async function executeWithdrawal(noteString, recipientAddress) {
    // This is for backward compatibility - it combines both steps
    const proofBundle = await generateWithdrawalProof(noteString, recipientAddress);
    return await executeWithdrawalTransaction(proofBundle, noteString, recipientAddress);
}

// Export functions
window.withdrawalComplete = {
    parseNote,
    generateWithdrawalProof,
    executeWithdrawalTransaction,
    executeWithdrawal, // backward compatibility
    displayWithdrawalSuccess
};