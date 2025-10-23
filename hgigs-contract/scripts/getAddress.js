const fs = require("fs");
const path = require("path");

function getDeployments() {
  const deploymentsPath = path.join(__dirname, "..", "deployments.json");

  try {
    const data = fs.readFileSync(deploymentsPath, "utf8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Error reading deployments.json:", error.message);
    console.log("\nNo deployments found. Deploy a contract first using:");
    console.log("  npm run deploy:testnet");
    console.log("  npm run deploy:mainnet");
    process.exit(1);
  }
}

function displayDeployment(deployment, networkName) {
  if (!deployment) {
    console.log(`No deployments found for ${networkName}`);
    return;
  }

  console.log(`\n${"=".repeat(60)}`);
  console.log(`Network: ${networkName}`);
  console.log(`${"=".repeat(60)}`);
  console.log(`Proxy Address:          ${deployment.proxyAddress}`);
  console.log(`Implementation Address: ${deployment.implementationAddress}`);
  console.log(`Deployer Address:       ${deployment.deployerAddress}`);
  console.log(`Transaction Hash:       ${deployment.transactionHash}`);
  console.log(`Chain ID:               ${deployment.chainId}`);
  console.log(`Deployed At:            ${new Date(deployment.timestamp).toLocaleString()}`);
  console.log(`${"=".repeat(60)}\n`);
}

function displayHistory(history, networkName) {
  if (!history || history.length === 0) {
    console.log(`No deployment history for ${networkName}`);
    return;
  }

  console.log(`\n${"=".repeat(60)}`);
  console.log(`Deployment History for ${networkName}`);
  console.log(`${"=".repeat(60)}`);

  history.forEach((deployment, index) => {
    console.log(`\n[${index + 1}] Deployed at ${new Date(deployment.timestamp).toLocaleString()}`);
    console.log(`    Proxy:          ${deployment.proxyAddress}`);
    console.log(`    Implementation: ${deployment.implementationAddress}`);
    console.log(`    Deployer:       ${deployment.deployerAddress}`);
    console.log(`    Tx Hash:        ${deployment.transactionHash}`);
  });

  console.log(`\n${"=".repeat(60)}\n`);
}

async function main() {
  const args = process.argv.slice(2);
  const networkFlag = args.indexOf("--network");
  const historyFlag = args.indexOf("--history");
  const allFlag = args.indexOf("--all");

  const deployments = getDeployments();

  // Show history for specific network
  if (historyFlag !== -1) {
    if (networkFlag !== -1 && args[networkFlag + 1]) {
      const network = args[networkFlag + 1];
      const networkKey = network === "testnet" ? "hedera_testnet" : network === "mainnet" ? "hedera_mainnet" : network;

      if (deployments[networkKey]) {
        displayHistory(deployments[networkKey].history, networkKey);
      } else {
        console.log(`No deployments found for network: ${network}`);
      }
    } else {
      // Show history for all networks
      Object.keys(deployments).forEach(network => {
        displayHistory(deployments[network].history, network);
      });
    }
    return;
  }

  // Show all latest deployments
  if (allFlag !== -1) {
    Object.keys(deployments).forEach(network => {
      displayDeployment(deployments[network].latest, network);
    });
    return;
  }

  // Show specific network deployment
  if (networkFlag !== -1 && args[networkFlag + 1]) {
    const network = args[networkFlag + 1];
    const networkKey = network === "testnet" ? "hedera_testnet" : network === "mainnet" ? "hedera_mainnet" : network;

    if (deployments[networkKey]) {
      displayDeployment(deployments[networkKey].latest, networkKey);
    } else {
      console.log(`No deployments found for network: ${network}`);
    }
    return;
  }

  // Default: show all latest deployments
  console.log("\nLatest Contract Deployments:");
  Object.keys(deployments).forEach(network => {
    displayDeployment(deployments[network].latest, network);
  });

  console.log("\nUsage:");
  console.log("  npm run address                    # Show all latest deployments");
  console.log("  npm run address -- --network testnet   # Show testnet deployment");
  console.log("  npm run address -- --network mainnet   # Show mainnet deployment");
  console.log("  npm run address -- --all              # Show all latest deployments");
  console.log("  npm run address -- --history          # Show deployment history for all networks");
  console.log("  npm run address -- --network testnet --history  # Show testnet history\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
