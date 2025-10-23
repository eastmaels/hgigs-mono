"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Search, Grid, List, Clock, User, DollarSign, Package, Loader2, Eye, ShoppingBag, Briefcase } from "lucide-react"
import { contractService } from "@/lib/contract-service"
import { Order } from "@/types/gig"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/auth-context"

interface GigData {
  id: string
  title: string
  description: string
  category: string
  seller: string
}

interface OrderWithGig extends Order {
  gig?: GigData
}

// Helper function to get order status for display
function getOrderStatus(order: Order) {
  const { isPaid, isCompleted, paymentReleased } = order

  if (!isPaid && !isCompleted && !paymentReleased) {
    return { text: "Pending Payment", variant: "destructive" as const, color: "text-red-600" }
  }

  if (isPaid && !isCompleted && !paymentReleased) {
    return { text: "Work in Progress", variant: "default" as const, color: "text-blue-600" }
  }

  if (isPaid && isCompleted && !paymentReleased) {
    return { text: "Awaiting Release", variant: "outline" as const, color: "text-orange-600" }
  }

  if (isPaid && isCompleted && paymentReleased) {
    return { text: "Complete", variant: "secondary" as const, color: "text-green-600" }
  }

  return { text: "Unknown", variant: "destructive" as const, color: "text-gray-600" }
}

