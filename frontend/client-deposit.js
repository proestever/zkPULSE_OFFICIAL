// Client-side deposit generation for maximum privacy
// NO server interaction - everything happens in the browser

(function() {
    'use strict';
    
    // Field size for zkSNARK
    const FIELD_SIZE = BigInt('21888242871839275222246405745257275088548364400416034343698204186575808495617');
    
    // Generate random bytes
    function randomBytes(length) {
        const array = new Uint8Array(length);
        crypto.getRandomValues(array);
        return array;
    }
    
    // Convert bytes to BigInt
    function bytesToBigInt(bytes) {
        let result = BigInt(0);
        for (let i = 0; i < bytes.length; i++) {
            result = (result << BigInt(8)) + BigInt(bytes[i]);
        }
        return result;
    }
    
    // Generate random field element
    function randomFieldElement() {
        // Generate 31 bytes (248 bits) to ensure we're under field size
        const bytes = randomBytes(31);
        const value = bytesToBigInt(bytes);
        return value % FIELD_SIZE;
    }
    
    // Simple hash function for commitment (mimics Pedersen hash behavior)
    function generateCommitment(nullifier, secret) {
        // Combine nullifier and secret
        const nullifierHex = nullifier.toString(16).padStart(62, '0');
        const secretHex = secret.toString(16).padStart(62, '0');
        const combined = nullifierHex + secretHex;
        
        // Use Web3's soliditySha3 for commitment
        if (typeof web3 !== 'undefined' && web3.utils) {
            const hash = web3.utils.soliditySha3(
                {t: 'uint256', v: nullifier.toString()},
                {t: 'uint256', v: secret.toString()}
            );
            return BigInt(hash) % FIELD_SIZE;
        } else {
            // Fallback: use crypto.subtle if available
            const encoder = new TextEncoder();
            const data = encoder.encode(combined);
            return crypto.subtle.digest('SHA-256', data).then(buffer => {
                const hashArray = new Uint8Array(buffer);
                return bytesToBigInt(hashArray) % FIELD_SIZE;
            });
        }
    }
    
    // Generate deposit locally
    async function generateDepositLocal() {
        // Generate random nullifier and secret
        const nullifier = randomFieldElement();
        const secret = randomFieldElement();
        
        // Generate commitment
        let commitment;
        const commitmentResult = generateCommitment(nullifier, secret);
        
        if (commitmentResult instanceof Promise) {
            commitment = await commitmentResult;
        } else {
            commitment = commitmentResult;
        }
        
        // Ensure commitment is not zero
        if (commitment === BigInt(0)) {
            commitment = BigInt(1);
        }
        
        // Create note hex (31 bytes each for nullifier and secret)
        const nullifierHex = nullifier.toString(16).padStart(62, '0');
        const secretHex = secret.toString(16).padStart(62, '0');
        const noteHex = nullifierHex + secretHex;
        
        return {
            nullifier,
            secret,
            commitment,
            nullifierHex,
            secretHex,
            noteHex,
            commitmentHex: '0x' + commitment.toString(16).padStart(64, '0')
        };
    }
    
    // Generate full deposit with note
    async function createClientDeposit(amount) {
        const deposit = await generateDepositLocal();
        
        // Create the note string
        const currency = 'pls';
        const netId = '369'; // PulseChain network ID
        const note = `tornado-${currency}-${amount}-${netId}-0x${deposit.noteHex}`;
        
        console.log('Deposit generated locally (no server interaction)');
        
        return {
            commitment: deposit.commitmentHex,
            note: note,
            nullifier: deposit.nullifier,
            secret: deposit.secret,
            noteHex: deposit.noteHex
        };
    }
    
    // Export to window
    window.clientDeposit = {
        generate: createClientDeposit,
        generateRaw: generateDepositLocal
    };
    
    console.log('Client-side deposit generator loaded');
})();