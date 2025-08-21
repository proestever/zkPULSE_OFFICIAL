const hre = require("hardhat");

async function main() {
    // Read deployment info
    const fs = require('fs');
    const deployment = JSON.parse(fs.readFileSync('deployment-pcock-10k.json', 'utf8'));
    
    console.log("===========================================");
    console.log("VERIFYING PCOCK 10K TORNADO CONTRACT");
    console.log("===========================================\n");
    
    const contractAddress = deployment.contracts.tornado_PCOCK_10K;
    const PCOCK_ADDRESS = deployment.tokenAddress;
    const HASHER_ADDRESS = deployment.contracts.hasher;
    const VERIFIER_ADDRESS = deployment.contracts.verifier;
    
    console.log("Contract to verify:", contractAddress);
    console.log("Token:", deployment.token);
    console.log("Network: PulseChain (Chain ID: 369)\n");
    
    // Verify on Otterscan/Sourcify
    try {
        await hre.run("verify:verify", {
            address: contractAddress,
            constructorArguments: [
                VERIFIER_ADDRESS,
                HASHER_ADDRESS,
                ethers.utils.parseUnits("10000", 18), // 10,000 PCOCK
                20, // Merkle tree height
                PCOCK_ADDRESS
            ],
            contract: "contracts/ERC20Tornado_PCOCK.sol:ERC20Tornado_PCOCK"
        });
        
        console.log("✅ Contract verified successfully!");
    } catch (error) {
        if (error.message.includes("already verified")) {
            console.log("✅ Contract is already verified!");
        } else {
            console.error("❌ Verification failed:", error);
            console.log("\nManual verification parameters:");
            console.log("Contract: ERC20Tornado_PCOCK");
            console.log("Constructor arguments:");
            console.log("  - Verifier:", VERIFIER_ADDRESS);
            console.log("  - Hasher:", HASHER_ADDRESS);
            console.log("  - Denomination: 10000000000000000000000 (10,000 * 10^18)");
            console.log("  - Merkle Tree Height: 20");
            console.log("  - Token:", PCOCK_ADDRESS);
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });