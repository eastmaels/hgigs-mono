const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");

describe("GigMarketplace - Pull Payment Mechanism", function () {
  let marketplace;
  let owner, client, provider, other;
  let gigId, orderId;
  const gigPrice = ethers.parseEther("10");

  beforeEach(async function () {
    [owner, client, provider, other] = await ethers.getSigners();

    // Deploy upgradeable contract
    const GigMarketplace = await ethers.getContractFactory("GigMarketplace");
    marketplace = await upgrades.deployProxy(GigMarketplace, [], {
      initializer: "initialize",
    });
    await marketplace.waitForDeployment();

    // Create a gig
    await marketplace
      .connect(provider)
      .createGig("Test Gig", "Description", gigPrice, ethers.ZeroAddress);
    gigId = 1;

    // Create an order
    await marketplace.connect(client).orderGig(gigId);
    orderId = 1;

    // Pay for the order
    await marketplace.connect(client).payOrder(orderId, { value: gigPrice });

    // Complete the order
    await marketplace
      .connect(provider)
      .completeOrder(orderId, "Deliverable content");
  });

  describe("approvePayment", function () {
    it("Should allow client to approve payment", async function () {
      await expect(marketplace.connect(client).approvePayment(orderId))
        .to.emit(marketplace, "PaymentApproved")
        .withArgs(orderId, gigPrice);

      const order = await marketplace.getOrder(orderId);
      expect(order.paymentApproved).to.be.true;
    });

    it("Should not allow non-client to approve payment", async function () {
      await expect(
        marketplace.connect(other).approvePayment(orderId)
      ).to.be.revertedWith("Only order client can call this function");
    });

    it("Should not allow approval if order not completed", async function () {
      // Create a new order and pay but don't complete
      await marketplace.connect(provider).createGig(
        "Test Gig 2",
        "Description 2",
        gigPrice,
        ethers.ZeroAddress
      );
      await marketplace.connect(client).orderGig(2);
      await marketplace.connect(client).payOrder(2, { value: gigPrice });

      await expect(
        marketplace.connect(client).approvePayment(2)
      ).to.be.revertedWith("Order is not completed");
    });

    it("Should not allow approval if order not paid", async function () {
      // Create order but don't pay
      await marketplace.connect(provider).createGig(
        "Test Gig 2",
        "Description 2",
        gigPrice,
        ethers.ZeroAddress
      );
      await marketplace.connect(client).orderGig(2);

      await expect(
        marketplace.connect(client).approvePayment(2)
      ).to.be.revertedWith("Order is not paid yet");
    });

    it("Should not allow approval if payment already released", async function () {
      // Release payment first
      await marketplace.connect(client).releasePayment(orderId);

      await expect(
        marketplace.connect(client).approvePayment(orderId)
      ).to.be.revertedWith("Payment already released");
    });

    it("Should not allow double approval", async function () {
      await marketplace.connect(client).approvePayment(orderId);

      await expect(
        marketplace.connect(client).approvePayment(orderId)
      ).to.be.revertedWith("Payment already approved");
    });
  });

  describe("claimPayment", function () {
    beforeEach(async function () {
      // Approve payment for all claim tests
      await marketplace.connect(client).approvePayment(orderId);
    });

    it("Should allow provider to claim approved payment", async function () {
      const providerBalanceBefore = await ethers.provider.getBalance(
        provider.address
      );
      const ownerBalanceBefore = await ethers.provider.getBalance(owner.address);

      await expect(marketplace.connect(provider).claimPayment(orderId))
        .to.emit(marketplace, "PaymentReleased")
        .withArgs(orderId, provider.address, ethers.parseEther("9.5")); // 95% after 5% fee

      const order = await marketplace.getOrder(orderId);
      expect(order.paymentReleased).to.be.true;

      // Check balances changed correctly
      const providerBalanceAfter = await ethers.provider.getBalance(
        provider.address
      );
      const ownerBalanceAfter = await ethers.provider.getBalance(owner.address);

      // Provider should receive 95% (minus gas fees)
      expect(providerBalanceAfter).to.be.gt(providerBalanceBefore);

      // Owner should receive 5% platform fee
      expect(ownerBalanceAfter).to.be.gt(ownerBalanceBefore);
    });

    it("Should not allow non-provider to claim payment", async function () {
      await expect(
        marketplace.connect(other).claimPayment(orderId)
      ).to.be.revertedWith("Only order provider can claim payment");
    });

    it("Should not allow claim if payment not approved", async function () {
      // Create and complete a new order but don't approve
      await marketplace.connect(provider).createGig(
        "Test Gig 2",
        "Description 2",
        gigPrice,
        ethers.ZeroAddress
      );
      await marketplace.connect(client).orderGig(2);
      await marketplace.connect(client).payOrder(2, { value: gigPrice });
      await marketplace
        .connect(provider)
        .completeOrder(2, "Deliverable content");

      await expect(
        marketplace.connect(provider).claimPayment(2)
      ).to.be.revertedWith("Payment not approved for claim");
    });

    it("Should not allow double claim", async function () {
      await marketplace.connect(provider).claimPayment(orderId);

      await expect(
        marketplace.connect(provider).claimPayment(orderId)
      ).to.be.revertedWith("Payment already released");
    });

    it("Should not allow claim if order not completed", async function () {
      // Create order, pay, approve but don't complete
      await marketplace.connect(provider).createGig(
        "Test Gig 2",
        "Description 2",
        gigPrice,
        ethers.ZeroAddress
      );
      await marketplace.connect(client).orderGig(2);
      await marketplace.connect(client).payOrder(2, { value: gigPrice });

      // Try to approve without completing (this should fail in approvePayment)
      await expect(
        marketplace.connect(client).approvePayment(2)
      ).to.be.revertedWith("Order is not completed");
    });
  });

  describe("Pull vs Push Payment Interaction", function () {
    it("Should allow client to push payment after approving", async function () {
      // Approve payment first
      await marketplace.connect(client).approvePayment(orderId);

      const order1 = await marketplace.getOrder(orderId);
      expect(order1.paymentApproved).to.be.true;
      expect(order1.paymentReleased).to.be.false;

      // Client can still release payment (push) even after approving
      await marketplace.connect(client).releasePayment(orderId);

      const order2 = await marketplace.getOrder(orderId);
      expect(order2.paymentReleased).to.be.true;
    });

    it("Should not allow claim after client has pushed payment", async function () {
      // Approve payment
      await marketplace.connect(client).approvePayment(orderId);

      // Client pushes payment
      await marketplace.connect(client).releasePayment(orderId);

      // Provider should not be able to claim
      await expect(
        marketplace.connect(provider).claimPayment(orderId)
      ).to.be.revertedWith("Payment already released");
    });

    it("Should work with direct push without approval", async function () {
      // Skip approval and go straight to release payment
      await expect(marketplace.connect(client).releasePayment(orderId))
        .to.emit(marketplace, "PaymentReleased")
        .withArgs(orderId, provider.address, ethers.parseEther("9.5"));

      const order = await marketplace.getOrder(orderId);
      expect(order.paymentReleased).to.be.true;
      expect(order.paymentApproved).to.be.false; // Never approved
    });
  });

  describe("Platform Fee Distribution with Pull Payment", function () {
    it("Should distribute platform fee correctly when provider claims", async function () {
      await marketplace.connect(client).approvePayment(orderId);

      const providerBalanceBefore = await ethers.provider.getBalance(
        provider.address
      );
      const ownerBalanceBefore = await ethers.provider.getBalance(owner.address);
      const contractBalanceBefore = await ethers.provider.getBalance(
        await marketplace.getAddress()
      );

      const tx = await marketplace.connect(provider).claimPayment(orderId);
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed * receipt.gasPrice;

      const providerBalanceAfter = await ethers.provider.getBalance(
        provider.address
      );
      const ownerBalanceAfter = await ethers.provider.getBalance(owner.address);
      const contractBalanceAfter = await ethers.provider.getBalance(
        await marketplace.getAddress()
      );

      // Platform fee is 5% of gigPrice
      const platformFee = (gigPrice * 5n) / 100n;
      const providerAmount = gigPrice - platformFee;

      // Convert to tinybars for Hedera
      const providerAmountTinybars = providerAmount / 10n ** 10n;
      const platformFeeTinybars = platformFee / 10n ** 10n;

      // Check provider received correct amount (minus gas)
      const providerGain = providerBalanceAfter - providerBalanceBefore + gasUsed;
      expect(providerGain).to.equal(providerAmountTinybars);

      // Check owner received platform fee
      expect(ownerBalanceAfter - ownerBalanceBefore).to.equal(
        platformFeeTinybars
      );

      // Check contract balance decreased by total amount
      expect(contractBalanceBefore - contractBalanceAfter).to.equal(
        providerAmountTinybars + platformFeeTinybars
      );
    });
  });

  describe("Multiple Orders with Mixed Payment Methods", function () {
    it("Should handle multiple orders with different payment methods", async function () {
      // Order 1: Already paid and completed (from beforeEach)

      // Order 2: Approve and claim
      await marketplace.connect(provider).createGig(
        "Test Gig 2",
        "Description 2",
        gigPrice,
        ethers.ZeroAddress
      );
      await marketplace.connect(client).orderGig(2);
      await marketplace.connect(client).payOrder(2, { value: gigPrice });
      await marketplace
        .connect(provider)
        .completeOrder(2, "Deliverable 2");
      await marketplace.connect(client).approvePayment(2);
      await marketplace.connect(provider).claimPayment(2);

      // Order 3: Direct push payment
      await marketplace.connect(provider).createGig(
        "Test Gig 3",
        "Description 3",
        gigPrice,
        ethers.ZeroAddress
      );
      await marketplace.connect(client).orderGig(3);
      await marketplace.connect(client).payOrder(3, { value: gigPrice });
      await marketplace
        .connect(provider)
        .completeOrder(3, "Deliverable 3");
      await marketplace.connect(client).releasePayment(3);

      // Verify all orders are released
      const order1 = await marketplace.getOrder(1);
      const order2 = await marketplace.getOrder(2);
      const order3 = await marketplace.getOrder(3);

      expect(order1.paymentReleased).to.be.false; // Not released yet in this test
      expect(order2.paymentReleased).to.be.true;
      expect(order3.paymentReleased).to.be.true;

      expect(order2.paymentApproved).to.be.true;
      expect(order3.paymentApproved).to.be.false; // Never approved, went straight to release
    });
  });
});
