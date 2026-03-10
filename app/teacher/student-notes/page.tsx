"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { collection, getDocs, addDoc, updateDoc, doc, query, where, deleteDoc } from "firebase/firestore"
import { useAuth } from "@/components/auth-provider"
import { db } from "@/lib/firebase"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Loader2, Plus, Trash2, Edit, FileText, Search } from "lucide-react"
import { toast } from "sonner"

interface StudentNote {
  id: string
  studentId: string
  studentName: string
  teacherId: string
  teacherName: string
  subject: string
  note: string
  type: "behavioral" | "academic" | "general"
  createdAt: string
  updatedAt: string
}

interface Student {
  uid: string
  fullName: string
  email: string
  grade?: string
}

export default function StudentNotesPage() {
  const { user, userProfile, loading: authLoading, isTeacher } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [students, setStudents] = useState<Student[]>([])
  const [notes, setNotes] = useState<StudentNote[]>([])
  const [filteredNotes, setFilteredNotes] = useState<StudentNote[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedStudent, setSelectedStudent] = useState("")
  const [selectedType, setSelectedType] = useState<string>("all")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingNote, setEditingNote] = useState<StudentNote | null>(null)
  const [saving, setSaving] = useState(false)

  const [noteForm, setNoteForm] = useState({
    studentId: "",
    subject: "",
    note: "",
    type: "general" as "behavioral" | "academic" | "general",
  })

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login")
      return
    }

    if (!authLoading && user && !isTeacher) {
      router.push("/feed")
      toast.error("This page is only accessible to teachers")
      return
    }

    if (user && isTeacher) {
      fetchData()
    }
  }, [user, authLoading, isTeacher, router])

  useEffect(() => {
    filterNotes()
  }, [searchQuery, selectedStudent, selectedType, notes])

  const fetchData = async () => {
    if (!user) return

    try {
      // Fetch all students
      const usersSnapshot = await getDocs(collection(db, "users"))
      const studentsData = usersSnapshot.docs
        .map((doc) => ({ ...doc.data() }))
        .filter((u: any) => u.role === "student") as Student[]
      setStudents(studentsData)

      // Fetch notes created by this teacher
      const notesQuery = query(collection(db, "studentNotes"), where("teacherId", "==", user.uid))
      const notesSnapshot = await getDocs(notesQuery)
      const notesData = notesSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as StudentNote[]
      setNotes(notesData)
      setFilteredNotes(notesData)
    } catch (error) {
      console.error("[v0] Error fetching data:", error)
      toast.error("Failed to load student notes")
    } finally {
      setLoading(false)
    }
  }

  const filterNotes = () => {
    let filtered = [...notes]

    if (searchQuery) {
      filtered = filtered.filter(
        (note) =>
          note.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          note.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
          note.note.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    if (selectedStudent) {
      filtered = filtered.filter((note) => note.studentId === selectedStudent)
    }

    if (selectedType !== "all") {
      filtered = filtered.filter((note) => note.type === selectedType)
    }

    setFilteredNotes(filtered)
  }

  const handleCreateNote = async () => {
    if (!noteForm.studentId || !noteForm.subject || !noteForm.note || !user || !userProfile) {
      toast.error("Please fill in all fields")
      return
    }

    setSaving(true)
    try {
      const student = students.find((s) => s.uid === noteForm.studentId)
      if (!student) {
        toast.error("Student not found")
        return
      }

      if (editingNote) {
        // Update existing note
        await updateDoc(doc(db, "studentNotes", editingNote.id), {
          subject: noteForm.subject,
          note: noteForm.note,
          type: noteForm.type,
          updatedAt: new Date().toISOString(),
        })
        toast.success("Note updated successfully!")
      } else {
        // Create new note
        await addDoc(collection(db, "studentNotes"), {
          studentId: noteForm.studentId,
          studentName: student.fullName,
          teacherId: user.uid,
          teacherName: userProfile.fullName || "Unknown Teacher",
          subject: noteForm.subject,
          note: noteForm.note,
          type: noteForm.type,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        toast.success("Note added successfully!")
      }

      setDialogOpen(false)
      setEditingNote(null)
      setNoteForm({
        studentId: "",
        subject: "",
        note: "",
        type: "general",
      })
      fetchData()
    } catch (error) {
      console.error("[v0] Error saving note:", error)
      toast.error("Failed to save note")
    } finally {
      setSaving(false)
    }
  }

  const handleEditNote = (note: StudentNote) => {
    setEditingNote(note)
    setNoteForm({
      studentId: note.studentId,
      subject: note.subject,
      note: note.note,
      type: note.type,
    })
    setDialogOpen(true)
  }

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm("Are you sure you want to delete this note?")) return

    try {
      await deleteDoc(doc(db, "studentNotes", noteId))
      toast.success("Note deleted successfully!")
      fetchData()
    } catch (error) {
      console.error("[v0] Error deleting note:", error)
      toast.error("Failed to delete note")
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

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "behavioral":
        return <Badge variant="destructive">Behavioral</Badge>
      case "academic":
        return <Badge variant="default">Academic</Badge>
      default:
        return <Badge variant="secondary">General</Badge>
    }
  }

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
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2">Student Notes</h1>
            <p className="text-muted-foreground">Manage private notes about students</p>
          </div>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button
                onClick={() => {
                  setEditingNote(null)
                  setNoteForm({ studentId: "", subject: "", note: "", type: "general" })
                }}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Note
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editingNote ? "Edit Note" : "Add Student Note"}</DialogTitle>
                <DialogDescription>
                  {editingNote
                    ? "Update the note details below"
                    : "Create a private note about a student. Only you can see this."}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="student">Student</Label>
                  <Select
                    value={noteForm.studentId}
                    onValueChange={(value) => setNoteForm({ ...noteForm, studentId: value })}
                    disabled={saving || !!editingNote}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a student" />
                    </SelectTrigger>
                    <SelectContent>
                      {students.map((student) => (
                        <SelectItem key={student.uid} value={student.uid}>
                          {student.fullName} {student.grade ? `(Grade ${student.grade})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="type">Note Type</Label>
                  <Select
                    value={noteForm.type}
                    onValueChange={(value: any) => setNoteForm({ ...noteForm, type: value })}
                    disabled={saving}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="academic">Academic</SelectItem>
                      <SelectItem value="behavioral">Behavioral</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subject">Subject</Label>
                  <Input
                    id="subject"
                    placeholder="e.g., Excellent participation in class"
                    value={noteForm.subject}
                    onChange={(e) => setNoteForm({ ...noteForm, subject: e.target.value })}
                    disabled={saving}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="note">Note</Label>
                  <Textarea
                    id="note"
                    placeholder="Add detailed notes here..."
                    value={noteForm.note}
                    onChange={(e) => setNoteForm({ ...noteForm, note: e.target.value })}
                    disabled={saving}
                    rows={5}
                  />
                </div>

                <div className="flex gap-2 pt-4">
                  <Button onClick={handleCreateNote} disabled={saving} className="flex-1">
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : editingNote ? (
                      "Update Note"
                    ) : (
                      "Add Note"
                    )}
                  </Button>
                  <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Search</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search notes..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Filter by Student</Label>
                <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                  <SelectTrigger>
                    <SelectValue placeholder="All students" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All students</SelectItem>
                    {students.map((student) => (
                      <SelectItem key={student.uid} value={student.uid}>
                        {student.fullName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Filter by Type</Label>
                <Select value={selectedType} onValueChange={setSelectedType}>
                  <SelectTrigger>
                    <SelectValue placeholder="All types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All types</SelectItem>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="academic">Academic</SelectItem>
                    <SelectItem value="behavioral">Behavioral</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notes List */}
        <Card>
          <CardHeader>
            <CardTitle>Your Notes ({filteredNotes.length})</CardTitle>
            <CardDescription>Private notes visible only to you</CardDescription>
          </CardHeader>
          <CardContent>
            {filteredNotes.length > 0 ? (
              <div className="space-y-4">
                {filteredNotes.map((note) => (
                  <div key={note.id} className="p-4 border rounded-lg">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold">{note.studentName}</p>
                          {getTypeBadge(note.type)}
                        </div>
                        <p className="text-sm font-medium text-foreground">{note.subject}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={() => handleEditNote(note)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteNote(note.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{note.note}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        Created: {formatDate(note.createdAt)}
                      </Badge>
                      {note.updatedAt !== note.createdAt && (
                        <Badge variant="outline" className="text-xs">
                          Updated: {formatDate(note.updatedAt)}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">
                  {notes.length === 0
                    ? "No notes yet. Add your first note to get started!"
                    : "No notes match your filters."}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
