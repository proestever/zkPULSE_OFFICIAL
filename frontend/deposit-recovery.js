// Deposit Recovery System - Prevents loss of notes during refresh
class DepositRecovery {
    constructor() {
        this.PENDING_KEY = 'tornadoPendingDeposits';
        this.checkPendingDeposits();
        this.setupUnloadProtection();
    }

    // Save deposit immediately when generation starts
    savePendingDeposit(amount, commitment, nullifierHash) {
        const pending = {
            id: Date.now(),
            amount: amount,
            commitment: commitment,
            nullifierHash: nullifierHash,
            status: 'generating',
            timestamp: new Date().toISOString(),
            note: null,
            txHash: null
        };
        
        const pendingDeposits = this.getPendingDeposits();
        pendingDeposits.push(pending);
        localStorage.setItem(this.PENDING_KEY, JSON.stringify(pendingDeposits));
        
        return pending.id;
    }

    // Update with the note once generated
    updatePendingWithNote(pendingId, note) {
        const pendingDeposits = this.getPendingDeposits();
        const deposit = pendingDeposits.find(d => d.id === pendingId);
        
        if (deposit) {
            deposit.note = note;
            deposit.status = 'note_generated';
            localStorage.setItem(this.PENDING_KEY, JSON.stringify(pendingDeposits));
            
            // Also immediately save to deposit tracker as backup
            this.backupNote(note, deposit.amount);
        }
    }

    // Update when transaction is sent
    updatePendingWithTx(pendingId, txHash) {
        const pendingDeposits = this.getPendingDeposits();
        const deposit = pendingDeposits.find(d => d.id === pendingId);
        
        if (deposit) {
            deposit.txHash = txHash;
            deposit.status = 'tx_sent';
            localStorage.setItem(this.PENDING_KEY, JSON.stringify(pendingDeposits));
        }
    }

    // Mark as complete and move to history
    completePending(pendingId, note, txHash) {
        const pendingDeposits = this.getPendingDeposits();
        const index = pendingDeposits.findIndex(d => d.id === pendingId);
        
        if (index !== -1) {
            const deposit = pendingDeposits[index];
            
            // Add to permanent history
            if (window.depositTracker && note) {
                window.depositTracker.addDeposit(
                    note,
                    deposit.amount,
                    CONFIG.contracts[deposit.amount],
                    txHash
                );
            }
            
            // Remove from pending
            pendingDeposits.splice(index, 1);
            localStorage.setItem(this.PENDING_KEY, JSON.stringify(pendingDeposits));
        }
    }

    // Get all pending deposits
    getPendingDeposits() {
        try {
            const stored = localStorage.getItem(this.PENDING_KEY);
            return stored ? JSON.parse(stored) : [];
        } catch (e) {
            return [];
        }
    }

    // Check for pending deposits on page load
    checkPendingDeposits() {
        const pending = this.getPendingDeposits();
        
        if (pending.length > 0) {
            // Show recovery UI
            this.showRecoveryUI(pending);
        }
    }

