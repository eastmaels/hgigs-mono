# HGigs - Decentralized Gig Marketplace on Hedera

A full-stack decentralized marketplace for freelance services built on the Hedera network. This monorepo contains both the smart contract and the Next.js frontend application.

* [Hashgraph Dev Course Certificate](https://drive.google.com/file/d/1H-6JSYSW5k7c9bpnnh4tCmtCz_TMbILm/view?usp=sharing)
* [Pitchdeck](https://docs.google.com/presentation/d/1ZIy5HskM6jHk-AcKBwea-5zjxvwJstGs/edit?usp=sharing&ouid=102514457800052031008&rtpof=true&sd=true)
* [Demo Video](https://youtu.be/15a6i9iUElc)
* [Demo App](https://hgigs.vercel.app/)

## Project Structure

```
hgigs-mono/
├── hgigs-contract/    # Smart contract (Hardhat + Solidity)
└── hgigs-dapp/        # Frontend application (Next.js + TypeScript)
```

## Features

- **Decentralized Service Marketplace**: Create and browse freelance gigs
- **Escrow Protection**: Automatic payment escrow for buyer/seller protection
- **Hedera Integration**: Built on Hedera's fast and eco-friendly network
- **Wallet Integration**: Connect with MetaMask and other Web3 wallets
- **Upgradeable Contracts**: OpenZeppelin proxy pattern for seamless upgrades
- **Modern UI**: Built with Next.js 14, React 18, and Tailwind CSS
- **Type Safety**: Full TypeScript support

## Prerequisites

Before getting started, ensure you have the following installed:

- **Node.js**: v16.x or higher
- **npm**: v8.x or higher
- **Git**: Latest version

### Hedera Account Setup

1. Create a Hedera testnet account at [Hedera Portal](https://portal.hedera.com/)
2. Get testnet HBAR from the [Hedera Faucet](https://portal.hedera.com/faucet)
3. Export your account's private key (you'll need this for deployment)

### Wallet Setup

- Install [MetaMask](https://metamask.io/) browser extension
- Configure MetaMask for Hedera network (instructions below)

## Quick Start

### 1. Clone the Repository

```bash
git clone <repository-url>
cd hgigs-mono
```

### 2. Install Dependencies

Install dependencies for both projects:

```bash
# Install contract dependencies
cd hgigs-contract
npm install

# Install frontend dependencies
cd ../hgigs-dapp
npm install
```

## Smart Contract Setup

### Configuration

1. Navigate to the contract directory:
```bash
cd hgigs-contract
```

2. Create environment file:
```bash
cp .env.example .env
```

3. Edit `.env` and add your Hedera private key:
```env
PRIVATE_KEY=your_hedera_private_key_here
```

**Important**: Never commit your `.env` file or share your private key!

### Available Scripts

```bash
# Compile the smart contract
npm run compile

# Run tests
npm run test

# Deploy to Hedera testnet
npm run deploy:testnet

# Deploy to Hedera mainnet
npm run deploy:mainnet

# Upgrade existing contract on testnet
npm run upgrade:testnet

# Upgrade existing contract on mainnet
npm run upgrade:mainnet
```

### Deployment Steps

1. **Compile the contract**:
```bash
npm run compile
```

2. **Run tests** (optional but recommended):
```bash
npm run test
```

3. **Deploy to testnet**:
```bash
npm run deploy:testnet
```

4. **Save the deployed address**: The deployment script will output the proxy contract address. Save this for frontend configuration.

Example output:
```
GigMarketplace deployed to: 0x1234567890abcdef1234567890abcdef12345678
```

### Contract Upgrading

The contract uses OpenZeppelin's upgradeable proxy pattern. To upgrade:

1. Make changes to `contracts/GigMarketplace.sol`
2. Compile: `npm run compile`
3. Set proxy address: `export PROXY_ADDRESS=0x...`
4. Run upgrade: `PROXY_ADDRESS=0x... npm run upgrade:testnet`

### Network Configuration

The contract is pre-configured for Hedera networks:

**Testnet**:
- Chain ID: 296
- RPC URL: https://testnet.hashio.io/api
- Explorer: https://hashscan.io/testnet

**Mainnet**:
- Chain ID: 295
- RPC URL: https://mainnet.hashio.io/api
- Explorer: https://hashscan.io/mainnet

## Frontend Setup

### Configuration

1. Navigate to the frontend directory:
```bash
cd hgigs-dapp
```

2. Create environment file:
```bash
touch .env.local
```

3. Add the following environment variables to `.env.local`:

```env
# Smart Contract Address (from deployment)
NEXT_PUBLIC_CONTRACT_ADDRESS=0x...

# Hedera Network Configuration
NEXT_PUBLIC_HEDERA_NETWORK=testnet
NEXT_PUBLIC_HEDERA_RPC_URL=https://testnet.hashio.io/api
NEXT_PUBLIC_CHAIN_ID=296

# Optional: Analytics
NEXT_PUBLIC_VERCEL_ANALYTICS=false
```

### Development

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Available Scripts

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linter
npm run lint
```

### Project Architecture

```
hgigs-dapp/
├── app/                 # Next.js 14 App Router
│   ├── browse/         # Browse gigs page
│   ├── orders/         # Client orders page
│   ├── payment/        # Payment processing
│   ├── post-gig/       # Create new gig
│   ├── profile/        # User profile
│   └── provider-orders/# Provider orders management
├── components/         # Reusable UI components
│   ├── ui/            # shadcn/ui components
│   └── ...            # Custom components
├── contexts/          # React Context providers
├── hooks/             # Custom React hooks
├── lib/               # Utility functions
├── types/             # TypeScript type definitions
└── styles/            # Global styles
```

### Key Technologies

- **Next.js 14**: React framework with App Router
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first CSS framework
- **shadcn/ui**: High-quality UI components
- **Radix UI**: Accessible component primitives
- **Hedera SDK**: @hashgraph/sdk for Hedera integration
- **ethers.js**: Web3 library for contract interaction

### Wallet Integration

The app supports Web3 wallet connections through MetaMask and other compatible wallets.

#### Configure MetaMask for Hedera

1. Open MetaMask
2. Click on the network dropdown
3. Click "Add Network" > "Add a network manually"
4. Enter the following details:

**For Testnet**:
```
Network Name: Hedera Testnet
RPC URL: https://testnet.hashio.io/api
Chain ID: 296
Currency Symbol: HBAR
Block Explorer: https://hashscan.io/testnet
```

**For Mainnet**:
```
Network Name: Hedera Mainnet
RPC URL: https://mainnet.hashio.io/api
Chain ID: 295
Currency Symbol: HBAR
Block Explorer: https://hashscan.io/mainnet
```

## Integration Guide

### Connecting Frontend to Smart Contract

1. **Deploy the smart contract** and note the proxy address
2. **Update frontend environment** with the contract address:
   ```env
   NEXT_PUBLIC_CONTRACT_ADDRESS=0x...
   ```

3. **Copy the contract ABI**: After compilation, the ABI is located at:
   ```
   hgigs-contract/artifacts/contracts/GigMarketplace.sol/GigMarketplace.json
   ```

4. **Use the contract** in your frontend:
   ```typescript
   import { ethers } from 'ethers';
   import GigMarketplaceABI from './GigMarketplace.json';

   const provider = new ethers.BrowserProvider(window.ethereum);
   const signer = await provider.getSigner();
   const contract = new ethers.Contract(
     process.env.NEXT_PUBLIC_CONTRACT_ADDRESS,
     GigMarketplaceABI.abi,
     signer
   );

   // Create a gig
   await contract.createGig("Title", "Description", ethers.parseEther("10"));
   ```

### Contract Functions Reference

**Provider Functions**:
- `createGig(title, description, price)` - Create new gig
- `updateGig(gigId, title, description, price)` - Update gig
- `deactivateGig(gigId)` - Deactivate gig
- `completeOrder(orderId)` - Mark order complete

**Client Functions**:
- `orderGig(gigId)` - Order a gig (send payment)
- `releasePayment(orderId)` - Release escrowed payment

**View Functions**:
- `getGig(gigId)` - Get gig details
- `getOrder(orderId)` - Get order details
- `getProviderGigs(address)` - Get provider's gigs
- `getClientOrders(address)` - Get client's orders

## Deployment

### Contract Deployment

1. Ensure you have testnet/mainnet HBAR
2. Configure `.env` with your private key
3. Deploy:
   ```bash
   cd hgigs-contract
   npm run deploy:testnet  # or deploy:mainnet
   ```
4. Save the proxy contract address

### Frontend Deployment

#### Deploying to Vercel

1. **Push your code** to GitHub/GitLab/Bitbucket

2. **Import project** to [Vercel](https://vercel.com):
   - Click "Add New Project"
   - Import your repository
   - Framework: Next.js (auto-detected)
   - Root Directory: `hgigs-dapp`

3. **Configure environment variables**:
   ```
   NEXT_PUBLIC_CONTRACT_ADDRESS=0x...
   NEXT_PUBLIC_HEDERA_NETWORK=testnet
   NEXT_PUBLIC_HEDERA_RPC_URL=https://testnet.hashio.io/api
   NEXT_PUBLIC_CHAIN_ID=296
   ```

4. **Deploy**: Click "Deploy"

#### Deploying to Netlify

1. **Push your code** to GitHub

2. **Create new site** in [Netlify](https://netlify.com):
   - Click "Add new site"
   - Connect to your repository
   - Base directory: `hgigs-dapp`
   - Build command: `npm run build`
   - Publish directory: `.next`

3. **Add environment variables** in Site Settings > Environment Variables

4. **Deploy**: Click "Deploy site"

### Post-Deployment Configuration

1. **Update contract address** in frontend environment variables
2. **Verify contract** on Hashscan (optional):
   ```bash
   npx hardhat verify --network hedera_testnet <PROXY_ADDRESS>
   ```
3. **Test the integration**:
   - Connect wallet
   - Create a test gig
   - Place a test order
   - Complete the flow

## Development Workflow

### Local Development

1. **Start local Hardhat node** (optional, for testing):
   ```bash
   cd hgigs-contract
   npx hardhat node
   ```

2. **Run contract tests**:
   ```bash
   cd hgigs-contract
   npm run test
   ```

3. **Start frontend development**:
   ```bash
   cd hgigs-dapp
   npm run dev
   ```

### Testing Strategy

**Smart Contract**:
- Unit tests in `hgigs-contract/test/`
- Run with: `npm run test`
- Tests cover all core functions and edge cases

**Frontend**:
- Manual testing with testnet deployment
- Wallet connection testing
- UI/UX testing across browsers

### Common Commands

```bash
# Contract compilation
cd hgigs-contract && npm run compile

# Run contract tests
cd hgigs-contract && npm run test

# Deploy contract to testnet
cd hgigs-contract && npm run deploy:testnet

# Start frontend dev server
cd hgigs-dapp && npm run dev

# Build frontend for production
cd hgigs-dapp && npm run build

# Start frontend production server
cd hgigs-dapp && npm start
```

## Troubleshooting

### Common Issues

#### Issue: "Cannot connect to wallet"
**Solution**:
- Ensure MetaMask is installed and unlocked
- Verify you're on the correct network (Hedera Testnet/Mainnet)
- Check browser console for detailed errors

#### Issue: "Transaction failed"
**Solution**:
- Ensure you have enough HBAR for gas fees
- Check if the contract is paused (admin function)
- Verify contract address in environment variables

#### Issue: "Contract deployment fails"
**Solution**:
- Verify your private key is correct in `.env`
- Ensure you have sufficient HBAR balance
- Check network connectivity to Hedera RPC
- Review gas settings in `hardhat.config.js`

#### Issue: "Module not found" errors
**Solution**:
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

#### Issue: "Next.js build errors"
**Solution**:
- Check TypeScript errors: `npm run lint`
- Ensure all environment variables are set
- Clear Next.js cache: `rm -rf .next`

### Hedera-Specific Considerations

1. **Gas Costs**: Hedera uses HBAR for gas. Ensure adequate balance.
2. **Network Speed**: Hedera has ~3-5 second finality
3. **Account ID vs EVM Address**: Hedera accounts have both formats
4. **Token Association**: Some operations may require token association

### Getting Help

- **Hedera Documentation**: https://docs.hedera.com
- **Hedera Discord**: https://hedera.com/discord
- **Hardhat Documentation**: https://hardhat.org/docs
- **Next.js Documentation**: https://nextjs.org/docs

## Security Considerations

### Smart Contract

- Contract uses OpenZeppelin security libraries
- Built-in reentrancy protection
- Pausable functionality for emergency stops
- Access control for admin functions

### Frontend

- Never expose private keys in frontend code
- Validate all user inputs
- Use environment variables for sensitive data
- Keep dependencies updated

### Best Practices

1. **Test thoroughly** on testnet before mainnet deployment
2. **Audit smart contracts** before production deployment
3. **Use hardware wallets** for mainnet deployments
4. **Monitor contract activity** through Hashscan
5. **Keep private keys secure** and never commit them

## License

This project is licensed under the MIT License.

## Contributing

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -m 'Add my feature'`
4. Push to the branch: `git push origin feature/my-feature`
5. Open a Pull Request

## Resources

- [Hedera Documentation](https://docs.hedera.com)
- [Hedera Portal](https://portal.hedera.com/)
- [HashScan Explorer](https://hashscan.io)
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts)
- [Next.js Documentation](https://nextjs.org/docs)
- [Hardhat Documentation](https://hardhat.org/docs)
- [ethers.js Documentation](https://docs.ethers.org)

## Support

For questions and support:
- Open an issue in this repository
- Join the Hedera Discord
- Check the documentation links above
