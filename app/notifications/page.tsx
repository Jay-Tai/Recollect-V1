"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { collection, getDocs, doc, updateDoc, arrayUnion } from "firebase/firestore"
import { useAuth } from "@/components/auth-provider"
import { db } from "@/lib/firebase"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Bell, Check } from "lucide-react"
import { toast } from "sonner"

interface Announcement {
  id: string
  grade: string
  subject: string
  body: string
  createdAt: string
  createdBy: string
  createdByTeacher?: string
  read: string[]
}

export default function NotificationsPage() {
  const { user, userProfile, loading: authLoading, isStudent } = useAuth()
  const router = useRouter()
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [markingRead, setMarkingRead] = useState<string | null>(null)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login")
      return
    }

    if (!authLoading && !isStudent) {
      toast.error("Access denied. Student account required.")
      router.push("/feed")
      return
    }

    if (user && userProfile) {
      fetchAnnouncements()
    }
  }, [user, userProfile, authLoading, isStudent, router])

  const fetchAnnouncements = async () => {
    if (!userProfile) return

    try {
      const announcementsSnapshot = await getDocs(collection(db, "announcements"))
      const announcementsData = announcementsSnapshot.docs
        .map(
          (doc) =>
            ({
              id: doc.id,
              ...doc.data(),
            }) as Announcement,
        )
        .filter((announcement) => {
          const isForGrade = announcement.grade === userProfile.grade || announcement.grade === "all"
          return isForGrade
        })
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

      setAnnouncements(announcementsData)
    } catch (error) {
      console.error("[v0] Error fetching announcements:", error)
      toast.error("Failed to load notifications")
    } finally {
      setLoading(false)
    }
  }

  const handleMarkAsRead = async (announcementId: string) => {
    if (!userProfile) return

    setMarkingRead(announcementId)

    try {
      await updateDoc(doc(db, "announcements", announcementId), {
        read: arrayUnion(userProfile.uid),
      })

      setAnnouncements((prev) =>
        prev.map((announcement) =>
          announcement.id === announcementId
            ? { ...announcement, read: [...announcement.read, userProfile.uid] }
            : announcement,
        ),
      )

      toast.success("Marked as read")
    } catch (error) {
      console.error("[v0] Error marking announcement as read:", error)
      toast.error("Failed to mark as read")
    } finally {
      setMarkingRead(null)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const isRead = (announcement: Announcement) => {
    return announcement.read && announcement.read.includes(userProfile?.uid || "")
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center lg:ml-64">
        <div className="text-center">
          <Bell className="w-12 h-12 text-primary mx-auto mb-4 animate-pulse" />
          <p className="text-muted-foreground">Loading notifications...</p>
        </div>
      </div>
    )
  }

  const unreadAnnouncements = announcements.filter((a) => !isRead(a))
  const readAnnouncements = announcements.filter((a) => isRead(a))

  return (
    <div className="min-h-screen bg-background lg:ml-64 p-8 pt-20 lg:pt-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">Notifications</h1>
          <p className="text-muted-foreground">Important announcements from your teachers and administrators</p>
        </div>

        {announcements.length === 0 ? (
          <Card>
            <CardContent className="pt-12 pb-12">
              <div className="text-center">
                <Bell className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground">No notifications yet</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {unreadAnnouncements.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <h2 className="text-xl font-semibold">Unread</h2>
                  <Badge variant="destructive">{unreadAnnouncements.length}</Badge>
                </div>
                <div className="space-y-3">
                  {unreadAnnouncements.map((announcement) => (
                    <Card key={announcement.id} className="border-primary/50">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="default">New</Badge>
                              <Badge variant="outline">
                                Grade {announcement.grade === "all" ? "All" : announcement.grade}
                              </Badge>
                              <span className="text-sm text-muted-foreground">
                                {formatDate(announcement.createdAt)}
                              </span>
                            </div>
                            <CardTitle className="text-lg">{announcement.subject}</CardTitle>
                            <CardDescription>
                              From {announcement.createdByTeacher || announcement.createdBy}
                            </CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="bg-muted/50 p-4 rounded-lg mb-4">
                          <p className="text-foreground whitespace-pre-wrap">{announcement.body}</p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-2 bg-transparent"
                          onClick={() => handleMarkAsRead(announcement.id)}
                          disabled={markingRead === announcement.id}
                        >
                          <Check className="w-4 h-4" />
                          Mark as Read
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {readAnnouncements.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold mb-4">Read</h2>
                <div className="space-y-3">
                  {readAnnouncements.map((announcement) => (
                    <Card key={announcement.id} className="opacity-75">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="secondary">Read</Badge>
                              <Badge variant="outline">
                                Grade {announcement.grade === "all" ? "All" : announcement.grade}
                              </Badge>
                              <span className="text-sm text-muted-foreground">
                                {formatDate(announcement.createdAt)}
                              </span>
                            </div>
                            <CardTitle className="text-lg">{announcement.subject}</CardTitle>
                            <CardDescription>
                              From {announcement.createdByTeacher || announcement.createdBy}
                            </CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="bg-muted/50 p-4 rounded-lg">
                          <p className="text-foreground whitespace-pre-wrap">{announcement.body}</p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
