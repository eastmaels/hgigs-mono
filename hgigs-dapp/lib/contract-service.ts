import { ethers } from "ethers"
import { getHederaProvider, getHederaSigner, CONTRACT_ADDRESS } from "./hedera-config"

// Gig Marketplace Contract ABI - Updated to match new contract structure
const CONTRACT_ABI = [
  // Core gig functions
  "function createGig(string memory _title, string memory _description, uint256 _price, address _token)",
  "function getGig(uint256 _gigId) view returns (tuple(uint256 id, address provider, string title, string description, uint256 price, bool isActive, bool isCompleted, address token))",
  "function updateGig(uint256 _gigId, string memory _title, string memory _description, uint256 _price, address _token)",
  "function deactivateGig(uint256 _gigId)",
  
  // Order functions - UPDATED
  "function orderGig(uint256 _gigId)",  // No longer payable
  "function payOrder(uint256 _orderId) payable",  // New payment function
  "function payOrderWithToken(uint256 _orderId)",  // Token payment function
  "function completeOrder(uint256 _orderId, string memory _deliverable)",
  "function releasePayment(uint256 _orderId)",
  "function getOrder(uint256 _orderId) view returns (tuple(uint256 id, uint256 gigId, address client, address provider, uint256 amount, bool isCompleted, bool isPaid, bool paymentReleased, uint256 createdAt, uint256 paidAmount, string deliverable))",  // Added paidAmount and deliverable fields
  "function getOrderDeliverable(uint256 _orderId) view returns (string memory)",
  
  // Query functions
  "function getProviderGigs(address _provider) view returns (uint256[])",
  "function getClientOrders(address _client) view returns (uint256[])",
  "function getAllActiveGigs() view returns (tuple(uint256 id, address provider, string title, string description, uint256 price, bool isActive, bool isCompleted, address token)[])",
  
  // Admin functions
  "function setPlatformFee(uint256 _feePercent)",
  "function withdrawPlatformFees()",
  "function pause()",
  "function unpause()",
  "function paused() view returns (bool)",
  
  // State variables
  "function nextGigId() view returns (uint256)",
  "function nextOrderId() view returns (uint256)",
  "function platformFeePercent() view returns (uint256)",
  
  // Events - UPDATED
  "event GigCreated(uint256 indexed gigId, address indexed provider, string title, uint256 price)",
  "event GigUpdated(uint256 indexed gigId, string title, string description, uint256 price)",
  "event GigDeactivated(uint256 indexed gigId)",
  "event OrderCreated(uint256 indexed orderId, uint256 indexed gigId, address indexed client, uint256 amount)",
  "event OrderPaid(uint256 indexed orderId, address indexed client, uint256 amount)",  // New event
  "event OrderCompleted(uint256 indexed orderId)",
  "event PaymentReleased(uint256 indexed orderId, address indexed provider, uint256 amount)"
]

export class ContractService {
  private contract: ethers.Contract | null = null
  private provider: ethers.JsonRpcProvider

