"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/components/auth-provider"
import { collection, getDocs, query, where, updateDoc, doc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

interface TeacherMessage {
  id: string
  teacherId: string
  announcement: string
  status: "approved" | "rejected"
  subject: string
  approvedAt?: string
  rejectedAt?: string
  read: boolean
}

export default function TeacherInboxPage() {
  const { userProfile, isTeacher } = useAuth()
  const [messages, setMessages] = useState<TeacherMessage[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    if (!isTeacher) {
      router.push("/feed")
      return
    }
    fetchMessages()
  }, [userProfile, isTeacher])

  const fetchMessages = async () => {
    if (!userProfile) return

    try {
      const q = query(collection(db, "teacherMessages"), where("teacherId", "==", userProfile.uid))
      const snapshot = await getDocs(q)
      const msgs = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as TeacherMessage[]

      // Sort by newest first
      msgs.sort((a, b) => {
        const dateA = new Date(a.approvedAt || a.rejectedAt || "0").getTime()
        const dateB = new Date(b.approvedAt || b.rejectedAt || "0").getTime()
        return dateB - dateA
      })

      setMessages(msgs)
    } catch (error) {
      console.error("[v0] Error fetching messages:", error)
      toast.error("Failed to load inbox")
    } finally {
      setLoading(false)
    }
  }

  const markAsRead = async (messageId: string) => {
    try {
      await updateDoc(doc(db, "teacherMessages", messageId), { read: true })
      setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, read: true } : m)))
    } catch (error) {
      console.error("[v0] Error marking as read:", error)
    }
  }

  if (loading) {
    return (
      <div className="ml-64 p-6">
        <div className="text-center py-12">Loading inbox...</div>
      </div>
    )
  }

  const unreadCount = messages.filter((m) => !m.read).length

  return (
    <div className="ml-64 p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Announcement Inbox</h1>
        <p className="text-muted-foreground">
          {unreadCount > 0 ? `You have ${unreadCount} unread message(s)` : "All messages read"}
        </p>
      </div>

      {messages.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">
          <p>No messages yet. Submit announcements for admin approval!</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {messages.map((message) => (
            <Card
              key={message.id}
              className={`p-4 cursor-pointer transition-colors ${!message.read ? "bg-muted/50 border-primary/50" : ""}`}
              onClick={() => markAsRead(message.id)}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-lg">{message.subject}</h3>
                    <Badge variant={message.status === "approved" ? "default" : "destructive"}>
                      {message.status === "approved" ? "Approved" : "Rejected"}
                    </Badge>
                    {!message.read && <Badge variant="outline">New</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    {message.status === "approved" ? "Approved on" : "Rejected on"}{" "}
                    {new Date(message.approvedAt || message.rejectedAt || "").toLocaleDateString()}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Your announcement has been{" "}
                    <span className={message.status === "approved" ? "text-green-600" : "text-red-600"}>
                      {message.status}
                    </span>
                    {message.status === "approved" && " and sent to students!"}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
