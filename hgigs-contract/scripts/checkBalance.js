const { ethers } = require("hardhat");
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

  // Get proxy address
  let PROXY_ADDRESS = process.env.PROXY_ADDRESS;

  if (!PROXY_ADDRESS) {
    console.log(`Checking deployments.json for ${network}...`);
    const deployment = getLatestDeployment(network);

    if (deployment?.proxyAddress) {
      PROXY_ADDRESS = deployment.proxyAddress;
      console.log(`Found proxy address: ${PROXY_ADDRESS}`);
    } else {
      console.error("\nError: Could not find proxy address.");
      process.exit(1);
    }
  }

  console.log("\n=== Contract Balance Check ===");
  console.log("Network:", network);
  console.log("Contract Address:", PROXY_ADDRESS);

  const provider = ethers.provider;

  // Get contract balance
  const balance = await provider.getBalance(PROXY_ADDRESS);
  const balanceInHbar = ethers.formatEther(balance);

  console.log("\nContract Balance:");
  console.log("  Wei:", balance.toString());
  console.log("  HBAR:", balanceInHbar);

  // Get block number for reference
  const blockNumber = await provider.getBlockNumber();
  console.log("\nCurrent Block:", blockNumber);

  // Try to get the contract and check owner
  try {
    const GigMarketplace = await ethers.getContractFactory("GigMarketplace");
    const contract = GigMarketplace.attach(PROXY_ADDRESS);

    const owner = await contract.owner();
    console.log("\nContract Owner:", owner);

    const platformFee = await contract.platformFeePercent();
    console.log("Platform Fee:", platformFee.toString() + "%");

    const nextOrderId = await contract.nextOrderId();
    console.log("Next Order ID:", nextOrderId.toString());
  } catch (error) {
    console.log("\nCould not read contract state:", error.message);
  }

  console.log("\n=== End Balance Check ===\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
