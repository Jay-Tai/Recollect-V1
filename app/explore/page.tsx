"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { collection, getDocs, query, orderBy, limit, where } from "firebase/firestore"
import { useAuth } from "@/components/auth-provider"
import { db } from "@/lib/firebase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TrendingUp, Users, Calendar, Bell } from "lucide-react"
import Link from "next/link"

interface Activity {
  id: string
  type: "memory" | "announcement" | "club"
  title: string
  description: string
  timestamp: string
  user?: {
    name: string
    photo: string
  }
}

export default function ExplorePage() {
  const { user, userProfile, loading: authLoading } = useAuth()
  const router = useRouter()
  const [latestActivity, setLatestActivity] = useState<Activity[]>([])
  const [clubActivity, setClubActivity] = useState<Activity[]>([])
  const [announcements, setAnnouncements] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login")
      return
    }

    if (user) {
      fetchAllActivity()
    }
  }, [user, authLoading, router])

  const fetchAllActivity = async () => {
    try {
      // Fetch latest memories
      const memoriesQuery = query(collection(db, "memories"), orderBy("createdAt", "desc"), limit(10))
      const memoriesSnapshot = await getDocs(memoriesQuery)
      
      const memoryActivities: Activity[] = memoriesSnapshot.docs.map((doc) => {
        const data = doc.data()
        return {
          id: doc.id,
          type: "memory" as const,
          title: data.title || "New Memory",
          description: data.caption || "",
          timestamp: data.createdAt,
          user: {
            name: data.userName,
            photo: data.userPhoto || "",
          },
        }
      })

      // Fetch announcements
      const announcementsQuery = query(collection(db, "announcements"), orderBy("createdAt", "desc"), limit(5))
      const announcementsSnapshot = await getDocs(announcementsQuery)
      const announcementsData = announcementsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))

      setLatestActivity(memoryActivities)
      setAnnouncements(announcementsData)
    } catch (error) {
      console.error("[v0] Error fetching activity:", error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return "Just now"
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center lg:ml-72">
        <div className="text-center">
          <TrendingUp className="w-12 h-12 text-primary mx-auto mb-4 animate-pulse" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background lg:ml-72">
      <div className="container mx-auto px-4 py-8 max-w-2xl pt-20 lg:pt-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">Explore</h1>
          <p className="text-muted-foreground">Discover what's happening across the school</p>
        </div>

        <Tabs defaultValue="latest" className="w-full">
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="latest">Latest Activity</TabsTrigger>
            <TabsTrigger value="clubs">Clubs</TabsTrigger>
            <TabsTrigger value="announcements">Announcements</TabsTrigger>
          </TabsList>

          <TabsContent value="latest" className="space-y-4 mt-6">
            {latestActivity.length === 0 ? (
              <Card>
                <CardContent className="pt-12 pb-12">
                  <div className="text-center">
                    <TrendingUp className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                    <p className="text-muted-foreground">No recent activity</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              latestActivity.map((activity) => (
                <Card key={activity.id} className="hover:bg-muted/50 transition-colors cursor-pointer">
                  <CardContent className="pt-6">
                    <div className="flex gap-3">
                      {activity.user && (
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={activity.user.photo || "/placeholder.svg"} />
                          <AvatarFallback>{activity.user.name[0]}</AvatarFallback>
                        </Avatar>
                      )}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold">{activity.user?.name}</span>
                          <span className="text-muted-foreground text-sm">{formatDate(activity.timestamp)}</span>
                        </div>
                        <h3 className="font-semibold mb-1">{activity.title}</h3>
                        <p className="text-sm text-muted-foreground line-clamp-2">{activity.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="clubs" className="space-y-4 mt-6">
            <Card>
              <CardContent className="pt-12 pb-12">
                <div className="text-center">
                  <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <p className="text-muted-foreground">Club activity coming soon</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="announcements" className="space-y-4 mt-6">
            {announcements.length === 0 ? (
              <Card>
                <CardContent className="pt-12 pb-12">
                  <div className="text-center">
                    <Bell className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                    <p className="text-muted-foreground">No announcements</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              announcements.map((announcement) => (
                <Card key={announcement.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg mb-2">{announcement.subject}</CardTitle>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">Grade {announcement.grade}</Badge>
                          <span className="text-sm text-muted-foreground">
                            {formatDate(announcement.createdAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-foreground whitespace-pre-wrap">{announcement.body}</p>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
