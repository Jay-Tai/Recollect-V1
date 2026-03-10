"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { doc, getDoc, setDoc } from "firebase/firestore"
import { useAuth } from "@/components/auth-provider"
import { db } from "@/lib/firebase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Loader2, QrCode, BookOpen, Lock, CheckCircle2, Copy, Check } from "lucide-react"
import { toast } from "sonner"

const GRADES = [9, 10, 11, 12]

function getUnlockedGrades(gradeStr: string): number[] {
  const grade = parseInt(gradeStr)
  if (isNaN(grade)) return []
  const unlocked: number[] = []
  for (let g = 9; g <= grade; g++) unlocked.push(g)
  return unlocked
}

export default function MyJourneyPage() {
  const { user, userProfile, loading: authLoading, isStudent } = useAuth()
  const router = useRouter()

  const [memorySlug, setMemorySlug] = useState<string | null>(null)
  const [loadingSlug, setLoadingSlug] = useState(true)
  const [qrOpen, setQrOpen] = useState(false)
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [selectedGrade, setSelectedGrade] = useState<number | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login")
    if (!authLoading && user && !isStudent) {
      toast.error("My Journey is only available for students")
      router.replace("/feed")
    }
  }, [user, authLoading, isStudent, router])

  const fetchOrCreateSlug = useCallback(async () => {
    if (!user || !userProfile) return
    setLoadingSlug(true)
    try {
      const ref = doc(db, "memoryBooks", user.uid)
      const snap = await getDoc(ref)
      if (snap.exists()) {
        setMemorySlug(snap.data().slug)
      } else {
        const slug =
          Math.random().toString(36).slice(2, 9) +
          Math.random().toString(36).slice(2, 6)
        await setDoc(ref, {
          userId: user.uid,
          slug,
          displayName: userProfile.fullName || "",
          grade: userProfile.grade || "",
          handle: userProfile.handle || "",
          photoURL: userProfile.photoURL || "",
          createdAt: new Date().toISOString(),
        })
        setMemorySlug(slug)
      }
    } catch (err) {
      console.error("[v0] Error fetching/creating memory book slug:", err)
      toast.error("Could not load your memory book link.")
    } finally {
      setLoadingSlug(false)
    }
  }, [user, userProfile])

  useEffect(() => {
    if (user && userProfile) fetchOrCreateSlug()
  }, [user, userProfile, fetchOrCreateSlug])

  const handleShareQR = async (grade: number) => {
    if (!memorySlug) return
    setSelectedGrade(grade)
    const url = `${window.location.origin}/memory/${memorySlug}`
    try {
      const QRCode = (await import("qrcode")).default
      const dataUrl = await QRCode.toDataURL(url, {
        width: 280,
        margin: 2,
        color: { dark: "#000000", light: "#ffffff" },
      })
      setQrDataUrl(dataUrl)
      setQrOpen(true)
    } catch (err) {
      console.error("[v0] QR generation error:", err)
      toast.error("Failed to generate QR code.")
    }
  }

  const bookUrl =
    typeof window !== "undefined" && memorySlug
      ? `${window.location.origin}/memory/${memorySlug}`
      : ""

  const handleCopy = async () => {
    if (!bookUrl) return
    await navigator.clipboard.writeText(bookUrl)
    setCopied(true)
    toast.success("Link copied!")
    setTimeout(() => setCopied(false), 2000)
  }

  if (authLoading || loadingSlug) {
    return (
      <div className="min-h-screen bg-background lg:ml-72 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!userProfile?.grade) {
    return (
      <div className="min-h-screen bg-background lg:ml-72">
        <div className="container mx-auto px-4 py-8 max-w-2xl pt-20 lg:pt-8">
          <p className="text-muted-foreground">
            Your grade is not set. Please update your profile first.
          </p>
        </div>
      </div>
    )
  }

  const currentGrade = parseInt(userProfile.grade)
  const unlockedGrades = getUnlockedGrades(userProfile.grade)

  return (
    <div className="min-h-screen bg-background lg:ml-72">
      <div className="container mx-auto px-4 py-8 max-w-2xl pt-20 lg:pt-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">My Journey</h1>
          <p className="text-muted-foreground">
            Your high school journey at a glance. Share your QR code so friends can leave memories in your book.
          </p>
        </div>

        {/* Grade Timeline */}
        <div className="relative mb-10">
          {/* Vertical connector line */}
          <div className="absolute left-6 top-6 bottom-6 w-0.5 bg-border" />

          <div className="space-y-5">
            {GRADES.map((grade) => {
              const isUnlocked = unlockedGrades.includes(grade)
              const isCurrent = grade === currentGrade
              const isFuture = grade > currentGrade

              return (
                <div key={grade} className="relative flex items-start gap-5 pl-1">
                  {/* Timeline dot */}
                  <div
                    className={`relative z-10 flex-shrink-0 w-11 h-11 rounded-full border-2 flex items-center justify-center text-sm font-bold transition-all ${
                      isCurrent
                        ? "bg-primary border-primary text-primary-foreground shadow-md scale-110"
                        : isUnlocked
                          ? "bg-primary/15 border-primary text-primary"
                          : "bg-muted border-border text-muted-foreground"
                    }`}
                  >
                    {isCurrent ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : isUnlocked ? (
                      <span>G{grade}</span>
                    ) : (
                      <Lock className="w-4 h-4" />
                    )}
                  </div>

                  {/* Card */}
                  <Card
                    className={`flex-1 transition-all ${
                      isCurrent
                        ? "border-primary shadow-sm"
                        : isUnlocked
                          ? "border-primary/25"
                          : "opacity-45"
                    }`}
                  >
                    <CardHeader className="pb-3 pt-4">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base font-bold">Grade {grade}</CardTitle>
                        {isCurrent && (
                          <Badge className="bg-primary text-primary-foreground text-xs">Current</Badge>
                        )}
                        {!isCurrent && isUnlocked && (
                          <Badge variant="outline" className="text-primary border-primary text-xs">
                            Completed
                          </Badge>
                        )}
                        {isFuture && (
                          <Badge variant="secondary" className="text-xs">Coming Soon</Badge>
                        )}
                      </div>
                    </CardHeader>

                    {isUnlocked && (
                      <CardContent className="pb-4">
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 gap-1.5 text-xs h-9"
                            onClick={() => handleShareQR(grade)}
                            disabled={!memorySlug}
                          >
                            <QrCode className="w-3.5 h-3.5" />
                            Share QR
                          </Button>
                          <Button
                            size="sm"
                            className="flex-1 gap-1.5 text-xs h-9"
                            onClick={() =>
                              router.push(`/memory/${memorySlug}?owner=true`)
                            }
                            disabled={!memorySlug}
                          >
                            <BookOpen className="w-3.5 h-3.5" />
                            Memory Book
                          </Button>
                        </div>
                      </CardContent>
                    )}
                  </Card>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* QR Dialog */}
      <Dialog open={qrOpen} onOpenChange={setQrOpen}>
        <DialogContent className="max-w-xs text-center">
          <DialogHeader>
            <DialogTitle>Grade {selectedGrade} Memory Book</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-2">
            <p className="text-sm text-muted-foreground px-2">
              Let friends scan this to leave you messages and memories.
            </p>
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt="QR Code"
                className="w-56 h-56 rounded-lg border shadow-sm"
              />
            ) : (
              <div className="w-56 h-56 bg-muted rounded-lg flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            )}
            <p className="text-xs text-muted-foreground break-all px-2">{bookUrl}</p>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={handleCopy}
            >
              {copied ? (
                <Check className="w-4 h-4 text-primary" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
              {copied ? "Copied!" : "Copy Link"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
