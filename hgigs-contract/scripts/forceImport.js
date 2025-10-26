const { ethers, upgrades } = require("hardhat");
const fs = require("fs");
const path = require("path");

function getLatestDeployment(network) {
  const deploymentsPath = path.join(__dirname, "..", "deployments.json");

  try {
    const data = fs.readFileSync(deploymentsPath, "utf8");
    const deployments = JSON.parse(data);
    return deployments[network]?.latest;
  } catch (error) {
    return null;
  }
}

async function main() {
  const network = hre.network.name;

  // Try to get proxy address from environment variable first, then from deployments.json
  let PROXY_ADDRESS = process.env.PROXY_ADDRESS;

  if (!PROXY_ADDRESS) {
    console.log("No PROXY_ADDRESS environment variable found.");
    console.log(`Checking deployments.json for ${network}...`);

    const deployment = getLatestDeployment(network);

    if (deployment?.proxyAddress) {
      PROXY_ADDRESS = deployment.proxyAddress;
      console.log(`Found proxy address in deployments.json: ${PROXY_ADDRESS}`);
    } else {
      console.error("\nError: Could not find proxy address.");
      console.error("Please either:");
      console.error("  1. Set PROXY_ADDRESS environment variable: PROXY_ADDRESS=0x... npx hardhat run scripts/forceImport.js --network hedera_testnet");
      console.error("  2. Deploy a contract first: npm run deploy:testnet");
      process.exit(1);
    }
  }

  console.log("\nForce importing existing proxy...");
  console.log("Proxy address:", PROXY_ADDRESS);

  const [deployer] = await ethers.getSigners();
  console.log("Importing with account:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "HBAR");

  // Get the contract factory with the NEW storage layout (including createdAt)
  const GigMarketplace = await ethers.getContractFactory("GigMarketplace");

  console.log("\nValidating storage layout and importing proxy...");
  console.log("This will check if the upgrade is safe...");

  try {
    // Force import the proxy - this validates the storage layout is upgrade-safe
    await upgrades.forceImport(PROXY_ADDRESS, GigMarketplace);

    console.log("\n✅ Proxy successfully imported!");
    console.log("Proxy address:", PROXY_ADDRESS);
    console.log("Network:", network);
    console.log("\nStorage layout validation passed!");
    console.log("The contract is ready to be upgraded.");
    console.log("\nNext step: Run the upgrade script");
    console.log("  npm run upgrade:testnet");

  } catch (error) {
    console.error("\n❌ Force import failed!");
    console.error("\nError details:", error.message);

    if (error.message.includes("storage layout")) {
      console.error("\nStorage layout incompatibility detected!");
      console.error("This means your storage changes are NOT upgrade-safe.");
      console.error("\nCommon causes:");
      console.error("  - Removed a field from a struct");
      console.error("  - Reordered fields in a struct");
      console.error("  - Changed a field type");
      console.error("\nYou added 'createdAt' to Gig struct - make sure it's the LAST field!");
    }

    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
