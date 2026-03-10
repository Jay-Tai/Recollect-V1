"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Flag, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { addDoc, collection } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "./auth-provider"

interface ReportDialogProps {
  contentId: string
  contentType: "memory" | "announcement" | "comment" | "user"
  contentOwnerId: string
  contentOwnerName: string
  contentLink: string
}

export function ReportDialog({
  contentId,
  contentType,
  contentOwnerId,
  contentOwnerName,
  contentLink,
}: ReportDialogProps) {
  const { user, userProfile } = useAuth()
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [description, setDescription] = useState("")

  const handleSubmit = async () => {
    if (!description.trim()) {
      toast.error("A description is required before submitting a report.")
      return
    }

    if (!user || !userProfile) {
      toast.error("You must be logged in to submit a report.")
      return
    }

    setSubmitting(true)
    try {
      await addDoc(collection(db, "reports"), {
        contentId,
        contentType,
        contentOwnerId,
        contentOwnerName,
        contentLink,
        reportedBy: user.uid,
        reportedByHandle: userProfile.handle || null,
        reportedByName: userProfile.fullName || user.email,
        description: description.trim(),
        status: "pending",
        createdAt: new Date().toISOString(),
      })

      toast.success("Report submitted. An admin will review it shortly.")
      setOpen(false)
      setDescription("")
    } catch (error) {
      console.error("[v0] Error submitting report:", error)
      toast.error("Failed to submit report. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  const typeLabel =
    contentType === "memory"
      ? "Memory"
      : contentType === "announcement"
        ? "Announcement"
        : contentType === "comment"
          ? "Comment"
          : "User"

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors"
          aria-label={`Report this ${typeLabel.toLowerCase()}`}
        >
          <Flag className="w-3 h-3" />
          Report
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Report {typeLabel}</DialogTitle>
          <DialogDescription>
            Reporting content by <strong>{contentOwnerName}</strong>. Describe what is wrong with this content. Your
            report is sent directly to an admin.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="report-description">
              Description <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="report-description"
              placeholder="Explain why you are reporting this content..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={submitting}
              rows={4}
            />
            <p className="text-xs text-muted-foreground">A description is required to submit a report.</p>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleSubmit}
              disabled={submitting || !description.trim()}
              className="flex-1"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Report"
              )}
            </Button>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
