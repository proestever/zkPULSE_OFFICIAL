// PCOCK Withdrawal Fix - handles both note formats
window.pcockWithdrawalFix = {
    parseNote: function(noteString) {
        const parts = noteString.split('-');
        const hexNote = parts[parts.length - 1];
        
        let nullifier, secret;
        
        if (hexNote.length === 128) {
            // Wrong format (64+64) - for notes already created
            console.warn('Note uses incorrect format (128 chars), attempting recovery...');
            nullifier = BigInt('0x' + hexNote.slice(0, 64));
            secret = BigInt('0x' + hexNote.slice(64, 128));
        } else if (hexNote.length === 124) {
            // Correct format (62+62)
            nullifier = BigInt('0x' + hexNote.slice(0, 62));
            secret = BigInt('0x' + hexNote.slice(62, 124));
        } else {
            throw new Error('Invalid note length: ' + hexNote.length);
        }
        
        return { nullifier, secret, noteHex: hexNote };
    },
    
    // Override the existing parseNote function
    init: function() {
        if (window.withdrawalAPI && window.withdrawalAPI.parseNote) {
            const originalParse = window.withdrawalAPI.parseNote;
            window.withdrawalAPI.parseNote = function(note) {
                try {
                    return originalParse(note);
                } catch (e) {
                    console.log('Standard parse failed, trying PCOCK fix...');
                    return window.pcockWithdrawalFix.parseNote(note);
                }
            };
        }
    }
};

// Auto-initialize on load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', window.pcockWithdrawalFix.init);
} else {
    window.pcockWithdrawalFix.init();
}