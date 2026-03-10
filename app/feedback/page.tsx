"use client"

import { useState, useRef } from "react"
import { useAuth } from "@/components/auth-provider"
import { db, storage } from "@/lib/firebase"
import { addDoc, collection } from "firebase/firestore"
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Loader2, Upload, X, MessageCircle, Bug } from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

export default function FeedbackPage() {
  const { user, userProfile } = useAuth()
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [reason, setReason] = useState<"feedback" | "bug" | "">("")
  const [text, setText] = useState("")
  const [image, setImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImage(file)
    setImagePreview(URL.createObjectURL(file))
  }

  const removeImage = () => {
    setImage(null)
    setImagePreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!reason) { toast.error("Please select a reason."); return }
    if (!text.trim()) { toast.error("Please fill in the required field."); return }
    if (!user || !userProfile) { toast.error("You must be logged in."); return }

    setSubmitting(true)
    try {
      let imageUrl: string | undefined
      if (image) {
        const storageRef = ref(storage, `feedback/${user.uid}/${Date.now()}-${image.name}`)
        await uploadBytes(storageRef, image)
        imageUrl = await getDownloadURL(storageRef)
      }

      await addDoc(collection(db, "feedback"), {
        type: reason,
        text: text.trim(),
        imageUrl: imageUrl || null,
        submittedBy: userProfile.fullName || user.email,
        submittedByEmail: user.email,
        userId: user.uid,
        createdAt: new Date().toISOString(),
        read: false,
      })

      toast.success("Thank you! Your submission has been sent.")
      router.push("/feed")
    } catch (err) {
      console.error("[v0] Feedback submission error:", err)
      toast.error("Failed to submit. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-background lg:ml-72">
      <div className="container mx-auto px-4 py-8 max-w-2xl pt-20 lg:pt-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Share Feedback</h1>
          <p className="text-muted-foreground">Help us improve Recollect by sharing your thoughts or reporting a bug.</p>
        </div>

        <Card className="border-2 border-primary/20">
          <CardHeader>
            <CardTitle>Feedback Form</CardTitle>
            <CardDescription>Fields marked with * are required.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Reason */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">
                  What is the reason for filling out this survey? <span className="text-destructive">*</span>
                </Label>
                <RadioGroup
                  value={reason}
                  onValueChange={(v) => setReason(v as "feedback" | "bug")}
                  className="flex flex-col gap-3"
                >
                  <div className="flex items-center gap-3 border rounded-lg p-4 cursor-pointer hover:bg-muted/50 transition-colors">
                    <RadioGroupItem value="feedback" id="r-feedback" />
                    <label htmlFor="r-feedback" className="flex items-center gap-2 cursor-pointer flex-1">
                      <MessageCircle className="w-4 h-4 text-primary" />
                      <span className="font-medium">Feedback</span>
                      <span className="text-sm text-muted-foreground ml-1">— Share a suggestion or general thought</span>
                    </label>
                  </div>
                  <div className="flex items-center gap-3 border rounded-lg p-4 cursor-pointer hover:bg-muted/50 transition-colors">
                    <RadioGroupItem value="bug" id="r-bug" />
                    <label htmlFor="r-bug" className="flex items-center gap-2 cursor-pointer flex-1">
                      <Bug className="w-4 h-4 text-destructive" />
                      <span className="font-medium">Bug</span>
                      <span className="text-sm text-muted-foreground ml-1">— Report something that isn't working correctly</span>
                    </label>
                  </div>
                </RadioGroup>
              </div>

              {/* Conditional text field */}
              {reason && (
                <div className="space-y-2">
                  <Label htmlFor="text-input" className="text-base font-semibold">
                    {reason === "feedback" ? "What is your feedback?" : "What is your bug?"}{" "}
                    <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    id="text-input"
                    placeholder={
                      reason === "feedback"
                        ? "Share your thoughts, suggestions, or ideas..."
                        : "Describe what happened, steps to reproduce, and what you expected..."
                    }
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    rows={5}
                    required
                    className="resize-none"
                  />
                </div>
              )}

              {/* Optional image attachment */}
              {reason && (
                <div className="space-y-2">
                  <Label className="text-base font-semibold">
                    Attach an optional image{" "}
                    <span className="text-muted-foreground font-normal text-sm">(optional)</span>
                  </Label>
                  {imagePreview ? (
                    <div className="relative inline-block">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="max-h-48 rounded-lg border object-cover"
                      />
                      <button
                        type="button"
                        onClick={removeImage}
                        className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full w-6 h-6 flex items-center justify-center shadow-md"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors"
                    >
                      <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">Click to upload an image</p>
                    </div>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    className="hidden"
                  />
                </div>
              )}

              <Button
                type="submit"
                className="w-full h-12 text-base font-semibold"
                disabled={submitting || !reason || !text.trim()}
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Submitting...
                  </>
                ) : (
                  "Submit"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
