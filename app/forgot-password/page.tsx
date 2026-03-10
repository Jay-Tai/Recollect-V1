"use client"

import type React from "react"

import { useState } from "react"
import { sendPasswordResetEmail } from "firebase/auth"
import { collection, getDocs, query, where } from "firebase/firestore"
import { auth, db } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Loader2, Mail } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { toast } from "sonner"
import { useTheme } from "next-themes"

export default function ForgotPasswordPage() {
  const { resolvedTheme } = useTheme()
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email.trim()) {
      toast.error("Please enter your email address")
      return
    }

    setLoading(true)

    try {
      console.log("[v0] Checking if user exists with email:", email)

      // Check if user exists in Firestore
      const usersRef = collection(db, "users")
      const q = query(usersRef, where("email", "==", email.trim().toLowerCase()))
      const querySnapshot = await getDocs(q)

      if (querySnapshot.empty) {
        toast.error("No account found with this email address")
        setLoading(false)
        return
      }

      console.log("[v0] User found, sending password reset email")

      // Send password reset email via Firebase Auth
      await sendPasswordResetEmail(auth, email.trim())

      toast.success("Password reset email sent! Check your inbox.")
      setEmailSent(true)
    } catch (error: any) {
      console.error("[v0] Password reset error:", error)

      let errorMessage = "Failed to send password reset email"
      if (error.code === "auth/invalid-email") {
        errorMessage = "Invalid email address"
      } else if (error.code === "auth/user-not-found") {
        errorMessage = "No account found with this email"
      }

      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-4">
            <Image
              src={resolvedTheme === "dark" ? "/icon-dark.png" : "/icon-light.png"}
              alt="Recollect icon"
              width={32}
              height={32}
              className="w-8 h-8"
            />
            <Image
              src={resolvedTheme === "dark" ? "/logo-dark.png" : "/logo-light.png"}
              alt="Recollect"
              width={110}
              height={28}
              className="h-6 w-auto"
            />
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Reset Your Password</CardTitle>
            <CardDescription>
              {emailSent
                ? "Check your email for a password reset link"
                : "Enter your email address and we'll send you a password reset link"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {emailSent ? (
              <div className="space-y-4">
                <div className="text-center py-8">
                  <Mail className="w-16 h-16 text-primary mx-auto mb-4" />
                  <p className="text-foreground mb-2">Password reset email sent to:</p>
                  <p className="font-medium text-foreground">{email}</p>
                  <p className="text-sm text-muted-foreground mt-4">
                    Click the link in the email to reset your password. If you don't see it, check your spam folder.
                  </p>
                </div>
                <div className="space-y-2">
                  <Button asChild variant="outline" className="w-full bg-transparent">
                    <Link href="/login">
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Back to Login
                    </Link>
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full"
                    onClick={() => {
                      setEmailSent(false)
                      setEmail("")
                    }}
                  >
                    Send to a different email
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your.email@school.edu"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    "Send Reset Link"
                  )}
                </Button>

                <Button asChild variant="ghost" className="w-full" disabled={loading}>
                  <Link href="/login">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Login
                  </Link>
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
