const Web3 = require('web3').default || require('web3');

const RPC_URL = 'https://rpc.pulsechain.com';
const PCOCK_TORNADO_ADDRESS = '0x5915Dc6C5a3D2F06DB93bc763334D2e8F5D1A8C3';

// The commitment that was actually stored
const ACTUAL_COMMITMENT = '0x02e990c5f3a6e61efb53739715d1a32ea32a46a826b895af7c658f36ca1ac965';

// Your note hex
const noteHex = '739044633c825ad6b156018fab14852f0e89ecb8abe581a8a2ac30bd53d645509ded69872f83a38680c30a2273c73471e8ad788a329af4768399fa1f89c9';

async function findCorrectValues() {
    const web3 = new Web3(RPC_URL);
    
    console.log('=== REVERSE ENGINEERING YOUR DEPOSIT ===\n');
    console.log('Actual commitment in contract:', ACTUAL_COMMITMENT);
    console.log('Note hex:', noteHex);
    console.log('Note length:', noteHex.length);
    
    // The note was generated wrong, but the commitment was generated using the WRONG values
    // that were modulo FIELD_SIZE
    
    const FIELD_SIZE = BigInt('21888242871839275222246405745257275088548364400416034343698204186575808495617');
    
    // Parse as it was incorrectly done
    const nullifierHex = noteHex.slice(0, 62);
    const secretHex = noteHex.slice(62, 124);
    
    console.log('\nParsing note as 62+62:');
    console.log('Nullifier hex:', nullifierHex);
    console.log('Secret hex:', secretHex);
    
    const nullifier = BigInt('0x' + nullifierHex);
    const secret = BigInt('0x' + secretHex);
    
    console.log('\nValues:');
    console.log('Nullifier:', nullifier.toString());
    console.log('Secret:', secret.toString());
    
    // The commitment that was stored was likely from the web3.utils.soliditySha3
    // that was then modulo'd
    const hash = web3.utils.soliditySha3(
        {t: 'uint256', v: nullifier.toString()},
        {t: 'uint256', v: secret.toString()}
    );
    
    const commitmentFromHash = BigInt(hash) % FIELD_SIZE;
    const commitmentHex = '0x' + commitmentFromHash.toString(16).padStart(64, '0');
    
    console.log('\nCalculated commitment using soliditySha3:', commitmentHex);
    console.log('Matches actual?', commitmentHex.toLowerCase() === ACTUAL_COMMITMENT.toLowerCase());
    
    if (commitmentHex.toLowerCase() === ACTUAL_COMMITMENT.toLowerCase()) {
        console.log('\n✅ SUCCESS! Found the correct values!');
        console.log('\n=== USE THESE VALUES FOR WITHDRAWAL ===');
        console.log('Nullifier:', '0x' + nullifierHex);
        console.log('Secret:', '0x' + secretHex);
        console.log('Commitment:', commitmentHex);
        
        // Generate a corrected note
        const correctedNote = `tornado-pcock-10k-369-${nullifierHex}${secretHex}`;
        console.log('\nCorrected note for withdrawal:');
        console.log(correctedNote);
    }
}

findCorrectValues().catch(console.error);