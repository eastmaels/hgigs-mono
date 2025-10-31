"use client"

import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/auth-context"
import { Wallet, LogOut, User, AlertTriangle, Network } from "lucide-react"
import Link from "next/link"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"

export function WalletConnect() {
  const {
    isConnected,
    address,
    userProfile,
    connectWallet,
    disconnectWallet,
    isLoading,
    isOnHederaNetwork,
    switchToHedera
  } = useAuth()

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

  const handleConnect = async () => {
    try {
      await connectWallet()
    } catch (error) {
      console.error("Failed to connect wallet:", error)
    }
  }

  const handleSwitchToHedera = async () => {
    try {
      await switchToHedera()
    } catch (error) {
      console.error("Failed to switch to Hedera:", error)
    }
  }

  if (isLoading) {
    return (
      <Button variant="outline" size="sm" disabled>
        Loading...
      </Button>
    )
  }

  if (isConnected && userProfile) {
    return (
      <div className="flex items-center gap-2">
        {!isOnHederaNetwork && (
          <Alert className="border-amber-200 bg-amber-50 text-amber-800 p-2">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-xs ml-2">
              Please switch to Hedera Testnet
              <Button
                variant="link"
                size="sm"
                className="h-auto p-0 ml-1 text-amber-800 underline"
                onClick={handleSwitchToHedera}
              >
                Switch Network
              </Button>
            </AlertDescription>
          </Alert>
        )}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" type="button">
              <User className="h-4 w-4 mr-2" />
              {isOnHederaNetwork && <div className="h-2 w-2 bg-green-500 rounded-full mr-1" />}
              <span className="hidden sm:inline">{userProfile.username || formatAddress(address)}</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-64">
            <div className="space-y-4">
              {/* Profile Info */}
              <div className="space-y-1">
                <div className="font-medium text-sm">{userProfile.username || "Anonymous User"}</div>
                <div className="text-muted-foreground text-xs">{formatAddress(address)}</div>
                <div className="text-xs text-muted-foreground">
                  {isOnHederaNetwork ? "✓ Hedera Testnet" : "⚠ Wrong Network"}
                </div>
              </div>

              <Separator />

              {/* Network Switch */}
              {!isOnHederaNetwork && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start"
                    onClick={handleSwitchToHedera}
                  >
                    <Network className="h-4 w-4 mr-2" />
                    Switch to Hedera Testnet
                  </Button>
                  <Separator />
                </>
              )}

              {/* Navigation Links */}
              <div className="space-y-1">
                <Link href="/profile" className="block">
                  <Button variant="ghost" size="sm" className="w-full justify-start">
                    Profile Settings
                  </Button>
                </Link>
                <Link href="/dashboard" className="block">
                  <Button variant="ghost" size="sm" className="w-full justify-start">
                    Dashboard
                  </Button>
                </Link>
                <Link href="/my-gigs" className="block">
                  <Button variant="ghost" size="sm" className="w-full justify-start">
                    My Gigs
                  </Button>
                </Link>
              </div>

              <Separator />

              {/* Disconnect Button */}
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={disconnectWallet}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Disconnect Wallet
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    )
  }

  return (
    <Button onClick={handleConnect} size="sm">
      <Wallet className="h-4 w-4 mr-2" />
      Connect Wallet
    </Button>
  )
}
