"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/auth-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Mail, CheckCircle, Loader2 } from "lucide-react"
import { toast } from "sonner"

export default function VerifyEmailPage() {
  const { user, userProfile, loading: authLoading } = useAuth()
  const router = useRouter()
  const [isVerified, setIsVerified] = useState(false)
  const [isChecking, setIsChecking] = useState(false)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login")
      return
    }

    if (user?.emailVerified) {
      setIsVerified(true)
    }
  }, [user, authLoading, router])

  const checkEmailVerification = async () => {
    if (!user) return

    setIsChecking(true)
    try {
      // Reload user to check if email is verified
      await user.reload()

      if (user.emailVerified) {
        setIsVerified(true)
        toast.success("Email verified successfully!")

        // Redirect to feed after a short delay
        setTimeout(() => {
          router.push("/feed")
        }, 1500)
      } else {
        toast.error("Email not verified yet. Please check your email.")
      }
    } catch (error) {
      console.error("[v0] Error checking verification:", error)
      toast.error("Failed to check verification status")
    } finally {
      setIsChecking(false)
    }
  }

  const resendVerificationEmail = async () => {
    if (!user) return

    try {
      const { sendEmailVerification } = await import("firebase/auth")
      await sendEmailVerification(user, {
        url: window.location.origin,
      })
      toast.success("Verification email sent! Check your inbox.")
    } catch (error) {
      console.error("[v0] Error resending verification:", error)
      toast.error("Failed to resend verification email")
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-primary mx-auto mb-4 animate-spin" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (isVerified) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md border-green-200 bg-green-50">
          <CardHeader className="text-center">
            <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
            <CardTitle>Email Verified!</CardTitle>
            <CardDescription>Your account is now active and ready to use.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground text-center">
              You will be redirected to your feed shortly. Click below if you don't want to wait.
            </p>
            <Button asChild className="w-full">
              <Link href="/feed">Go to Feed</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md">
        <CardHeader className="text-center">
          <Mail className="w-12 h-12 text-primary mx-auto mb-4" />
          <CardTitle>Verify Your Email</CardTitle>
          <CardDescription>
            We've sent a verification email to <strong>{user?.email}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted/50 p-4 rounded-lg space-y-2 text-sm">
            <p className="font-medium">What's next?</p>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
              <li>Check your email inbox</li>
              <li>Click the verification link</li>
              <li>Return here and click "I've Verified My Email"</li>
              <li>NOTE: Please check your spam box in case the email verification has gone there."</li>
            </ol>
          </div>
          <Button onClick={checkEmailVerification} disabled={isChecking} className="w-full">
            {isChecking ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Checking...
              </>
            ) : (
              "I've Verified My Email"
            )}
          </Button>
          <Button variant="outline" onClick={resendVerificationEmail} className="w-full bg-transparent">
            Didn't receive email? Resend
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            Once verified, you'll have full access to JASS Memory Vault.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
