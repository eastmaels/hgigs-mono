import { ProtectedRoute } from "@/components/protected-route"
import { ProfileSetup } from "@/components/profile-setup"
import { Button } from "@/components/ui/button"
import { ShoppingBag, Briefcase } from "lucide-react"
import Link from "next/link"

export default function ProfilePage() {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background py-8">
        <div className="container max-w-4xl mx-auto px-4">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Profile Settings</h1>
            <p className="text-muted-foreground">Manage your profile information and preferences</p>
          </div>

          {/* Quick Links */}
          <div className="mb-8 flex gap-4">
            <Button asChild variant="outline">
              <Link href="/my-orders" className="flex items-center gap-2">
                <ShoppingBag className="h-4 w-4" />
                My Orders
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/post-gig" className="flex items-center gap-2">
                <Briefcase className="h-4 w-4" />
                My Gigs
              </Link>
            </Button>
          </div>

          <ProfileSetup />
        </div>
      </div>
    </ProtectedRoute>
  )
}
