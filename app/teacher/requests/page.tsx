"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { collection, getDocs, doc, getDoc, updateDoc, arrayUnion, deleteDoc } from "firebase/firestore"
import { useAuth } from "@/components/auth-provider"
import { db } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ClipboardCheck, Users, BookOpen, Check, X } from "lucide-react"
import { toast } from "sonner"

interface JoinRequest {
  id: string
  studentId: string
  studentName: string
  studentEmail: string
  type: "course" | "club"
  targetId: string
  targetName: string
  createdAt: string
  status: "pending"
}

interface Course {
  id: string
  courseCode: string
  courseName: string
  teachers: string[]
}

export default function TeacherRequestsPage() {
  const { user, userProfile, loading: authLoading, isTeacher, isAdmin } = useAuth()
  const router = useRouter()
  const [courseRequests, setCourseRequests] = useState<JoinRequest[]>([])
  const [clubRequests, setClubRequests] = useState<JoinRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState<string | null>(null)
  const [teacherCourseIds, setTeacherCourseIds] = useState<string[]>([])
  const [teacherClubIds, setTeacherClubIds] = useState<string[]>([])

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login")
      return
    }

    if (!authLoading && !isTeacher && !isAdmin) {
      toast.error("Access denied. Teacher role required.")
      router.push("/feed")
      return
    }

    if (user && userProfile) {
      fetchTeacherData()
    }
  }, [user, userProfile, authLoading, isTeacher, isAdmin, router])

  const fetchTeacherData = async () => {
    if (!userProfile || !user) return

    try {
      console.log("[v0] Fetching teacher data for:", userProfile.fullName)

      // Fetch all courses
      const coursesSnapshot = await getDocs(collection(db, "courses"))
      const allCourses = coursesSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Course[]

      console.log("[v0] All courses:", allCourses)

      // Filter courses where this teacher is assigned (check teachers array)
      const teacherCourses = allCourses.filter((course) => course.teachers && course.teachers.includes(user.uid))

      console.log("[v0] Teacher assigned courses:", teacherCourses)

      const courseIds = teacherCourses.map((c) => c.id)
      setTeacherCourseIds(courseIds)

      // For clubs, use the leadingClubs from userProfile
      const clubIds = userProfile.leadingClubs || []
      setTeacherClubIds(clubIds)

      console.log("[v0] Teacher course IDs:", courseIds)
      console.log("[v0] Teacher club IDs:", clubIds)

      await fetchRequests(courseIds, clubIds)
    } catch (error) {
      console.error("[v0] Error fetching teacher data:", error)
      toast.error("Failed to load requests")
    } finally {
      setLoading(false)
    }
  }

  const fetchRequests = async (courseIds: string[], clubIds: string[]) => {
    try {
      const requestsRef = collection(db, "joinRequests")
      const requestsSnapshot = await getDocs(requestsRef)

      const allRequests = requestsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as JoinRequest[]

      console.log("[v0] All join requests:", allRequests)

      // Filter course requests for courses this teacher teaches
      const courseReqs = allRequests.filter(
        (req) => req.type === "course" && req.status === "pending" && courseIds.includes(req.targetId),
      )

      console.log("[v0] Filtered course requests:", courseReqs)

      // Filter club requests for clubs this teacher leads
      const clubReqs = allRequests.filter(
        (req) => req.type === "club" && req.status === "pending" && clubIds.includes(req.targetId),
      )

      console.log("[v0] Filtered club requests:", clubReqs)

      setCourseRequests(courseReqs)
      setClubRequests(clubReqs)
    } catch (error) {
      console.error("[v0] Error fetching requests:", error)
    }
  }

  const handleApproveRequest = async (request: JoinRequest) => {
    setProcessing(request.id)

    try {
      console.log("[v0] Approving request:", request)

      const studentRef = doc(db, "users", request.studentId)

      if (request.type === "course") {
        // Add student to course
        await updateDoc(studentRef, {
          courses: arrayUnion(request.targetId),
        })

        // Also add student to the course's students array
        const courseRef = doc(db, "courses", request.targetId)
        const courseDoc = await getDoc(courseRef)
        if (courseDoc.exists()) {
          const courseData = courseDoc.data()
          const students = courseData.students || []
          await updateDoc(courseRef, {
            students: arrayUnion(request.studentId),
          })
        }
      } else {
        // Add student to club
        await updateDoc(studentRef, {
          clubs: arrayUnion(request.targetId),
        })

        // Could also update club membership if you have a clubs collection
      }

      // Delete the request
      await deleteDoc(doc(db, "joinRequests", request.id))

      toast.success(`Approved ${request.studentName}'s request to join ${request.targetName}`)

      // Remove from local state
      if (request.type === "course") {
        setCourseRequests((prev) => prev.filter((r) => r.id !== request.id))
      } else {
        setClubRequests((prev) => prev.filter((r) => r.id !== request.id))
      }
    } catch (error) {
      console.error("[v0] Error approving request:", error)
      toast.error("Failed to approve request")
    } finally {
      setProcessing(null)
    }
  }

  const handleRejectRequest = async (request: JoinRequest) => {
    setProcessing(request.id)

    try {
      await deleteDoc(doc(db, "joinRequests", request.id))

      toast.success(`Rejected ${request.studentName}'s request`)

      if (request.type === "course") {
        setCourseRequests((prev) => prev.filter((r) => r.id !== request.id))
      } else {
        setClubRequests((prev) => prev.filter((r) => r.id !== request.id))
      }
    } catch (error) {
      console.error("[v0] Error rejecting request:", error)
      toast.error("Failed to reject request")
    } finally {
      setProcessing(null)
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
      <div className="min-h-screen bg-background flex items-center justify-center lg:ml-64">
        <div className="text-center">
          <ClipboardCheck className="w-12 h-12 text-primary mx-auto mb-4 animate-pulse" />
          <p className="text-muted-foreground">Loading requests...</p>
        </div>
      </div>
    )
  }

  const showClubTab = teacherClubIds.length > 0

  return (
    <div className="min-h-screen bg-background lg:ml-64 p-4 lg:p-8 pt-20 lg:pt-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">Review Requests</h1>
          <p className="text-muted-foreground">Approve or reject student requests to join your courses and clubs</p>
          <div className="mt-2 text-sm text-muted-foreground">
            <p>You are teaching {teacherCourseIds.length} course(s)</p>
            {showClubTab && <p>You are leading {teacherClubIds.length} club(s)</p>}
          </div>
        </div>

        <Tabs defaultValue="courses" className="w-full">
          <TabsList>
            <TabsTrigger value="courses" className="gap-2">
              <BookOpen className="w-4 h-4" />
              Course Requests
              {courseRequests.length > 0 && (
                <Badge variant="destructive" className="ml-1">
                  {courseRequests.length}
                </Badge>
              )}
            </TabsTrigger>
            {showClubTab && (
              <TabsTrigger value="clubs" className="gap-2">
                <Users className="w-4 h-4" />
                Club Requests
                {clubRequests.length > 0 && (
                  <Badge variant="destructive" className="ml-1">
                    {clubRequests.length}
                  </Badge>
                )}
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="courses" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Course Join Requests</CardTitle>
                <CardDescription>Students requesting to join courses you teach</CardDescription>
              </CardHeader>
              <CardContent>
                {courseRequests.length === 0 ? (
                  <div className="text-center py-12">
                    <BookOpen className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                    <p className="text-muted-foreground">No pending course requests</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {courseRequests.map((request) => (
                      <Card key={request.id} className="border-border">
                        <CardContent className="pt-6">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-start gap-4 flex-1">
                              <Avatar className="w-12 h-12">
                                <AvatarFallback>{getInitials(request.studentName)}</AvatarFallback>
                              </Avatar>
                              <div className="flex-1">
                                <h3 className="font-semibold text-foreground">{request.studentName}</h3>
                                <p className="text-sm text-muted-foreground">{request.studentEmail}</p>
                                <div className="flex items-center gap-2 mt-2">
                                  <Badge variant="outline">{request.targetName}</Badge>
                                  <span className="text-xs text-muted-foreground">{formatDate(request.createdAt)}</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="default"
                                className="gap-2"
                                onClick={() => handleApproveRequest(request)}
                                disabled={processing === request.id}
                              >
                                <Check className="w-4 h-4" />
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                className="gap-2"
                                onClick={() => handleRejectRequest(request)}
                                disabled={processing === request.id}
                              >
                                <X className="w-4 h-4" />
                                Reject
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {showClubTab && (
            <TabsContent value="clubs" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Club Join Requests</CardTitle>
                  <CardDescription>Students requesting to join clubs you lead</CardDescription>
                </CardHeader>
                <CardContent>
                  {clubRequests.length === 0 ? (
                    <div className="text-center py-12">
                      <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                      <p className="text-muted-foreground">No pending club requests</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {clubRequests.map((request) => (
                        <Card key={request.id} className="border-border">
                          <CardContent className="pt-6">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex items-start gap-4 flex-1">
                                <Avatar className="w-12 h-12">
                                  <AvatarFallback>{getInitials(request.studentName)}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1">
                                  <h3 className="font-semibold text-foreground">{request.studentName}</h3>
                                  <p className="text-sm text-muted-foreground">{request.studentEmail}</p>
                                  <div className="flex items-center gap-2 mt-2">
                                    <Badge variant="outline">{request.targetName}</Badge>
                                    <span className="text-xs text-muted-foreground">
                                      {formatDate(request.createdAt)}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="default"
                                  className="gap-2"
                                  onClick={() => handleApproveRequest(request)}
                                  disabled={processing === request.id}
                                >
                                  <Check className="w-4 h-4" />
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  className="gap-2"
                                  onClick={() => handleRejectRequest(request)}
                                  disabled={processing === request.id}
                                >
                                  <X className="w-4 h-4" />
                                  Reject
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  )
}
