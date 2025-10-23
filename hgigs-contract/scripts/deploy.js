const { ethers, upgrades } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function saveDeployment(deploymentInfo) {
  const deploymentsPath = path.join(__dirname, "..", "deployments.json");
  let deployments;

  try {
    const data = fs.readFileSync(deploymentsPath, "utf8");
    deployments = JSON.parse(data);
  } catch (error) {
    deployments = {
      hedera_testnet: { latest: null, history: [] },
      hedera_mainnet: { latest: null, history: [] }
    };
  }

  const network = deploymentInfo.network;

  if (!deployments[network]) {
    deployments[network] = { latest: null, history: [] };
  }

  deployments[network].latest = deploymentInfo;
  deployments[network].history.push(deploymentInfo);

  fs.writeFileSync(deploymentsPath, JSON.stringify(deployments, null, 2));
  console.log(`\nDeployment info saved to deployments.json`);
}

async function main() {
  console.log("Deploying upgradeable GigMarketplace contract...");

  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "HBAR");

  const GigMarketplace = await ethers.getContractFactory("GigMarketplace");

  console.log("Deploying proxy...");
  const gigMarketplace = await upgrades.deployProxy(GigMarketplace, [], {
    initializer: 'initialize'
  });

  await gigMarketplace.waitForDeployment();
  const proxyAddress = await gigMarketplace.getAddress();
  const implementationAddress = await upgrades.erc1967.getImplementationAddress(proxyAddress);
  const txHash = gigMarketplace.deploymentTransaction().hash;
  const network = hre.network.name;

  console.log("GigMarketplace proxy deployed to:", proxyAddress);
  console.log("Implementation deployed to:", implementationAddress);
  console.log("Transaction hash:", txHash);

  const deploymentInfo = {
    proxyAddress,
    implementationAddress,
    deployerAddress: deployer.address,
    transactionHash: txHash,
    network,
    timestamp: new Date().toISOString(),
    chainId: (await ethers.provider.getNetwork()).chainId.toString()
  };

  await saveDeployment(deploymentInfo);

  console.log("\nDeployment completed!");
  console.log("Proxy address:", proxyAddress);
  console.log("Implementation address:", implementationAddress);
  console.log("Network:", network);

  console.log("\nTo upgrade later, run: npm run upgrade:" + (network.includes("testnet") ? "testnet" : "mainnet"));
  console.log("Or retrieve address anytime with: npm run address -- --network " + (network.includes("testnet") ? "testnet" : "mainnet"));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });