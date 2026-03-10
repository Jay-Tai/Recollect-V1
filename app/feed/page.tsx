"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { collection, addDoc, query, orderBy, getDocs, updateDoc, doc, increment } from "firebase/firestore"
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"
import { useAuth } from "@/components/auth-provider"
import { db, storage } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Camera, Upload, Loader2, Heart } from "lucide-react"
import { toast } from "sonner"
import { ReportDialog } from "@/components/report-dialog"

interface Memory {
  id: string
  userId: string
  userName: string
  imageUrl: string
  title: string
  caption: string
  createdAt: string
  likes: number
}

export default function FeedPage() {
  const { user, userProfile, loading: authLoading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [memories, setMemories] = useState<Memory[]>([])
  const [loading, setLoading] = useState(true)
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [title, setTitle] = useState("")
  const [caption, setCaption] = useState("")
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [showPreview, setShowPreview] = useState(false)

  useEffect(() => {
    const handleOpenDialog = () => {
      setUploadDialogOpen(true)
    }

    window.addEventListener("openCreateMemoryDialog", handleOpenDialog)
    return () => window.removeEventListener("openCreateMemoryDialog", handleOpenDialog)
  }, [])

  useEffect(() => {
    if (searchParams.get("create") === "true") {
      setUploadDialogOpen(true)
      // Clean up URL
      router.replace("/feed")
    }
  }, [searchParams, router])

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login")
      return
    }

    if (user) {
      fetchMemories()
    }
  }, [user, authLoading, router])

  const fetchMemories = async () => {
    try {
      const memoriesQuery = query(collection(db, "memories"), orderBy("createdAt", "desc"))
      const snapshot = await getDocs(memoriesQuery)
      const memoriesData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Memory[]
      setMemories(memoriesData)
    } catch (error) {
      console.error("[v0] Error fetching memories:", error)
      toast.error("Failed to load memories")
    } finally {
      setLoading(false)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("File size must be less than 5MB")
        return
      }
      if (!file.type.startsWith("image/")) {
        toast.error("Please select an image file")
        return
      }
      setSelectedFile(file)
      setPreviewUrl(URL.createObjectURL(file))
    }
  }

  const runModeration = async (text: string): Promise<boolean> => {
    try {
      const res = await fetch("/api/moderate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text }),
      })
      if (!res.ok) return false
      const data = await res.json()
      // Check if any category score exceeds 79%
      if (data.category_scores) {
        for (const score of Object.values(data.category_scores) as number[]) {
          if (score > 0.79) return true
        }
      }
      return data.flagged === true
    } catch {
      return false
    }
  }

  const handleUpload = async () => {
    if (!selectedFile || !title.trim() || !caption.trim() || !user || !userProfile) {
      toast.error("Please fill in all fields")
      return
    }

    setUploading(true)

    try {
      // Run moderation on title + caption before uploading
      const textToModerate = `${title.trim()} ${caption.trim()}`
      const flagged = await runModeration(textToModerate)

      if (flagged) {
        // Add a strike to the user's account
        await updateDoc(doc(db, "users", user.uid), {
          strikes: increment(1),
        })
        // Send automated system message to the user
        await addDoc(collection(db, "systemMessages"), {
          userId: user.uid,
          message:
            "Your recent post was automatically removed because it violated our community guidelines. A strike has been added to your account. Repeated violations may result in a ban.",
          createdAt: new Date().toISOString(),
          read: false,
          type: "moderation_warning",
        })
        toast.error(
          "Your post was flagged and could not be published. It violates community guidelines. A strike has been added to your account.",
          { duration: 6000 }
        )
        setUploading(false)
        return
      }

      // Upload image to Firebase Storage
      const fileName = `${Date.now()}-${selectedFile.name}`
      const storageRef = ref(storage, `memories/${user.uid}/${fileName}`)
      await uploadBytes(storageRef, selectedFile)
      const imageUrl = await getDownloadURL(storageRef)

      const userName = userProfile.fullName || user.email?.split("@")[0] || "Anonymous"

      const memoryData = {
        userId: user.uid,
        userName: userName,
        userHandle: userProfile.handle || null,
        imageUrl: imageUrl,
        title: title.trim(),
        caption: caption.trim(),
        createdAt: new Date().toISOString(),
        likes: 0,
      }

      await addDoc(collection(db, "memories"), memoryData)

      await updateDoc(doc(db, "users", user.uid), {
        memoriesCount: increment(1),
      })

      toast.success("Memory shared successfully!")

      setUploadDialogOpen(false)
      setSelectedFile(null)
      setTitle("")
      setCaption("")
      setPreviewUrl(null)
      setShowPreview(false)

      await fetchMemories()
    } catch (error) {
      console.error("[v0] Upload error:", error)
      toast.error("Failed to upload memory. Please try again.")
    } finally {
      setUploading(false)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Camera className="w-12 h-12 text-primary mx-auto mb-4 animate-pulse" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  const rotationClasses = [
    "rotate-[-2deg]",
    "rotate-[1deg]",
    "rotate-[-1deg]",
    "rotate-[2deg]",
    "rotate-[-3deg]",
    "rotate-[3deg]",
  ]

  return (
    <div className="min-h-screen bg-background lg:ml-72">
      <div className="container mx-auto px-4 py-8 max-w-2xl pt-20 lg:pt-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-4">Memory Feed</h1>
          <p className="text-muted-foreground mb-6">Share and explore school memories with your classmates</p>

          <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
            <DialogTrigger asChild>
              <Button size="lg" className="gap-2">
                <Upload className="w-4 h-4" />
                Share a Memory
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Share a Memory</DialogTitle>
                <DialogDescription>Upload a photo, add a title and caption to share your moment</DialogDescription>
              </DialogHeader>

              {showPreview ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Preview</h3>
                    <Button variant="outline" size="sm" onClick={() => setShowPreview(false)}>
                      Back to Edit
                    </Button>
                  </div>
                  <div className="bg-card p-4 rounded-lg shadow-lg max-w-md mx-auto">
                    <div className="aspect-square bg-accent rounded-md mb-3 overflow-hidden">
                      <img
                        src={previewUrl || "/placeholder.svg"}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <h4 className="text-lg font-semibold text-center mb-2">{title}</h4>
                    <p className="text-sm text-center font-handwriting text-foreground mb-2">{caption}</p>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{userProfile?.fullName || user?.email?.split("@")[0]}</span>
                      <button className="flex items-center gap-1">
                        <Heart className="w-3 h-3" />0
                      </button>
                    </div>
                  </div>
                  <Button onClick={handleUpload} disabled={uploading} className="w-full">
                    {uploading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Publish Memory
                      </>
                    )}
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {previewUrl && (
                    <div className="aspect-square bg-accent rounded-md overflow-hidden max-w-md mx-auto">
                      <img
                        src={previewUrl || "/placeholder.svg"}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="photo">Photo *</Label>
                    <Input id="photo" type="file" accept="image/*" onChange={handleFileSelect} disabled={uploading} />
                    <p className="text-xs text-muted-foreground">Maximum file size: 5MB (Required)</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="title">Title *</Label>
                    <Input
                      id="title"
                      type="text"
                      placeholder="Give your memory a title..."
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      disabled={uploading}
                      maxLength={50}
                    />
                    <p className="text-xs text-muted-foreground">{title.length}/50 characters</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="caption">Caption *</Label>
                    <Textarea
                      id="caption"
                      placeholder="Add a caption to your memory..."
                      value={caption}
                      onChange={(e) => setCaption(e.target.value)}
                      disabled={uploading}
                      rows={3}
                      maxLength={200}
                    />
                    <p className="text-xs text-muted-foreground">{caption.length}/200 characters</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setShowPreview(true)}
                      disabled={!selectedFile || !title.trim() || !caption.trim()}
                      className="flex-1"
                    >
                      Preview
                    </Button>
                    <Button
                      onClick={handleUpload}
                      disabled={!selectedFile || !title.trim() || !caption.trim() || uploading}
                      className="flex-1"
                    >
                      {uploading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4 mr-2" />
                          Upload Memory
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>

        {memories.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <Camera className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="text-xl font-semibold text-foreground mb-2">No memories yet</h3>
              <p className="text-muted-foreground mb-6">Be the first to share a memory!</p>
              <Button onClick={() => setUploadDialogOpen(true)} className="gap-2">
                <Upload className="w-4 h-4" />
                Upload Your First Photo
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {memories.map((memory, index) => (
              <div
                key={memory.id}
                className={`bg-card p-4 rounded-lg shadow-lg transform ${rotationClasses[index % rotationClasses.length]} hover:rotate-0 hover:scale-105 transition-all duration-300 cursor-pointer`}
              >
                <div className="aspect-square bg-accent rounded-md mb-3 overflow-hidden">
                  <img
                    src={memory.imageUrl || "/placeholder.svg"}
                    alt={memory.caption}
                    className="w-full h-full object-cover"
                  />
                </div>
                {(memory as any).title && (
                  <h4 className="text-base font-semibold text-center mb-1">{(memory as any).title}</h4>
                )}
                <p className="text-sm text-center font-handwriting text-foreground mb-2 line-clamp-2">
                  {memory.caption}
                </p>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{memory.userName}</span>
                  <div className="flex items-center gap-2">
                    <button className="flex items-center gap-1 hover:text-destructive transition-colors">
                      <Heart className="w-3 h-3" />
                      {memory.likes}
                    </button>
                    {user?.uid !== memory.userId && (
                      <ReportDialog
                        contentId={memory.id}
                        contentType="memory"
                        contentOwnerId={memory.userId}
                        contentOwnerName={memory.userName}
                        contentLink={`/feed?memory=${memory.id}`}
                      />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
