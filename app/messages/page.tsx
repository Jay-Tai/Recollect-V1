"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { collection, getDocs, query, where, updateDoc, doc } from "firebase/firestore"
import { useAuth } from "@/components/auth-provider"
import { db } from "@/lib/firebase"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MessageSquare, Trash2, Loader2 } from "lucide-react"
import { toast } from "sonner"

interface PrivateMessage {
  id: string
  recipientId: string
  senderId: string
  subject: string
  body: string
  createdAt: string
  read: boolean
}

export default function MessagesPage() {
  const { user, isStudent, loading: authLoading } = useAuth()
  const router = useRouter()
  const [messages, setMessages] = useState<PrivateMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)

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

    if (user) {
      fetchMessages()
    }
  }, [user, authLoading, isStudent, router])

  const fetchMessages = async () => {
    if (!user) return

    try {
      const q = query(collection(db, "privateMessages"), where("recipientId", "==", user.uid))
      const snapshot = await getDocs(q)
      const msgs = snapshot.docs
        .map((d) => ({
          id: d.id,
          ...d.data(),
        }))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) as PrivateMessage[]

      setMessages(msgs)
    } catch (error) {
      console.error("[v0] Error fetching messages:", error)
      toast.error("Failed to load messages")
    } finally {
      setLoading(false)
    }
  }

  const markAsRead = async (messageId: string) => {
    try {
      await updateDoc(doc(db, "privateMessages", messageId), { read: true })
      setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, read: true } : m)))
    } catch (error) {
      console.error("[v0] Error marking as read:", error)
      toast.error("Failed to mark as read")
    }
  }

  const deleteMessage = async (messageId: string) => {
    setDeleting(messageId)
    try {
      await updateDoc(doc(db, "privateMessages", messageId), { deleted: true })
      setMessages((prev) => prev.filter((m) => m.id !== messageId))
      toast.success("Message deleted")
    } catch (error) {
      console.error("[v0] Error deleting message:", error)
      toast.error("Failed to delete message")
    } finally {
      setDeleting(null)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center lg:ml-72">
        <div className="text-center">
          <MessageSquare className="w-12 h-12 text-primary mx-auto mb-4 animate-pulse" />
          <p className="text-muted-foreground">Loading messages...</p>
        </div>
      </div>
    )
  }

  const unreadCount = messages.filter((m) => !m.read).length

  return (
    <div className="min-h-screen bg-background lg:ml-72 p-8 pt-20 lg:pt-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">Private Messages</h1>
          <p className="text-muted-foreground">
            {unreadCount > 0 ? `You have ${unreadCount} unread message(s)` : "All messages read"}
          </p>
        </div>

        {messages.length === 0 ? (
          <Card>
            <CardContent className="pt-12 pb-12">
              <div className="text-center">
                <MessageSquare className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                <h3 className="text-xl font-semibold mb-2">No messages yet</h3>
                <p className="text-sm text-muted-foreground">Messages from admins will appear here</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => (
              <Card
                key={message.id}
                className={`cursor-pointer transition-colors ${!message.read ? "bg-muted/50 border-primary/50" : ""}`}
                onClick={() => markAsRead(message.id)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-lg">{message.subject}</h3>
                        {!message.read && <Badge variant="destructive">New</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground">{formatDate(message.createdAt)}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteMessage(message.id)
                      }}
                      disabled={deleting === message.id}
                    >
                      {deleting === message.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-foreground whitespace-pre-wrap">{message.body}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
