"use client"

import { DialogTitle } from "@/components/ui/dialog"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { collection, getDocs, doc, deleteDoc, updateDoc, getDoc, addDoc, setDoc } from "firebase/firestore"
import { createUserWithEmailAndPassword } from "firebase/auth"
import { useAuth } from "@/components/auth-provider"
import { db, auth } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Shield,
  UserPlus,
  Bell,
  BookOpen,
  Loader2,
  Trash2,
  X,
  Edit2,
  Users,
  Eye,
  Crown,
  MessageSquare,
  Flag,
  ExternalLink,
  UserX,
} from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTrigger } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

interface User {
  uid: string
  firstName?: string
  lastName?: string
  fullName: string
  email: string
  role: string
  memoriesCount: number
  badges: any[]
  createdAt: string
  courses?: string[]
  clubs?: string[]
  pronouns?: string
  teacherRole?: string
  studentNumber?: string
  grade?: number
  bio?: string
  photoURL?: string
}

interface Course {
  id: string
  courseCode: string
  courseName: string
  category: string
  grade?: number
  teachers: string[]
  students: string[]
  createdAt: string
  createdBy: string
}

interface Category {
  id: string
  name: string
  createdAt: string
  createdBy: string
}

interface Club {
  id: string
  clubName: string
  description?: string
  teachers: string[]
  students: string[]
  joinRequests: string[]
  createdAt: string
  createdBy: string
}

interface Report {
  id: string
  contentId: string
  contentType: "memory" | "announcement" | "comment" | "user"
  contentOwnerId: string
  contentOwnerName: string
  contentLink: string
  reportedBy: string
  reportedByName: string
  reportedByHandle?: string
  description: string
  status: "pending" | "resolved" | "dismissed"
  createdAt: string
}

interface FeedbackItem {
  id: string
  type: "feedback" | "bug"
  text: string
  imageUrl?: string
  submittedBy: string
  submittedByEmail: string
  createdAt: string
  read: boolean
}

