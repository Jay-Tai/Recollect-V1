"use client"

import { useEffect, useState, useRef } from "react"
import { useParams, useSearchParams } from "next/navigation"
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  orderBy,
} from "firebase/firestore"
import { db, storage } from "@/lib/firebase"
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage"
import { useAuth } from "@/components/auth-provider"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Loader2,
  ImageIcon,
  Mic,
  Video,
  Send,
  X,
  Heart,
} from "lucide-react"
import { toast } from "sonner"
import Image from "next/image"

interface BookOwner {
  userId: string
  slug: string
  displayName: string
  grade: string
  handle: string
  photoURL: string
}

interface Message {
  id: string
  senderName: string
  senderHandle?: string
  senderPhotoURL?: string
  text: string
  mediaUrl?: string
  mediaType?: "image" | "audio" | "video"
  createdAt: string
  isAnonymous: boolean
}

const ACCEPTED_TYPES: Record<string, string> = {
  image: "image/*",
  audio: "audio/*",
  video: "video/mp4,video/webm,video/ogg",
}

export default function MemoryBookPage() {
  const { slug } = useParams<{ slug: string }>()
  const searchParams = useSearchParams()
  const isOwner = searchParams.get("owner") === "true"
  const { user, userProfile } = useAuth()

  const [owner, setOwner] = useState<BookOwner | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loadingPage, setLoadingPage] = useState(true)

  // Form state
  const [senderName, setSenderName] = useState("")
  const [text, setText] = useState("")
  const [mediaFile, setMediaFile] = useState<File | null>(null)
  const [mediaPreview, setMediaPreview] = useState<string | null>(null)
  const [mediaKind, setMediaKind] = useState<"image" | "audio" | "video" | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  /* ─── Load book owner + messages ─── */
  useEffect(() => {
    if (!slug) return
    const load = async () => {
      setLoadingPage(true)
      try {
        // Find owner by slug
        const booksSnap = await getDocs(
          query(collection(db, "memoryBooks"), where("slug", "==", slug))
        )
        if (booksSnap.empty) { setLoadingPage(false); return }
        const ownerData = { id: booksSnap.docs[0].id, ...booksSnap.docs[0].data() } as any
        setOwner(ownerData)

        // Load messages
        const msgsSnap = await getDocs(
          query(
            collection(db, "memoryBookMessages"),
            where("bookSlug", "==", slug),
            orderBy("createdAt", "asc")
          )
        )
        setMessages(msgsSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as Message))
      } catch (err) {
        console.error("[v0] Error loading memory book:", err)
        toast.error("Failed to load memory book.")
      } finally {
        setLoadingPage(false)
      }
    }
    load()
  }, [slug])

  /* ─── Pre-fill name if logged in ─── */
  useEffect(() => {
    if (userProfile?.fullName && !senderName) {
      setSenderName(userProfile.fullName)
    }
  }, [userProfile])

  /* ─── Media picker ─── */
  const openPicker = (kind: "image" | "audio" | "video") => {
    setMediaKind(kind)
    if (fileInputRef.current) {
      fileInputRef.current.accept = ACCEPTED_TYPES[kind]
      fileInputRef.current.click()
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !mediaKind) return
    setMediaFile(file)
    setMediaPreview(URL.createObjectURL(file))
  }

  const clearMedia = () => {
    setMediaFile(null)
    setMediaPreview(null)
    setMediaKind(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  /* ─── Submit message ─── */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!owner) return
    const nameToUse = senderName.trim()
    if (!nameToUse) { toast.error("Please enter your name."); return }
    if (!text.trim() && !mediaFile) { toast.error("Add a message or media."); return }

    setSubmitting(true)
    try {
      let mediaUrl: string | undefined
      if (mediaFile && mediaKind) {
        const sRef = storageRef(
          storage,
          `memoryBooks/${slug}/${Date.now()}-${mediaFile.name}`
        )
        await uploadBytes(sRef, mediaFile)
        mediaUrl = await getDownloadURL(sRef)
      }

      const doc = await addDoc(collection(db, "memoryBookMessages"), {
        bookSlug: slug,
        bookOwnerId: owner.userId,
        senderName: nameToUse,
        senderHandle: userProfile?.handle || null,
        senderPhotoURL: userProfile?.photoURL || null,
        text: text.trim(),
        mediaUrl: mediaUrl || null,
        mediaType: mediaKind || null,
        isAnonymous: false,
        createdAt: new Date().toISOString(),
      })

      setMessages((prev) => [
        ...prev,
        {
          id: doc.id,
          senderName: nameToUse,
          senderHandle: userProfile?.handle,
          senderPhotoURL: userProfile?.photoURL,
          text: text.trim(),
          mediaUrl,
          mediaType: mediaKind || undefined,
          isAnonymous: false,
          createdAt: new Date().toISOString(),
        },
      ])

      setText("")
      clearMedia()
      setSenderName(isAnonymous ? "" : (userProfile?.fullName || ""))
      toast.success("Memory added!")
    } catch (err) {
      console.error("[v0] Error submitting memory:", err)
      toast.error("Failed to submit. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })

  /* ─── Loading ─── */
  if (loadingPage) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!owner) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl font-bold mb-2">Memory book not found</p>
          <p className="text-muted-foreground text-sm">This link may be invalid.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-xl mx-auto px-4 py-10">
        {/* Owner header */}
        <div className="flex flex-col items-center gap-3 mb-8 text-center">
          <Avatar className="w-20 h-20 border-4 border-primary shadow-md">
            <AvatarImage src={owner.photoURL} alt={owner.displayName} />
            <AvatarFallback className="text-2xl font-bold">
              {owner.displayName?.charAt(0) || "?"}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{owner.displayName}</h1>
            {owner.handle && (
              <p className="text-sm text-muted-foreground">@{owner.handle}</p>
            )}
          </div>
          <Badge variant="outline" className="text-primary border-primary">
            Grade {owner.grade} Memory Book
          </Badge>
          <p className="text-sm text-muted-foreground max-w-xs">
            Leave a memory, message, photo, audio, or video for {owner.displayName.split(" ")[0]}!
          </p>
        </div>

        {/* Leave a memory form — hidden for owner */}
        {!isOwner && (
          <Card className="border-2 border-primary/20 mb-8">
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Name */}
                <div className="space-y-1.5">
                  <Label htmlFor="sender-name">Your name</Label>
                  <Input
                    id="sender-name"
                    placeholder="Your name"
                    value={senderName}
                    onChange={(e) => setSenderName(e.target.value)}
                    required
                  />
                </div>

                {/* Message text */}
                <div className="space-y-1.5">
                  <Label htmlFor="memory-text">Message</Label>
                  <Textarea
                    id="memory-text"
                    placeholder={`Write a memory or message for ${owner.displayName.split(" ")[0]}...`}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    rows={4}
                    className="resize-none"
                  />
                </div>

                {/* Media preview */}
                {mediaPreview && mediaKind && (
                  <div className="relative inline-block">
                    {mediaKind === "image" && (
                      <img
                        src={mediaPreview}
                        alt="Preview"
                        className="max-h-40 rounded-lg border object-cover"
                      />
                    )}
                    {mediaKind === "audio" && (
                      <audio controls src={mediaPreview} className="w-full" />
                    )}
                    {mediaKind === "video" && (
                      <video
                        src={mediaPreview}
                        controls
                        className="max-h-40 rounded-lg border"
                      />
                    )}
                    <button
                      type="button"
                      onClick={clearMedia}
                      className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}

                {/* Media action buttons */}
                {!mediaFile && (
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="flex-1 gap-1.5 text-xs"
                      onClick={() => openPicker("image")}
                    >
                      <ImageIcon className="w-3.5 h-3.5" /> Photo
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="flex-1 gap-1.5 text-xs"
                      onClick={() => openPicker("audio")}
                    >
                      <Mic className="w-3.5 h-3.5" /> Audio
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="flex-1 gap-1.5 text-xs"
                      onClick={() => openPicker("video")}
                    >
                      <Video className="w-3.5 h-3.5" /> Video
                    </Button>
                  </div>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileChange}
                  className="hidden"
                />

                <Button
                  type="submit"
                  className="w-full gap-2"
                  disabled={submitting || (!text.trim() && !mediaFile)}
                >
                  {submitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  {submitting ? "Sending..." : "Leave a Memory"}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Messages list */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Heart className="w-5 h-5 text-primary" />
            {messages.length} {messages.length === 1 ? "Memory" : "Memories"}
          </h2>

          {messages.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground text-sm">
              No memories yet. Be the first to leave one!
            </div>
          ) : (
            messages.map((msg) => (
              <Card key={msg.id} className="border overflow-hidden">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start gap-3 mb-3">
                    <Avatar className="w-9 h-9 flex-shrink-0">
                      {!msg.isAnonymous && msg.senderPhotoURL ? (
                        <AvatarImage src={msg.senderPhotoURL} alt={msg.senderName} />
                      ) : null}
                      <AvatarFallback className="text-sm font-bold">
                        {msg.isAnonymous ? "?" : msg.senderName.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm">{msg.senderName}</span>
                        {msg.isAnonymous && (
                          <Badge variant="secondary" className="text-xs gap-1">
                            <Lock className="w-2.5 h-2.5" /> Anonymous
                          </Badge>
                        )}
                        {msg.senderHandle && !msg.isAnonymous && (
                          <span className="text-xs text-muted-foreground">@{msg.senderHandle}</span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{formatDate(msg.createdAt)}</p>
                    </div>
                  </div>

                  {msg.text && (
                    <p className="text-sm text-foreground leading-relaxed mb-3">{msg.text}</p>
                  )}

                  {msg.mediaUrl && msg.mediaType === "image" && (
                    <img
                      src={msg.mediaUrl}
                      alt="Memory"
                      className="w-full max-h-72 object-cover rounded-lg"
                    />
                  )}
                  {msg.mediaUrl && msg.mediaType === "audio" && (
                    <audio controls src={msg.mediaUrl} className="w-full mt-1" />
                  )}
                  {msg.mediaUrl && msg.mediaType === "video" && (
                    <video
                      src={msg.mediaUrl}
                      controls
                      className="w-full max-h-72 rounded-lg mt-1"
                    />
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