export default function MyOrdersPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { address, isConnected, connectWallet } = useAuth()
  const [orders, setOrders] = useState<OrderWithGig[]>([])
  const [providerOrders, setProviderOrders] = useState<OrderWithGig[]>([])
  const [filteredOrders, setFilteredOrders] = useState<OrderWithGig[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [activeTab, setActiveTab] = useState<"client" | "provider">("client")

  useEffect(() => {
    if (isConnected && address) {
      loadUserOrders()
    } else {
      setIsLoading(false)
    }
  }, [isConnected, address])

  useEffect(() => {
    filterOrders()
  }, [orders, providerOrders, searchQuery, statusFilter, activeTab])

  const loadUserOrders = async () => {
    try {
      setIsLoading(true)

      // Get orders where user is the client
      const clientOrderIds = await contractService.getClientOrders(address)
      const clientOrdersData: OrderWithGig[] = []

      for (const orderId of clientOrderIds) {
        try {
          const order = await contractService.getOrder(orderId)

          // Load associated gig data
          try {
            const gig = await contractService.getGig(parseInt(order.gigId))
            clientOrdersData.push({
              ...order,
              gig: {
                id: gig.id,
                title: gig.title,
                description: gig.description,
                category: gig.category,
                seller: gig.seller
              }
            })
          } catch (gigError) {
            console.error(`Error loading gig ${order.gigId}:`, gigError)
            clientOrdersData.push(order)
          }
        } catch (orderError) {
          console.error(`Error loading order ${orderId}:`, orderError)
        }
      }

      setOrders(clientOrdersData)

      // Get orders where user is the provider
      // We need to check all orders and filter by provider address
      const totalOrders = await contractService.getTotalOrders()
      const totalOrdersCount = parseInt(totalOrders)
      const providerOrdersData: OrderWithGig[] = []

      if (totalOrdersCount > 0) {
        for (let i = 1; i <= totalOrdersCount; i++) {
          try {
            const order = await contractService.getOrder(i)

            // Check if current user is the provider
            if (order.provider.toLowerCase() === address.toLowerCase()) {
              try {
                const gig = await contractService.getGig(parseInt(order.gigId))
                providerOrdersData.push({
                  ...order,
                  gig: {
                    id: gig.id,
                    title: gig.title,
                    description: gig.description,
                    category: gig.category,
                    seller: gig.seller
                  }
                })
              } catch (gigError) {
                console.error(`Error loading gig ${order.gigId}:`, gigError)
                providerOrdersData.push(order)
              }
            }
          } catch (orderError) {
            console.error(`Error loading order ${i}:`, orderError)
          }
        }
      }

      setProviderOrders(providerOrdersData)
    } catch (error) {
      console.error("Error loading orders:", error)
      toast({
        title: "Error",
        description: "Failed to load your orders",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const filterOrders = () => {
    const sourceOrders = activeTab === "client" ? orders : providerOrders
    let filtered = [...sourceOrders]

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(order =>
        order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.gig?.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.gig?.category.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(order => {
        switch (statusFilter) {
          case "pending":
            return !order.isPaid
          case "paid":
            return order.isPaid && !order.isCompleted
          case "completed":
            return order.isCompleted && !order.paymentReleased
          case "released":
            return order.paymentReleased
          default:
            return true
        }
      })
    }

    setFilteredOrders(filtered)
  }

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  const handleViewOrder = (orderId: string) => {
    router.push(`/payment/${orderId}`)
  }

  const GridView = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {filteredOrders.map((order) => {
        const status = getOrderStatus(order)
        return (
          <Card key={order.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">Order #{order.id}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    {order.gig?.title || "Gig data unavailable"}
                  </p>
                </div>
                <Badge variant={status.variant}>{status.text}</Badge>
              </div>
            </CardHeader>

            <CardContent className="space-y-3">
              {order.gig && (
                <div>
                  <Badge variant="outline" className="text-xs">
                    {order.gig.category}
                  </Badge>
                  <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                    {order.gig.description}
                  </p>
                </div>
              )}

              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <DollarSign className="h-4 w-4" />
                    Amount:
                  </span>
                  <span className="font-medium">{order.amount} HBAR</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <User className="h-4 w-4" />
                    {activeTab === "client" ? "Provider:" : "Client:"}
                  </span>
                  <span className="font-mono text-xs">
                    {formatAddress(activeTab === "client" ? order.provider : order.client)}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    Created:
                  </span>
                  <span className="text-xs">
                    {order.createdAt.toLocaleDateString()}
                  </span>
                </div>
              </div>
            </CardContent>

            <CardFooter className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => handleViewOrder(order.id)}
              >
                <Eye className="h-4 w-4 mr-2" />
                View Details
              </Button>
              {activeTab === "client" && !order.isPaid && (
                <Button
                  className="flex-1"
                  onClick={() => handleViewOrder(order.id)}
                >
                  Pay Now
                </Button>
              )}
            </CardFooter>
          </Card>
        )
      })}
    </div>
  )

  const ListView = () => (
    <div className="space-y-4">
      {filteredOrders.map((order) => {
        const status = getOrderStatus(order)
        return (
          <Card key={order.id} className="hover:shadow-lg transition-shadow">
            <div className="flex items-center p-6">
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Order #{order.id}</h3>
                  <Badge variant={status.variant}>{status.text}</Badge>
                </div>

                <p className="text-muted-foreground">
                  {order.gig?.title || "Gig data unavailable"}
                </p>

                <div className="flex items-center gap-6 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <DollarSign className="h-4 w-4" />
                    {order.amount} HBAR
                  </div>

                  <div className="flex items-center gap-1">
                    <User className="h-4 w-4" />
                    {formatAddress(activeTab === "client" ? order.provider : order.client)}
                  </div>

                  {order.gig && (
                    <Badge variant="outline" className="text-xs">
                      {order.gig.category}
                    </Badge>
                  )}

                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {order.createdAt.toLocaleDateString()}
                  </div>
                </div>
              </div>

              <div className="ml-4 flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => handleViewOrder(order.id)}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  View Details
                </Button>
                {activeTab === "client" && !order.isPaid && (
                  <Button
                    onClick={() => handleViewOrder(order.id)}
                  >
                    Pay Now
                  </Button>
                )}
              </div>
            </div>
          </Card>
        )
      })}
    </div>
  )

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container max-w-4xl mx-auto px-4 py-8">
          <div className="text-center py-12">
            <ShoppingBag className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h1 className="text-2xl font-bold mb-4">Connect Your Wallet</h1>
            <p className="text-muted-foreground mb-6">
              Please connect your wallet to view your orders
            </p>
            <Button onClick={connectWallet}>Connect Wallet</Button>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">My Orders</h1>
          <p className="text-muted-foreground">
            View and manage your orders as a client or service provider
          </p>
        </div>

        {/* Tabs for Client vs Provider orders */}
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "client" | "provider")} className="mb-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="client" className="flex items-center gap-2">
              <ShoppingBag className="h-4 w-4" />
              My Purchases ({orders.length})
            </TabsTrigger>
            <TabsTrigger value="provider" className="flex items-center gap-2">
              <Briefcase className="h-4 w-4" />
              My Services ({providerOrders.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="client" className="mt-6">
            {/* Filters */}
            <div className="mb-8 bg-muted/30 p-6 rounded-lg">
              <div className="flex flex-col lg:flex-row gap-4">
                {/* Search */}
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search orders by ID, gig title, or category..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* Status Filter */}
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full lg:w-[200px]">
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="pending">Pending Payment</SelectItem>
                    <SelectItem value="paid">Work in Progress</SelectItem>
                    <SelectItem value="completed">Awaiting Release</SelectItem>
                    <SelectItem value="released">Complete</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Results Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <span className="text-muted-foreground">
                  {isLoading ? "Loading..." : `${filteredOrders.length} orders found`}
                </span>
                {(searchQuery || statusFilter !== "all") && (
                  <Badge variant="outline">Filtered</Badge>
                )}
              </div>

              {/* View Toggle */}
              <div className="flex items-center gap-2 border rounded-md p-1">
                <Button
                  variant={viewMode === "grid" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("grid")}
                >
                  <Grid className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === "list" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("list")}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Content */}
            {isLoading ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="text-center py-12">
                <Package className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">
                  {orders.length === 0
                    ? "You haven't purchased any services yet."
                    : "No orders match your current filters."}
                </p>
                {orders.length === 0 ? (
                  <Button asChild>
                    <a href="/browse">Browse Gigs</a>
                  </Button>
                ) : (
                  <Button variant="outline" onClick={() => {
                    setSearchQuery("")
                    setStatusFilter("all")
                  }}>
                    Clear Filters
                  </Button>
                )}
              </div>
            ) : (
              <>
                {viewMode === "grid" ? <GridView /> : <ListView />}
              </>
            )}
          </TabsContent>

          <TabsContent value="provider" className="mt-6">
            {/* Filters */}
            <div className="mb-8 bg-muted/30 p-6 rounded-lg">
              <div className="flex flex-col lg:flex-row gap-4">
                {/* Search */}
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search orders by ID, gig title, or category..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* Status Filter */}
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full lg:w-[200px]">
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="pending">Pending Payment</SelectItem>
                    <SelectItem value="paid">Work in Progress</SelectItem>
                    <SelectItem value="completed">Awaiting Release</SelectItem>
                    <SelectItem value="released">Complete</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Results Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <span className="text-muted-foreground">
                  {isLoading ? "Loading..." : `${filteredOrders.length} orders found`}
                </span>
                {(searchQuery || statusFilter !== "all") && (
                  <Badge variant="outline">Filtered</Badge>
                )}
              </div>

              {/* View Toggle */}
              <div className="flex items-center gap-2 border rounded-md p-1">
                <Button
                  variant={viewMode === "grid" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("grid")}
                >
                  <Grid className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === "list" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("list")}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Content */}
            {isLoading ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="text-center py-12">
                <Briefcase className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">
                  {providerOrders.length === 0
                    ? "You haven't received any service orders yet."
                    : "No orders match your current filters."}
                </p>
                {providerOrders.length === 0 ? (
                  <Button asChild>
                    <a href="/post-gig">Post a Gig</a>
                  </Button>
                ) : (
                  <Button variant="outline" onClick={() => {
                    setSearchQuery("")
                    setStatusFilter("all")
                  }}>
                    Clear Filters
                  </Button>
                )}
              </div>
            ) : (
              <>
                {viewMode === "grid" ? <GridView /> : <ListView />}
              </>
            )}
          </TabsContent>
        </Tabs>
      </main>
      <Footer />
    </div>
  )
}
