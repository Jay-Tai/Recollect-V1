"use client"

import { useEffect, useState } from "react"
import { collection, getDocs } from "firebase/firestore"
import { useAuth } from "./auth-provider"
import { db } from "@/lib/firebase"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Bell, X } from "lucide-react"

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

export function AnnouncementModal() {
  const { user, userProfile, isStudent } = useAuth()
  const [open, setOpen] = useState(false)
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    if (user && userProfile && isStudent) {
      // Small delay to let the user see the app before showing modal
      const timer = setTimeout(() => {
        fetchUnreadAnnouncements()
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [user, userProfile, isStudent])

  const fetchUnreadAnnouncements = async () => {
    if (!userProfile) return

    try {
      const announcementsSnapshot = await getDocs(collection(db, "announcements"))
      const unreadAnnouncements = announcementsSnapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }) as Announcement)
        .filter((announcement) => {
          const isForGrade = announcement.grade === userProfile.grade || announcement.grade === "all"
          const isUnread = !announcement.read || !announcement.read.includes(userProfile.uid)
          return isForGrade && isUnread
        })
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5) // Show max 5 announcements

      if (unreadAnnouncements.length > 0) {
        setAnnouncements(unreadAnnouncements)
        setOpen(true)
      }
    } catch (error) {
      console.error("[v0] Error fetching announcements:", error)
    }
  }

  const handleNext = () => {
    if (currentIndex < announcements.length - 1) {
      setCurrentIndex(currentIndex + 1)
    } else {
      setOpen(false)
    }
  }

  const handleClose = () => {
    setOpen(false)
  }

  const currentAnnouncement = announcements[currentIndex]

  if (!currentAnnouncement) return null

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-primary" />
              <DialogTitle>New Announcement</DialogTitle>
            </div>
            <Button variant="ghost" size="sm" onClick={handleClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
          <DialogDescription>
            {announcements.length > 1 && (
              <span className="text-sm">
                {currentIndex + 1} of {announcements.length}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Badge variant="default">New</Badge>
            <Badge variant="outline">
              Grade {currentAnnouncement.grade === "all" ? "All" : currentAnnouncement.grade}
            </Badge>
          </div>

          <div>
            <h3 className="text-xl font-semibold mb-2">{currentAnnouncement.subject}</h3>
            <p className="text-sm text-muted-foreground mb-4">
              From {currentAnnouncement.createdByTeacher || currentAnnouncement.createdBy}
            </p>
            <div className="bg-muted/50 p-4 rounded-lg">
              <p className="text-foreground whitespace-pre-wrap">{currentAnnouncement.body}</p>
            </div>
          </div>

          <div className="flex justify-between items-center pt-4">
            <Button variant="link" onClick={handleClose}>
              Skip all
            </Button>
            <Button onClick={handleNext}>{currentIndex < announcements.length - 1 ? "Next" : "Got it"}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
