"use client"

import { useSession, signIn, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { User, LogOut, Crown, Settings } from "lucide-react"

export function AuthButton() {
  const { data: session, status } = useSession()
  const router = useRouter()

  if (status === "loading") {
    return (
      <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse" />
    )
  }

  if (!session) {
    return (
      <Button 
        onClick={() => signIn()}
        variant="outline"
        size="sm"
        className="flex items-center space-x-2"
      >
        <User className="w-4 h-4" />
        <span>Iniciar Sesión</span>
      </Button>
    )
  }

  const getPlanBadge = (plan: string) => {
    switch (plan) {
      case 'PRO':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            <Crown className="w-3 h-3 mr-1" />
            Pro
          </span>
        )
      case 'LIFETIME':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <Crown className="w-3 h-3 mr-1" />
            Lifetime
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            Freemium
          </span>
        )
    }
  }

  const handleSettingsClick = () => {
    router.push('/settings')
  }

  const handleUpgradePlanClick = () => {
    const currentPlan = session.user.plan

    // If user already has Lifetime, do nothing (button should be disabled)
    if (currentPlan === 'LIFETIME') {
      return
    }

    // If user has Pro, upgrade directly to Lifetime
    if (currentPlan === 'PRO') {
      router.push('/checkout?plan=LIFETIME')
      return
    }

    // For Freemium users, redirect to pricing to choose between Pro and Lifetime
    router.push('/#pricing')
  }

  const getUpgradeText = () => {
    const currentPlan = session.user.plan
    
    switch (currentPlan) {
      case 'LIFETIME':
        return 'Plan Lifetime Activo'
      case 'PRO':
        return 'Upgrade a Lifetime'
      default:
        return 'Actualizar Plan'
    }
  }

  const isUpgradeDisabled = () => {
    return session.user.plan === 'LIFETIME'
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarImage src={session.user.image || ""} alt={session.user.name || ""} />
            <AvatarFallback>
              {session.user.name?.charAt(0).toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">
              {session.user.name}
            </p>
            <p className="text-xs leading-none text-muted-foreground">
              {session.user.email}
            </p>
            <div className="pt-1">
              {getPlanBadge(session.user.plan)}
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          className="cursor-pointer"
          onClick={handleSettingsClick}
        >
          <Settings className="mr-2 h-4 w-4" />
          <span>Configuración</span>
        </DropdownMenuItem>
        <DropdownMenuItem 
          className={`cursor-pointer ${isUpgradeDisabled() ? 'opacity-50 cursor-not-allowed' : ''}`}
          onClick={isUpgradeDisabled() ? undefined : handleUpgradePlanClick}
        >
          <Crown className="mr-2 h-4 w-4" />
          <span>{getUpgradeText()}</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          className="cursor-pointer text-red-600 focus:text-red-600"
          onClick={() => signOut()}
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>Cerrar Sesión</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
} 