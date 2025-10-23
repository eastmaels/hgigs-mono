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

function updateDeploymentImplementation(network, proxyAddress, newImplementationAddress, txHash, deployerAddress) {
  const deploymentsPath = path.join(__dirname, "..", "deployments.json");

  try {
    const data = fs.readFileSync(deploymentsPath, "utf8");
    const deployments = JSON.parse(data);

    if (deployments[network]?.latest) {
      deployments[network].latest.implementationAddress = newImplementationAddress;
      deployments[network].latest.lastUpgradeHash = txHash;
      deployments[network].latest.lastUpgradeTimestamp = new Date().toISOString();
      deployments[network].latest.lastUpgradeBy = deployerAddress;

      // Update in history as well
      const historyIndex = deployments[network].history.findIndex(
        dep => dep.proxyAddress === proxyAddress
      );
      if (historyIndex !== -1) {
        deployments[network].history[historyIndex] = deployments[network].latest;
      }

      fs.writeFileSync(deploymentsPath, JSON.stringify(deployments, null, 2));
      console.log("\nDeployment info updated in deployments.json");
    }
  } catch (error) {
    console.warn("Warning: Could not update deployments.json:", error.message);
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
      console.error("  1. Set PROXY_ADDRESS environment variable: PROXY_ADDRESS=0x... npm run upgrade:testnet");
      console.error("  2. Deploy a contract first: npm run deploy:testnet");
      process.exit(1);
    }
  }

  console.log("\nUpgrading GigMarketplace contract...");
  console.log("Proxy address:", PROXY_ADDRESS);

  const [deployer] = await ethers.getSigners();
  console.log("Upgrading with account:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "HBAR");

  // Get the new contract factory
  const GigMarketplaceV2 = await ethers.getContractFactory("GigMarketplace");

  console.log("Upgrading proxy...");
  const upgraded = await upgrades.upgradeProxy(PROXY_ADDRESS, GigMarketplaceV2);
  await upgraded.waitForDeployment();

  const newImplementationAddress = await upgrades.erc1967.getImplementationAddress(PROXY_ADDRESS);
  const upgradeTx = upgraded.deploymentTransaction();
  const txHash = upgradeTx ? upgradeTx.hash : "N/A";

  console.log("Contract upgraded!");
  console.log("Proxy address (unchanged):", PROXY_ADDRESS);
  console.log("New implementation address:", newImplementationAddress);
  console.log("Network:", network);

  // Update deployments.json with new implementation address
  updateDeploymentImplementation(network, PROXY_ADDRESS, newImplementationAddress, txHash, deployer.address);

  // Verify the upgrade worked
  console.log("\nVerifying upgrade...");
  const contract = await ethers.getContractAt("GigMarketplace", PROXY_ADDRESS);
  const owner = await contract.owner();
  console.log("Contract owner:", owner);
  console.log("✅ Upgrade completed successfully!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });