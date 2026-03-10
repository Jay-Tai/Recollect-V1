"use client"

import type React from "react"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useAuth } from "./auth-provider"
import {
  Home,
  Users,
  Shield,
  ClipboardCheck,
  LogOut,
  Bell,
  Menu,
  X,
  Settings,
  User,
  Search,
  MessageSquare,
  Compass,
  LayoutDashboard,
  Trophy,
  MessageCircle,
} from "lucide-react"
import { Badge } from "./ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu"
import { signOut } from "firebase/auth"
import { auth } from "@/lib/firebase"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { useEffect, useState } from "react"
import { collection, getDocs, query, where } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Input } from "./ui/input"
import { Button } from "./ui/button"
import { useTheme } from "next-themes"
import Image from "next/image"

export function SideNav() {
  const { user, userProfile, isAdmin, isTeacher, isStudent, isPrincipal } = useAuth()
  const pathname = usePathname()
  const router = useRouter()
  const { theme, resolvedTheme } = useTheme()
  const [unreadCount, setUnreadCount] = useState(0)
  const [unreadMessages, setUnreadMessages] = useState(0)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    if (userProfile && isStudent) {
      fetchUnreadAnnouncements()
      fetchUnreadMessages()
    }
  }, [userProfile, isStudent])

  useEffect(() => {
    setMobileMenuOpen(false)
  }, [pathname])

  const fetchUnreadAnnouncements = async () => {
    if (!userProfile) return

    try {
      const announcementsSnapshot = await getDocs(collection(db, "announcements"))
      const announcements = announcementsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))

      const relevantAnnouncements = announcements.filter((announcement: any) => {
        const isForGrade = announcement.grade === userProfile.grade || announcement.grade === "all"
        const isUnread = !announcement.read || !announcement.read.includes(userProfile.uid)
        return isForGrade && isUnread
      })

      setUnreadCount(relevantAnnouncements.length)
    } catch (error) {
      console.error("[v0] Error fetching announcements:", error)
    }
  }

  const fetchUnreadMessages = async () => {
    if (!user) return

    try {
      const q = query(collection(db, "privateMessages"), where("recipientId", "==", user.uid))
      const snapshot = await getDocs(q)
      const messages = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
      const unread = messages.filter((m: any) => !m.read).length
      setUnreadMessages(unread)
    } catch (error) {
      console.error("[v0] Error fetching unread messages:", error)
    }
  }

  const handleLogout = async () => {
    try {
      await signOut(auth)
      toast.success("Logged out successfully")
      router.push("/")
    } catch (error) {
      console.error("[v0] Logout error:", error)
      toast.error("Failed to log out")
    }
  }

  const handleCreateMemory = () => {
    if (pathname === "/feed") {
      window.dispatchEvent(new CustomEvent("openCreateMemoryDialog"))
    } else {
      router.push("/feed?create=true")
    }
    setMobileMenuOpen(false)
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`)
      setMobileMenuOpen(false)
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  if (
    pathname === "/login" ||
    pathname === "/signup" ||
    pathname === "/" ||
    pathname === "/forgot-password" ||
    pathname === "/verify-email"
  ) {
    return null
  }

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        className="fixed top-4 left-4 z-50 lg:hidden bg-card border rounded-lg p-2 shadow-lg"
        aria-label="Toggle menu"
      >
        {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Mobile Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 h-screen w-72 border-r bg-background flex flex-col z-40 transition-transform duration-300",
          "lg:translate-x-0",
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {/* Logo */}
        <div className="px-6 py-5">
          <Link href="/feed" className="flex items-center gap-2" onClick={() => setMobileMenuOpen(false)}>
            <Image
              src={resolvedTheme === "dark" ? "/icon-dark.png" : "/icon-light.png"}
              alt="Recollect icon"
              width={32}
              height={32}
              className="w-8 h-8"
            />
            <Image
              src={resolvedTheme === "dark" ? "/logo-dark.png" : "/logo-light.png"}
              alt="Recollect"
              width={110}
              height={28}
              className="h-6 w-auto"
            />
          </Link>
        </div>

        {/* Search Bar */}
        <div className="px-3 mb-2">
          <form onSubmit={handleSearch}>
            <div className="relative">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 bg-muted/50 border-0 rounded-full h-11"
              />
            </div>
          </form>
        </div>

        <nav className="flex-1 px-2 space-y-1 overflow-y-auto">
          {/* Home */}
          <NavItem
            href="/feed"
            icon={<Home className="w-6 h-6" />}
            label="Home"
            active={pathname === "/feed"}
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Explore */}
          <NavItem
            href="/explore"
            icon={<Compass className="w-6 h-6" />}
            label="Explore"
            active={pathname === "/explore"}
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* My Journey - students only */}
          {isStudent && (
            <NavItem
              href="/my-journey"
              icon={<Trophy className="w-6 h-6" />}
              label="My Journey"
              active={pathname === "/my-journey"}
              onClick={() => setMobileMenuOpen(false)}
            />
          )}

          {/* Messages - students only */}
          {isStudent && (
            <NavItem
              href="/messages"
              icon={<MessageSquare className="w-6 h-6" />}
              label="Messages"
              active={pathname === "/messages"}
              badge={unreadMessages > 0 ? unreadMessages : undefined}
              onClick={() => setMobileMenuOpen(false)}
            />
          )}

          {/* Settings */}
          <NavItem
            href="/settings"
            icon={<Settings className="w-6 h-6" />}
            label="Settings"
            active={pathname === "/settings"}
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Profile */}
          <NavItem
            href={`/profile/${userProfile?.uid}`}
            icon={<User className="w-6 h-6" />}
            label="Profile"
            active={pathname === `/profile/${userProfile?.uid}`}
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Admin Panel */}
          {isAdmin && (
            <NavItem
              href="/admin"
              icon={<Shield className="w-6 h-6" />}
              label="Admin Panel"
              active={pathname === "/admin"}
              onClick={() => setMobileMenuOpen(false)}
            />
          )}

          {/* Teacher Portal */}
          {isTeacher && (
            <>
              <NavItem
                href="/teacher"
                icon={<LayoutDashboard className="w-6 h-6" />}
                label="Teacher Portal"
                active={pathname === "/teacher"}
                onClick={() => setMobileMenuOpen(false)}
              />
              <NavItem
                href="/teacher/requests"
                icon={<ClipboardCheck className="w-6 h-6" />}
                label="Review Requests"
                active={pathname === "/teacher/requests"}
                onClick={() => setMobileMenuOpen(false)}
              />
              <NavItem
                href="/teacher/inbox"
                icon={<Bell className="w-6 h-6" />}
                label="Inbox"
                active={pathname === "/teacher/inbox"}
                onClick={() => setMobileMenuOpen(false)}
              />
            </>
          )}

          {/* Create Memory Button */}
          <div className="pt-4">
            <Button
              onClick={handleCreateMemory}
              className="w-full h-12 rounded-full font-bold text-base shadow-lg hover:shadow-xl transition-shadow"
              size="lg"
            >
              Create a Memory
            </Button>
          </div>

          {/* Feedback Button - prominent, outlined, all users */}
          <div className="pt-2">
            <Link href="/feedback" onClick={() => setMobileMenuOpen(false)}>
              <Button
                variant="outline"
                className="w-full h-11 rounded-full font-semibold text-sm border-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                Give Feedback
              </Button>
            </Link>
          </div>
        </nav>

        {/* Account */}
        <div className="p-3 border-t">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-full flex items-center gap-3 px-4 py-3 rounded-full hover:bg-muted/50 transition-colors">
                <Avatar className="w-10 h-10">
                  <AvatarImage src={userProfile?.photoURL || "/placeholder.svg"} alt={userProfile?.fullName} />
                  <AvatarFallback>{userProfile?.fullName ? getInitials(userProfile.fullName) : "?"}</AvatarFallback>
                </Avatar>
                <div className="flex-1 text-left overflow-hidden">
                  <p className="font-bold text-sm truncate">{userProfile?.fullName}</p>
                  <p className="text-xs text-muted-foreground truncate">@{userProfile?.handle || "user"}</p>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                <LogOut className="w-4 h-4 mr-2" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>
    </>
  )
}

function NavItem({
  href,
  icon,
  label,
  active,
  badge,
  onClick,
}: {
  href: string
  icon: React.ReactNode
  label: string
  active: boolean
  badge?: number
  onClick?: () => void
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        "flex items-center justify-between gap-4 px-4 py-3 rounded-full transition-all group",
        active ? "font-bold" : "hover:bg-muted/50",
      )}
    >
      <div className="flex items-center gap-4">
        <div className={active ? "" : "text-muted-foreground group-hover:text-foreground"}>{icon}</div>
        <span className={cn("text-xl", active ? "font-bold" : "font-normal")}>{label}</span>
      </div>
      {badge !== undefined && (
        <Badge variant="destructive" className="h-5 min-w-5 flex items-center justify-center text-xs px-1.5 rounded-full">
          {badge}
        </Badge>
      )}
    </Link>
  )
}
