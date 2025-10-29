"use client"

import { useState, useEffect } from "react"

// Extend window interface for MetaMask
declare global {
  interface Window {
    ethereum?: any;
  }
}
import { useParams, useRouter } from "next/navigation"
import QRCode from "qrcode"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { QrCode, Copy, ArrowLeft, CheckCircle, Loader2, Clock, User, RefreshCw } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { contractService } from "@/lib/contract-service"
import { CONTRACT_ADDRESS } from "@/lib/hedera-config"
import { Order } from "@/types/gig"
import { ethers } from "ethers"

interface GigData {
  id: string
  title: string
  description: string
  price: string
  seller: string
  category: string
  deliveryTime: string
  active: boolean
}

export default function PaymentPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const orderId = params.orderId as string

  const [order, setOrder] = useState<Order | null>(null)
  const [gig, setGig] = useState<GigData | null>(null)
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("")
  const [isLoading, setIsLoading] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isCheckingStatus, setIsCheckingStatus] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isReleasingPayment, setIsReleasingPayment] = useState(false)
  const [isApprovingPayment, setIsApprovingPayment] = useState(false)
  const [isClaimingPayment, setIsClaimingPayment] = useState(false)
  const [paymentHash, setPaymentHash] = useState<string>("")
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
  const [currentUserAddress, setCurrentUserAddress] = useState<string | null>(null)

  useEffect(() => {
    if (orderId) {
      loadOrderData()
    }
  }, [orderId])

  // Get current user's wallet address
  useEffect(() => {
    const getCurrentAddress = async () => {
      if (typeof window.ethereum !== 'undefined') {
        try {
          const accounts = await window.ethereum.request({ method: 'eth_accounts' })
          if (accounts && accounts.length > 0) {
            setCurrentUserAddress(accounts[0].toLowerCase())
          }
        } catch (error) {
          console.error("Error getting current address:", error)
        }
      }
    }
    getCurrentAddress()
  }, [])

  // Periodic status polling - checks every 15 seconds
  useEffect(() => {
    if (!orderId || !order) return

    console.log(`[POLLING] Starting periodic status checks for Order ${orderId}`)
    
    const pollInterval = setInterval(async () => {
      try {
        // Continue polling until payment is fully released (final state)
        if (!order.paymentReleased) {
          console.log(`[POLLING] Automatic status check for Order ${orderId}...`, {
            currentState: {
              isPaid: order.isPaid,
              isCompleted: order.isCompleted,
              paymentReleased: order.paymentReleased,
              paymentApproved: order.paymentApproved
            },
            timestamp: new Date().toISOString()
          })
          
          const updatedOrder = await contractService.getOrder(parseInt(orderId))
          
          console.log(`[POLLING] Fetched updated status:`, {
            newState: {
              isPaid: updatedOrder.isPaid,
              isCompleted: updatedOrder.isCompleted,
              paymentReleased: updatedOrder.paymentReleased,
              paymentApproved: updatedOrder.paymentApproved
            },
            hasChanged: (
              updatedOrder.isPaid !== order.isPaid ||
              updatedOrder.isCompleted !== order.isCompleted ||
              updatedOrder.paymentReleased !== order.paymentReleased ||
              updatedOrder.paymentApproved !== order.paymentApproved
            ),
            timestamp: new Date().toISOString()
          })

          // Check if any status changed
          if (updatedOrder.isPaid !== order.isPaid ||
              updatedOrder.isCompleted !== order.isCompleted ||
              updatedOrder.paymentReleased !== order.paymentReleased ||
              updatedOrder.paymentApproved !== order.paymentApproved) {
            
            console.log(`[POLLING] ✅ STATUS CHANGED! Updating UI`, {
              changes: {
                isPaid: { from: order.isPaid, to: updatedOrder.isPaid },
                isCompleted: { from: order.isCompleted, to: updatedOrder.isCompleted },
                paymentReleased: { from: order.paymentReleased, to: updatedOrder.paymentReleased }
              }
            })
            
            setOrder(updatedOrder)
            setLastUpdated(new Date())
            
            // Show appropriate notifications
            if (updatedOrder.isPaid && !order.isPaid) {
              toast({
                title: "Payment Received!",
                description: "Your payment has been confirmed on the blockchain.",
              })
            }
            
            if (updatedOrder.isCompleted && !order.isCompleted) {
              toast({
                title: "Work Completed!",
                description: "The provider has marked this order as completed.",
              })
            }
            
            if (updatedOrder.paymentApproved && !order.paymentApproved) {
              toast({
                title: "Payment Approved!",
                description: "Payment has been approved for provider to claim.",
              })
            }

            if (updatedOrder.paymentReleased && !order.paymentReleased) {
              toast({
                title: "Payment Released!",
                description: "Payment has been released to the provider.",
              })
            }
          } else {
            console.log(`[POLLING] No changes detected for Order ${orderId}`)
          }
        } else {
          console.log(`[POLLING] Order ${orderId} is complete (payment released), continuing to monitor`)
        }
      } catch (error) {
        console.error("[POLLING] Error during status check:", error)
      }
    }, 15000) // Check every 15 seconds

    return () => {
      console.log(`[POLLING] Stopping periodic checks for Order ${orderId}`)
      clearInterval(pollInterval)
    }
  }, [orderId, order?.isPaid, order?.isCompleted, order?.paymentReleased, toast])

  const loadOrderData = async (isRefresh = false) => {
    try {
      if (!isRefresh) setIsLoading(true)
      
      console.log(`[${isRefresh ? 'REFRESH' : 'LOAD'}] Fetching Order ${orderId} data...`, {
        timestamp: new Date().toISOString(),
        isRefresh
      })
      
      // First get the order data
      const orderData = await contractService.getOrder(parseInt(orderId))
      
      console.log(`[${isRefresh ? 'REFRESH' : 'LOAD'}] Order ${orderId} status:`, {
        isPaid: orderData.isPaid,
        isCompleted: orderData.isCompleted,
        paymentReleased: orderData.paymentReleased,
        amount: orderData.amount,
        client: orderData.client,
        provider: orderData.provider,
        createdAt: orderData.createdAt.toISOString(),
        timestamp: new Date().toISOString()
      })
      
      setOrder(orderData)
      setLastUpdated(new Date())
      
      // Then get the associated gig data
      if (orderData) {
        const gigData = await contractService.getGig(parseInt(orderData.gigId))
        setGig(gigData)
        
        if (gigData && !orderData.isPaid) {
          await generateQRCode(orderData, gigData)
        }
      }
    } catch (error) {
      console.error("Error loading order:", error)
      toast({
        title: "Error",
        description: "Failed to load order data",
        variant: "destructive",
      })
    } finally {
      if (!isRefresh) setIsLoading(false)
    }
  }

  const generateQRCode = async (orderData: Order, gigData: GigData) => {
    try {
      // Create contract call data for payOrder function
      // Get the correct function selector for payOrder(uint256)
      const contractInterface = new ethers.Interface([
        "function payOrder(uint256 _orderId) payable"
      ])
      const callData = contractInterface.encodeFunctionData("payOrder", [parseInt(orderId)])
      
      // Create transaction data object for calling contract
      const transactionData = {
        to: CONTRACT_ADDRESS, // Send to contract, not provider
        value: ethers.parseEther(orderData.amount).toString(), // Payment amount
        data: callData, // Encoded payOrder function call
        chainId: 296, // Hedera Testnet chain ID
        gasLimit: "100000" // Higher gas limit for contract interaction
      }
      
      console.log('[QR Code] Generated contract call data:', {
        contractAddress: CONTRACT_ADDRESS,
        orderId: orderId,
        amount: orderData.amount,
        callData: callData,
        provider: orderData.provider
      })
      
      // Create a MetaMask-compatible transaction request for contract interaction
      // Format: ethereum:0x<contractAddress>@<chainId>?value=<value>&data=<callData>
      const ethereumUri = `ethereum:${CONTRACT_ADDRESS}@296?value=${transactionData.value}&data=${transactionData.data}`
      
      // Generate QR code for the contract transaction
      const qrUrl = await QRCode.toDataURL(ethereumUri, {
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      })
      
      setQrCodeUrl(qrUrl)
    } catch (error) {
      console.error("Error generating QR code:", error)
      toast({
        title: "Error",
        description: "Failed to generate QR code",
        variant: "destructive",
      })
    }
  }

  const copyPaymentData = async () => {
    if (!order || !gig) {
      toast({
        title: "Cannot Copy",
        description: "Order data is still loading. Please wait and try again.",
        variant: "destructive",
      })
      return
    }

    // Create contract transaction data
    const contractInterface = new ethers.Interface([
      "function payOrder(uint256 _orderId) payable"
    ])
    const callData = contractInterface.encodeFunctionData("payOrder", [parseInt(orderId)])

    const paymentData = {
      type: "Contract Transaction",
      contractAddress: CONTRACT_ADDRESS,
      function: "payOrder",
      orderId: orderId,
      amount: order.amount,
      currency: "HBAR",
      callData: callData,
      description: `Payment for Order ${orderId}: ${gig.title}`,
      network: "Hedera Testnet"
    }

    try {
      await navigator.clipboard.writeText(JSON.stringify(paymentData, null, 2))
      toast({
        title: "Copied!",
        description: "Contract transaction data copied to clipboard",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy payment data",
        variant: "destructive",
      })
    }
  }

  const copyMetaMaskUri = async () => {
    if (!order || !gig) {
      toast({
        title: "Cannot Copy",
        description: "Order data is still loading. Please wait and try again.",
        variant: "destructive",
      })
      return
    }

    // Create contract transaction URI
    const contractInterface = new ethers.Interface([
      "function payOrder(uint256 _orderId) payable"
    ])
    const callData = contractInterface.encodeFunctionData("payOrder", [parseInt(orderId)])
    
    const ethereumUri = `ethereum:${CONTRACT_ADDRESS}@296?value=${ethers.parseEther(order.amount).toString()}&data=${callData}`

    try {
      await navigator.clipboard.writeText(ethereumUri)
      toast({
        title: "Copied!",
        description: "Contract transaction URI copied to clipboard",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy transaction URI",
        variant: "destructive",
      })
    }
  }

  // Manual refresh function
  const handleManualRefresh = async () => {
    try {
      setIsRefreshing(true)
      console.log(`[MANUAL REFRESH] User requested refresh for Order ${orderId}`)
      
      await loadOrderData(true) // Pass true to indicate this is a refresh
      
      toast({
        title: "Status Updated",
        description: "Order status has been refreshed.",
      })
      
      console.log(`[MANUAL REFRESH] Refresh completed for Order ${orderId}`)
    } catch (error) {
      console.error("[MANUAL REFRESH] Error:", error)
      toast({
        title: "Refresh Failed",
        description: "Failed to refresh order status. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsRefreshing(false)
    }
  }

  // MetaMask browser extension payment function
  const payWithMetaMask = async () => {
    if (!orderId || !order) {
      console.log(`[METAMASK PAY] Missing required data: orderId=${orderId}, order=${!!order}`)
      toast({
        title: "Cannot Process Payment",
        description: "Order data is still loading. Please wait and try again.",
        variant: "destructive",
      })
      return
    }

    try {
      setIsProcessing(true)
      console.log(`[METAMASK PAY] Starting MetaMask payment for Order ${orderId}`)
      
      // Check if MetaMask is available
      if (typeof window.ethereum === 'undefined') {
        console.log(`[METAMASK PAY] MetaMask not detected`)
        toast({
          title: "MetaMask Not Found",
          description: "Please install MetaMask browser extension to continue.",
          variant: "destructive",
        })
        throw new Error("MetaMask not found")
      }

      // Check if user is connected to MetaMask
      try {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' })
        if (!accounts || accounts.length === 0) {
          console.log(`[METAMASK PAY] No accounts connected, requesting connection`)
          await window.ethereum.request({ method: 'eth_requestAccounts' })
        }
      } catch (connectionError) {
        console.error(`[METAMASK PAY] Connection error:`, connectionError)
        toast({
          title: "Connection Failed",
          description: "Please connect to MetaMask and try again.",
          variant: "destructive",
        })
        throw connectionError
      }

      toast({
        title: "Processing Payment",
        description: "Please confirm the transaction in MetaMask...",
      })

      console.log(`[METAMASK PAY] Calling contractService.payOrder(${orderId})`)

      let tx
      try {
        // Use the contract service's payOrder method
        tx = await contractService.payOrder(parseInt(orderId))
        console.log(`[METAMASK PAY] Transaction submitted:`, tx.hash)
      } catch (contractError) {
        console.error(`[METAMASK PAY] Contract call failed:`, contractError)
        throw contractError
      }
      
      toast({
        title: "Transaction Submitted",
        description: `Transaction hash: ${tx.hash.slice(0, 10)}...`,
      })

      // Wait for transaction confirmation with timeout
      console.log(`[METAMASK PAY] Waiting for transaction confirmation...`)
      let receipt
      try {
        receipt = await tx.wait()
      } catch (waitError) {
        console.error(`[METAMASK PAY] Error waiting for transaction:`, waitError)
        toast({
          title: "Transaction Pending",
          description: "Transaction was submitted but confirmation is taking longer than expected. Please check your wallet.",
        })
        throw waitError
      }
      
      if (receipt?.status === 1) {
        console.log(`[METAMASK PAY] Payment confirmed! Receipt:`, receipt)
        
        // Reload order data to reflect payment
        try {
          await loadOrderData(true)
        } catch (reloadError) {
          console.error(`[METAMASK PAY] Error reloading order data:`, reloadError)
        }
        
        toast({
          title: "Payment Successful! 🎉",
          description: "Your payment has been confirmed and funds are held in escrow.",
        })
      } else {
        console.log(`[METAMASK PAY] Transaction failed with status:`, receipt?.status)
        throw new Error(`Transaction failed with status: ${receipt?.status}`)
      }

    } catch (error: any) {
      console.error("[METAMASK PAY] Payment error:", error)

      let errorMessage = "Payment failed. Please try again."

      // Handle specific error types
      if (error.code === "ACTION_REJECTED" || error.code === 4001 || error.message?.includes("user rejected")) {
        errorMessage = "Transaction was rejected by user"
      } else if (error.code === "INSUFFICIENT_FUNDS" || error.message?.includes("insufficient funds")) {
        errorMessage = "Insufficient funds for transaction"
      } else if (error.code === "NETWORK_ERROR") {
        errorMessage = "Network error. Please check your connection and try again."
      } else if (error.reason) {
        // Ethers v6 provides clean revert reason from contract
        errorMessage = error.reason
      } else if (error.revert?.args?.[0]) {
        // Extract from revert args
        errorMessage = error.revert.args[0]
      } else if (error.message) {
        // Try to extract message from quotes if it's a revert string
        const match = error.message.match(/\"([^\"]+)\"/)
        errorMessage = match ? match[1] : error.message
      }

      toast({
        title: "Payment Failed",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      // Always reset processing state
      console.log(`[METAMASK PAY] Resetting processing state`)
      setIsProcessing(false)
    }
  }

  const handleReleasePayment = async () => {
    if (!order) {
      toast({
        title: "Cannot Release Payment",
        description: "Order data is not available. Please refresh the page and try again.",
        variant: "destructive",
      })
      return
    }

    try {
      setIsReleasingPayment(true)
      console.log(`[RELEASE PAYMENT] Starting payment release for Order ${orderId}`)

      // Get fresh order data from blockchain to ensure we have the latest state
      console.log(`[RELEASE PAYMENT] Fetching fresh order data from blockchain...`)
      const freshOrder = await contractService.getOrder(parseInt(orderId))

      console.log(`[RELEASE PAYMENT] ==== DEBUG INFO ====`)
      console.log(`Order ID: ${orderId}`)
      console.log(`Current User Address: ${currentUserAddress}`)
      console.log(`Order Client (from blockchain): ${freshOrder.client}`)
      console.log(`Order Provider (from blockchain): ${freshOrder.provider}`)
      console.log(`Order State (from blockchain):`, {
        isPaid: freshOrder.isPaid,
        isCompleted: freshOrder.isCompleted,
        paymentReleased: freshOrder.paymentReleased,
        amount: freshOrder.amount
      })
      console.log(`Frontend State (may be cached):`, {
        isPaid: order.isPaid,
        isCompleted: order.isCompleted,
        paymentReleased: order.paymentReleased,
        amount: order.amount
      })
      console.log(`[RELEASE PAYMENT] ====================`)

      // Check if MetaMask is connected
      if (!currentUserAddress) {
        console.error(`[RELEASE PAYMENT] ❌ No wallet connected`)
        toast({
          title: "Wallet Not Connected",
          description: "Please connect your MetaMask wallet to continue.",
          variant: "destructive",
        })
        return
      }

      // Check if user is the client (use fresh data from blockchain)
      if (freshOrder.client.toLowerCase() !== currentUserAddress.toLowerCase()) {
        console.error(`[RELEASE PAYMENT] ❌ User is not the client`)
        console.error(`Expected client: ${freshOrder.client}`)
        console.error(`Current user: ${currentUserAddress}`)
        toast({
          title: "Not Authorized",
          description: `Only the client (${freshOrder.client.slice(0, 6)}...${freshOrder.client.slice(-4)}) can release payment. You are: ${currentUserAddress.slice(0, 6)}...${currentUserAddress.slice(-4)}`,
          variant: "destructive",
        })
        return
      }

      // Check if order is paid
      if (!freshOrder.isPaid) {
        console.error(`[RELEASE PAYMENT] ❌ Order is not paid`)
        toast({
          title: "Order Not Paid",
          description: "The order must be paid before you can release payment.",
          variant: "destructive",
        })
        return
      }

      // Check if order is completed
      if (!freshOrder.isCompleted) {
        console.error(`[RELEASE PAYMENT] ❌ Order is not completed`)
        toast({
          title: "Order Not Completed",
          description: "The provider must complete the order before you can release payment.",
          variant: "destructive",
        })
        return
      }

      // Check if payment is already released
      if (freshOrder.paymentReleased) {
        console.error(`[RELEASE PAYMENT] ❌ Payment already released`)
        toast({
          title: "Already Released",
          description: "Payment has already been released for this order.",
          variant: "destructive",
        })
        // Refresh UI to show correct state
        await loadOrderData(true)
        return
      }

      console.log(`[RELEASE PAYMENT] ✅ All pre-flight checks passed!`)

      // Debug: Check contract balance and amounts before release
      console.log(`[RELEASE PAYMENT] Calling debug function to inspect balance...`)
      try {
        const debugInfo = await contractService.debugReleasePayment(parseInt(orderId))
        console.log(`[RELEASE PAYMENT] 💰 Balance Debug Info:`, debugInfo)
      } catch (debugError) {
        console.error(`[RELEASE PAYMENT] ⚠️ Debug function failed:`, debugError)
        // Continue even if debug fails
      }

      toast({
        title: "Releasing Payment",
        description: "Please confirm the transaction in MetaMask...",
      })

      console.log(`[RELEASE PAYMENT] Calling contractService.releasePayment(${orderId})`)

      const tx = await contractService.releasePayment(parseInt(orderId))
      console.log(`[RELEASE PAYMENT] Transaction submitted:`, tx.hash)

      toast({
        title: "Transaction Submitted",
        description: `Transaction hash: ${tx.hash.slice(0, 10)}...`,
      })

      // Wait for transaction confirmation
      console.log(`[RELEASE PAYMENT] Waiting for transaction confirmation...`)
      const receipt = await tx.wait()

      if (receipt?.status === 1) {
        console.log(`[RELEASE PAYMENT] ✅ Payment released successfully!`, receipt.hash)

        toast({
          title: "Payment Released!",
          description: "The payment has been released to the provider.",
        })

        // Reload order data to show updated status
        await loadOrderData(true)
      } else {
        throw new Error("Transaction failed")
      }
    } catch (error: any) {
      console.error("[RELEASE PAYMENT] Error:", error)

      let errorMessage = "Failed to release payment. Please try again."

      // More specific error handling
      if (error.code === "ACTION_REJECTED" || error.message?.includes("user rejected")) {
        errorMessage = "Transaction was cancelled."
      } else if (error.message?.includes("Only order client")) {
        errorMessage = "You are not the client for this order. Please use the correct wallet."
      } else if (error.message?.includes("Order is not completed")) {
        errorMessage = "The order must be completed before releasing payment."
      } else if (error.message?.includes("Order is not paid")) {
        errorMessage = "The order must be paid before releasing payment."
      } else if (error.message?.includes("Payment already released")) {
        errorMessage = "Payment has already been released."
      } else if (error.message?.includes("Insufficient contract balance")) {
        errorMessage = "The contract does not have sufficient balance to release payment. This is a critical error - please contact support."
      } else if (error.message?.includes("Provider payment failed")) {
        errorMessage = "Failed to send payment to the provider. The provider's wallet may not accept payments."
      } else if (error.message?.includes("Platform fee payment failed")) {
        errorMessage = "Failed to send platform fee. Please contact support."
      } else if (error.message) {
        errorMessage = error.message
      }

      toast({
        title: "Release Failed",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      console.log(`[RELEASE PAYMENT] Resetting releasing state`)
      setIsReleasingPayment(false)
    }
  }

  const handleApprovePayment = async () => {
    if (!order) {
      toast({
        title: "Cannot Approve Payment",
        description: "Order data is not available. Please refresh the page and try again.",
        variant: "destructive",
      })
      return
    }

    try {
      setIsApprovingPayment(true)
      console.log(`[APPROVE PAYMENT] Starting payment approval for Order ${orderId}`)

      // Get fresh order data from blockchain
      const freshOrder = await contractService.getOrder(parseInt(orderId))

      // Check if MetaMask is connected
      if (!currentUserAddress) {
        toast({
          title: "Wallet Not Connected",
          description: "Please connect your MetaMask wallet to continue.",
          variant: "destructive",
        })
        return
      }

      // Check if user is the client
      if (freshOrder.client.toLowerCase() !== currentUserAddress.toLowerCase()) {
        toast({
          title: "Not Authorized",
          description: `Only the client can approve payment.`,
          variant: "destructive",
        })
        return
      }

      // Check if order is paid
      if (!freshOrder.isPaid) {
        toast({
          title: "Order Not Paid",
          description: "The order must be paid before you can approve payment.",
          variant: "destructive",
        })
        return
      }

      // Check if order is completed
      if (!freshOrder.isCompleted) {
        toast({
          title: "Order Not Completed",
          description: "The provider must complete the order before you can approve payment.",
          variant: "destructive",
        })
        return
      }

      // Check if payment is already released
      if (freshOrder.paymentReleased) {
        toast({
          title: "Already Released",
          description: "Payment has already been released for this order.",
          variant: "destructive",
        })
        await loadOrderData(true)
        return
      }

      // Check if payment is already approved
      if (freshOrder.paymentApproved) {
        toast({
          title: "Already Approved",
          description: "Payment has already been approved for this order.",
          variant: "destructive",
        })
        await loadOrderData(true)
        return
      }

      toast({
        title: "Approving Payment",
        description: "Please confirm the transaction in MetaMask...",
      })

      console.log(`[APPROVE PAYMENT] Calling contractService.approvePayment(${orderId})`)

      const tx = await contractService.approvePayment(parseInt(orderId))
      console.log(`[APPROVE PAYMENT] Transaction submitted:`, tx.hash)

      toast({
        title: "Transaction Submitted",
        description: `Transaction hash: ${tx.hash.slice(0, 10)}...`,
      })

      // Wait for transaction confirmation
      console.log(`[APPROVE PAYMENT] Waiting for transaction confirmation...`)
      const receipt = await tx.wait()

      if (receipt?.status === 1) {
        console.log(`[APPROVE PAYMENT] ✅ Payment approved successfully!`, receipt.hash)

        toast({
          title: "Payment Approved!",
          description: "The provider can now claim the payment.",
        })

        // Reload order data to show updated status
        await loadOrderData(true)
      } else {
        throw new Error("Transaction failed")
      }
    } catch (error: any) {
      console.error("[APPROVE PAYMENT] Error:", error)

      let errorMessage = "Failed to approve payment. Please try again."

      if (error.code === "ACTION_REJECTED" || error.message?.includes("user rejected")) {
        errorMessage = "Transaction was cancelled."
      } else if (error.message?.includes("Only order client")) {
        errorMessage = "You are not the client for this order."
      } else if (error.message?.includes("Payment already approved")) {
        errorMessage = "Payment has already been approved."
      } else if (error.message) {
        errorMessage = error.message
      }

      toast({
        title: "Approval Failed",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsApprovingPayment(false)
    }
  }

  const handleClaimPayment = async () => {
    if (!order) {
      toast({
        title: "Cannot Claim Payment",
        description: "Order data is not available. Please refresh the page and try again.",
        variant: "destructive",
      })
      return
    }

    try {
      setIsClaimingPayment(true)
      console.log(`[CLAIM PAYMENT] Starting payment claim for Order ${orderId}`)

      // Get fresh order data from blockchain
      const freshOrder = await contractService.getOrder(parseInt(orderId))

      // Check if MetaMask is connected
      if (!currentUserAddress) {
        toast({
          title: "Wallet Not Connected",
          description: "Please connect your MetaMask wallet to continue.",
          variant: "destructive",
        })
        return
      }

      // Check if user is the provider
      if (freshOrder.provider.toLowerCase() !== currentUserAddress.toLowerCase()) {
        toast({
          title: "Not Authorized",
          description: `Only the provider can claim payment.`,
          variant: "destructive",
        })
        return
      }

      // Check if payment is approved
      if (!freshOrder.paymentApproved) {
        toast({
          title: "Payment Not Approved",
          description: "The client must approve the payment before you can claim it.",
          variant: "destructive",
        })
        return
      }

      // Check if payment is already released
      if (freshOrder.paymentReleased) {
        toast({
          title: "Already Claimed",
          description: "Payment has already been claimed for this order.",
          variant: "destructive",
        })
        await loadOrderData(true)
        return
      }

      toast({
        title: "Claiming Payment",
        description: "Please confirm the transaction in MetaMask...",
      })

      console.log(`[CLAIM PAYMENT] Calling contractService.claimPayment(${orderId})`)

      const tx = await contractService.claimPayment(parseInt(orderId))
      console.log(`[CLAIM PAYMENT] Transaction submitted:`, tx.hash)

      toast({
        title: "Transaction Submitted",
        description: `Transaction hash: ${tx.hash.slice(0, 10)}...`,
      })

      // Wait for transaction confirmation
      console.log(`[CLAIM PAYMENT] Waiting for transaction confirmation...`)
      const receipt = await tx.wait()

      if (receipt?.status === 1) {
        console.log(`[CLAIM PAYMENT] ✅ Payment claimed successfully!`, receipt.hash)

        toast({
          title: "Payment Claimed!",
          description: "The payment has been transferred to your wallet.",
        })

        // Reload order data to show updated status
        await loadOrderData(true)
      } else {
        throw new Error("Transaction failed")
      }
    } catch (error: any) {
      console.error("[CLAIM PAYMENT] Error:", error)

      let errorMessage = "Failed to claim payment. Please try again."

      if (error.code === "ACTION_REJECTED" || error.message?.includes("user rejected")) {
        errorMessage = "Transaction was cancelled."
      } else if (error.message?.includes("Only order provider")) {
        errorMessage = "You are not the provider for this order."
      } else if (error.message?.includes("Payment not approved")) {
        errorMessage = "Payment has not been approved yet."
      } else if (error.message?.includes("Payment already released")) {
        errorMessage = "Payment has already been claimed."
      } else if (error.message) {
        errorMessage = error.message
      }

      toast({
        title: "Claim Failed",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsClaimingPayment(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container max-w-4xl mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  if (!order || !gig) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container max-w-4xl mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Order Not Found</h1>
            <p className="text-muted-foreground mb-4">
              The order you're looking for doesn't exist or has been removed.
            </p>
            <Button onClick={() => router.push("/browse")}>Browse Gigs</Button>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  // For paid orders, show order status and deliverable/release payment UI
  if (order.isPaid) {
    const isClient = currentUserAddress && order.client.toLowerCase() === currentUserAddress
    const isProvider = currentUserAddress && order.provider.toLowerCase() === currentUserAddress

    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container max-w-4xl mx-auto px-4 py-8">
          <div className="mb-6">
            <Button
              variant="ghost"
              onClick={() => router.back()}
              className="mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>

            <h1 className="text-3xl font-bold mb-2">Order #{orderId}</h1>
            <p className="text-muted-foreground">
              {gig.title}
            </p>
          </div>

          {/* Order Status Card */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Order Status
                {order.paymentReleased && <CheckCircle className="h-5 w-5 text-green-500" />}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Payment Status</div>
                  <Badge variant="default">Paid</Badge>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Work Status</div>
                  <Badge variant={order.isCompleted ? "default" : "secondary"}>
                    {order.isCompleted ? "Completed" : "In Progress"}
                  </Badge>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Payment Release</div>
                  <Badge variant={order.paymentReleased ? "default" : "outline"}>
                    {order.paymentReleased ? "Released" : "Held in Escrow"}
                  </Badge>
                </div>
              </div>

              <Separator />

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Order Amount:</span>
                  <span className="font-semibold">{order.amount} HBAR</span>
                </div>
                <div className="flex justify-between">
                  <span>Created:</span>
                  <span>{order.createdAt.toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Client:</span>
                  <span className="font-mono text-xs">
                    {order.client.slice(0, 6)}...{order.client.slice(-4)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Provider:</span>
                  <span className="font-mono text-xs">
                    {order.provider.slice(0, 6)}...{order.provider.slice(-4)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Deliverable Section - Show when order is completed */}
          {order.isCompleted && order.deliverable && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Deliverable</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-muted p-4 rounded-lg">
                  <p className="whitespace-pre-wrap break-words">{order.deliverable}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Release Payment Section - Show to client when order is completed but payment not released */}
          {isClient && order.isCompleted && !order.paymentReleased && !order.paymentApproved && (
            <Card className="mb-6 border-green-200 dark:border-green-900">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-400">
                  <CheckCircle className="h-5 w-5" />
                  Work Completed - Review & Release Payment
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  The provider has completed the work. Please review the deliverable above and choose how to release the payment.
                </p>

                <div className="bg-yellow-50 dark:bg-yellow-950 p-4 rounded-lg">
                  <p className="text-sm font-medium mb-2">⚠️ Important:</p>
                  <ul className="text-sm space-y-1 list-disc list-inside text-muted-foreground">
                    <li>This will release {order.amount} HBAR from escrow to the provider</li>
                    <li>A platform fee will be deducted automatically</li>
                    <li>These actions cannot be undone</li>
                  </ul>
                </div>

                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium mb-2">Option 1: Push Payment (Immediate)</p>
                    <Button
                      onClick={handleReleasePayment}
                      disabled={isReleasingPayment || isApprovingPayment}
                      className="w-full"
                      size="lg"
                      variant="default"
                    >
                      {isReleasingPayment ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Releasing Payment...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Release Payment Now (Push)
                        </>
                      )}
                    </Button>
                    <p className="text-xs text-muted-foreground mt-1">
                      Immediately transfer funds from escrow to provider
                    </p>
                  </div>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">Or</span>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-medium mb-2">Option 2: Approve for Claim (Pull)</p>
                    <Button
                      onClick={handleApprovePayment}
                      disabled={isApprovingPayment || isReleasingPayment}
                      className="w-full"
                      size="lg"
                      variant="outline"
                    >
                      {isApprovingPayment ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Approving Payment...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Approve for Provider to Claim (Pull)
                        </>
                      )}
                    </Button>
                    <p className="text-xs text-muted-foreground mt-1">
                      Let the provider withdraw funds themselves at their convenience
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Payment Approved - Waiting for Provider to Claim */}
          {isClient && order.isCompleted && !order.paymentReleased && order.paymentApproved && (
            <Card className="mb-6 border-blue-200 dark:border-blue-900">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
                  <CheckCircle className="h-5 w-5" />
                  Payment Approved - Awaiting Provider Claim
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  You have approved the payment for the provider to claim. The provider can now withdraw the funds at their convenience.
                </p>
                <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
                  <p className="text-sm">
                    <Clock className="h-4 w-4 inline mr-2" />
                    The provider will claim the payment when ready. You'll be notified once they do.
                  </p>
                </div>

                {/* Option to push payment instead if provider hasn't claimed yet */}
                <div className="pt-2 border-t">
                  <p className="text-sm font-medium mb-2">Changed your mind?</p>
                  <Button
                    onClick={handleReleasePayment}
                    disabled={isReleasingPayment}
                    className="w-full"
                    size="sm"
                    variant="outline"
                  >
                    {isReleasingPayment ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Releasing Payment...
                      </>
                    ) : (
                      <>
                        Release Payment Now Instead
                      </>
                    )}
                  </Button>
                  <p className="text-xs text-muted-foreground mt-1">
                    You can still push the payment immediately if needed
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Provider view - payment not approved yet */}
          {isProvider && order.isCompleted && !order.paymentReleased && !order.paymentApproved && (
            <Card className="mb-6">
              <CardContent className="pt-6">
                <div className="text-center">
                  <Clock className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Awaiting Client Approval</h3>
                  <p className="text-muted-foreground">
                    The client is reviewing your work. They can either release payment directly or approve it for you to claim.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Provider view - payment approved, ready to claim */}
          {isProvider && order.isCompleted && !order.paymentReleased && order.paymentApproved && (
            <Card className="mb-6 border-green-200 dark:border-green-900">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-400">
                  <CheckCircle className="h-5 w-5" />
                  Payment Approved - Ready to Claim
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  The client has approved the payment! You can now claim your funds.
                </p>

                <div className="bg-green-50 dark:bg-green-950 p-4 rounded-lg">
                  <p className="text-sm font-medium mb-2">Payment Details:</p>
                  <ul className="text-sm space-y-1 list-disc list-inside text-muted-foreground">
                    <li>Amount: {order.amount} HBAR</li>
                    <li>Platform fee will be deducted automatically</li>
                    <li>Claim the payment when you're ready</li>
                  </ul>
                </div>

                <Button
                  onClick={handleClaimPayment}
                  disabled={isClaimingPayment}
                  className="w-full"
                  size="lg"
                >
                  {isClaimingPayment ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Claiming Payment...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Claim Payment
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Payment Released - Success message */}
          {order.paymentReleased && (
            <Card className="mb-6 border-green-200 dark:border-green-900">
              <CardContent className="pt-6">
                <div className="text-center">
                  <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                  <h3 className="text-xl font-bold mb-2">Order Complete!</h3>
                  <p className="text-muted-foreground mb-4">
                    Payment has been released to the provider.
                  </p>
                  <div className="flex gap-2 justify-center">
                    <Button onClick={() => router.push("/browse")} variant="outline">
                      Browse More Gigs
                    </Button>
                    <Button onClick={() => router.push("/my-orders")}>
                      My Orders
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* In Progress - Waiting for provider to complete */}
          {!order.isCompleted && (
            <Card className="mb-6">
              <CardContent className="pt-6">
                <div className="text-center">
                  <Loader2 className="h-12 w-12 text-blue-500 mx-auto mb-4 animate-spin" />
                  <h3 className="text-lg font-semibold mb-2">Work in Progress</h3>
                  <p className="text-muted-foreground">
                    {isProvider
                      ? "Complete the work and submit the deliverable to receive payment."
                      : "The provider is working on your order. You'll be notified when it's completed."}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="ghost"
              onClick={() => router.back()}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            
            <div className="flex items-center gap-2">
              <div className="text-xs text-muted-foreground">
                Last updated: {lastUpdated.toLocaleTimeString()}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleManualRefresh}
                disabled={isRefreshing}
              >
                {isRefreshing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Refreshing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh Status
                  </>
                )}
              </Button>
            </div>
          </div>
          
          <h1 className="text-3xl font-bold mb-2">Payment for Order #{orderId}</h1>
          <p className="text-muted-foreground">
            Complete your payment by scanning the QR code or using the payment details below
          </p>
          
          {/* Status indicator */}
          <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
            <p className="text-sm">
              <strong>Auto-refresh:</strong> Status automatically updates every 15 seconds. 
              Use the "Refresh Status" button above for immediate updates.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Order Details */}
          <Card>
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Service Details (from original gig) */}
              <div>
                <div className="text-xs text-muted-foreground mb-1">Service Ordered:</div>
                <h3 className="font-semibold text-lg">{gig.title}</h3>
                <Badge variant="secondary" className="mt-1">
                  {gig.category}
                </Badge>
              </div>
              
              <p className="text-muted-foreground text-sm">{gig.description}</p>
              
              {/* Order Details */}
              <div className="space-y-2">
                <div className="text-xs font-medium text-muted-foreground mb-2">ORDER DETAILS</div>
                
                <div className="flex justify-between">
                  <span>Order ID:</span>
                  <span className="font-mono text-sm">#{orderId}</span>
                </div>
                <div className="flex justify-between">
                  <span>Order Created:</span>
                  <span className="text-sm">
                    {order.createdAt.toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Client:</span>
                  <span className="font-mono text-xs">
                    {order.client.slice(0, 6)}...{order.client.slice(-4)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Provider:
                  </span>
                  <span className="font-mono text-xs">
                    {order.provider.slice(0, 6)}...{order.provider.slice(-4)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Expected Delivery:
                  </span>
                  <span className="text-sm">{gig.deliveryTime}</span>
                </div>
                <div className="flex justify-between">
                  <span>Payment Status:</span>
                  <Badge variant={order.isPaid ? "default" : "secondary"}>
                    {order.isPaid ? "Paid" : "Pending Payment"}
                  </Badge>
                </div>
                {order.isPaid && (
                  <div className="flex justify-between">
                    <span>Escrow Status:</span>
                    <Badge variant={order.paymentReleased ? "default" : "secondary"}>
                      {order.paymentReleased ? "Released to Provider" : "Held in Escrow"}
                    </Badge>
                  </div>
                )}
              </div>

              <Separator />
              
              <div className="flex justify-between text-lg font-semibold">
                <span>Order Amount:</span>
                <span>{order.amount} HBAR</span>
              </div>
              
              {/* Show price comparison if different */}
              {parseFloat(order.amount) !== parseFloat(gig.price) && (
                <div className="text-sm text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Original Gig Price:</span>
                    <span>{gig.price} HBAR</span>
                  </div>
                </div>
              )}

              {/* Primary Payment Button - MetaMask Browser Extension */}
              {!order.isPaid && (
                <>
                  <Separator />
                  <Button 
                    onClick={payWithMetaMask}
                    disabled={isProcessing}
                    className="w-full"
                    size="lg"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Processing Payment...
                      </>
                    ) : (
                      <>
                        Pay {order.amount} HBAR Now
                      </>
                    )}
                  </Button>
                  <p className="text-xs text-muted-foreground text-center">
                    Uses MetaMask browser extension
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          {/* Payment Methods */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <QrCode className="h-5 w-5" />
                Alternative Payment Methods
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {!order.isPaid && (
                <div className="text-sm text-muted-foreground bg-blue-50 dark:bg-blue-950 p-3 rounded-lg">
                  <p><strong>Recommended:</strong> Use the "Pay Now" button above for direct browser payment.</p>
                  <p className="mt-1">The methods below are for mobile wallets and manual transactions.</p>
                </div>
              )}
              {/* QR Code Section */}
              <div className="text-center">
                <h3 className="font-semibold mb-4">Scan with MetaMask</h3>
                {qrCodeUrl && (
                  <div className="inline-block p-4 bg-white rounded-lg">
                    <img 
                      src={qrCodeUrl} 
                      alt="Payment QR Code" 
                      className="w-48 h-48 mx-auto"
                    />
                  </div>
                )}
                <p className="text-sm text-muted-foreground mt-2">
                  Scan to call the contract's payOrder function with proper escrow
                </p>
              </div>

              <Separator />

              {/* Manual Payment Data */}
              <div>
                <h3 className="font-semibold mb-2">Contract Transaction Details</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Contract Address:</span>
                    <span className="font-mono text-xs">
                      {CONTRACT_ADDRESS.slice(0, 10)}...{CONTRACT_ADDRESS.slice(-6)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Function:</span>
                    <span className="font-mono text-xs">payOrder({orderId})</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Amount (HBAR):</span>
                    <span className="font-semibold">{order.amount} HBAR</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Amount (Wei):</span>
                    <span className="font-mono text-xs">{ethers.parseEther(order.amount).toString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Network:</span>
                    <span className="text-xs">Hedera Testnet (Chain ID: 296)</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Escrow:</span>
                    <span className="text-xs">Funds held until completion</span>
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <Button
                    variant="outline"
                    onClick={copyPaymentData}
                    className="flex-1"
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Contract Data
                  </Button>
                  <Button
                    variant="outline"
                    onClick={copyMetaMaskUri}
                    className="flex-1"
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Contract URI
                  </Button>
                </div>
              </div>

              <Separator />

              {/* Payment Status */}
              <div className="text-center p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">
                  After payment, the funds will be held in escrow until the order is completed and released by the client.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  )
}