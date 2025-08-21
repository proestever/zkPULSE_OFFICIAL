const { ethers } = require("hardhat");
const fs = require("fs");
const snarkjs = require("snarkjs");
const circomlib = require("circomlib");
const MerkleTree = require("fixed-merkle-tree").default;

// Import utilities
const { toHex, rbigint, pedersenHash } = require("../src/utils");

async function main() {
    console.log("===========================================");
    console.log("PCOCK 10K TORNADO WITHDRAWAL");
    console.log("===========================================\n");
    
    // Get withdrawal parameters from command line
    const noteString = process.env.NOTE;
    const recipientAddress = process.env.RECIPIENT;
    
    if (!noteString || !recipientAddress) {
        console.error("Usage: NOTE='tornado-pcock-10k-369-0x...' RECIPIENT='0x...' npx hardhat run scripts/withdraw-pcock.js");
        return;
    }
    
    // Parse note
    const noteRegex = /tornado-pcock-(\d+k?)-(\d+)-0x([0-9a-fA-F]+)/;
    const match = noteString.match(noteRegex);
    
    if (!match) {
        console.error("Invalid note format");
        return;
    }
    
    const [, denomination, chainId, noteHex] = match;
    
    if (chainId !== '369') {
        console.error("Note is for wrong chain. Expected PulseChain (369)");
        return;
    }
    
    if (denomination !== '10k') {
        console.error("Note is for wrong denomination. Expected 10k");
        return;
    }
    
    // Load deployment info
    const deployment = JSON.parse(fs.readFileSync('deployment-pcock-10k.json', 'utf8'));
    const TORNADO_ADDRESS = deployment.contracts.tornado_PCOCK_10K;
    const PCOCK_ADDRESS = deployment.tokenAddress;
    
    console.log("Tornado contract:", TORNADO_ADDRESS);
    console.log("Recipient:", recipientAddress);
    console.log("Token:", "PCOCK\n");
    
    const [signer] = await ethers.getSigners();
    
    // Parse deposit note
    const buf = Buffer.from(noteHex, 'hex');
    const nullifier = ethers.BigNumber.from('0x' + buf.slice(0, 31).toString('hex'));
    const secret = ethers.BigNumber.from('0x' + buf.slice(31, 62).toString('hex'));
    
    // Calculate commitment
    const preimage = Buffer.concat([
        nullifier.toBuffer('le', 31),
        secret.toBuffer('le', 31)
    ]);
    const commitment = pedersenHash(preimage);
    const nullifierHash = pedersenHash(nullifier.toBuffer('le', 31));
    
    console.log("Commitment:", toHex(commitment));
    console.log("Nullifier hash:", toHex(nullifierHash));
    
    // Get Tornado contract
    const Tornado_ABI = [
        "function withdraw(bytes calldata _proof, bytes32 _root, bytes32 _nullifierHash, address payable _recipient, address payable _relayer, uint256 _fee, uint256 _refund) external payable",
        "function roots(bytes32) view returns (bool)",
        "event Deposit(bytes32 indexed commitment, uint32 leafIndex, uint256 timestamp)"
    ];
    
    const tornado = new ethers.Contract(TORNADO_ADDRESS, Tornado_ABI, signer);
    
    // Get all deposits to build Merkle tree
    console.log("\nFetching deposits to build Merkle tree...");
    const filter = tornado.filters.Deposit();
    const events = await tornado.queryFilter(filter, deployment.deploymentBlock);
    
    console.log(`Found ${events.length} deposits`);
    
    // Build Merkle tree
    const leaves = events
        .sort((a, b) => a.args.leafIndex - b.args.leafIndex)
        .map(e => e.args.commitment);
    
    const tree = new MerkleTree(20, leaves, {
        hashFunction: circomlib.mimcsponge.multiHash,
        zeroElement: '21663839004416932945382355908790599225266501822907911457504978515578255421292'
    });
    
    // Find our deposit
    const depositIndex = leaves.findIndex(leaf => leaf === toHex(commitment));
    if (depositIndex === -1) {
        console.error("Deposit not found in the tree");
        return;
    }
    
    console.log(`Found deposit at index ${depositIndex}`);
    
    // Generate proof
    const { pathElements, pathIndices } = tree.path(depositIndex);
    const root = tree.root();
    
    console.log("Merkle root:", toHex(root));
    
    // Check if root is valid
    const isValidRoot = await tornado.roots(toHex(root));
    if (!isValidRoot) {
        console.error("Merkle root is not valid. It might be too recent.");
        return;
    }
    
    console.log("✅ Root is valid\n");
    
    // Generate ZK proof
    console.log("Generating zero-knowledge proof...");
    const input = {
        root: root,
        nullifierHash: nullifierHash,
        recipient: ethers.BigNumber.from(recipientAddress),
        relayer: ethers.constants.AddressZero,
        fee: 0,
        refund: 0,
        nullifier: nullifier,
        secret: secret,
        pathElements: pathElements,
        pathIndices: pathIndices
    };
    
    const { proof } = await snarkjs.groth16.fullProve(
        input,
        "circuits/withdraw.wasm",
        "circuits/withdraw_final.zkey"
    );
    
    const solidityProof = [
        proof.pi_a[0], proof.pi_a[1],
        proof.pi_b[0][1], proof.pi_b[0][0], proof.pi_b[1][1], proof.pi_b[1][0],
        proof.pi_c[0], proof.pi_c[1]
    ].map(x => ethers.BigNumber.from(x).toString());
    
    const proofBytes = ethers.utils.defaultAbiCoder.encode(
        ["uint256[8]"],
        [solidityProof]
    );
    
    console.log("✅ Proof generated\n");
    
    // Execute withdrawal
    console.log("Executing withdrawal...");
    const withdrawTx = await tornado.withdraw(
        proofBytes,
        toHex(root),
        toHex(nullifierHash),
        recipientAddress,
        ethers.constants.AddressZero,
        0,
        0,
        { value: 0 }
    );
    
    console.log("Withdrawal tx:", withdrawTx.hash);
    const receipt = await withdrawTx.wait();
    
    console.log("\n✅ Withdrawal successful!");
    console.log(`10,000 PCOCK sent to ${recipientAddress}`);
    
    // Parse withdrawal event
    const withdrawalEvent = receipt.events.find(e => e.event === 'Withdrawal');
    if (withdrawalEvent) {
        console.log("\nWithdrawal details:");
        console.log("  Recipient:", withdrawalEvent.args.to);
        console.log("  Nullifier hash:", withdrawalEvent.args.nullifierHash);
        console.log("  Fee:", withdrawalEvent.args.fee.toString());
    }
    
    console.log("\n===========================================");
    console.log("WITHDRAWAL COMPLETE!");
    console.log("===========================================");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });