const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const network = hre.network.name;
  console.log(`\nVerifying contracts on ${network}...`);

  // Read deployment info
  const deploymentsPath = path.join(__dirname, "..", "deployments.json");
  let deployments;

  try {
    const data = fs.readFileSync(deploymentsPath, "utf8");
    deployments = JSON.parse(data);
  } catch (error) {
    console.error("Error reading deployments.json:", error.message);
    console.error("Please deploy the contract first using: npm run deploy:testnet or npm run deploy:mainnet");
    process.exit(1);
  }

  const deployment = deployments[network]?.latest;

  if (!deployment) {
    console.error(`No deployment found for network: ${network}`);
    console.error("Available networks:", Object.keys(deployments));
    process.exit(1);
  }

  const { proxyAddress, implementationAddress } = deployment;

  console.log("\nDeployment Info:");
  console.log("================");
  console.log("Proxy Address:", proxyAddress);
  console.log("Implementation Address:", implementationAddress);
  console.log("Network:", network);

  try {
    // Verify the implementation contract
    console.log("\n📝 Verifying Implementation Contract...");
    console.log("Address:", implementationAddress);

    await hre.run("verify:verify", {
      address: implementationAddress,
      constructorArguments: [],
    });

    console.log("✅ Implementation contract verified successfully!");

  } catch (error) {
    if (error.message.toLowerCase().includes("already verified")) {
      console.log("✅ Implementation contract is already verified!");
    } else {
      console.error("❌ Error verifying implementation contract:", error.message);
    }
  }

  try {
    // Verify the proxy contract
    console.log("\n📝 Verifying Proxy Contract...");
    console.log("Address:", proxyAddress);

    await hre.run("verify:verify", {
      address: proxyAddress,
      constructorArguments: [],
    });

    console.log("✅ Proxy contract verified successfully!");

  } catch (error) {
    if (error.message.toLowerCase().includes("already verified")) {
      console.log("✅ Proxy contract is already verified!");
    } else {
      console.error("❌ Error verifying proxy contract:", error.message);
      console.log("\n💡 Note: Proxy verification may require manual verification on HashScan.");
      console.log("   Visit: https://hashscan.io/testnet/contract/" + proxyAddress);
    }
  }

  console.log("\n✨ Verification process completed!");
  console.log("\nView your contracts:");
  console.log("Proxy:", `https://hashscan.io/${network.includes('testnet') ? 'testnet' : 'mainnet'}/contract/${proxyAddress}`);
  console.log("Implementation:", `https://hashscan.io/${network.includes('testnet') ? 'testnet' : 'mainnet'}/contract/${implementationAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