export default function AdminDashboardPage() {
  const { user, userProfile, isAdmin, loading: authLoading } = useAuth()
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [clubs, setClubs] = useState<Club[]>([])
  const [reports, setReports] = useState<Report[]>([])
  const [feedbackItems, setFeedbackItems] = useState<FeedbackItem[]>([])
  const [loading, setLoading] = useState(true)

  // Teacher creation form
  const [teacherName, setTeacherName] = useState("")
  const [teacherRole, setTeacherRole] = useState("")
  const [teacherPronouns, setTeacherPronouns] = useState("")
  const [teacherEmail, setTeacherEmail] = useState("")
  const [teacherPassword, setTeacherPassword] = useState("")
  const [teacherCourses, setTeacherCourses] = useState("")
  const [teacherClubs, setTeacherClubs] = useState("")
  const [creatingTeacher, setCreatingTeacher] = useState(false)

  // Admin assignment form
  const [adminEmail, setAdminEmail] = useState("")
  const [assigningAdmin, setAssigningAdmin] = useState(false)

  // Announcement form
  const [announcementGrade, setAnnouncementGrade] = useState("")
  const [announcementSubject, setAnnouncementSubject] = useState("")
  const [announcementBody, setAnnouncementBody] = useState("")
  const [sendingAnnouncement, setSendingAnnouncement] = useState(false)

  // Course creation form
  const [courseCode, setCourseCode] = useState("")
  const [courseName, setCourseName] = useState("")
  const [courseCategory, setCourseCategory] = useState("")
  const [courseGrade, setCourseGrade] = useState<number | "">("")
  const [selectedTeachers, setSelectedTeachers] = useState<string[]>([])
  const [creatingCourse, setCreatingCourse] = useState(false)
  const [editingCourse, setEditingCourse] = useState<string | null>(null)
  const [editingCourseName, setEditingCourseName] = useState("")
  const [editingCourseCategory, setEditingCourseCategory] = useState("")
  const [editingCourseGrade, setEditingCourseGrade] = useState<number | "">("")

  // Category management
  const [newCategoryName, setNewCategoryName] = useState("")
  const [creatingCategory, setCreatingCategory] = useState(false)

  // Club creation form
  const [clubName, setClubName] = useState("")
  const [clubDescription, setClubDescription] = useState("")
  const [selectedClubTeachers, setSelectedClubTeachers] = useState<string[]>([])
  const [creatingClub, setCreatingClub] = useState(false)

  // Pending announcements state
  const [pendingAnnouncements, setPendingAnnouncements] = useState<any[]>([])
  const [processingAnnouncement, setProcessingAnnouncement] = useState<string | null>(null)
  const [deletingCourse, setDeletingCourse] = useState<string | null>(null)

  // Teacher account management states
  const [editingTeacher, setEditingTeacher] = useState<string | null>(null)
  const [editingTeacherData, setEditingTeacherData] = useState({
    fullName: "",
    teacherRole: "",
    pronouns: "",
    teachingCourses: "",
    leadingClubs: "",
  })
  const [deletingTeacher, setDeletingTeacher] = useState<string | null>(null)
  const [savingTeacher, setSavingTeacher] = useState(false)

  // Helper function to fetch all users
  const fetchUsers = async () => {
    try {
      const usersSnapshot = await getDocs(collection(db, "users"))
      const usersData = usersSnapshot.docs
        .map((doc) => ({ uid: doc.id, ...doc.data() }) as User)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      setUsers(usersData)
    } catch (error) {
      console.error("Error fetching users:", error)
      toast.error("Failed to load user data")
    }
  }

  const fetchData = async () => {
    try {
      // Fetch users (moved to separate function for reuse)
      await fetchUsers()

      // Fetch courses
      const coursesSnapshot = await getDocs(collection(db, "courses"))
      const coursesData = coursesSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Course)
      setCourses(coursesData)

      // Fetch categories
      const categoriesSnapshot = await getDocs(collection(db, "categories"))
      const categoriesData = categoriesSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Category)
      setCategories(categoriesData)

      // Fetch clubs
      const clubsSnapshot = await getDocs(collection(db, "clubs"))
      const clubsData = clubsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Club)
      setClubs(clubsData)

      // Fetch reports
      const reportsSnapshot = await getDocs(collection(db, "reports"))
      const reportsData = reportsSnapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }) as Report)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      setReports(reportsData)

      // Fetch feedback
      const feedbackSnapshot = await getDocs(collection(db, "feedback"))
      const feedbackData = feedbackSnapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }) as FeedbackItem)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      setFeedbackItems(feedbackData)

      const pendingAnnouncementsSnapshot = await getDocs(collection(db, "pendingAnnouncements"))
      const pendingAnnouncementsData = pendingAnnouncementsSnapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter((announcement) => announcement.status === "pending")
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      setPendingAnnouncements(pendingAnnouncementsData)
    } catch (error) {
      console.error("Error fetching data:", error)
      toast.error("Failed to load dashboard data")
    } finally {
      setLoading(false)
    }
  }

  const handleCreateTeacher = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!teacherName || !teacherEmail || !teacherPassword || !teacherRole || !teacherPronouns) {
      toast.error("Please fill in all required fields")
      return
    }

    setCreatingTeacher(true)

    try {
      // Create auth account
      const userCredential = await createUserWithEmailAndPassword(auth, teacherEmail, teacherPassword)
      const newUser = userCredential.user

      // Parse courses and clubs
      const coursesArray = teacherCourses
        .split(",")
        .map((c) => c.trim())
        .filter((c) => c)
      const clubsArray = teacherClubs
        .split(",")
        .map((c) => c.trim())
        .filter((c) => c)

      // Create teacher profile in Firestore
      await setDoc(doc(db, "users", newUser.uid), {
        uid: newUser.uid,
        email: teacherEmail,
        fullName: teacherName,
        teacherName: teacherName,
        role: "teacher",
        teacherRole: teacherRole,
        pronouns: teacherPronouns,
        teachingCourses: coursesArray,
        leadingClubs: clubsArray,
        courses: coursesArray,
        clubs: clubsArray,
        createdAt: new Date().toISOString(),
        badges: [],
        memoriesCount: 0,
      })

      toast.success("Teacher account created successfully!")

      // Reset form
      setTeacherName("")
      setTeacherRole("")
      setTeacherPronouns("")
      setTeacherEmail("")
      setTeacherPassword("")
      setTeacherCourses("")
      setTeacherClubs("")

      fetchData()
    } catch (error: any) {
      console.error("Create teacher error:", error)

      let errorMessage = "Failed to create teacher account"
      if (error.code === "auth/email-already-in-use") {
        errorMessage = "This email is already registered"
      } else if (error.code === "auth/weak-password") {
        errorMessage = "Password must be at least 6 characters"
      }

      toast.error(errorMessage)
    } finally {
      setCreatingTeacher(false)
    }
  }

  const handleAssignAdmin = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!adminEmail) {
      toast.error("Please enter an email address")
      return
    }

    setAssigningAdmin(true)

    try {
      // Find user by email
      const userToPromote = users.find((u) => u.email === adminEmail)

      if (!userToPromote) {
        toast.error("No user found with that email address")
        setAssigningAdmin(false)
        return
      }

      // Add to admins collection
      await addDoc(collection(db, "admins"), {
        email: adminEmail,
        userId: userToPromote.uid,
        assignedAt: new Date().toISOString(),
        assignedBy: user?.email,
      })

      // Update user role
      await updateDoc(doc(db, "users", userToPromote.uid), {
        role: "admin",
      })

      toast.success(`${adminEmail} has been promoted to admin`)
      setAdminEmail("")
      fetchData()
    } catch (error) {
      console.error("Assign admin error:", error)
      toast.error("Failed to assign admin role")
    } finally {
      setAssigningAdmin(false)
    }
  }

  const handleSendAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!announcementGrade || !announcementSubject || !announcementBody) {
      toast.error("Please fill in all announcement fields")
      return
    }

    setSendingAnnouncement(true)

    try {
      // Create announcement document
      await addDoc(collection(db, "announcements"), {
        grade: announcementGrade === "all" ? "all" : announcementGrade,
        subject: announcementSubject,
        body: announcementBody,
        createdAt: new Date().toISOString(),
        createdBy: user?.email,
        read: [],
      })

      toast.success("Announcement sent successfully!")

      // Reset form
      setAnnouncementGrade("")
      setAnnouncementSubject("")
      setAnnouncementBody("")
    } catch (error) {
      console.error("Send announcement error:", error)
      toast.error("Failed to send announcement")
    } finally {
      setSendingAnnouncement(false)
    }
  }

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!courseCode || !courseName || !courseCategory || courseGrade === "") {
      toast.error("Please enter course code, name, category, and grade")
      return
    }

    setCreatingCourse(true)

    try {
      // Check if course code already exists
      const existingCourse = courses.find((c) => c.courseCode === courseCode)
      if (existingCourse) {
        toast.error("A course with this code already exists")
        setCreatingCourse(false)
        return
      }

      await addDoc(collection(db, "courses"), {
        courseCode: courseCode,
        courseName: courseName,
        category: courseCategory,
        grade: Number(courseGrade),
        teachers: selectedTeachers,
        students: [],
        createdAt: new Date().toISOString(),
        createdBy: user?.email,
      })

      toast.success("Course created successfully!")

      // Reset form
      setCourseCode("")
      setCourseName("")
      setCourseCategory("")
      setCourseGrade("")
      setSelectedTeachers([])

      fetchData()
    } catch (error) {
      console.error("[v0] Create course error:", error)
      toast.error("Failed to create course")
    } finally {
      setCreatingCourse(false)
    }
  }

  const handleEditCourse = async (courseId: string) => {
    if (!editingCourseName || !editingCourseCategory) {
      toast.error("Please fill in all fields")
      return
    }

    try {
      await updateDoc(doc(db, "courses", courseId), {
        courseName: editingCourseName,
        category: editingCourseCategory,
      })

      toast.success("Course updated successfully!")
      setEditingCourse(null)
      fetchData()
    } catch (error) {
      console.error("[v0] Edit course error:", error)
      toast.error("Failed to update course")
    }
  }

  const handleAssignTeacherToCourse = async (teacherId: string, courseId: string) => {
    try {
      const courseRef = doc(db, "courses", courseId)
      const courseDoc = await getDoc(courseRef)

      if (courseDoc.exists()) {
        const courseData = courseDoc.data()
        const teachers = courseData.teachers || []

        if (!teachers.includes(teacherId)) {
          await updateDoc(courseRef, {
            teachers: [...teachers, teacherId],
          })

          toast.success("Teacher assigned to course")
          fetchData()
        } else {
          toast.info("Teacher already assigned to this course")
        }
      }
    } catch (error) {
      console.error("[v0] Assign teacher error:", error)
      toast.error("Failed to assign teacher to course")
    }
  }

  const handleRemoveTeacherFromCourse = async (teacherId: string, courseId: string) => {
    try {
      const courseRef = doc(db, "courses", courseId)
      const courseDoc = await getDoc(courseRef)

      if (courseDoc.exists()) {
        const courseData = courseDoc.data()
        const teachers = courseData.teachers || []

        await updateDoc(courseRef, {
          teachers: teachers.filter((id: string) => id !== teacherId),
        })

        toast.success("Teacher removed from course")
        fetchData()
      }
    } catch (error) {
      console.error("[v0] Remove teacher error:", error)
      toast.error("Failed to remove teacher")
    }
  }

  const handleDeleteCourse = async (courseId: string) => {
    if (!confirm("Are you sure you want to delete this course? This action cannot be undone.")) {
      return
    }

    setDeletingCourse(courseId)

    try {
      await deleteDoc(doc(db, "courses", courseId))
      toast.success("Course deleted successfully")
      fetchData()
    } catch (error) {
      console.error("[v0] Delete course error:", error)
      toast.error("Failed to delete course")
    } finally {
      setDeletingCourse(null)
    }
  }

  const handleApproveAnnouncement = async (announcement: any) => {
    setProcessingAnnouncement(announcement.id)

    try {
      // Create the approved announcement
      await addDoc(collection(db, "announcements"), {
        grade: announcement.grade,
        subject: announcement.subject,
        body: announcement.body,
        createdAt: new Date().toISOString(),
        createdBy: announcement.teacherEmail,
        createdByTeacher: announcement.teacherName,
        approvedBy: user?.email,
        read: [],
      })

      // Get teacher ID from email
      const teachersSnapshot = await getDocs(collection(db, "users"))
      const teacher = teachersSnapshot.docs.find(
        (d: any) => d.data().email === announcement.teacherEmail && d.data().role === "teacher",
      )

      if (teacher) {
        await addDoc(collection(db, "teacherMessages"), {
          teacherId: teacher.id,
          announcement: announcement.id,
          status: "approved",
          subject: announcement.subject,
          approvedAt: new Date().toISOString(),
          read: false,
        })
      }

      // Delete from pending
      await deleteDoc(doc(db, "pendingAnnouncements", announcement.id))

      toast.success("Announcement approved and sent!")
      setPendingAnnouncements((prev) => prev.filter((a) => a.id !== announcement.id))
    } catch (error) {
      console.error("Approve announcement error:", error)
      toast.error("Failed to approve announcement")
    } finally {
      setProcessingAnnouncement(null)
    }
  }

  const handleRejectAnnouncement = async (announcement: any) => {
    setProcessingAnnouncement(announcement.id)

    try {
      const teachersSnapshot = await getDocs(collection(db, "users"))
      const teacher = teachersSnapshot.docs.find(
        (d: any) => d.data().email === announcement.teacherEmail && d.data().role === "teacher",
      )

      if (teacher) {
        await addDoc(collection(db, "teacherMessages"), {
          teacherId: teacher.id,
          announcement: announcement.id,
          status: "rejected",
          subject: announcement.subject,
          rejectedAt: new Date().toISOString(),
          read: false,
        })
      }

      await deleteDoc(doc(db, "pendingAnnouncements", announcement.id))

      toast.success("Announcement rejected")
      setPendingAnnouncements((prev) => prev.filter((a) => a.id !== announcement.id))
    } catch (error) {
      console.error("Reject announcement error:", error)
      toast.error("Failed to reject announcement")
    } finally {
      setProcessingAnnouncement(null)
    }
  }

  // Check if user is admin and load data on mount
  useEffect(() => {
    if (!authLoading && !isAdmin) {
      router.push("/")
      return
    }
    if (!authLoading && isAdmin) {
      fetchData()
    }
  }, [authLoading, isAdmin, router])

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!newCategoryName.trim()) {
      toast.error("Please enter a category name")
      return
    }

    setCreatingCategory(true)

    try {
      await addDoc(collection(db, "categories"), {
        name: newCategoryName.trim(),
        createdAt: new Date().toISOString(),
        createdBy: user?.email,
      })

      toast.success("Category created successfully!")
      setNewCategoryName("")
      fetchData()
    } catch (error) {
      console.error("Error creating category:", error)
      toast.error("Failed to create category")
    } finally {
      setCreatingCategory(false)
    }
  }

  const handleCreateClub = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!clubName.trim()) {
      toast.error("Please enter a club name")
      return
    }

    setCreatingClub(true)

    try {
      await addDoc(collection(db, "clubs"), {
        clubName: clubName.trim(),
        description: clubDescription.trim(),
        teachers: selectedClubTeachers,
        students: [],
        joinRequests: [],
        createdAt: new Date().toISOString(),
        createdBy: user?.email,
      })

      toast.success("Club created successfully!")
      setClubName("")
      setClubDescription("")
      setSelectedClubTeachers([])
      fetchData()
    } catch (error) {
      console.error("Error creating club:", error)
      toast.error("Failed to create club")
    } finally {
      setCreatingClub(false)
    }
  }

  const handleReportAction = async (
    reportId: string,
    action: "resolved" | "dismissed",
  ) => {
    try {
      await updateDoc(doc(db, "reports", reportId), { status: action })
      setReports((prev) => prev.map((r) => (r.id === reportId ? { ...r, status: action } : r)))
      toast.success(`Report marked as ${action}.`)
    } catch {
      toast.error("Failed to update report.")
    }
  }

  const handleDeleteReportedContent = async (report: Report) => {
    try {
      const collectionMap: Record<string, string> = {
        memory: "memories",
        announcement: "announcements",
        comment: "comments",
        user: "users",
      }
      const col = collectionMap[report.contentType]
      if (col) {
        await deleteDoc(doc(db, col, report.contentId))
      }
      await updateDoc(doc(db, "reports", report.id), { status: "resolved" })
      setReports((prev) => prev.map((r) => (r.id === report.id ? { ...r, status: "resolved" } : r)))
      toast.success("Content deleted and report resolved.")
    } catch {
      toast.error("Failed to delete content.")
    }
  }

  const handleBanUser = async (uid: string, reportId: string) => {
    try {
      await updateDoc(doc(db, "users", uid), { banned: true })
      await updateDoc(doc(db, "reports", reportId), { status: "resolved" })
      setReports((prev) => prev.map((r) => (r.id === reportId ? { ...r, status: "resolved" } : r)))
      toast.success("User banned and report resolved.")
    } catch {
      toast.error("Failed to ban user.")
    }
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

  const getTeacherName = (teacherId: string) => {
    const teacher = users.find((u) => u.uid === teacherId && u.role === "teacher")
    return teacher?.fullName || "Unknown Teacher"
  }

  const handleEditTeacher = (teacher: User) => {
    setEditingTeacher(teacher.uid)
    setEditingTeacherData({
      fullName: teacher.fullName,
      teacherRole: teacher.teacherRole || "",
      pronouns: teacher.pronouns || "",
      teachingCourses: (teacher.courses || []).join(", "),
      leadingClubs: (teacher.clubs || []).join(", "),
    })
  }

  const handleSaveTeacher = async () => {
    if (!editingTeacher || !editingTeacherData.fullName) {
      toast.error("Please fill in all required fields")
      return
    }

    setSavingTeacher(true)

    try {
      const coursesArray = editingTeacherData.teachingCourses
        .split(",")
        .map((c) => c.trim())
        .filter((c) => c)
      const clubsArray = editingTeacherData.leadingClubs
        .split(",")
        .map((c) => c.trim())
        .filter((c) => c)

      await updateDoc(doc(db, "users", editingTeacher), {
        fullName: editingTeacherData.fullName,
        teacherName: editingTeacherData.fullName,
        teacherRole: editingTeacherData.teacherRole,
        pronouns: editingTeacherData.pronouns,
        teachingCourses: coursesArray,
        leadingClubs: clubsArray,
        courses: coursesArray,
        clubs: clubsArray,
      })

      toast.success("Teacher account updated successfully!")
      setEditingTeacher(null)
      fetchData()
    } catch (error) {
      console.error("[v0] Save teacher error:", error)
      toast.error("Failed to update teacher account")
    } finally {
      setSavingTeacher(false)
    }
  }

  const handleDeleteTeacher = async (teacherId: string, teacherEmail: string) => {
    if (
      !confirm(
        `Are you sure you want to delete ${teacherEmail}? This action will remove them from all courses and cannot be undone.`,
      )
    ) {
      return
    }

    setDeletingTeacher(teacherId)

    try {
      // Remove teacher from all courses
      const coursesSnapshot = await getDocs(collection(db, "courses"))
      for (const courseDoc of coursesSnapshot.docs) {
        const courseData = courseDoc.data()
        if (courseData.teachers && courseData.teachers.includes(teacherId)) {
          await updateDoc(courseDoc.ref, {
            teachers: courseData.teachers.filter((id: string) => id !== teacherId),
          })
        }
      }

      // Delete teacher user document
      await deleteDoc(doc(db, "users", teacherId))

      toast.success("Teacher account deleted successfully")
      fetchData()
    } catch (error) {
      console.error("[v0] Delete teacher error:", error)
      toast.error("Failed to delete teacher account")
    } finally {
      setDeletingTeacher(null)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center lg:ml-72">
        <div className="text-center">
          <Shield className="w-12 h-12 text-primary mx-auto mb-4 animate-pulse" />
          <p className="text-muted-foreground">Loading admin dashboard...</p>
        </div>
      </div>
    )
  }

  const stats = {
    totalUsers: users.length,
    students: users.filter((u) => u.role === "student").length,
    teachers: users.filter((u) => u.role === "teacher").length,
    admins: users.filter((u) => u.role === "admin").length,
    totalCourses: courses.length,
  }

  return (
    <div className="min-h-screen bg-background lg:ml-72">
      <div className="container mx-auto px-4 py-8 max-w-7xl pt-20 lg:pt-8">
        {/* Dashboard Content */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">Admin Panel</h1>
          <p className="text-muted-foreground">Manage teachers, students, courses, and announcements</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">Total Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{stats.totalUsers}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">Students</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{stats.students}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">Teachers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{stats.teachers}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">Admins</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{stats.admins}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">Courses</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{stats.totalCourses}</div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="teachers" className="w-full">
          <TabsList className="flex flex-wrap gap-1 h-auto p-1">
            <TabsTrigger value="teachers" className="gap-2">
              <UserPlus className="w-4 h-4" />
              <span className="hidden sm:inline">Teachers</span>
            </TabsTrigger>
            <TabsTrigger value="admins" className="gap-2">
              <Shield className="w-4 h-4" />
              <span className="hidden sm:inline">Admins</span>
            </TabsTrigger>
            <TabsTrigger value="students" className="gap-2">
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Students</span>
            </TabsTrigger>
            <TabsTrigger value="announcements" className="gap-2">
              <Bell className="w-4 h-4" />
              <span className="hidden sm:inline">Announcements</span>
            </TabsTrigger>
            <TabsTrigger value="approval" className="gap-2">
              <Bell className="w-4 h-4" />
              <span className="hidden sm:inline">Approve</span>
              {pendingAnnouncements.length > 0 && (
                <Badge variant="destructive" className="ml-1">
                  {pendingAnnouncements.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="courses" className="gap-2">
              <BookOpen className="w-4 h-4" />
              <span className="hidden sm:inline">Courses</span>
            </TabsTrigger>
            <TabsTrigger value="clubs" className="gap-2">
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Clubs</span>
            </TabsTrigger>
            <TabsTrigger value="reports" className="gap-2">
              <Flag className="w-4 h-4" />
              <span className="hidden sm:inline">Reports</span>
              {reports.filter((r) => r.status === "pending").length > 0 && (
                <Badge variant="destructive" className="ml-1">
                  {reports.filter((r) => r.status === "pending").length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="feedback" className="gap-2">
              <MessageSquare className="w-4 h-4" />
              <span className="hidden sm:inline">Feedback</span>
              {feedbackItems.filter((f) => !f.read).length > 0 && (
                <Badge variant="destructive" className="ml-1">
                  {feedbackItems.filter((f) => !f.read).length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Teacher Creation Tab */}
          <TabsContent value="teachers">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Create Teacher Account</CardTitle>
                  <CardDescription>Add a new teacher to the platform</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleCreateTeacher} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="teacherName">Teacher Name (Display Name)</Label>
                      <Input
                        id="teacherName"
                        placeholder="Mr. Alderton"
                        value={teacherName}
                        onChange={(e) => setTeacherName(e.target.value)}
                        required
                        disabled={creatingTeacher}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="teacherRole">Role/Subject</Label>
                      <Input
                        id="teacherRole"
                        placeholder="Mathematics Teacher"
                        value={teacherRole}
                        onChange={(e) => setTeacherRole(e.target.value)}
                        required
                        disabled={creatingTeacher}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="teacherPronouns">Pronouns</Label>
                      <Input
                        id="teacherPronouns"
                        placeholder="he/him, she/her, they/them"
                        value={teacherPronouns}
                        onChange={(e) => setTeacherPronouns(e.target.value)}
                        required
                        disabled={creatingTeacher}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="teacherEmail">Email</Label>
                      <Input
                        id="teacherEmail"
                        type="email"
                        placeholder="teacher@school.edu"
                        value={teacherEmail}
                        onChange={(e) => setTeacherEmail(e.target.value)}
                        required
                        disabled={creatingTeacher}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="teacherPassword">Password</Label>
                      <Input
                        id="teacherPassword"
                        type="password"
                        placeholder="••••••••"
                        value={teacherPassword}
                        onChange={(e) => setTeacherPassword(e.target.value)}
                        required
                        disabled={creatingTeacher}
                        minLength={6}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="teacherCourses">Courses Teaching (comma-separated)</Label>
                      <Input
                        id="teacherCourses"
                        placeholder="MATH101, MATH102"
                        value={teacherCourses}
                        onChange={(e) => setTeacherCourses(e.target.value)}
                        disabled={creatingTeacher}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="teacherClubs">Clubs Leading (comma-separated)</Label>
                      <Input
                        id="teacherClubs"
                        placeholder="Chess Club, Math Club"
                        value={teacherClubs}
                        onChange={(e) => setTeacherClubs(e.target.value)}
                        disabled={creatingTeacher}
                      />
                    </div>

                    <Button type="submit" className="w-full" disabled={creatingTeacher}>
                      {creatingTeacher ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          Creating...
                        </>
                      ) : (
                        <>
                          <UserPlus className="w-4 h-4 mr-2" />
                          Create Teacher Account
                        </>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Manage Teachers</CardTitle>
                  <CardDescription>{stats.teachers} teachers registered</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-[600px] overflow-y-auto">
                    {users
                      .filter((u) => u.role === "teacher")
                      .map((teacher) => (
                        <div key={teacher.uid}>
                          {editingTeacher === teacher.uid ? (
                            <div className="p-3 border rounded-lg space-y-3 bg-muted/50">
                              <div className="space-y-2">
                                <Label className="text-xs">Full Name</Label>
                                <Input
                                  value={editingTeacherData.fullName}
                                  onChange={(e) =>
                                    setEditingTeacherData({ ...editingTeacherData, fullName: e.target.value })
                                  }
                                  disabled={savingTeacher}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label className="text-xs">Role/Subject</Label>
                                <Input
                                  value={editingTeacherData.teacherRole}
                                  onChange={(e) =>
                                    setEditingTeacherData({ ...editingTeacherData, teacherRole: e.target.value })
                                  }
                                  disabled={savingTeacher}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label className="text-xs">Pronouns</Label>
                                <Input
                                  value={editingTeacherData.pronouns}
                                  onChange={(e) =>
                                    setEditingTeacherData({ ...editingTeacherData, pronouns: e.target.value })
                                  }
                                  disabled={savingTeacher}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label className="text-xs">Courses (comma-separated)</Label>
                                <Input
                                  value={editingTeacherData.teachingCourses}
                                  onChange={(e) =>
                                    setEditingTeacherData({ ...editingTeacherData, teachingCourses: e.target.value })
                                  }
                                  disabled={savingTeacher}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label className="text-xs">Clubs (comma-separated)</Label>
                                <Input
                                  value={editingTeacherData.leadingClubs}
                                  onChange={(e) =>
                                    setEditingTeacherData({ ...editingTeacherData, leadingClubs: e.target.value })
                                  }
                                  disabled={savingTeacher}
                                />
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={handleSaveTeacher}
                                  disabled={savingTeacher}
                                  className="flex-1"
                                >
                                  {savingTeacher ? (
                                    <>
                                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                      Saving...
                                    </>
                                  ) : (
                                    "Save"
                                  )}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setEditingTeacher(null)}
                                  disabled={savingTeacher}
                                  className="flex-1"
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-start justify-between p-3 border rounded-lg">
                              <div className="flex-1">
                                <p className="font-medium">{teacher.fullName}</p>
                                <p className="text-sm text-muted-foreground">{teacher.email}</p>
                                {teacher.teacherRole && (
                                  <p className="text-xs text-muted-foreground mt-1">{teacher.teacherRole}</p>
                                )}
                                {teacher.pronouns && (
                                  <p className="text-xs text-muted-foreground mt-1">{teacher.pronouns}</p>
                                )}
                              </div>
                              <div className="flex gap-2">
                                <Button variant="outline" size="sm" onClick={() => handleEditTeacher(teacher)}>
                                  <Edit2 className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => handleDeleteTeacher(teacher.uid, teacher.email)}
                                  disabled={deletingTeacher === teacher.uid}
                                >
                                  {deletingTeacher === teacher.uid ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <Trash2 className="w-4 h-4" />
                                  )}
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    {stats.teachers === 0 && <p className="text-center text-muted-foreground py-8">No teachers yet</p>}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Admin Assignment Tab */}
          <TabsContent value="admins">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Assign Admin Role</CardTitle>
                  <CardDescription>Promote an existing user to admin</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleAssignAdmin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="adminEmail">User Email</Label>
                      <Input
                        id="adminEmail"
                        type="email"
                        placeholder="user@school.edu"
                        value={adminEmail}
                        onChange={(e) => setAdminEmail(e.target.value)}
                        required
                        disabled={assigningAdmin}
                      />
                      <p className="text-xs text-muted-foreground">User must have an existing account</p>
                    </div>

                    <Button type="submit" className="w-full" disabled={assigningAdmin}>
                      {assigningAdmin ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          Assigning...
                        </>
                      ) : (
                        <>
                          <Shield className="w-4 h-4 mr-2" />
                          Assign Admin Role
                        </>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Current Admins</CardTitle>
                  <CardDescription>{stats.admins} administrators</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-[400px] overflow-y-auto">
                    {users
                      .filter((u) => u.role === "admin")
                      .map((admin) => (
                        <div key={admin.uid} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <p className="font-medium">{admin.fullName}</p>
                            <p className="text-sm text-muted-foreground">{admin.email}</p>
                          </div>
                          <Badge>Admin</Badge>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Students Management Tab */}
          <TabsContent value="students">
            <Card>
              <CardHeader>
                <CardTitle>Student Management</CardTitle>
                <CardDescription>View and manage student accounts</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Student Number</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users
                      .filter((u) => u.role === "student")
                      .map((student) => (
                        <TableRow key={student.uid}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Avatar>
                                <AvatarImage src={student.photoURL || "/placeholder.svg"} alt={student.fullName} />
                                <AvatarFallback>{student.fullName.charAt(0)}</AvatarFallback>
                              </Avatar>
                              <span className="font-medium">{student.fullName}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">{student.email}</TableCell>
                          <TableCell className="text-sm">{student.studentNumber || "N/A"}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button size="sm" variant="outline" className="gap-1 bg-transparent">
                                    <Eye className="w-4 h-4" />
                                    <span className="hidden sm:inline">Profile</span>
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-2xl">
                                  <DialogHeader>
                                    <DialogTitle>View {student.fullName}'s Public Profile</DialogTitle>
                                  </DialogHeader>
                                  <div className="space-y-4">
                                    <div>
                                      <p className="text-sm font-medium text-muted-foreground">Email</p>
                                      <p className="text-sm">{student.email}</p>
                                    </div>
                                    <div>
                                      <p className="text-sm font-medium text-muted-foreground">Student Number</p>
                                      <p className="text-sm">{student.studentNumber}</p>
                                    </div>
                                    <div>
                                      <p className="text-sm font-medium text-muted-foreground">Grade</p>
                                      <p className="text-sm">Grade {student.grade}</p>
                                    </div>
                                    <div>
                                      <p className="text-sm font-medium text-muted-foreground">Bio</p>
                                      <p className="text-sm">{student.bio || "No bio provided"}</p>
                                    </div>
                                    <Button asChild className="w-full">
                                      <Link href={`/profile/${student.uid}`}>View Full Public Profile</Link>
                                    </Button>
                                  </div>
                                </DialogContent>
                              </Dialog>

                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button size="sm" variant="outline" className="gap-1 bg-transparent">
                                    <MessageSquare className="w-4 h-4" />
                                    <span className="hidden sm:inline">Message</span>
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-2xl">
                                  <DialogHeader>
                                    <DialogTitle>Send Message to {student.fullName}</DialogTitle>
                                    <DialogDescription>
                                      Send a private message that only this student will see
                                    </DialogDescription>
                                  </DialogHeader>
                                  <form
                                    onSubmit={async (e) => {
                                      e.preventDefault()
                                      const formData = new FormData(e.currentTarget)
                                      const subject = formData.get("subject") as string
                                      const body = formData.get("body") as string

                                      try {
                                        await addDoc(collection(db, "privateMessages"), {
                                          recipientId: student.uid,
                                          senderId: user?.uid,
                                          subject,
                                          body,
                                          createdAt: new Date().toISOString(),
                                          read: false,
                                        })
                                        toast.success("Message sent!")
                                        ;(e.target as HTMLFormElement).reset()
                                      } catch (error) {
                                        console.error("[v0] Error sending message:", error)
                                        toast.error("Failed to send message")
                                      }
                                    }}
                                    className="space-y-4"
                                  >
                                    <div className="space-y-2">
                                      <Label htmlFor="msg-subject">Subject</Label>
                                      <Input id="msg-subject" name="subject" placeholder="Message subject" required />
                                    </div>
                                    <div className="space-y-2">
                                      <Label htmlFor="msg-body">Message</Label>
                                      <Textarea
                                        id="msg-body"
                                        name="body"
                                        placeholder="Write your message..."
                                        rows={6}
                                        required
                                      />
                                    </div>
                                    <Button type="submit" className="w-full">
                                      Send Message
                                    </Button>
                                  </form>
                                </DialogContent>
                              </Dialog>

                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-1 bg-transparent"
                                onClick={async () => {
                                  try {
                                    await addDoc(collection(db, "admins"), {
                                      email: student.email,
                                      uid: student.uid,
                                      promotedAt: new Date().toISOString(),
                                    })
                                    await updateDoc(doc(db, "users", student.uid), { role: "admin" })
                                    toast.success(`${student.fullName} promoted to admin`)
                                    fetchUsers()
                                  } catch (error) {
                                    console.error("[v0] Error promoting student:", error)
                                    toast.error("Failed to promote student")
                                  }
                                }}
                              >
                                <Crown className="w-4 h-4" />
                                <span className="hidden sm:inline">Promote</span>
                              </Button>

                              <Button
                                size="sm"
                                variant="destructive"
                                className="gap-1"
                                onClick={async () => {
                                  if (confirm(`Are you sure you want to delete ${student.fullName}'s account?`)) {
                                    try {
                                      await deleteDoc(doc(db, "users", student.uid))
                                      toast.success("Student account deleted")
                                      fetchUsers()
                                    } catch (error) {
                                      console.error("[v0] Error deleting student:", error)
                                      toast.error("Failed to delete student")
                                    }
                                  }
                                }}
                              >
                                <Trash2 className="w-4 h-4" />
                                <span className="hidden sm:inline">Delete</span>
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Announcements Tab */}
          <TabsContent value="announcements">
            <Card>
              <CardHeader>
                <CardTitle>Send Global Announcement</CardTitle>
                <CardDescription>Create announcements for specific grades or all users</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSendAnnouncement} className="space-y-4 max-w-2xl">
                  <div className="space-y-2">
                    <Label htmlFor="grade">Target Grade</Label>
                    <Select
                      value={announcementGrade}
                      onValueChange={setAnnouncementGrade}
                      required
                      disabled={sendingAnnouncement}
                    >
                      <SelectTrigger id="grade">
                        <SelectValue placeholder="Select grade" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Grades</SelectItem>
                        <SelectItem value="9">Grade 9</SelectItem>
                        <SelectItem value="10">Grade 10</SelectItem>
                        <SelectItem value="11">Grade 11</SelectItem>
                        <SelectItem value="12">Grade 12</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="subject">Subject</Label>
                    <Input
                      id="subject"
                      placeholder="Important: School Event Tomorrow"
                      value={announcementSubject}
                      onChange={(e) => setAnnouncementSubject(e.target.value)}
                      required
                      disabled={sendingAnnouncement}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="body">Message</Label>
                    <Textarea
                      id="body"
                      placeholder="Write your announcement message here..."
                      value={announcementBody}
                      onChange={(e) => setAnnouncementBody(e.target.value)}
                      required
                      disabled={sendingAnnouncement}
                      rows={6}
                    />
                  </div>

                  <Button type="submit" className="w-full" disabled={sendingAnnouncement}>
                    {sendingAnnouncement ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Bell className="w-4 h-4 mr-2" />
                        Send Announcement
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Courses Tab */}
          <TabsContent value="courses">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Create Course</CardTitle>
                  <CardDescription>Add a new course with category and teachers</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleCreateCourse} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="courseCode">Course Code</Label>
                      <Input
                        id="courseCode"
                        placeholder="MATH101"
                        value={courseCode}
                        onChange={(e) => setCourseCode(e.target.value.toUpperCase())}
                        required
                        disabled={creatingCourse}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="courseName">Course Name</Label>
                      <Input
                        id="courseName"
                        placeholder="Introduction to Calculus"
                        value={courseName}
                        onChange={(e) => setCourseName(e.target.value)}
                        required
                        disabled={creatingCourse}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="courseCategory">Category</Label>
                      <div className="flex gap-2">
                        <Select
                          value={courseCategory}
                          onValueChange={setCourseCategory}
                          disabled={creatingCourse}
                        >
                          <SelectTrigger id="courseCategory" className="flex-1">
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            {categories.map((cat) => (
                              <SelectItem key={cat.id} value={cat.name}>
                                {cat.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button type="button" variant="outline" disabled={creatingCourse}>
                              + New
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Create New Category</DialogTitle>
                            </DialogHeader>
                            <form onSubmit={handleCreateCategory} className="space-y-4">
                              <div>
                                <Label htmlFor="categoryName">Category Name</Label>
                                <Input
                                  id="categoryName"
                                  placeholder="e.g., Computer Science"
                                  value={newCategoryName}
                                  onChange={(e) => setNewCategoryName(e.target.value)}
                                  disabled={creatingCategory}
                                />
                              </div>
                              <Button type="submit" className="w-full" disabled={creatingCategory}>
                                {creatingCategory ? (
                                  <>
                                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                    Creating...
                                  </>
                                ) : (
                                  "Create Category"
                                )}
                              </Button>
                            </form>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="courseGrade">Grade Level</Label>
                      <Select
                        value={courseGrade === "" ? "" : courseGrade.toString()}
                        onValueChange={(val) => setCourseGrade(val === "" ? "" : Number(val))}
                        disabled={creatingCourse}
                      >
                        <SelectTrigger id="courseGrade">
                          <SelectValue placeholder="Select grade" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="9">Grade 9</SelectItem>
                          <SelectItem value="10">Grade 10</SelectItem>
                          <SelectItem value="11">Grade 11</SelectItem>
                          <SelectItem value="12">Grade 12</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Assign Teachers (Optional)</Label>
                      <div className="space-y-2">
                        {users
                          .filter((u) => u.role === "teacher")
                          .map((teacher) => (
                            <div key={teacher.uid} className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                id={`teacher-${teacher.uid}`}
                                checked={selectedTeachers.includes(teacher.uid)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedTeachers([...selectedTeachers, teacher.uid])
                                  } else {
                                    setSelectedTeachers(selectedTeachers.filter((id) => id !== teacher.uid))
                                  }
                                }}
                                disabled={creatingCourse}
                                className="w-4 h-4"
                              />
                              <label htmlFor={`teacher-${teacher.uid}`} className="text-sm cursor-pointer">
                                {teacher.fullName}
                              </label>
                            </div>
                          ))}
                        {users.filter((u) => u.role === "teacher").length === 0 && (
                          <p className="text-sm text-muted-foreground">No teachers available</p>
                        )}
                      </div>
                    </div>

                    <Button type="submit" className="w-full" disabled={creatingCourse}>
                      {creatingCourse ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          Creating...
                        </>
                      ) : (
                        <>
                          <BookOpen className="w-4 h-4 mr-2" />
                          Create Course
                        </>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Existing Courses</CardTitle>
                  <CardDescription>{stats.totalCourses} courses available</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-[600px] overflow-y-auto">
                    {courses.map((course) => (
                      <div key={course.id} className="p-3 border rounded-lg space-y-3">
                        {editingCourse === course.id ? (
                          <div className="space-y-3">
                            <Input
                              placeholder="Course Name"
                              value={editingCourseName}
                              onChange={(e) => setEditingCourseName(e.target.value)}
                            />
                            <Select value={editingCourseCategory} onValueChange={setEditingCourseCategory}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="mathematics">Mathematics</SelectItem>
                                <SelectItem value="science">Science</SelectItem>
                                <SelectItem value="english">English</SelectItem>
                                <SelectItem value="history">History</SelectItem>
                                <SelectItem value="languages">Languages</SelectItem>
                                <SelectItem value="arts">Arts</SelectItem>
                                <SelectItem value="physical-education">Physical Education</SelectItem>
                                <SelectItem value="technology">Technology</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                              </SelectContent>
                            </Select>
                            <div className="flex gap-2">
                              <Button size="sm" onClick={() => handleEditCourse(course.id)} className="flex-1">
                                Save
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setEditingCourse(null)}
                                className="flex-1"
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <Badge variant="outline">{course.courseCode}</Badge>
                                  <Badge variant="secondary">{course.category}</Badge>
                                  <span className="text-sm text-muted-foreground">{formatDate(course.createdAt)}</span>
                                </div>
                                <CardTitle className="text-lg">{course.courseName}</CardTitle>
                                <CardDescription className="mt-2">Created by {course.createdBy}</CardDescription>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setEditingCourse(course.id)
                                    setEditingCourseName(course.courseName)
                                    setEditingCourseCategory(course.category)
                                  }}
                                >
                                  Edit
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => handleDeleteCourse(course.id)}
                                  disabled={deletingCourse === course.id}
                                >
                                  {deletingCourse === course.id ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <Trash2 className="w-4 h-4" />
                                  )}
                                </Button>
                              </div>
                            </div>

                            {/* Assigned Teachers List */}
                            <div className="space-y-2">
                              <Label className="text-xs text-muted-foreground">Assigned Teachers:</Label>
                              {course.teachers.length > 0 ? (
                                <div className="space-y-1">
                                  {course.teachers.map((teacherId) => (
                                    <div
                                      key={teacherId}
                                      className="flex items-center justify-between text-sm p-2 bg-muted rounded"
                                    >
                                      <span>{getTeacherName(teacherId)}</span>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleRemoveTeacherFromCourse(teacherId, course.id)}
                                      >
                                        <X className="w-4 h-4 text-destructive" />
                                      </Button>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-sm text-muted-foreground italic">No teachers assigned</p>
                              )}
                            </div>

                            {/* Add Teacher */}
                            <div className="pt-2 border-t">
                              <Label className="text-xs text-muted-foreground">Add Teacher:</Label>
                              <Select onValueChange={(teacherId) => handleAssignTeacherToCourse(teacherId, course.id)}>
                                <SelectTrigger className="mt-1">
                                  <SelectValue placeholder="Select teacher" />
                                </SelectTrigger>
                                <SelectContent>
                                  {users
                                    .filter((u) => u.role === "teacher" && !course.teachers.includes(u.uid))
                                    .map((teacher) => (
                                      <SelectItem key={teacher.uid} value={teacher.uid}>
                                        {teacher.fullName}
                                      </SelectItem>
                                    ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                    {stats.totalCourses === 0 && (
                      <p className="text-center text-muted-foreground py-8">No courses yet</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Approval Tab */}
          <TabsContent value="approval">
            <Card>
              <CardHeader>
                <CardTitle>Approve Teacher Announcements</CardTitle>
                <CardDescription>Review and approve announcements submitted by teachers</CardDescription>
              </CardHeader>
              <CardContent>
                {pendingAnnouncements.length === 0 ? (
                  <div className="text-center py-12">
                    <Bell className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                    <p className="text-muted-foreground">No pending announcements</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pendingAnnouncements.map((announcement) => (
                      <Card key={announcement.id} className="border-border">
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge variant="outline">
                                  Grade {announcement.grade === "all" ? "All" : announcement.grade}
                                </Badge>
                                <span className="text-sm text-muted-foreground">
                                  {formatDate(announcement.createdAt)}
                                </span>
                              </div>
                              <CardTitle className="text-lg">{announcement.subject}</CardTitle>
                              <CardDescription className="mt-2">
                                By {announcement.teacherName} ({announcement.teacherEmail})
                              </CardDescription>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="bg-muted/50 p-4 rounded-lg mb-4">
                            <p className="text-foreground whitespace-pre-wrap">{announcement.body}</p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="default"
                              className="gap-2"
                              onClick={() => handleApproveAnnouncement(announcement)}
                              disabled={processingAnnouncement === announcement.id}
                            >
                              {processingAnnouncement === announcement.id ? (
                                <>
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                  Approving...
                                </>
                              ) : (
                                <>
                                  <Bell className="w-4 h-4" />
                                  Approve & Send
                                </>
                              )}
                            </Button>
                            <Button
                              variant="destructive"
                              onClick={() => handleRejectAnnouncement(announcement)}
                              disabled={processingAnnouncement === announcement.id}
                            >
                              Reject
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Clubs Tab */}
          <TabsContent value="clubs">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Create Club</CardTitle>
                  <CardDescription>Create a new club and assign teachers</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleCreateClub} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="clubName">Club Name</Label>
                      <Input
                        id="clubName"
                        placeholder="e.g., Photography Club"
                        value={clubName}
                        onChange={(e) => setClubName(e.target.value)}
                        disabled={creatingClub}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="clubDescription">Description (Optional)</Label>
                      <Textarea
                        id="clubDescription"
                        placeholder="Club description..."
                        value={clubDescription}
                        onChange={(e) => setClubDescription(e.target.value)}
                        disabled={creatingClub}
                        rows={3}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Assign Teachers</Label>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {users
                          .filter((u) => u.role === "teacher")
                          .map((teacher) => (
                            <div key={teacher.uid} className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                id={`club-teacher-${teacher.uid}`}
                                checked={selectedClubTeachers.includes(teacher.uid)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedClubTeachers([...selectedClubTeachers, teacher.uid])
                                  } else {
                                    setSelectedClubTeachers(selectedClubTeachers.filter((id) => id !== teacher.uid))
                                  }
                                }}
                                disabled={creatingClub}
                                className="w-4 h-4"
                              />
                              <label htmlFor={`club-teacher-${teacher.uid}`} className="text-sm cursor-pointer">
                                {teacher.fullName}
                              </label>
                            </div>
                          ))}
                        {users.filter((u) => u.role === "teacher").length === 0 && (
                          <p className="text-sm text-muted-foreground">No teachers available</p>
                        )}
                      </div>
                    </div>

                    <Button type="submit" className="w-full" disabled={creatingClub}>
                      {creatingClub ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          Creating...
                        </>
                      ) : (
                        <>
                          <Users className="w-4 h-4 mr-2" />
                          Create Club
                        </>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Existing Clubs</CardTitle>
                  <CardDescription>{clubs.length} clubs available</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-[600px] overflow-y-auto">
                    {clubs.map((club) => (
                      <div key={club.id} className="p-3 border rounded-lg space-y-2">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-base">{club.clubName}</CardTitle>
                            {club.description && (
                              <CardDescription className="text-xs mt-1">{club.description}</CardDescription>
                            )}
                            <div className="mt-2 flex flex-wrap gap-1">
                              {club.teachers.length > 0 && (
                                <Badge variant="outline" className="text-xs">
                                  {club.teachers.length} teacher{club.teachers.length !== 1 ? "s" : ""}
                                </Badge>
                              )}
                              {club.students.length > 0 && (
                                <Badge variant="secondary" className="text-xs">
                                  {club.students.length} student{club.students.length !== 1 ? "s" : ""}
                                </Badge>
                              )}
                              {club.joinRequests.length > 0 && (
                                <Badge variant="destructive" className="text-xs">
                                  {club.joinRequests.length} request{club.joinRequests.length !== 1 ? "s" : ""}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    {clubs.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">No clubs created yet</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="reports">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Flag className="w-5 h-5" />
                  User Reports
                </CardTitle>
                <CardDescription>
                  {reports.filter((r) => r.status === "pending").length} pending reports
                </CardDescription>
              </CardHeader>
              <CardContent>
                {reports.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No reports submitted yet.</p>
                ) : (
                  <div className="space-y-4">
                    {reports.map((report) => (
                      <div
                        key={report.id}
                        className={`border rounded-lg p-4 space-y-3 ${
                          report.status === "pending" ? "border-destructive/50 bg-destructive/5" : "opacity-60"
                        }`}
                      >
                        {/* Header row */}
                        <div className="flex items-start justify-between gap-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge
                                variant={
                                  report.status === "pending"
                                    ? "destructive"
                                    : report.status === "resolved"
                                      ? "default"
                                      : "secondary"
                                }
                              >
                                {report.status}
                              </Badge>
                              <Badge variant="outline" className="capitalize">
                                {report.contentType}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">{formatDate(report.createdAt)}</p>
                          </div>
                          <a
                            href={report.contentLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-xs text-primary hover:underline whitespace-nowrap"
                          >
                            <ExternalLink className="w-3 h-3" />
                            View content
                          </a>
                        </div>

                        {/* Reporter & Reported */}
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                              Reported by
                            </p>
                            <p className="font-medium">{report.reportedByName}</p>
                            {report.reportedByHandle && (
                              <p className="text-xs text-muted-foreground">@{report.reportedByHandle}</p>
                            )}
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                              Reporting about
                            </p>
                            <p className="font-medium">{report.contentOwnerName}</p>
                          </div>
                        </div>

                        {/* Description */}
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                            Description
                          </p>
                          <p className="text-sm bg-muted rounded p-2">{report.description}</p>
                        </div>

                        {/* Actions */}
                        {report.status === "pending" && (
                          <div className="flex flex-wrap gap-2 pt-1">
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDeleteReportedContent(report)}
                            >
                              <Trash2 className="w-3 h-3 mr-1" />
                              Delete Content
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleBanUser(report.contentOwnerId, report.id)}
                            >
                              <UserX className="w-3 h-3 mr-1" />
                              Ban User
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => router.push(`/admin/user/${report.contentOwnerId}`)}
                            >
                              <Eye className="w-3 h-3 mr-1" />
                              Edit User Settings
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleReportAction(report.id, "resolved")}
                            >
                              Mark Resolved
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleReportAction(report.id, "dismissed")}
                            >
                              Dismiss
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Feedback Tab */}
          <TabsContent value="feedback">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  User Feedback & Bug Reports
                </CardTitle>
                <CardDescription>
                  {feedbackItems.filter((f) => !f.read).length} unread submissions
                </CardDescription>
              </CardHeader>
              <CardContent>
                {feedbackItems.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No feedback submitted yet.</p>
                ) : (
                  <div className="space-y-4">
                    {feedbackItems.map((item) => (
                      <div
                        key={item.id}
                        className={`border rounded-lg p-4 space-y-3 ${!item.read ? "border-primary/40 bg-primary/5" : ""}`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-center gap-2">
                            <Badge variant={item.type === "bug" ? "destructive" : "default"} className="capitalize">
                              {item.type}
                            </Badge>
                            {!item.read && <Badge variant="outline" className="text-xs">New</Badge>}
                          </div>
                          <p className="text-xs text-muted-foreground">{formatDate(item.createdAt)}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Submitted by</p>
                            <p className="font-medium">{item.submittedBy}</p>
                            <p className="text-xs text-muted-foreground">{item.submittedByEmail}</p>
                          </div>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                            {item.type === "bug" ? "Bug Description" : "Feedback"}
                          </p>
                          <p className="text-sm bg-muted rounded p-2">{item.text}</p>
                        </div>
                        {item.imageUrl && (
                          <div>
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Attachment</p>
                            <img src={item.imageUrl} alt="Feedback attachment" className="max-h-48 rounded-md border object-cover" />
                          </div>
                        )}
                        {!item.read && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={async () => {
                              await updateDoc(doc(db, "feedback", item.id), { read: true })
                              setFeedbackItems((prev) => prev.map((f) => f.id === item.id ? { ...f, read: true } : f))
                            }}
                          >
                            Mark as Read
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
