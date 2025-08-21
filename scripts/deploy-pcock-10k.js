const hre = require("hardhat");
const { ethers } = require("hardhat");

async function main() {
    console.log("===========================================");
    console.log("DEPLOYING PCOCK 10K TORNADO POOL");
    console.log("===========================================\n");
    
    // PCOCK Token Contract Address on PulseChain
    const PCOCK_ADDRESS = "0xc10A4Ed9b4042222d69ff0B374eddd47ed90fC1F";
    
    // Existing infrastructure contracts (already deployed)
    const HASHER_ADDRESS = "0x5Aa1eE340a2E9F199f068DB35a855956429067cf";
    const VERIFIER_ADDRESS = "0x165A378540d26F1f9BEB97F30670B5B8Eb3f8aD5";
    
    // Configuration
    const DENOMINATION = ethers.utils.parseUnits("10000", 18); // 10,000 PCOCK (assuming 18 decimals)
    const MERKLE_TREE_HEIGHT = 20;
    
    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with account:", deployer.address);
    
    const balance = await deployer.getBalance();
    console.log("Account balance:", ethers.utils.formatEther(balance), "PLS\n");
    
    // Deploy ERC20Tornado for PCOCK
    console.log("Deploying PCOCK 10K Tornado Pool...");
    const ERC20Tornado = await ethers.getContractFactory("ERC20Tornado_PCOCK");
    const tornado = await ERC20Tornado.deploy(
        VERIFIER_ADDRESS,
        HASHER_ADDRESS,
        DENOMINATION,
        MERKLE_TREE_HEIGHT,
        PCOCK_ADDRESS
    );
    
    await tornado.deployed();
    
    console.log("\n✅ PCOCK 10K Tornado Pool deployed!");
    console.log("Contract address:", tornado.address);
    console.log("Token address:", PCOCK_ADDRESS);
    console.log("Denomination:", "10,000 PCOCK");
    console.log("Hasher:", HASHER_ADDRESS);
    console.log("Verifier:", VERIFIER_ADDRESS);
    
    // Save deployment info
    const deployment = {
        network: "PulseChain",
        chainId: 369,
        token: "PCOCK (PulseChain Peacock)",
        tokenAddress: PCOCK_ADDRESS,
        denomination: "10000",
        contracts: {
            tornado_PCOCK_10K: tornado.address,
            hasher: HASHER_ADDRESS,
            verifier: VERIFIER_ADDRESS
        },
        deploymentBlock: (await ethers.provider.getBlockNumber()),
        timestamp: new Date().toISOString()
    };
    
    const fs = require('fs');
    fs.writeFileSync(
        'deployment-pcock-10k.json',
        JSON.stringify(deployment, null, 2)
    );
    
    console.log("\n📄 Deployment info saved to deployment-pcock-10k.json");
    console.log("\n===========================================");
    console.log("DEPLOYMENT COMPLETE!");
    console.log("===========================================");
    console.log("\nNEXT STEPS:");
    console.log("1. Verify the contract on Otterscan");
    console.log("2. Update frontend configuration");
    console.log("3. Test deposit and withdrawal");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });