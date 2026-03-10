"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Camera, Award, Calendar, Loader2, ArrowLeft } from "lucide-react"

interface UserProfile {
  uid: string
  fullName: string
  handle?: string
  photoURL?: string
  bio?: string
  interests?: string[]
  pronouns?: string
  createdAt: string
  badges: Array<{
    id: string
    name: string
    description: string
    awardedBy: string
    awardedAt: string
  }>
  memoriesCount: number
}

interface Memory {
  id: string
  imageUrl: string
  caption: string
  createdAt: string
  userId: string
  userName: string
}

export default function PublicProfilePage() {
  const params = useParams()
  const router = useRouter()
  const userId = params.userId as string

  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [memories, setMemories] = useState<Memory[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (userId) {
      fetchPublicProfile()
    }
  }, [userId])

  const fetchPublicProfile = async () => {
    try {
      const userDoc = await getDoc(doc(db, "users", userId))
      if (userDoc.exists()) {
        const data = userDoc.data() as UserProfile
        setProfile(data)

        // Fetch user's memories
        const memoriesQuery = query(collection(db, "memories"), where("userId", "==", userId))
        const memoriesSnapshot = await getDocs(memoriesQuery)
        const memoriesData = memoriesSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Memory[]
        setMemories(memoriesData)
      }
    } catch (error) {
      console.error("[v0] Error fetching profile:", error)
    } finally {
      setLoading(false)
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

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center lg:ml-72">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center lg:ml-72">
        <Card>
          <CardHeader>
            <CardTitle>Profile Not Found</CardTitle>
            <CardDescription>This user profile does not exist.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push("/feed")}>Go to Feed</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background lg:ml-72 pt-20 lg:pt-0">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <Button variant="ghost" onClick={() => router.back()} className="mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        {/* Profile Header */}
        <Card className="mb-6">
          <CardContent className="pt-12 pb-8">
            <div className="flex flex-col items-center">
              {/* Interests as Thought Bubbles */}
              {profile.interests && profile.interests.length > 0 && (
                <div className="relative w-full max-w-2xl mx-auto mb-12" style={{ minHeight: "400px" }}>
                  {/* Central Avatar */}
                  <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
                    <Avatar className="w-40 h-40 border-4 border-background shadow-xl">
                      <AvatarImage src={profile.photoURL || "/placeholder.svg"} alt={profile.fullName} />
                      <AvatarFallback className="text-4xl">{getInitials(profile.fullName)}</AvatarFallback>
                    </Avatar>
                  </div>

                  {/* Thought Bubbles with Connecting Dots */}
                  {profile.interests.slice(0, 4).map((interest, index) => {
                    const positions = [
                      { x: "10%", y: "15%" }, // Top left
                      { x: "75%", y: "10%" }, // Top right
                      { x: "5%", y: "65%" }, // Bottom left
                      { x: "70%", y: "70%" }, // Bottom right
                    ]
                    const pos = positions[index] || positions[0]

                    return (
                      <div key={index} className="absolute" style={{ left: pos.x, top: pos.y }}>
                        {/* Connecting Dots */}
                        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                          <div className="flex items-center gap-1" style={{ 
                            transform: `rotate(${index * 45}deg)`,
                            transformOrigin: "center"
                          }}>
                            <div className="w-2 h-2 rounded-full bg-muted-foreground/40" />
                            <div className="w-2.5 h-2.5 rounded-full bg-muted-foreground/50" />
                            <div className="w-3 h-3 rounded-full bg-muted-foreground/60" />
                          </div>
                        </div>

                        {/* Thought Bubble Cloud */}
                        <div className="relative">
                          <div className="bg-card border-2 border-foreground rounded-[40%_60%_70%_30%/60%_30%_70%_40%] px-6 py-4 shadow-lg">
                            <span className="font-semibold text-lg whitespace-nowrap">{interest}</span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* No Interests - Just Avatar */}
              {(!profile.interests || profile.interests.length === 0) && (
                <Avatar className="w-40 h-40 border-4 border-background shadow-xl mb-6">
                  <AvatarImage src={profile.photoURL || "/placeholder.svg"} alt={profile.fullName} />
                  <AvatarFallback className="text-4xl">{getInitials(profile.fullName)}</AvatarFallback>
                </Avatar>
              )}

              <div className="text-center">
                <h1 className="text-3xl font-bold text-foreground mb-1">{profile.fullName}</h1>
                {profile.handle && <p className="text-sm text-primary font-medium mb-2">@{profile.handle}</p>}
                {profile.pronouns && <p className="text-sm text-muted-foreground mb-2">({profile.pronouns})</p>}
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-4">
                  <Calendar className="w-4 h-4" />
                  Joined {formatDate(profile.createdAt)}
                </div>
                {profile.bio && <p className="text-foreground leading-relaxed mb-4 max-w-2xl mx-auto">{profile.bio}</p>}
                <div className="flex flex-wrap items-center justify-center gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">{memories.length}</div>
                    <div className="text-xs text-muted-foreground">Memories</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">{profile.badges?.length || 0}</div>
                    <div className="text-xs text-muted-foreground">Badges</div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs for Badges and Memories */}
        <Tabs defaultValue="memories" className="w-full">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="memories" className="gap-2">
              <Camera className="w-4 h-4" />
              Memories
              <Badge variant="secondary">{memories.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="badges" className="gap-2">
              <Award className="w-4 h-4" />
              Badges
              <Badge variant="secondary">{profile.badges?.length || 0}</Badge>
            </TabsTrigger>
          </TabsList>

          {/* Memories Tab */}
          <TabsContent value="memories">
            <Card>
              <CardHeader>
                <CardTitle>Memories</CardTitle>
                <CardDescription>Photos and moments shared by {profile.fullName}</CardDescription>
              </CardHeader>
              <CardContent>
                {memories.length === 0 ? (
                  <div className="text-center py-12">
                    <Camera className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                    <p className="text-muted-foreground">No memories shared yet</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {memories.map((memory) => (
                      <div
                        key={memory.id}
                        className="relative group cursor-pointer"
                        onClick={() => {
                          // Will open fullscreen view (to be implemented with search)
                        }}
                      >
                        <div className="bg-white p-3 shadow-lg transform rotate-1 hover:rotate-0 transition-transform">
                          <img
                            src={memory.imageUrl || "/placeholder.svg"}
                            alt={memory.caption}
                            className="w-full aspect-square object-cover"
                          />
                          <p className="mt-2 text-sm font-handwriting text-center text-foreground line-clamp-2">
                            {memory.caption}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Badges Tab */}
          <TabsContent value="badges">
            <Card>
              <CardHeader>
                <CardTitle>Recognition Badges</CardTitle>
                <CardDescription>Awards earned by {profile.fullName}</CardDescription>
              </CardHeader>
              <CardContent>
                {profile.badges.length === 0 ? (
                  <div className="text-center py-12">
                    <Award className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                    <p className="text-muted-foreground">No badges yet</p>
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
        </Tabs>
      </div>
    </div>
  )
}
