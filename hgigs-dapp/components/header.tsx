"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { WalletConnect } from "@/components/wallet-connect"
import { Menu, X } from "lucide-react"

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto max-w-screen-2xl flex h-16 items-center px-6 gap-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-lg">H</span>
          </div>
          <span className="font-bold text-xl whitespace-nowrap">HederaGigs</span>
        </Link>

        {/* Navigation - grows to fill space */}
        <nav className="hidden md:flex items-center gap-3 lg:gap-4 flex-1">
          <Link href="/browse" className="text-sm font-medium hover:text-primary transition-colors whitespace-nowrap">
            Browse Gigs
          </Link>
          <Link href="/my-orders" className="text-sm font-medium hover:text-primary transition-colors whitespace-nowrap">
            My Orders
          </Link>
          <Link href="/orders" className="text-sm font-medium hover:text-primary transition-colors whitespace-nowrap">
            Orders
          </Link>
          <Link href="/provider-orders" className="text-sm font-medium hover:text-primary transition-colors whitespace-nowrap">
            Provider Dashboard
          </Link>
          <Link href="/requests" className="text-sm font-medium hover:text-primary transition-colors whitespace-nowrap">
            View Requests
          </Link>
          <Link href="/post-request" className="text-sm font-medium hover:text-primary transition-colors whitespace-nowrap">
            Post Request
          </Link>
        </nav>

        {/* Wallet & Mobile Menu */}
        <div className="flex items-center gap-4 shrink-0">
          <WalletConnect />

          <Button variant="ghost" size="sm" className="md:hidden" onClick={() => setIsMenuOpen(!isMenuOpen)}>
            {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile menu */}
      {isMenuOpen && (
        <div className="md:hidden border-t bg-background">
          <nav className="container py-4 flex flex-col gap-4">
            <Link href="/browse" className="text-sm font-medium hover:text-primary transition-colors">
              Browse Gigs
            </Link>
            <Link href="/my-orders" className="text-sm font-medium hover:text-primary transition-colors">
              My Orders
            </Link>
            <Link href="/orders" className="text-sm font-medium hover:text-primary transition-colors">
              Orders
            </Link>
            <Link href="/provider-orders" className="text-sm font-medium hover:text-primary transition-colors">
              Provider Dashboard
            </Link>
            <Link href="/requests" className="text-sm font-medium hover:text-primary transition-colors">
              View Requests
            </Link>
            <Link href="/post-request" className="text-sm font-medium hover:text-primary transition-colors">
              Post Request
            </Link>
          </nav>
        </div>
      )}
    </header>
  )
}
