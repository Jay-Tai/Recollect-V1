"use client"

import { useEffect, useState } from "react"
import { useRouter } from 'next/navigation'
import Link from "next/link"
import { collection, getDocs, doc, updateDoc, arrayUnion, getDoc, addDoc } from "firebase/firestore"
import { useAuth } from "@/components/auth-provider"
import { db } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Camera, Award, Users, LogOut, Search, Megaphone } from 'lucide-react'
import { toast } from "sonner"
import { signOut } from "firebase/auth"
import { auth } from "@/lib/firebase"

interface Student {
  uid: string
  fullName: string
  email: string
  memoriesCount: number
  badges: Array<{
    id: string
    name: string
    description: string
    awardedBy: string
    awardedAt: string
  }>
  createdAt: string
}

interface BadgeForm {
  name: string
  description: string
}

export default function TeacherPortalPage() {
  const { user, userProfile, loading: authLoading } = useAuth()
  const router = useRouter()
  const [students, setStudents] = useState<Student[]>([])
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [badgeForm, setBadgeForm] = useState<BadgeForm>({ name: "", description: "" })
  const [awarding, setAwarding] = useState(false)
  const [userRole, setUserRole] = useState<string>("")
  
  const [announcementDialogOpen, setAnnouncementDialogOpen] = useState(false)
  const [announcementForm, setAnnouncementForm] = useState({
    subject: "",
    body: "",
    grade: ""
  })
  const [submittingAnnouncement, setSubmittingAnnouncement] = useState(false)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login")
      return
    }

    if (user) {
      checkUserRole()
    }
  }, [user, authLoading, router])

  const checkUserRole = async () => {
    if (!user) return

    try {
      const userDoc = await getDoc(doc(db, "users", user.uid))
      if (userDoc.exists()) {
        const userData = userDoc.data()
        setUserRole(userData.role)

        if (userData.role !== "teacher" && userData.role !== "admin") {
          toast.error("Access denied. Teacher role required.")
          router.push("/feed")
          return
        }

        fetchStudents()
      }
    } catch (error) {
      console.error("[v0] Error checking role:", error)
      toast.error("Failed to verify access")
    }
  }

  const fetchStudents = async () => {
    try {
      const usersSnapshot = await getDocs(collection(db, "users"))
      const studentsData = usersSnapshot.docs
        .map((doc) => ({ uid: doc.id, ...doc.data() }) as Student)
        .filter((user) => user.uid !== auth.currentUser?.uid)
        .sort((a, b) => a.fullName.localeCompare(b.fullName))

      setStudents(studentsData)
      setFilteredStudents(studentsData)
    } catch (error) {
      console.error("[v0] Error fetching students:", error)
      toast.error("Failed to load students")
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (query: string) => {
    setSearchQuery(query)
    if (!query.trim()) {
      setFilteredStudents(students)
      return
    }

    const filtered = students.filter(
      (student) =>
        student.fullName.toLowerCase().includes(query.toLowerCase()) ||
        student.email.toLowerCase().includes(query.toLowerCase()),
    )
    setFilteredStudents(filtered)
  }

  const handleAwardBadge = async () => {
    if (!selectedStudent || !badgeForm.name.trim() || !badgeForm.description.trim()) {
      toast.error("Please fill in all badge details")
      return
    }

    setAwarding(true)

    try {
      const badge = {
        id: `badge_${Date.now()}`,
        name: badgeForm.name.trim(),
        description: badgeForm.description.trim(),
        awardedBy: user?.displayName || user?.email || "Teacher",
        awardedAt: new Date().toISOString(),
      }

      await updateDoc(doc(db, "users", selectedStudent.uid), {
        badges: arrayUnion(badge),
      })

      toast.success(`Badge "${badge.name}" awarded to ${selectedStudent.fullName}!`)
      setDialogOpen(false)
      setBadgeForm({ name: "", description: "" })
      setSelectedStudent(null)
      fetchStudents()
    } catch (error) {
      console.error("[v0] Award badge error:", error)
      toast.error("Failed to award badge")
    } finally {
      setAwarding(false)
    }
  }

  const handleLogout = async () => {
    try {
      await signOut(auth)
      toast.success("Logged out successfully")
      router.push("/")
    } catch (error) {
      console.error("[v0] Logout error:", error)
      toast.error("Failed to log out")
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

  const handleSubmitAnnouncement = async () => {
    if (!announcementForm.subject.trim() || !announcementForm.body.trim() || !announcementForm.grade) {
      toast.error("Please fill in all announcement fields")
      return
    }

    if (!userProfile) {
      toast.error("User profile not loaded")
      return
    }

    setSubmittingAnnouncement(true)

    try {
      await addDoc(collection(db, "pendingAnnouncements"), {
        teacherId: user?.uid,
        teacherName: userProfile.fullName || userProfile.teacherName || user?.email,
        teacherEmail: user?.email,
        subject: announcementForm.subject.trim(),
        body: announcementForm.body.trim(),
        grade: announcementForm.grade,
        status: "pending",
        createdAt: new Date().toISOString()
      })

      toast.success("Announcement submitted for admin approval!")
      setAnnouncementDialogOpen(false)
      setAnnouncementForm({ subject: "", body: "", grade: "" })
    } catch (error) {
      console.error("[v0] Submit announcement error:", error)
      toast.error("Failed to submit announcement")
    } finally {
      setSubmittingAnnouncement(false)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Award className="w-12 h-12 text-primary mx-auto mb-4 animate-pulse" />
          <p className="text-muted-foreground">Loading teacher portal...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background ml-64 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">Teacher Portal</h1>
          <p className="text-muted-foreground">Recognize and celebrate student achievements with badges</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Students</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <Users className="w-8 h-8 text-primary" />
                <div className="text-3xl font-bold text-foreground">{students.length}</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">Badges Awarded</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <Award className="w-8 h-8 text-primary" />
                <div className="text-3xl font-bold text-foreground">
                  {students.reduce((sum, student) => sum + student.badges.length, 0)}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Memories</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <Camera className="w-8 h-8 text-primary" />
                <div className="text-3xl font-bold text-foreground">
                  {students.reduce((sum, student) => sum + student.memoriesCount, 0)}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs for Student Roster and Announcements */}
        <Tabs defaultValue="roster" className="w-full">
          <TabsList>
            <TabsTrigger value="roster">Student Roster</TabsTrigger>
            <TabsTrigger value="announcements">Make Announcement</TabsTrigger>
          </TabsList>

          <TabsContent value="roster" className="mt-6">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <CardTitle>Student Roster</CardTitle>
                    <CardDescription>View and manage student badges</CardDescription>
                  </div>
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search students..."
                      value={searchQuery}
                      onChange={(e) => handleSearch(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead className="text-center">Memories</TableHead>
                      <TableHead className="text-center">Badges</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStudents.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          No students found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredStudents.map((student) => (
                        <TableRow key={student.uid}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar>
                                <AvatarImage src="/placeholder.svg" alt={student.fullName} />
                                <AvatarFallback>{getInitials(student.fullName)}</AvatarFallback>
                              </Avatar>
                              <span className="font-medium">{student.fullName}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground">{student.email}</TableCell>
                          <TableCell className="text-center">{student.memoriesCount}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="secondary">{student.badges.length}</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Dialog
                              open={dialogOpen && selectedStudent?.uid === student.uid}
                              onOpenChange={(open) => {
                                setDialogOpen(open)
                                if (!open) {
                                  setSelectedStudent(null)
                                  setBadgeForm({ name: "", description: "" })
                                }
                              }}
                            >
                              <DialogTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="gap-2 bg-transparent"
                                  onClick={() => setSelectedStudent(student)}
                                >
                                  <Award className="w-4 h-4" />
                                  Award Badge
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Award Badge to {student.fullName}</DialogTitle>
                                  <DialogDescription>
                                    Recognize this student's achievement with a special badge
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div className="space-y-2">
                                    <Label htmlFor="badge-name">Badge Name</Label>
                                    <Input
                                      id="badge-name"
                                      placeholder="e.g., Leadership Excellence"
                                      value={badgeForm.name}
                                      onChange={(e) => setBadgeForm({ ...badgeForm, name: e.target.value })}
                                      disabled={awarding}
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label htmlFor="badge-description">Description</Label>
                                    <Textarea
                                      id="badge-description"
                                      placeholder="Describe why this student earned this badge..."
                                      value={badgeForm.description}
                                      onChange={(e) => setBadgeForm({ ...badgeForm, description: e.target.value })}
                                      disabled={awarding}
                                      rows={3}
                                    />
                                  </div>
                                  <Button
                                    onClick={handleAwardBadge}
                                    disabled={!badgeForm.name.trim() || !badgeForm.description.trim() || awarding}
                                    className="w-full gap-2"
                                  >
                                    {awarding ? (
                                      <>Awarding...</>
                                    ) : (
                                      <>
                                        <Award className="w-4 h-4" />
                                        Award Badge
                                      </>
                                    )}
                                  </Button>
                                </div>
                              </DialogContent>
                            </Dialog>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="announcements" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Make an Announcement</CardTitle>
                <CardDescription>
                  Submit an announcement for admin approval. Once approved, it will be sent to students in the selected grade.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="announcement-subject">Subject</Label>
                    <Input
                      id="announcement-subject"
                      placeholder="e.g., Upcoming Field Trip"
                      value={announcementForm.subject}
                      onChange={(e) => setAnnouncementForm({ ...announcementForm, subject: e.target.value })}
                      disabled={submittingAnnouncement}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="announcement-body">Message</Label>
                    <Textarea
                      id="announcement-body"
                      placeholder="Write your announcement message..."
                      value={announcementForm.body}
                      onChange={(e) => setAnnouncementForm({ ...announcementForm, body: e.target.value })}
                      disabled={submittingAnnouncement}
                      rows={6}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="announcement-grade">Target Grade</Label>
                    <Select
                      value={announcementForm.grade}
                      onValueChange={(value) => setAnnouncementForm({ ...announcementForm, grade: value })}
                      disabled={submittingAnnouncement}
                    >
                      <SelectTrigger id="announcement-grade">
                        <SelectValue placeholder="Select grade" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="9">Grade 9</SelectItem>
                        <SelectItem value="10">Grade 10</SelectItem>
                        <SelectItem value="11">Grade 11</SelectItem>
                        <SelectItem value="12">Grade 12</SelectItem>
                        <SelectItem value="all">All Grades</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    onClick={handleSubmitAnnouncement}
                    disabled={!announcementForm.subject.trim() || !announcementForm.body.trim() || !announcementForm.grade || submittingAnnouncement}
                    className="w-full gap-2"
                  >
                    {submittingAnnouncement ? (
                      <>Submitting...</>
                    ) : (
                      <>
                        <Megaphone className="w-4 h-4" />
                        Submit for Admin Approval
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
