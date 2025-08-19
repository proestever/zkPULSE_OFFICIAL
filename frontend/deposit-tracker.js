// Track user's deposits locally in browser
class DepositTracker {
    constructor() {
        this.storageKey = 'tornadoUserDeposits';
        this.deposits = this.loadDeposits();
    }

    loadDeposits() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            return stored ? JSON.parse(stored) : [];
        } catch (e) {
            console.error('Error loading deposits:', e);
            return [];
        }
    }

    saveDeposits() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.deposits));
        } catch (e) {
            console.error('Error saving deposits:', e);
        }
    }

    addDeposit(note, amount, contractAddress, transactionHash) {
        const deposit = {
            id: Date.now(),
            note: note,
            amount: amount,
            contractAddress: contractAddress,
            transactionHash: transactionHash,
            timestamp: new Date().toISOString(),
            withdrawn: false
        };
        
        this.deposits.push(deposit);
        this.saveDeposits();
        this.updateUI();
        
        return deposit;
    }

    markAsWithdrawn(noteOrId) {
        const deposit = this.deposits.find(d => 
            d.note === noteOrId || d.id === noteOrId
        );
        
        if (deposit) {
            deposit.withdrawn = true;
            deposit.withdrawnAt = new Date().toISOString();
            this.saveDeposits();
            this.updateUI();
        }
    }

    getActiveDeposits() {
        return this.deposits.filter(d => !d.withdrawn);
    }

    getWithdrawnDeposits() {
        return this.deposits.filter(d => d.withdrawn);
    }

    updateUI() {
        const container = document.getElementById('userDepositsHistory');
        if (!container) return;

        const active = this.getActiveDeposits();
        const withdrawn = this.getWithdrawnDeposits();

        if (this.deposits.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; color: #a0a0a0; padding: 20px;">
                    No deposits tracked yet. Your deposits will appear here.
                </div>
            `;
            return;
        }

        let html = `
            <div style="margin-bottom: 15px;">
                <span style="color: #00ff88; font-weight: 600;">
                    ${active.length} Active Deposit${active.length !== 1 ? 's' : ''}
                </span>
                ${withdrawn.length > 0 ? `
                    <span style="color: #a0a0a0; margin-left: 15px;">
                        ${withdrawn.length} Withdrawn
                    </span>
                ` : ''}
            </div>
        `;

        // Show active deposits
        if (active.length > 0) {
            html += '<div style="margin-bottom: 15px;">';
            active.forEach(deposit => {
                const date = new Date(deposit.timestamp);
                const timeAgo = this.getTimeAgo(date);
                
                html += `
                    <div style="background: rgba(0, 255, 65, 0.1); border: 1px solid #00ff41; border-radius: 8px; padding: 12px; margin-bottom: 10px;">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <span style="color: #00ff41; font-weight: 600;">${deposit.amount}</span>
                                <span style="color: #a0a0a0; font-size: 12px; margin-left: 10px;">${timeAgo}</span>
                            </div>
                            <button onclick="copyDepositNote('${deposit.id}')" style="background: rgba(10, 10, 10, 0.7); color: #00ff41; border: 1px solid #00ff41; padding: 5px 10px; border-radius: 5px; cursor: pointer; font-size: 12px; box-shadow: 0 0 10px rgba(0, 255, 65, 0.3);">
                                Copy Note
                            </button>
                        </div>
                    </div>
                `;
            });
            html += '</div>';
        }

        // Show withdrawn deposits (collapsed by default)
        if (withdrawn.length > 0) {
            html += `
                <details style="margin-top: 20px;">
                    <summary style="cursor: pointer; color: #a0a0a0; font-size: 14px;">
                        Withdrawn History (${withdrawn.length})
                    </summary>
                    <div style="margin-top: 10px;">
            `;
            
            withdrawn.forEach(deposit => {
                const date = new Date(deposit.withdrawnAt);
                const timeAgo = this.getTimeAgo(date);
                
                html += `
                    <div style="background: rgba(81, 207, 102, 0.05); border: 1px solid #3a3a3a; border-radius: 8px; padding: 10px; margin-bottom: 8px; opacity: 0.7;">
                        <div style="display: flex; justify-content: space-between;">
                            <span style="color: #a0a0a0;">${deposit.amount}</span>
                            <span style="color: #51cf66; font-size: 12px;">Withdrawn ${timeAgo}</span>
                        </div>
                    </div>
                `;
            });
            
            html += '</div></details>';
        }

        container.innerHTML = html;
    }

    getTimeAgo(date) {
        const seconds = Math.floor((new Date() - date) / 1000);
        
        if (seconds < 60) return 'just now';
        if (seconds < 3600) return Math.floor(seconds / 60) + ' min ago';
        if (seconds < 86400) return Math.floor(seconds / 3600) + ' hours ago';
        if (seconds < 604800) return Math.floor(seconds / 86400) + ' days ago';
        
        return date.toLocaleDateString();
    }

    exportNotes() {
        const active = this.getActiveDeposits();
        if (active.length === 0) {
            alert('No active deposits to export');
            return;
        }

        const notes = active.map(d => d.note).join('\n\n');
        const blob = new Blob([notes], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `tornado-notes-${Date.now()}.txt`;
        a.click();
    }

    clearHistory() {
        if (confirm('Are you sure you want to clear all deposit history? Make sure you have saved your active deposit notes!')) {
            this.deposits = [];
            this.saveDeposits();
            this.updateUI();
        }
    }
}

// Initialize tracker
window.depositTracker = new DepositTracker();

// Helper function for copying notes
window.copyDepositNote = function(depositId) {
    const deposit = window.depositTracker.deposits.find(d => d.id == depositId);
    if (deposit) {
        navigator.clipboard.writeText(deposit.note);
        
        // Show confirmation
        const btn = event.target;
        const originalText = btn.textContent;
        btn.textContent = 'Copied!';
        btn.style.background = 'rgba(10, 10, 10, 0.8)';
        btn.style.color = '#00ff88';
        btn.style.borderColor = '#00ff88';
        btn.style.boxShadow = '0 0 15px rgba(0, 255, 136, 0.5)';
        setTimeout(() => {
            btn.textContent = originalText;
            btn.style.background = 'rgba(10, 10, 10, 0.7)';
            btn.style.color = '#00ff41';
            btn.style.borderColor = '#00ff41';
            btn.style.boxShadow = '0 0 10px rgba(0, 255, 65, 0.3)';
        }, 2000);
    }
};

// Hook into deposit success to track
window.addEventListener('depositSuccess', (event) => {
    const { note, amount, contractAddress, transactionHash } = event.detail;
    window.depositTracker.addDeposit(note, amount, contractAddress, transactionHash);
});

// Hook into withdrawal success to mark as withdrawn
window.addEventListener('withdrawalSuccess', (event) => {
    const { note } = event.detail;
    window.depositTracker.markAsWithdrawn(note);
});