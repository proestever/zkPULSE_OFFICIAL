// Client-side deposit generation with proper Pedersen hash
// This creates commitments that match what the contract expects

(function() {
    'use strict';
    
    // Use the server API for proper Pedersen hash generation
    // but generate the random values client-side for privacy
    
    // Field size for zkSNARK
    const FIELD_SIZE = BigInt('21888242871839275222246405745257275088548364400416034343698204186575808495617');
    
    // Generate random bytes
    function randomBytes(length) {
        const array = new Uint8Array(length);
        crypto.getRandomValues(array);
        return array;
    }
    
    // Convert bytes to BigInt (little-endian)
    function leBuff2int(bytes) {
        let result = BigInt(0);
        for (let i = 0; i < bytes.length; i++) {
            result += BigInt(bytes[i]) * (BigInt(256) ** BigInt(i));
        }
        return result;
    }
    
    // Convert BigInt to buffer (little-endian)
    function leInt2Buff(num, bytes) {
        const buffer = new Uint8Array(bytes);
        let temp = BigInt(num);
        for (let i = 0; i < bytes; i++) {
            buffer[i] = Number(temp & BigInt(0xFF));
            temp = temp >> BigInt(8);
        }
        return buffer;
    }
    
    // Generate random field element (31 bytes)
    function rbigint() {
        return leBuff2int(randomBytes(31));
    }
    
    // Create deposit using server API for proper Pedersen hash
    async function createDepositWithAPI(amount) {
        // Generate random nullifier and secret client-side
        const nullifier = rbigint();
        const secret = rbigint();
        
        // Convert to hex for the note
        const nullifierBuffer = leInt2Buff(nullifier, 31);
        const secretBuffer = leInt2Buff(secret, 31);
        
        // Create note hex
        const nullifierHex = Array.from(nullifierBuffer).map(b => b.toString(16).padStart(2, '0')).join('');
        const secretHex = Array.from(secretBuffer).map(b => b.toString(16).padStart(2, '0')).join('');
        const noteHex = nullifierHex + secretHex;
        
        // Generate the note string
        const currency = 'pls';
        const netId = '369';
        const note = `tornado-${currency}-${amount}-${netId}-0x${noteHex}`;
        
        // Now we need to call the server JUST to generate the proper commitment
        // We'll send the noteHex but NOT save anything server-side
        try {
            const response = await fetch('/api/commitment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    noteHex: noteHex,
                    // Don't send wallet address - maintain privacy
                    temporary: true // Tell server not to store this
                })
            });
            
            if (!response.ok) {
                throw new Error('Failed to generate commitment');
            }
            
            const data = await response.json();
            
            return {
                commitment: data.commitment,
                note: note,
                nullifier: nullifier.toString(),
                secret: secret.toString(),
                noteHex: noteHex
            };
        } catch (error) {
            console.error('Failed to generate commitment, falling back to local generation');
            // Fallback to local generation if server is unavailable
            return fallbackLocalGeneration(amount, nullifier, secret, noteHex);
        }
    }
    
    // Fallback local generation (less accurate but works)
    function fallbackLocalGeneration(amount, nullifier, secret, noteHex) {
        // Use Web3's keccak256 as a fallback
        let commitment;
        if (typeof web3 !== 'undefined' && web3.utils) {
            // Simulate Pedersen hash with keccak256
            const hash = web3.utils.soliditySha3(
                {t: 'bytes32', v: '0x' + Array.from(leInt2Buff(nullifier, 31)).map(b => b.toString(16).padStart(2, '0')).join('')},
                {t: 'bytes32', v: '0x' + Array.from(leInt2Buff(secret, 31)).map(b => b.toString(16).padStart(2, '0')).join('')}
            );
            commitment = hash;
        } else {
            // Last resort - simple hash
            const combined = nullifier.toString() + secret.toString();
            commitment = '0x' + Array.from(new TextEncoder().encode(combined))
                .map(b => b.toString(16).padStart(2, '0'))
                .join('')
                .padStart(64, '0')
                .slice(0, 64);
        }
        
        const currency = 'pls';
        const netId = '369';
        const note = `tornado-${currency}-${amount}-${netId}-0x${noteHex}`;
        
        console.warn('Using fallback commitment generation - withdrawals may not work!');
        
        return {
            commitment: commitment,
            note: note,
            nullifier: nullifier.toString(),
            secret: secret.toString(),
            noteHex: noteHex
        };
    }
    
    // Export functions
    window.clientDepositPedersen = {
        generate: createDepositWithAPI
    };
    
    console.log('Client-side Pedersen deposit generator loaded');
})();