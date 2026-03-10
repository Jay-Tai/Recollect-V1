"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { doc, getDoc, updateDoc, collection, query, where, getDocs } from "firebase/firestore"
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"
import { useAuth } from "@/components/auth-provider"
import { db, storage } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Camera, Loader2, X, Check, AlertCircle, Moon, Sun } from "lucide-react"
import { toast } from "sonner"
import { useTheme } from "next-themes"

interface UserProfile {
  uid: string
  email: string
  fullName: string
  studentNumber?: string
  photoURL?: string
  bio?: string
  handle?: string
  birthDate?: string
  interests?: string[]
  pronouns?: string
}

export default function SettingsPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [checkingHandle, setCheckingHandle] = useState(false)
  const [handleAvailable, setHandleAvailable] = useState<boolean | null>(null)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)

  const [formData, setFormData] = useState({
    handle: "",
    bio: "",
    birthDate: "",
    interests: [] as string[],
    newInterest: "",
    pronouns: "",
    photoURL: "",
  })

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
        setFormData({
          handle: data.handle || "",
          bio: data.bio || "",
          birthDate: data.birthDate || "",
          interests: data.interests || [],
          newInterest: "",
          pronouns: data.pronouns || "",
          photoURL: data.photoURL || "",
        })
      }
    } catch (error) {
      console.error("[v0] Error fetching profile:", error)
      toast.error("Failed to load profile")
    } finally {
      setLoading(false)
    }
  }

  const checkHandleAvailability = async (handle: string) => {
    if (!handle || handle === profile?.handle) {
      setHandleAvailable(null)
      return
    }

    setCheckingHandle(true)
    try {
      const usersRef = collection(db, "users")
      const q = query(usersRef, where("handle", "==", handle.toLowerCase()))
      const snapshot = await getDocs(q)

      setHandleAvailable(snapshot.empty)
    } catch (error) {
      console.error("[v0] Error checking handle:", error)
      setHandleAvailable(null)
    } finally {
      setCheckingHandle(false)
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      if (formData.handle && formData.handle !== profile?.handle) {
        checkHandleAvailability(formData.handle)
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [formData.handle])

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return

    setUploadingPhoto(true)
    try {
      const storageRef = ref(storage, `profilePictures/${user.uid}/${Date.now()}_${file.name}`)
      await uploadBytes(storageRef, file)
      const photoURL = await getDownloadURL(storageRef)

      setFormData({ ...formData, photoURL })
      toast.success("Photo uploaded successfully!")
    } catch (error) {
      console.error("[v0] Error uploading photo:", error)
      toast.error("Failed to upload photo")
    } finally {
      setUploadingPhoto(false)
    }
  }

  const addInterest = () => {
    if (formData.newInterest.trim() && formData.interests.length < 8) {
      setFormData({
        ...formData,
        interests: [...formData.interests, formData.newInterest.trim()],
        newInterest: "",
      })
    }
  }

  const removeInterest = (index: number) => {
    setFormData({
      ...formData,
      interests: formData.interests.filter((_, i) => i !== index),
    })
  }

  const handleSave = async () => {
    if (!user) return

    if (formData.handle && formData.handle !== profile?.handle && handleAvailable === false) {
      toast.error("Handle is already taken. Please choose a different one.")
      return
    }

    setSaving(true)
    try {
      const updateData: any = {
        bio: formData.bio.trim(),
        birthDate: formData.birthDate,
        interests: formData.interests,
        pronouns: formData.pronouns.trim(),
        photoURL: formData.photoURL,
      }

      if (formData.handle && formData.handle !== profile?.handle) {
        updateData.handle = formData.handle.toLowerCase().trim()
      }

      await updateDoc(doc(db, "users", user.uid), updateData)

      toast.success("Settings saved successfully!")
      router.push("/feed")
    } catch (error) {
      console.error("[v0] Error saving settings:", error)
      toast.error("Failed to save settings")
    } finally {
      setSaving(false)
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

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center lg:ml-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center lg:ml-64">
        <Card>
          <CardHeader>
            <CardTitle>Profile Not Found</CardTitle>
            <CardDescription>Unable to load your profile.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background lg:ml-72 pt-20 lg:pt-0">
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">Settings</h1>
          <p className="text-muted-foreground">Manage your profile and preferences</p>
        </div>

        {/* Appearance Settings */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Appearance</CardTitle>
            <CardDescription>Customize how the app looks to you</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Label>Theme</Label>
              <div className="flex gap-3">
                <Button
                  variant={theme === "light" ? "default" : "outline"}
                  onClick={() => setTheme("light")}
                  className="flex-1 h-20 flex-col gap-2"
                >
                  <Sun className="w-6 h-6" />
                  Light
                </Button>
                <Button
                  variant={theme === "dark" ? "default" : "outline"}
                  onClick={() => setTheme("dark")}
                  className="flex-1 h-20 flex-col gap-2"
                >
                  <Moon className="w-6 h-6" />
                  Dark
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Profile Settings</CardTitle>
            <CardDescription>Update your public profile information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Profile Picture */}
            <div className="flex flex-col items-center gap-4">
              <Avatar className="w-24 h-24">
                <AvatarImage src={formData.photoURL || "/placeholder.svg"} alt={profile.fullName} />
                <AvatarFallback className="text-2xl">{getInitials(profile.fullName)}</AvatarFallback>
              </Avatar>
              <div className="flex gap-2">
                <Label htmlFor="photo-upload" className="cursor-pointer">
                  <div className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors">
                    {uploadingPhoto ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Camera className="w-4 h-4" />
                        Change Photo
                      </>
                    )}
                  </div>
                </Label>
                <Input
                  id="photo-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoUpload}
                  disabled={uploadingPhoto}
                />
              </div>
            </div>

            {/* Handle */}
            <div className="space-y-2">
              <Label htmlFor="handle">Handle (Username)</Label>
              <div className="relative">
                <Input
                  id="handle"
                  placeholder="yourhandle"
                  value={formData.handle}
                  onChange={(e) => setFormData({ ...formData, handle: e.target.value.replace(/[^a-zA-Z0-9_]/g, "") })}
                  disabled={saving}
                  className="pr-10"
                  maxLength={20}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {checkingHandle && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
                  {!checkingHandle && handleAvailable === true && <Check className="w-4 h-4 text-green-500" />}
                  {!checkingHandle && handleAvailable === false && <AlertCircle className="w-4 h-4 text-destructive" />}
                </div>
              </div>
              {formData.handle && formData.handle !== profile.handle && (
                <p
                  className={`text-xs ${handleAvailable === true ? "text-green-500" : handleAvailable === false ? "text-destructive" : "text-muted-foreground"}`}
                >
                  {handleAvailable === true
                    ? "Handle is available!"
                    : handleAvailable === false
                      ? "Handle is already taken"
                      : "Checking availability..."}
                </p>
              )}
            </div>

            {/* Pronouns */}
            <div className="space-y-2">
              <Label htmlFor="pronouns">Pronouns</Label>
              <Input
                id="pronouns"
                placeholder="e.g., they/them, she/her, he/him"
                value={formData.pronouns}
                onChange={(e) => setFormData({ ...formData, pronouns: e.target.value })}
                disabled={saving}
              />
            </div>

            {/* Bio */}
            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                placeholder="Tell us about yourself..."
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                disabled={saving}
                rows={4}
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground">{formData.bio.length}/500 characters</p>
            </div>

            {/* Birth Date */}
            <div className="space-y-2">
              <Label htmlFor="birthDate">Birth Date</Label>
              <Input
                id="birthDate"
                type="date"
                value={formData.birthDate}
                onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                disabled={saving}
              />
            </div>

            {/* Interests */}
            <div className="space-y-2">
              <Label htmlFor="interests">Interests (max 8)</Label>
              <div className="flex gap-2">
                <Input
                  id="interests"
                  placeholder="Add an interest..."
                  value={formData.newInterest}
                  onChange={(e) => setFormData({ ...formData, newInterest: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      addInterest()
                    }
                  }}
                  disabled={saving || formData.interests.length >= 8}
                />
                <Button
                  type="button"
                  onClick={addInterest}
                  disabled={!formData.newInterest.trim() || formData.interests.length >= 8 || saving}
                >
                  Add
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.interests.map((interest, index) => (
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

            {/* Student Number (Read-only) */}
            <div className="space-y-2">
              <Label htmlFor="studentNumber">Student Number</Label>
              <Input id="studentNumber" value={profile.studentNumber || "N/A"} disabled className="bg-muted" />
              <p className="text-xs text-muted-foreground">Student number cannot be changed</p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 pt-4">
              <Button
                onClick={handleSave}
                disabled={saving || (handleAvailable === false && formData.handle !== profile.handle)}
                className="flex-1"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
              <Button variant="outline" onClick={() => router.push("/feed")} disabled={saving}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
