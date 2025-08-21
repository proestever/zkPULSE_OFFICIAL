const { ethers } = require("hardhat");
const fs = require("fs");

// Import Tornado utilities
const { toHex, rbigint, pedersenHash } = require("../src/utils");

async function main() {
    console.log("===========================================");
    console.log("TESTING PCOCK 10K TORNADO DEPOSIT");
    console.log("===========================================\n");
    
    // Load deployment info
    const deployment = JSON.parse(fs.readFileSync('deployment-pcock-10k.json', 'utf8'));
    const TORNADO_ADDRESS = deployment.contracts.tornado_PCOCK_10K;
    const PCOCK_ADDRESS = deployment.tokenAddress;
    
    const [signer] = await ethers.getSigners();
    console.log("Testing with account:", signer.address);
    
    // Get PCOCK token contract
    const PCOCK_ABI = [
        "function balanceOf(address) view returns (uint256)",
        "function approve(address spender, uint256 amount) returns (bool)",
        "function allowance(address owner, address spender) view returns (uint256)",
        "function decimals() view returns (uint8)"
    ];
    
    const pcock = new ethers.Contract(PCOCK_ADDRESS, PCOCK_ABI, signer);
    
    // Check PCOCK balance
    const balance = await pcock.balanceOf(signer.address);
    const decimals = await pcock.decimals();
    console.log("PCOCK Balance:", ethers.utils.formatUnits(balance, decimals), "PCOCK");
    
    // Check if we have enough PCOCK
    const requiredAmount = ethers.utils.parseUnits("10000", decimals);
    if (balance.lt(requiredAmount)) {
        console.error("❌ Insufficient PCOCK balance. Need at least 10,000 PCOCK");
        return;
    }
    
    // Get Tornado contract
    const Tornado_ABI = [
        "function deposit(bytes32 _commitment) external",
        "function denomination() view returns (uint256)",
        "event Deposit(bytes32 indexed commitment, uint32 leafIndex, uint256 timestamp)"
    ];
    
    const tornado = new ethers.Contract(TORNADO_ADDRESS, Tornado_ABI, signer);
    
    // Check denomination
    const denomination = await tornado.denomination();
    console.log("Pool denomination:", ethers.utils.formatUnits(denomination, decimals), "PCOCK\n");
    
    // Generate deposit note
    const deposit = {
        secret: rbigint(31),
        nullifier: rbigint(31)
    };
    
    const preimage = Buffer.concat([
        deposit.nullifier.toBuffer('le', 31),
        deposit.secret.toBuffer('le', 31)
    ]);
    
    const commitment = pedersenHash(preimage);
    const commitmentHex = toHex(commitment);
    
    const note = toHex(preimage, 62);
    const noteString = `tornado-pcock-10k-369-${note}`;
    
    console.log("Generated deposit note:");
    console.log(noteString);
    console.log("\n⚠️  SAVE THIS NOTE - YOU NEED IT TO WITHDRAW!\n");
    
    // Approve PCOCK spending
    console.log("1. Approving PCOCK spending...");
    const currentAllowance = await pcock.allowance(signer.address, TORNADO_ADDRESS);
    
    if (currentAllowance.lt(denomination)) {
        const approveTx = await pcock.approve(TORNADO_ADDRESS, denomination);
        console.log("   Approval tx:", approveTx.hash);
        await approveTx.wait();
        console.log("   ✅ PCOCK spending approved\n");
    } else {
        console.log("   ✅ PCOCK already approved\n");
    }
    
    // Make deposit
    console.log("2. Making deposit to Tornado pool...");
    const depositTx = await tornado.deposit(commitmentHex);
    console.log("   Deposit tx:", depositTx.hash);
    
    const receipt = await depositTx.wait();
    console.log("   ✅ Deposit successful!\n");
    
    // Parse events
    const depositEvent = receipt.events.find(e => e.event === 'Deposit');
    if (depositEvent) {
        console.log("Deposit details:");
        console.log("  Commitment:", depositEvent.args.commitment);
        console.log("  Leaf index:", depositEvent.args.leafIndex.toString());
        console.log("  Timestamp:", new Date(depositEvent.args.timestamp * 1000).toISOString());
    }
    
    // Save note to file
    const noteData = {
        note: noteString,
        commitment: commitmentHex,
        token: "PCOCK",
        denomination: "10000",
        timestamp: new Date().toISOString(),
        txHash: depositTx.hash,
        contract: TORNADO_ADDRESS
    };
    
    fs.writeFileSync(
        `pcock-deposit-${Date.now()}.json`,
        JSON.stringify(noteData, null, 2)
    );
    
    console.log("\n📄 Deposit note saved to file");
    console.log("\n===========================================");
    console.log("DEPOSIT COMPLETE!");
    console.log("===========================================");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });