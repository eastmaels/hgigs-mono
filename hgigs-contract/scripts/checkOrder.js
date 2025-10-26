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
  const orderId = process.env.ORDER_ID || "1";

  // Get proxy address
  const deployment = getLatestDeployment(network);
  const PROXY_ADDRESS = deployment?.proxyAddress;

  if (!PROXY_ADDRESS) {
    console.error("Could not find proxy address");
    process.exit(1);
  }

  console.log("\n=== Order Details Check ===");
  console.log("Contract Address:", PROXY_ADDRESS);
  console.log("Order ID:", orderId);

  const GigMarketplace = await ethers.getContractFactory("GigMarketplace");
  const contract = GigMarketplace.attach(PROXY_ADDRESS);

  // Get contract balance
  const contractBalance = await ethers.provider.getBalance(PROXY_ADDRESS);
  console.log("\nContract Balance:");
  console.log("  Wei:", contractBalance.toString());
  console.log("  HBAR:", ethers.formatEther(contractBalance));

  // Get order details
  const order = await contract.getOrder(orderId);
  console.log("\nOrder Details:");
  console.log("  ID:", order.id.toString());
  console.log("  Gig ID:", order.gigId.toString());
  console.log("  Client:", order.client);
  console.log("  Provider:", order.provider);
  console.log("  Amount (wei):", order.amount.toString());
  console.log("  Amount (HBAR):", ethers.formatEther(order.amount));
  console.log("  Paid Amount (wei):", order.paidAmount.toString());
  console.log("  Paid Amount (HBAR):", ethers.formatEther(order.paidAmount));
  console.log("  Is Paid:", order.isPaid);
  console.log("  Is Completed:", order.isCompleted);
  console.log("  Payment Released:", order.paymentReleased);

  // Calculate what would be needed
  const platformFee = await contract.platformFeePercent();
  const feeAmount = (order.amount * platformFee) / 100n;
  const providerAmount = order.amount - feeAmount;

  console.log("\nPayment Breakdown:");
  console.log("  Platform Fee %:", platformFee.toString());
  console.log("  Provider Amount (wei):", providerAmount.toString());
  console.log("  Provider Amount (HBAR):", ethers.formatEther(providerAmount));
  console.log("  Platform Fee (wei):", feeAmount.toString());
  console.log("  Platform Fee (HBAR):", ethers.formatEther(feeAmount));
  console.log("  Total Needed (wei):", order.amount.toString());
  console.log("  Total Needed (HBAR):", ethers.formatEther(order.amount));

  console.log("\nBalance Check:");
  console.log("  Contract has (wei):", contractBalance.toString());
  console.log("  Needs (wei):", order.amount.toString());
  console.log("  Sufficient?", contractBalance >= order.amount ? "YES ✅" : "NO ❌");
  console.log("  Difference (wei):", (contractBalance - order.amount).toString());

  console.log("\n=== End Order Check ===\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
