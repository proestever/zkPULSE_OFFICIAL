// Tornado Cash API Client
// Uses server API for proper Pedersen hash commitment generation

async function createDepositViaAPI(walletAddress, amount) {
    try {
        const response = await fetch('/api/deposit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                walletAddress: walletAddress,
                amount: amount 
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to generate deposit');
        }
        
        const data = await response.json();
        
        console.log('API deposit data:', data);
        
        return {
            commitment: data.commitment,
            preimageHex: data.preimageHex || data.noteHex,
            note: data.note,
            nullifierHash: data.nullifierHash
        };
        
    } catch (error) {
        console.error('API error:', error);
        throw error;
    }
}

// Get pending deposits for wallet
async function getPendingDeposits(walletAddress) {
    try {
        const response = await fetch(`/api/deposits/${walletAddress}`);
        
        if (!response.ok) {
            return [];
        }
        
        return await response.json();
    } catch (error) {
        console.error('Error fetching pending deposits:', error);
        return [];
    }
}

// Mark deposit as completed
async function markDepositComplete(walletAddress, commitment, txHash) {
    try {
        const response = await fetch('/api/deposit/complete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                walletAddress,
                commitment,
                txHash
            })
        });
        
        return await response.json();
    } catch (error) {
        console.error('Error marking deposit complete:', error);
    }
}

// Export for use in app
window.createDepositViaAPI = createDepositViaAPI;