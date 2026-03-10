"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { collection, getDocs, addDoc } from "firebase/firestore"
import { useAuth } from "@/components/auth-provider"
import { db } from "@/lib/firebase"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2, BookOpen, Users, Search } from "lucide-react"
import { toast } from "sonner"

interface Course {
  id: string
  courseCode: string
  courseName: string
  teachers: string[]
  students: string[]
}

interface Club {
  id: string
  clubName: string
  description: string
  leader: string
}

export default function JoinGroupPage() {
  const { user, userProfile, loading: authLoading } = useAuth()
  const router = useRouter()
  const [courses, setCourses] = useState<Course[]>([])
  const [clubs, setClubs] = useState<Club[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [selectedGrade, setSelectedGrade] = useState<number | "all">("all")
  const [requesting, setRequesting] = useState<string | null>(null)
  
  const categories = [
    "all",
    "Mathematics",
    "Science",
    "English",
    "History",
    "Languages",
    "Arts",
    "Physical Education",
    "Technology",
    "Other"
  ]

  const grades = [
    { label: "All Grades", value: "all" },
    { label: "Grade 9", value: 9 },
    { label: "Grade 10", value: 10 },
    { label: "Grade 11", value: 11 },
    { label: "Grade 12", value: 12 },
  ]

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login")
      return
    }

    if (user) {
      fetchCoursesAndClubs()
    }
  }, [user, authLoading, router])

  const fetchCoursesAndClubs = async () => {
    try {
      // Fetch courses
      const coursesSnapshot = await getDocs(collection(db, "courses"))
      const coursesData = coursesSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Course[]
      setCourses(coursesData)

      // Fetch clubs
      const clubsSnapshot = await getDocs(collection(db, "clubs"))
      const clubsData = clubsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Club[]
      setClubs(clubsData)
    } catch (error) {
      console.error("[v0] Error fetching data:", error)
      toast.error("Failed to load courses and clubs")
    } finally {
      setLoading(false)
    }
  }

  const handleRequestJoin = async (type: "course" | "club", targetId: string, targetName: string) => {
    if (!user || !userProfile) {
      toast.error("You must be logged in to request to join")
      return
    }

    setRequesting(targetId)

    try {
      console.log("[v0] Creating join request:", { type, targetId, targetName })

      await addDoc(collection(db, "joinRequests"), {
        studentId: user.uid,
        studentName: userProfile.fullName,
        studentEmail: user.email,
        type: type,
        targetId: targetId,
        targetName: targetName,
        createdAt: new Date().toISOString(),
        status: "pending",
      })

      toast.success(`Request sent for ${targetName}!`)
    } catch (error) {
      console.error("[v0] Request join error:", error)
      toast.error("Failed to send request")
    } finally {
      setRequesting(null)
    }
  }

  const filteredCourses = courses.filter((course) => {
    const matchesSearch =
      course.courseCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.courseName.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesCategory = 
      selectedCategory === "all" || 
      (course as any).category === selectedCategory

    const matchesGrade =
      selectedGrade === "all" ||
      (course as any).grade === selectedGrade
    
    return matchesSearch && matchesCategory && matchesGrade
  })

  const filteredClubs = clubs.filter((club) => club.clubName.toLowerCase().includes(searchQuery.toLowerCase()))

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center lg:ml-72">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background lg:ml-72 pt-20 lg:pt-0">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">Join Courses & Clubs</h1>
          <p className="text-muted-foreground">Request to join courses and clubs for the current school year</p>
        </div>

        {/* Search Bar and Filters */}
        <div className="mb-6 space-y-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search courses or clubs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          {/* Grade Filter Pills */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Filter by Grade:</p>
            <div className="flex flex-wrap gap-2">
              {grades.map((grade) => (
                <Button
                  key={grade.value}
                  variant={selectedGrade === grade.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedGrade(grade.value)}
                  className="rounded-full"
                >
                  {grade.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Filter by Category:</p>
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <Button
                  key={category}
                  variant={selectedCategory === category ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(category)}
                  className="rounded-full"
                >
                  {category === "all" ? "All Categories" : category}
                </Button>
              ))}
            </div>
          </div>
        </div>

        <Tabs defaultValue="courses" className="w-full">
          <TabsList>
            <TabsTrigger value="courses" className="gap-2">
              <BookOpen className="w-4 h-4" />
              Courses
              <Badge variant="secondary">{courses.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="clubs" className="gap-2">
              <Users className="w-4 h-4" />
              Clubs
              <Badge variant="secondary">{clubs.length}</Badge>
            </TabsTrigger>
          </TabsList>

          {/* Courses Tab */}
          <TabsContent value="courses" className="mt-6">
            {filteredCourses.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <BookOpen className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <p className="text-muted-foreground">
                    {searchQuery ? "No courses found matching your search" : "No courses available"}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredCourses.map((course) => {
                  const alreadyEnrolled = userProfile?.courses?.includes(course.id)

                  return (
                    <Card key={course.id} className={alreadyEnrolled ? "border-primary" : ""}>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <CardTitle className="text-lg">{course.courseCode}</CardTitle>
                              {(course as any).grade && (
                                <Badge variant="outline" className="text-xs">
                                  Grade {(course as any).grade}
                                </Badge>
                              )}
                              {(course as any).category && (
                                <Badge variant="secondary" className="text-xs">
                                  {(course as any).category}
                                </Badge>
                              )}
                            </div>
                            <CardDescription>{course.courseName}</CardDescription>
                          </div>
                          {alreadyEnrolled && <Badge variant="default">Enrolled</Badge>}
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between text-sm text-muted-foreground">
                            <span>Teachers: {course.teachers.length}</span>
                            <span>Students: {course.students.length}</span>
                          </div>

                          <Button
                            className="w-full"
                            onClick={() => handleRequestJoin("course", course.id, course.courseCode)}
                            disabled={requesting === course.id || alreadyEnrolled}
                          >
                            {requesting === course.id ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Requesting...
                              </>
                            ) : alreadyEnrolled ? (
                              "Already Enrolled"
                            ) : (
                              "Request to Join"
                            )}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </TabsContent>

          {/* Clubs Tab */}
          <TabsContent value="clubs" className="mt-6">
            {filteredClubs.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <p className="text-muted-foreground">
                    {searchQuery ? "No clubs found matching your search" : "No clubs available yet"}
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">Contact your teachers to create clubs</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredClubs.map((club) => {
                  const alreadyMember = userProfile?.clubs?.includes(club.id)

                  return (
                    <Card key={club.id} className={alreadyMember ? "border-primary" : ""}>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-lg">{club.clubName}</CardTitle>
                            <CardDescription>{club.description}</CardDescription>
                          </div>
                          {alreadyMember && <Badge variant="default">Member</Badge>}
                        </div>
                      </CardHeader>
                      <CardContent>
                        <Button
                          className="w-full"
                          onClick={() => handleRequestJoin("club", club.id, club.clubName)}
                          disabled={requesting === club.id || alreadyMember}
                        >
                          {requesting === club.id ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Requesting...
                            </>
                          ) : alreadyMember ? (
                            "Already a Member"
                          ) : (
                            "Request to Join"
                          )}
                        </Button>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
