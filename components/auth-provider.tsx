"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState } from "react"
import { type User, onAuthStateChanged } from "firebase/auth"
import { collection, getDocs, doc, getDoc, query, where } from "firebase/firestore"
import { auth, db } from "@/lib/firebase"

interface UserProfile {
  uid: string
  email: string
  firstName?: string
  lastName?: string
  fullName?: string
  role: "student" | "teacher" | "admin" | "principal"
  handle?: string
  studentNumber?: string
  grade?: string
  courses?: string[]
  clubs?: string[]
  teacherName?: string
  teachingCourses?: string[]
  leadingClubs?: string[]
  photoURL?: string
  interests?: string[]
  theme?: "light" | "dark" | "system"
  strikes?: number
  banned?: boolean
  reports?: string[]
}

interface AuthContextType {
  user: User | null
  userProfile: UserProfile | null
  loading: boolean
  isAdmin: boolean
  isTeacher: boolean
  isStudent: boolean
  isPrincipal: boolean
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userProfile: null,
  loading: true,
  isAdmin: false,
  isTeacher: false,
  isStudent: false,
  isPrincipal: false,
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isTeacher, setIsTeacher] = useState(false)
  const [isStudent, setIsStudent] = useState(false)
  const [isPrincipal, setIsPrincipal] = useState(false)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user)
      
      if (user) {
        try {
          // Fetch user profile and check admin status in parallel
          const userDocRef = doc(db, "users", user.uid)
          const adminsQuery = query(collection(db, "admins"), where("email", "==", user.email))
          
          const [userDoc, adminsSnapshot] = await Promise.all([
            getDoc(userDocRef),
            getDocs(adminsQuery),
          ])
          
          if (userDoc.exists()) {
            const profile = userDoc.data() as UserProfile
            
            // Check admins collection for admin or principal status
            if (!adminsSnapshot.empty) {
              const adminDoc = adminsSnapshot.docs[0].data()
              profile.role = adminDoc.role || "admin" // Support both admin and principal roles
            }
            
            setUserProfile(profile)
            setIsAdmin(profile.role === "admin")
            setIsTeacher(profile.role === "teacher")
            setIsStudent(profile.role === "student")
            setIsPrincipal(profile.role === "principal")
          }
        } catch (error) {
          console.error("[v0] Error fetching user profile:", error)
        }
      } else {
        setUserProfile(null)
        setIsAdmin(false)
        setIsTeacher(false)
        setIsStudent(false)
        setIsPrincipal(false)
      }
      
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  return (
    <AuthContext.Provider value={{ user, userProfile, loading, isAdmin, isTeacher, isStudent, isPrincipal }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