  constructor() {
    this.provider = getHederaProvider()
    this.contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, this.provider)
  }

  async getContractWithSigner(): Promise<ethers.Contract> {
    const signer = await getHederaSigner()
    if (!signer) {
      throw new Error("No wallet connected")
    }
    return new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer)
  }

  async getContractName(): Promise<string> {
    // GigMarketplace doesn't have a name function, return a static name
    return "Gig Marketplace"
  }

  async getContractSymbol(): Promise<string> {
    // GigMarketplace doesn't have a symbol, return marketplace identifier
    return "MARKETPLACE"
  }

  async getTotalGigs(): Promise<string> {
    if (!this.contract) throw new Error("Contract not initialized")
    try {
      const nextGigId = await this.contract.nextGigId()
      return (Number(nextGigId) - 1).toString() // Subtract 1 since IDs start from 1
    } catch (error) {
      console.error("Error getting total gigs:", error)
      return "0"
    }
  }

  async getTotalOrders(): Promise<string> {
    if (!this.contract) throw new Error("Contract not initialized")
    try {
      const nextOrderId = await this.contract.nextOrderId()
      return (Number(nextOrderId) - 1).toString() // Subtract 1 since IDs start from 1
    } catch (error) {
      console.error("Error getting total orders:", error)
      return "0"
    }
  }

  async getPlatformFee(): Promise<string> {
    if (!this.contract) throw new Error("Contract not initialized")
    try {
      const feePercent = await this.contract.platformFeePercent()
      return `${feePercent}%`
    } catch (error) {
      console.error("Error getting platform fee:", error)
      return "5%"
    }
  }

  // Marketplace-specific utility functions
  async getContractBalance(): Promise<string> {
    if (!this.provider) throw new Error("Provider not initialized")
    try {
      const balance = await this.provider.getBalance(CONTRACT_ADDRESS)
      return ethers.formatEther(balance)
    } catch (error) {
      console.error("Error getting contract balance:", error)
      return "0"
    }
  }

  async isContractPaused(): Promise<boolean> {
    if (!this.contract) throw new Error("Contract not initialized")
    try {
      return await this.contract.paused()
    } catch (error) {
      console.error("Error checking if contract is paused:", error)
      return false
    }
  }

  async getTransactionReceipt(txHash: string): Promise<ethers.TransactionReceipt | null> {
    return await this.provider.getTransactionReceipt(txHash)
  }

  getContractAddress(): string {
    return CONTRACT_ADDRESS
  }

  getBlockExplorerUrl(txHash: string): string {
    return `https://hashscan.io/testnet/transaction/${txHash}`
  }

  // Gig-related methods
  async createGig(
    title: string,
    description: string,
    category: string,
    price: string,
    deliveryTime: string,
    requirements: string,
    tags: string[],
    network: string = "hedera-testnet",
    paymentToken: string = "native"
  ): Promise<ethers.TransactionResponse> {
    const contractWithSigner = await this.getContractWithSigner()
    
    try {
      const priceInWei = ethers.parseEther(price)
      
      // Combine all fields into description since contract only takes title, description, price
      const fullDescription = `${description}\n\nCategory: ${category}\nDelivery Time: ${deliveryTime}\nRequirements: ${requirements}\nTags: ${tags.join(', ')}\nNetwork: ${network}\nPayment Token: ${paymentToken}`
      
      // For native token payments, use zero address
      const tokenAddress = paymentToken === "native" ? "0x0000000000000000000000000000000000000000" : paymentToken
      
      return await contractWithSigner.createGig(
        title,
        fullDescription,
        priceInWei,
        tokenAddress
      )
    } catch (error: any) {
      console.error("Contract error:", error)
      if (error.code === "CALL_EXCEPTION" || error.message.includes("execution reverted")) {
        throw new Error("Failed to create gig. Please check the contract is properly initialized.")
      }
      throw error
    }
  }

  async getGig(gigId: number): Promise<any> {
    if (!this.contract) throw new Error("Contract not initialized")
    try {
      const gig = await this.contract.getGig(gigId)
      
      // Parse the description to extract additional fields
      const descParts = gig.description.split('\n\n')
      const mainDescription = descParts[0] || ""
      
      // Extract metadata from description if present
      let category = "General"
      let deliveryTime = "1 week"
      let requirements = ""
      let tags: string[] = []
      let network = "hedera-testnet"
      let paymentToken = "native"
      
      if (descParts.length > 1) {
        const metadata = descParts[1]
        const categoryMatch = metadata.match(/Category: (.+)/)
        const deliveryMatch = metadata.match(/Delivery Time: (.+)/)
        const requirementsMatch = metadata.match(/Requirements: (.+)/)
        const tagsMatch = metadata.match(/Tags: (.+)/)
        const networkMatch = metadata.match(/Network: (.+)/)
        const paymentTokenMatch = metadata.match(/Payment Token: (.+)/)
        
        if (categoryMatch) category = categoryMatch[1].split('\n')[0]
        if (deliveryMatch) deliveryTime = deliveryMatch[1].split('\n')[0]
        if (requirementsMatch) requirements = requirementsMatch[1].split('\n')[0]
        if (tagsMatch) tags = tagsMatch[1].split('\n')[0].split(', ').filter(tag => tag.trim())
        if (networkMatch) network = networkMatch[1].split('\n')[0]
        if (paymentTokenMatch) paymentToken = paymentTokenMatch[1].split('\n')[0]
      }
      
      return {
        id: gig.id.toString(),
        seller: gig.provider, // Note: contract uses 'provider' not 'seller'
        title: gig.title,
        description: mainDescription,
        category: category,
        price: ethers.formatEther(gig.price),
        deliveryTime: deliveryTime,
        requirements: requirements,
        tags: tags,
        active: gig.isActive,
        createdAt: new Date(), // Contract doesn't store creation timestamp
        network: network,
        paymentToken: paymentToken
      }
    } catch (error) {
      console.error("Error getting gig:", error)
      throw error
    }
  }

  async getGigsByOwner(ownerAddress: string): Promise<number[]> {
    if (!this.contract) throw new Error("Contract not initialized")
    try {
      const gigIds = await this.contract.getProviderGigs(ownerAddress)
      return gigIds.map((id: any) => Number(id))
    } catch (error) {
      console.error("Error getting gigs by owner:", error)
      return []
    }
  }

  async getAllActiveGigs(): Promise<number[]> {
    if (!this.contract) throw new Error("Contract not initialized")
    try {
      // Get the next gig ID to know how many gigs exist
      const nextGigId = await this.contract.nextGigId()
      const totalGigs = Number(nextGigId) - 1
      
      const activeGigs: number[] = []
      
      // Check each gig to see if it's active
      for (let i = 1; i <= totalGigs; i++) {
        try {
          const gig = await this.contract.getGig(i)
          if (gig.isActive) {
            activeGigs.push(i)
          }
        } catch (error) {
          // Skip gigs that don't exist or have errors
          continue
        }
      }
      
      return activeGigs
    } catch (error: any) {
      console.error("Error getting active gigs:", error)
      return []
    }
  }

  async updateGig(gigId: number, title: string, description: string, price: string, paymentToken: string = "native"): Promise<ethers.TransactionResponse> {
    const contractWithSigner = await this.getContractWithSigner()
    const priceInWei = ethers.parseEther(price)
    const tokenAddress = paymentToken === "native" ? "0x0000000000000000000000000000000000000000" : paymentToken
    return await contractWithSigner.updateGig(gigId, title, description, priceInWei, tokenAddress)
  }

  async deactivateGig(gigId: number): Promise<ethers.TransactionResponse> {
    const contractWithSigner = await this.getContractWithSigner()
    return await contractWithSigner.deactivateGig(gigId)
  }

  async getGigCount(): Promise<number> {
    if (!this.contract) throw new Error("Contract not initialized")
    try {
      const nextGigId = await this.contract.nextGigId()
      return Number(nextGigId) - 1 // Subtract 1 because IDs start from 1
    } catch (error) {
      console.error("Error getting gig count:", error)
      return 0
    }
  }

  // Order-related methods
  async orderGig(gigId: number): Promise<ethers.TransactionResponse> {
    const contractWithSigner = await this.getContractWithSigner()
    
    // No payment required for creating order (just creates the order/invoice)
    return await contractWithSigner.orderGig(gigId)
  }

  async payOrder(orderId: number): Promise<ethers.TransactionResponse> {
    const contractWithSigner = await this.getContractWithSigner()
    
    // Get the raw order details directly from contract (not formatted)
    const rawOrder = await this.contract?.getOrder(orderId)
    if (!rawOrder) {
      throw new Error("Order not found")
    }
    
    // Also get the formatted order for comparison
    const formattedOrder = await this.getOrder(orderId)
    
    console.log(`[CONTRACT SERVICE] PayOrder comparison:`, {
      orderId: orderId,
      raw: {
        amount: rawOrder.amount.toString(),
        type: typeof rawOrder.amount,
        isString: typeof rawOrder.amount === 'string',
        isBigInt: typeof rawOrder.amount === 'bigint'
      },
      formatted: {
        amount: formattedOrder.amount,
        type: typeof formattedOrder.amount,
        parseEtherWouldWork: typeof formattedOrder.amount === 'string'
      },
      comparison: {
        rawToString: rawOrder.amount.toString(),
        formattedParsed: ethers.parseEther(formattedOrder.amount).toString(),
        areEqual: rawOrder.amount.toString() === ethers.parseEther(formattedOrder.amount).toString()
      }
    })
    
    // Try multiple approaches to ensure value is properly included
    const amountInWei = rawOrder.amount
    const amountAsString = rawOrder.amount.toString()
    const amountAsBigInt = BigInt(rawOrder.amount.toString())
    
    console.log(`[CONTRACT SERVICE] About to call payOrder with multiple formats:`, {
      orderId: orderId,
      original: { value: amountInWei, type: typeof amountInWei },
      asString: { value: amountAsString, type: typeof amountAsString },
      asBigInt: { value: amountAsBigInt, type: typeof amountAsBigInt }
    })
    
    // Let's also check what the gig price was when this order was created
    try {
      const associatedGig = await this.contract.getGig(rawOrder.gigId)
      console.log(`[CONTRACT SERVICE] Associated gig info:`, {
        gigId: rawOrder.gigId.toString(),
        gigPrice: associatedGig.price.toString(),
        gigPriceFormatted: ethers.formatEther(associatedGig.price),
        orderAmount: rawOrder.amount.toString(),
        amountsMatch: associatedGig.price.toString() === rawOrder.amount.toString()
      })
    } catch (gigError) {
      console.error('[CONTRACT SERVICE] Could not fetch associated gig:', gigError)
    }
    
    // Try a completely different approach - manually construct the transaction
    console.log('[CONTRACT SERVICE] Attempting manual transaction construction')
    
    try {
      // Get the contract function interface
      const contractInterface = new ethers.Interface([
        "function payOrder(uint256 _orderId) payable"
      ])
      
      // Encode the function call
      const data = contractInterface.encodeFunctionData("payOrder", [orderId])
      
      const fromAddress = await (await this.getContractWithSigner()).getAddress()
      
      console.log('[CONTRACT SERVICE] Manual transaction details:', {
        to: CONTRACT_ADDRESS,
        data: data,
        dataLength: data.length,
        value: amountAsString,
        valueInWei: amountAsString,
        from: fromAddress,
        orderId: orderId,
        functionSignature: contractInterface.getFunction("payOrder").selector
      })
      
      // Create the transaction object manually
      const txRequest = {
        to: CONTRACT_ADDRESS,
        data: data,
        value: amountAsString,
        gasLimit: 5000000, // Increase gas limit for contract interaction
        type: 2 // Use EIP-1559 transaction type
      }
      
      // Send the transaction manually
      const signer = await getHederaSigner()
      if (!signer) {
        throw new Error("No signer available")
      }
      
      console.log('[CONTRACT SERVICE] Sending manual transaction with signer')
      return await signer.sendTransaction(txRequest)
      
    } catch (manualError) {
      console.error('[CONTRACT SERVICE] Manual transaction failed:', manualError)
      throw manualError
    }
  }

  async payOrderWithToken(orderId: number): Promise<ethers.TransactionResponse> {
    const contractWithSigner = await this.getContractWithSigner()
    
    console.log(`[CONTRACT SERVICE] PayOrderWithToken for order ${orderId}`)
    
    return await contractWithSigner.payOrderWithToken(orderId)
  }

  async completeOrder(orderId: number, deliverable: string): Promise<ethers.TransactionResponse> {
    const contractWithSigner = await this.getContractWithSigner()
    
    console.log(`[CONTRACT SERVICE] CompleteOrder for order ${orderId} with deliverable:`, deliverable)
    
    return await contractWithSigner.completeOrder(orderId, deliverable)
  }

  async getProviderOrders(providerAddress: string): Promise<any[]> {
    try {
      const allOrderIds = await this.getAllOrders()
      const providerOrders = []
      
      for (const orderId of allOrderIds) {
        try {
          const order = await this.getOrder(orderId)
          if (order.provider.toLowerCase() === providerAddress.toLowerCase()) {
            providerOrders.push(order)
          }
        } catch (error) {
          console.error(`Error loading order ${orderId}:`, error)
        }
      }
      
      return providerOrders.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    } catch (error) {
      console.error("Error getting provider orders:", error)
      throw error
    }
  }

  async getOrder(orderId: number): Promise<any> {
    if (!this.contract) throw new Error("Contract not initialized")
    try {
      const order = await this.contract.getOrder(orderId)
      return {
        id: order.id.toString(),
        gigId: order.gigId.toString(),
        client: order.client,
        provider: order.provider,
        amount: ethers.formatEther(order.amount),
        isCompleted: order.isCompleted,
        isPaid: order.isPaid,
        paymentReleased: order.paymentReleased,
        createdAt: new Date(Number(order.createdAt) * 1000),
        paidAmount: ethers.formatEther(order.paidAmount),
        deliverable: order.deliverable
      }
    } catch (error) {
      console.error("Error getting order:", error)
      throw error
    }
  }

  async getOrderDeliverable(orderId: number): Promise<string> {
    if (!this.contract) throw new Error("Contract not initialized")
    try {
      return await this.contract.getOrderDeliverable(orderId)
    } catch (error) {
      console.error("Error getting order deliverable:", error)
      throw error
    }
  }

  async getClientOrders(clientAddress: string): Promise<number[]> {
    if (!this.contract) throw new Error("Contract not initialized")
    try {
      const orderIds = await this.contract.getClientOrders(clientAddress)
      return orderIds.map((id: any) => Number(id))
    } catch (error) {
      console.error("Error getting client orders:", error)
      return []
    }
  }

  // Get all orders in the system (for admin/marketplace view)
  async getAllOrders(): Promise<number[]> {
    if (!this.contract) throw new Error("Contract not initialized")
    try {
      const nextOrderId = await this.contract.nextOrderId()
      const totalOrders = Number(nextOrderId) - 1
      
      const allOrders: number[] = []
      
      // Check each order to see if it exists
      for (let i = 1; i <= totalOrders; i++) {
        try {
          await this.contract.getOrder(i)
          allOrders.push(i)
        } catch (error) {
          // Skip orders that don't exist or have errors
          continue
        }
      }
      
      return allOrders
    } catch (error: any) {
      console.error("Error getting all orders:", error)
      return []
    }
  }

  // Listen for gig creation events
  onGigCreated(callback: (gigId: number, provider: string, title: string, price: string) => void) {
    if (!this.contract) return
    
    this.contract.on("GigCreated", (gigId, provider, title, price) => {
      callback(Number(gigId), provider, title, ethers.formatEther(price))
    })
  }

  // Listen for order creation events
  onOrderCreated(callback: (orderId: number, gigId: number, client: string, amount: string) => void) {
    if (!this.contract) return
    
    this.contract.on("OrderCreated", (orderId, gigId, client, amount) => {
      callback(Number(orderId), Number(gigId), client, ethers.formatEther(amount))
    })
  }

  // Get orders for a specific gig by filtering events
  async getGigOrders(gigId: number): Promise<any[]> {
    if (!this.contract) return []
    
    try {
      // Get OrderCreated events for this specific gig
      const filter = this.contract.filters.OrderCreated(null, gigId)
      const events = await this.contract.queryFilter(filter)
      
      const orders = await Promise.all(
        events.map(async (event) => {
          try {
            const orderId = Number(event.args?.[0])
            return await this.getOrder(orderId)
          } catch (error) {
            console.error(`Error getting order details:`, error)
            return null
          }
        })
      )
      
      return orders.filter(order => order !== null)
    } catch (error) {
      console.error("Error getting gig orders:", error)
      return []
    }
  }

  // Get active orders count for a gig
  async getActiveOrdersCount(gigId: number): Promise<number> {
    try {
      const orders = await this.getGigOrders(gigId)
      return orders.filter(order => !order.isPaid).length
    } catch (error) {
      console.error("Error getting active orders count:", error)
      return 0
    }
  }

  // Extract orderId from OrderCreated event in transaction receipt
  parseOrderCreatedEvent(receipt: ethers.TransactionReceipt): number | null {
    if (!this.contract || !receipt.logs) return null
    
    try {
      for (const log of receipt.logs) {
        try {
          const parsedLog = this.contract.interface.parseLog({
            topics: log.topics,
            data: log.data
          })
          
          if (parsedLog && parsedLog.name === 'OrderCreated') {
            // OrderCreated(uint256 indexed orderId, uint256 indexed gigId, address indexed client, uint256 amount)
            return Number(parsedLog.args[0]) // orderId is the first argument
          }
        } catch (error) {
          // Skip logs that can't be parsed by this contract
          continue
        }
      }
    } catch (error) {
      console.error("Error parsing OrderCreated event:", error)
    }
    
    return null
  }

  // Remove all event listeners
  removeAllListeners() {
    if (this.contract) {
      this.contract.removeAllListeners()
    }
  }
}

export const contractService = new ContractService()