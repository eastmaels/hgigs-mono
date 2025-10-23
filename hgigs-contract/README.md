# Gig Marketplace Smart Contract

A decentralized, upgradeable marketplace smart contract for freelance services, designed for deployment on the Hedera network.

## Overview

This smart contract enables service providers to offer their skills and clients to purchase services in a trustless environment. The contract includes escrow functionality to protect both parties and ensure fair transactions.

## Features

- **Gig Management**: Service providers can create, update, and deactivate their service listings
- **Order System**: Clients can order services with automatic escrow payment
- **Escrow Protection**: Payments are held in the contract until work is completed
- **Platform Fee**: Configurable fee system (default 5%)
- **Event Logging**: All major actions are logged for transparency
- **Upgradeable**: Uses OpenZeppelin's proxy pattern for seamless upgrades
- **Security**: Built-in reentrancy protection, pausable functionality, and access controls

## Contract Structure

### Main Entities

#### Gig
```solidity
struct Gig {
    uint256 id;
    address payable provider;
    string title;
    string description;
    uint256 price;
    bool isActive;
    bool isCompleted;
}
```

#### Order
```solidity
struct Order {
    uint256 id;
    uint256 gigId;
    address payable client;
    address payable provider;
    uint256 amount;
    bool isCompleted;
    bool isPaid;
    uint256 createdAt;
}
```

## Core Functions

### For Service Providers

- `createGig(title, description, price)` - Create a new service listing
- `updateGig(gigId, title, description, price)` - Update existing gig details
- `deactivateGig(gigId)` - Remove gig from active listings
- `completeOrder(orderId)` - Mark an order as completed

### For Clients

- `orderGig(gigId)` - Order a service (requires payment)
- `releasePayment(orderId)` - Release escrowed payment to provider

### View Functions

- `getGig(gigId)` - Get gig details
- `getOrder(orderId)` - Get order details
- `getProviderGigs(address)` - Get all gigs by a provider
- `getClientOrders(address)` - Get all orders by a client

## Workflow

1. **Service Provider** creates a gig with `createGig()`
2. **Client** discovers the gig and places an order with `orderGig()` (includes payment)
3. Payment is held in escrow within the contract
4. **Service Provider** completes the work and calls `completeOrder()`
5. **Client** verifies the work and calls `releasePayment()`
6. Contract distributes payment: (95% to provider, 5% platform fee)

## Deployment

### Prerequisites

1. Node.js and npm installed
2. Hedera account with HBAR balance
3. Private key for deployment

### Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment:
```bash
cp .env.example .env
# Edit .env and add your private key
```

3. Compile contract:
```bash
npm run compile
```

4. Deploy to testnet:
```bash
npm run deploy:testnet
```

5. Deploy to mainnet:
```bash
npm run deploy:mainnet
```

The deployment script will automatically save the contract address and deployment information to `deployments.json`.

## Deployment Tracking

The project includes an automatic deployment tracking system that saves contract addresses and deployment details to `deployments.json`. This makes it easy to retrieve contract addresses and manage deployments across different networks.

### Retrieving Contract Addresses

After deploying a contract, you can retrieve the address using:

```bash
# Show all latest deployments
npm run address

# Show specific network deployment
npm run address -- --network testnet
npm run address -- --network mainnet

# Show deployment history
npm run address -- --history
npm run address -- --network testnet --history
```

### Deployment Information Stored

The tracking system automatically saves:
- **Proxy Address** - The main contract address (this never changes during upgrades)
- **Implementation Address** - The address of the implementation contract
- **Deployer Address** - The account that deployed the contract
- **Transaction Hash** - The deployment transaction hash
- **Network** - Which network it was deployed to (hedera_testnet/hedera_mainnet)
- **Timestamp** - When the deployment occurred
- **Chain ID** - The chain ID of the network

### deployments.json Structure

```json
{
  "hedera_testnet": {
    "latest": {
      "proxyAddress": "0x...",
      "implementationAddress": "0x...",
      "deployerAddress": "0x...",
      "transactionHash": "0x...",
      "network": "hedera_testnet",
      "timestamp": "2025-10-23T12:00:00.000Z",
      "chainId": "296"
    },
    "history": [...]
  },
  "hedera_mainnet": {
    "latest": {...},
    "history": [...]
  }
}
```

## Upgrading the Contract

The contract uses OpenZeppelin's upgradeable proxy pattern, allowing for seamless upgrades while preserving state and addresses.

### Upgrade Process

1. **Make changes** to the `GigMarketplace.sol` contract
2. **Compile** the updated contract:
```bash
npm run compile
```

3. **Deploy the upgrade**:
```bash
# For testnet - automatically uses address from deployments.json
npm run upgrade:testnet

# For mainnet - automatically uses address from deployments.json
npm run upgrade:mainnet

# Or specify a custom proxy address
PROXY_ADDRESS=0x... npm run upgrade:testnet
```

The upgrade script will automatically:
- Read the proxy address from `deployments.json` if not provided via environment variable
- Deploy the new implementation contract
- Update the proxy to point to the new implementation
- Save the new implementation address to `deployments.json`

### Upgrade Safety

- **State preservation**: All existing data (gigs, orders, balances) remains intact
- **Address continuity**: The proxy address never changes - users and integrations continue working
- **Version compatibility**: New versions must be compatible with existing storage layout

### Admin Functions

The contract owner has additional control functions:
- `pause()` - Temporarily disable contract interactions
- `unpause()` - Re-enable contract interactions
- `setPlatformFee()` - Update platform fee percentage
- `withdrawPlatformFees()` - Withdraw accumulated fees

## Network Configuration

The contract is configured for Hedera networks:

- **Testnet**: Chain ID 296, RPC: https://testnet.hashio.io/api
- **Mainnet**: Chain ID 295, RPC: https://mainnet.hashio.io/api

## Security Features

- **Access Control**: Only gig providers can update their gigs and mark orders complete
- **Payment Validation**: Exact payment amount required for orders
- **Self-Order Prevention**: Providers cannot order their own gigs
- **Owner Controls**: Platform fee management and fee withdrawal

## Events

The contract emits events for all major actions:
- `GigCreated` - New gig created
- `GigUpdated` - Gig details updated
- `GigDeactivated` - Gig removed from listings
- `OrderCreated` - New order placed
- `OrderCompleted` - Work marked as complete
- `PaymentReleased` - Payment sent to provider

## Platform Administration

Contract owner can:
- Set platform fee percentage (max 10%)
- Withdraw accumulated platform fees

## Gas Optimization

The contract is designed with gas efficiency in mind:
- Minimal storage usage
- Efficient data structures
- Batch operations where possible

## License

MIT License