    // Show UI for pending/interrupted deposits
    showRecoveryUI(pendingDeposits) {
        // Filter deposits that have notes
        const recoverableDeposits = pendingDeposits.filter(d => d.note);
        
        if (recoverableDeposits.length > 0) {
            const recoveryHtml = `
                <div id="recoveryAlert" style="
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
                    <h4 style="color: #ffc107; margin: 0 0 10px 0;">⚠️ Incomplete Deposits Found!</h4>
                    <p style="color: #e0e0e0; font-size: 14px; margin-bottom: 15px;">
                        You have ${recoverableDeposits.length} deposit(s) that were interrupted. 
                        Your notes have been saved!
                    </p>
                    <div style="max-height: 200px; overflow-y: auto;">
                        ${recoverableDeposits.map(d => `
                            <div style="
                                background: rgba(255, 193, 7, 0.1);
                                border: 1px solid rgba(255, 193, 7, 0.3);
                                border-radius: 5px;
                                padding: 10px;
                                margin-bottom: 10px;
                            ">
                                <div style="display: flex; justify-content: space-between; align-items: center;">
                                    <span style="color: #ffc107; font-weight: 600;">${d.amount}</span>
                                    <span style="color: #a0a0a0; font-size: 12px;">${this.getTimeAgo(new Date(d.timestamp))}</span>
                                </div>
                                <div style="margin-top: 8px;">
                                    <button onclick="depositRecovery.copyRecoveredNote('${d.id}')" style="
                                        background: rgba(10, 10, 10, 0.7);
                                        color: #ffc107;
                                        border: 1px solid #ffc107;
                                        padding: 5px 10px;
                                        border-radius: 5px;
                                        cursor: pointer;
                                        font-size: 12px;
                                        margin-right: 5px;
                                    ">Copy Note</button>
                                    <button onclick="depositRecovery.saveRecoveredNote('${d.id}')" style="
                                        background: rgba(10, 10, 10, 0.7);
                                        color: #00ff41;
                                        border: 1px solid #00ff41;
                                        padding: 5px 10px;
                                        border-radius: 5px;
                                        cursor: pointer;
                                        font-size: 12px;
                                        margin-right: 5px;
                                    ">Save to File</button>
                                    <button onclick="depositRecovery.dismissRecovered('${d.id}')" style="
                                        background: rgba(10, 10, 10, 0.7);
                                        color: #ff6b6b;
                                        border: 1px solid #ff6b6b;
                                        padding: 5px 10px;
                                        border-radius: 5px;
                                        cursor: pointer;
                                        font-size: 12px;
                                    ">Dismiss</button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                    <button onclick="depositRecovery.dismissAll()" style="
                        width: 100%;
                        margin-top: 10px;
                        background: rgba(10, 10, 10, 0.7);
                        color: #a0a0a0;
                        border: 1px solid #3a3a3a;
                        padding: 8px;
                        border-radius: 5px;
                        cursor: pointer;
                        font-size: 12px;
                    ">Dismiss All</button>
                </div>
            `;
            
            // Add to page
            const existingAlert = document.getElementById('recoveryAlert');
            if (existingAlert) existingAlert.remove();
            
            document.body.insertAdjacentHTML('beforeend', recoveryHtml);
        }
        
        // Clean up old pending deposits without notes (older than 1 hour)
        const oneHourAgo = Date.now() - (60 * 60 * 1000);
        const cleaned = pendingDeposits.filter(d => {
            return d.note || (new Date(d.timestamp).getTime() > oneHourAgo);
        });
        
        if (cleaned.length !== pendingDeposits.length) {
            localStorage.setItem(this.PENDING_KEY, JSON.stringify(cleaned));
        }
    }

    // Copy recovered note to clipboard
    copyRecoveredNote(depositId) {
        const pending = this.getPendingDeposits();
        const deposit = pending.find(d => d.id == depositId);
        
        if (deposit && deposit.note) {
            navigator.clipboard.writeText(deposit.note);
            
            // Visual feedback
            const btn = event.target;
            const originalText = btn.textContent;
            btn.textContent = 'Copied!';
            btn.style.background = 'rgba(0, 255, 65, 0.2)';
            setTimeout(() => {
                btn.textContent = originalText;
                btn.style.background = 'rgba(10, 10, 10, 0.7)';
            }, 2000);
        }
    }

    // Save recovered note to file
    saveRecoveredNote(depositId) {
        const pending = this.getPendingDeposits();
        const deposit = pending.find(d => d.id == depositId);
        
        if (deposit && deposit.note) {
            const blob = new Blob([deposit.note], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `tornado-recovery-${deposit.amount}-${Date.now()}.txt`;
            a.click();
            
            // Move to permanent history after saving
            this.completePending(deposit.id, deposit.note, deposit.txHash);
            this.showRecoveryUI(this.getPendingDeposits());
        }
    }

    // Dismiss a recovered deposit
    dismissRecovered(depositId) {
        const pending = this.getPendingDeposits();
        const deposit = pending.find(d => d.id == depositId);
        
        if (deposit && deposit.note) {
            // Move to history before dismissing
            this.completePending(deposit.id, deposit.note, deposit.txHash);
        } else {
            // Just remove if no note
            const filtered = pending.filter(d => d.id != depositId);
            localStorage.setItem(this.PENDING_KEY, JSON.stringify(filtered));
        }
        
        this.showRecoveryUI(this.getPendingDeposits());
        
        // Remove UI if no more pending
        if (this.getPendingDeposits().filter(d => d.note).length === 0) {
            const alert = document.getElementById('recoveryAlert');
            if (alert) alert.remove();
        }
    }

    // Dismiss all
    dismissAll() {
        const pending = this.getPendingDeposits();
        
        // Save all with notes to history first
        pending.forEach(d => {
            if (d.note) {
                this.completePending(d.id, d.note, d.txHash);
            }
        });
        
        // Clear all pending
        localStorage.setItem(this.PENDING_KEY, JSON.stringify([]));
        
        const alert = document.getElementById('recoveryAlert');
        if (alert) alert.remove();
    }

    // Backup note immediately
    backupNote(note, amount) {
        const backupKey = 'tornadoNoteBackup_' + Date.now();
        const backup = { note, amount, timestamp: new Date().toISOString() };
        localStorage.setItem(backupKey, JSON.stringify(backup));
        
        // Clean old backups (keep last 10)
        const allKeys = Object.keys(localStorage);
        const backupKeys = allKeys.filter(k => k.startsWith('tornadoNoteBackup_')).sort();
        if (backupKeys.length > 10) {
            for (let i = 0; i < backupKeys.length - 10; i++) {
                localStorage.removeItem(backupKeys[i]);
            }
        }
    }

    // Setup protection against accidental refresh
    setupUnloadProtection() {
        window.addEventListener('beforeunload', (e) => {
            const pending = this.getPendingDeposits();
            const activeDeposits = pending.filter(d => 
                d.status === 'generating' || d.status === 'note_generated' || d.status === 'tx_sent'
            );
            
            if (activeDeposits.length > 0) {
                const message = 'You have a deposit in progress! Your note has been saved and can be recovered if you continue.';
                e.preventDefault();
                e.returnValue = message;
                return message;
            }
        });
    }

    getTimeAgo(date) {
        const seconds = Math.floor((new Date() - date) / 1000);
        if (seconds < 60) return 'just now';
        if (seconds < 3600) return Math.floor(seconds / 60) + ' min ago';
        if (seconds < 86400) return Math.floor(seconds / 3600) + ' hours ago';
        return date.toLocaleDateString();
    }
}

// Initialize recovery system
window.depositRecovery = new DepositRecovery();