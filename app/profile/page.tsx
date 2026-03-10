"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { doc, getDoc, updateDoc } from "firebase/firestore"
import { signOut } from "firebase/auth"
import { useAuth } from "@/components/auth-provider"
import { auth, db } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Camera, Award, LogOut, Settings, Calendar, Mail, Sparkles, X } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"
import { useTheme } from "next-themes"

interface UserProfile {
  uid: string
  email: string
  fullName: string
  role: string
  createdAt: string
  badges: Array<{
    id: string
    name: string
    description: string
    awardedBy: string
    awardedAt: string
  }>
  memoriesCount: number
  bio?: string
  photoURL?: string
  interests?: string[]
  pronouns?: string
}

export default function ProfilePage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const { resolvedTheme } = useTheme()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editForm, setEditForm] = useState({
    bio: "",
    pronouns: "",
    interests: [] as string[],
    newInterest: "",
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login")
      return
    }

    if (user) {
      fetchUserProfile()
    }
  }, [user, authLoading, router])

  const fetchUserProfile = async () => {
    if (!user) return

    try {
      const userDoc = await getDoc(doc(db, "users", user.uid))
      if (userDoc.exists()) {
        const data = userDoc.data() as UserProfile
        setProfile(data)
        setEditForm({
          bio: data.bio || "",
          pronouns: data.pronouns || "",
          interests: data.interests || [],
          newInterest: "",
        })
      }
    } catch (error) {
      console.error("[v0] Error fetching profile:", error)
      toast.error("Failed to load profile")
    } finally {
      setLoading(false)
    }
  }

  const handleSaveProfile = async () => {
    if (!user) return

    setSaving(true)
    try {
      await updateDoc(doc(db, "users", user.uid), {
        bio: editForm.bio.trim(),
        pronouns: editForm.pronouns.trim(),
        interests: editForm.interests,
      })

      toast.success("Profile updated successfully!")
      setEditDialogOpen(false)
      fetchUserProfile()
    } catch (error) {
      console.error("[v0] Error saving profile:", error)
      toast.error("Failed to save profile")
    } finally {
      setSaving(false)
    }
  }

  const addInterest = () => {
    if (editForm.newInterest.trim() && editForm.interests.length < 8) {
      setEditForm({
        ...editForm,
        interests: [...editForm.interests, editForm.newInterest.trim()],
        newInterest: "",
      })
    }
  }

  const removeInterest = (index: number) => {
    setEditForm({
      ...editForm,
      interests: editForm.interests.filter((_, i) => i !== index),
    })
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

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Camera className="w-12 h-12 text-primary mx-auto mb-4 animate-pulse" />
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Profile Not Found</CardTitle>
            <CardDescription>Unable to load your profile information.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push("/feed")}>Go to Feed</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation Header */}
      <nav className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/feed" className="flex items-center gap-3">
            <Image
              src={resolvedTheme === "dark" ? "/logo-dark.png" : "/logo-light.png"}
              alt="JASS Memory Vault"
              width={40}
              height={40}
              className="w-10 h-10"
            />
            <span className="text-xl font-bold text-foreground">JASS Memory Vault</span>
          </Link>
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={handleLogout}>
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline ml-2">Log out</span>
            </Button>
          </div>
        </div>
      </nav>

      {/* Profile Content */}
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Profile Header */}
        <Card className="mb-6">
          <CardContent className="pt-8">
            <div className="flex flex-col items-center mb-6">
              <div className="relative">
                <Avatar className="w-32 h-32 border-4 border-background shadow-lg">
                  <AvatarImage src={profile.photoURL || "/placeholder.svg"} alt={profile.fullName} />
                  <AvatarFallback className="text-3xl">{getInitials(profile.fullName)}</AvatarFallback>
                </Avatar>

                {profile.interests && profile.interests.length > 0 && (
                  <div
                    className="absolute inset-0 w-full h-full"
                    style={{
                      width: "300px",
                      height: "300px",
                      left: "50%",
                      top: "50%",
                      transform: "translate(-50%, -50%)",
                    }}
                  >
                    {profile.interests.map((interest, index) => {
                      const angle = (360 / profile.interests!.length) * index
                      const radius = 120
                      const x = Math.cos((angle - 90) * (Math.PI / 180)) * radius
                      const y = Math.sin((angle - 90) * (Math.PI / 180)) * radius

                      return (
                        <Badge
                          key={index}
                          variant="secondary"
                          className="absolute whitespace-nowrap"
                          style={{
                            left: `calc(50% + ${x}px)`,
                            top: `calc(50% + ${y}px)`,
                            transform: "translate(-50%, -50%)",
                          }}
                        >
                          {interest}
                        </Badge>
                      )
                    })}
                  </div>
                )}
              </div>

              <div className="text-center mt-24">
                <h1 className="text-3xl font-bold text-foreground mb-1">{profile.fullName}</h1>
                {profile.pronouns && <p className="text-sm text-muted-foreground mb-2">({profile.pronouns})</p>}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-sm text-muted-foreground mb-4">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    {profile.email}
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Joined {formatDate(profile.createdAt)}
                  </div>
                </div>
                {profile.bio && <p className="text-foreground leading-relaxed mb-4 max-w-2xl mx-auto">{profile.bio}</p>}
                <div className="flex flex-wrap items-center justify-center gap-4 mb-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">{profile.memoriesCount || 0}</div>
                    <div className="text-xs text-muted-foreground">Memories</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">{profile.badges?.length || 0}</div>
                    <div className="text-xs text-muted-foreground">Badges</div>
                  </div>
                </div>
                <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="gap-2 bg-transparent">
                      <Settings className="w-4 h-4" />
                      Edit Profile
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Edit Profile</DialogTitle>
                      <DialogDescription>Update your profile information, interests, and bio</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="pronouns">Pronouns</Label>
                        <Input
                          id="pronouns"
                          placeholder="e.g., they/them, she/her, he/him"
                          value={editForm.pronouns}
                          onChange={(e) => setEditForm({ ...editForm, pronouns: e.target.value })}
                          disabled={saving}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="bio">Bio</Label>
                        <Textarea
                          id="bio"
                          placeholder="Tell us about yourself..."
                          value={editForm.bio}
                          onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                          disabled={saving}
                          rows={4}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="interests">Interests (max 8)</Label>
                        <div className="flex gap-2">
                          <Input
                            id="interests"
                            placeholder="Add an interest..."
                            value={editForm.newInterest}
                            onChange={(e) => setEditForm({ ...editForm, newInterest: e.target.value })}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault()
                                addInterest()
                              }
                            }}
                            disabled={saving || editForm.interests.length >= 8}
                          />
                          <Button
                            type="button"
                            onClick={addInterest}
                            disabled={!editForm.newInterest.trim() || editForm.interests.length >= 8 || saving}
                          >
                            Add
                          </Button>
                        </div>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {editForm.interests.map((interest, index) => (
                            <Badge key={index} variant="secondary" className="gap-1">
                              {interest}
                              <button
                                type="button"
                                onClick={() => removeInterest(index)}
                                className="ml-1 hover:text-destructive"
                                disabled={saving}
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <Button onClick={handleSaveProfile} disabled={saving} className="w-full">
                        {saving ? "Saving..." : "Save Changes"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs for Badges, Memories, etc */}
        <Tabs defaultValue="badges" className="w-full">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="badges" className="gap-2">
              <Award className="w-4 h-4" />
              Badges
            </TabsTrigger>
            <TabsTrigger value="memories" className="gap-2">
              <Camera className="w-4 h-4" />
              Memories
            </TabsTrigger>
            <TabsTrigger value="about" className="gap-2">
              <Sparkles className="w-4 h-4" />
              About
            </TabsTrigger>
          </TabsList>

          {/* Badges Tab */}
          <TabsContent value="badges">
            <Card>
              <CardHeader>
                <CardTitle>Recognition Badges</CardTitle>
                <CardDescription>
                  Special achievements awarded by teachers for your outstanding contributions.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {profile.badges.length === 0 ? (
                  <div className="text-center py-12">
                    <Award className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                    <p className="text-muted-foreground mb-2">No badges yet</p>
                    <p className="text-sm text-muted-foreground">
                      Keep participating and contributing to earn recognition from your teachers!
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {profile.badges.map((badge) => (
                      <Card key={badge.id} className="border-primary/20">
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <CardTitle className="text-lg flex items-center gap-2">
                                <Award className="w-5 h-5 text-primary" />
                                {badge.name}
                              </CardTitle>
                              <CardDescription className="mt-2">{badge.description}</CardDescription>
                            </div>
                            <Badge variant="secondary">New</Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="text-sm text-muted-foreground">
                            <p>Awarded by {badge.awardedBy}</p>
                            <p className="text-xs mt-1">{formatDate(badge.awardedAt)}</p>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Memories Tab */}
          <TabsContent value="memories">
            <Card>
              <CardHeader>
                <CardTitle>My Memories</CardTitle>
                <CardDescription>Your shared moments and polaroid-style photos.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <Camera className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <p className="text-muted-foreground mb-4">No memories shared yet</p>
                  <Button asChild>
                    <Link href="/feed">Start Sharing Memories</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* About Tab */}
          <TabsContent value="about">
            <Card>
              <CardHeader>
                <CardTitle>About</CardTitle>
                <CardDescription>Your account details and settings.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">Full Name</h3>
                    <p className="text-foreground">{profile.fullName}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">Email</h3>
                    <p className="text-foreground">{profile.email}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">Role</h3>
                    <Badge variant="outline" className="capitalize">
                      {profile.role}
                    </Badge>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">Member Since</h3>
                    <p className="text-foreground">{formatDate(profile.createdAt)}</p>
                  </div>
                </div>
                <div className="pt-4 border-t">
                  <h3 className="text-sm font-medium text-muted-foreground mb-3">Account Actions</h3>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button variant="outline">Change Password</Button>
                    <Button variant="outline">Update Email</Button>
                    <Button variant="destructive">Delete Account</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
