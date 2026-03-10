"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { collection, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Loader2, Search, User, Camera, X } from "lucide-react"

interface UserResult {
  uid: string
  fullName: string
  handle?: string
  photoURL?: string
  bio?: string
  role: string
}

interface MemoryResult {
  id: string
  imageUrl: string
  caption: string
  userId: string
  userName: string
  createdAt: string
}

export default function SearchPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const query = searchParams.get("q") || ""

  const [searchQuery, setSearchQuery] = useState(query)
  const [users, setUsers] = useState<UserResult[]>([])
  const [memories, setMemories] = useState<MemoryResult[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedMemory, setSelectedMemory] = useState<MemoryResult | null>(null)

  useEffect(() => {
    if (query) {
      performSearch(query)
    } else {
      setLoading(false)
    }
  }, [query])

  const performSearch = async (searchTerm: string) => {
    setLoading(true)
    try {
      const lowerQuery = searchTerm.toLowerCase()

      // Search users
      const usersSnapshot = await getDocs(collection(db, "users"))
      const usersData = usersSnapshot.docs
        .map((doc) => ({
          uid: doc.id,
          ...doc.data(),
        }))
        .filter((user: any) => {
          const matchesName = user.fullName?.toLowerCase().includes(lowerQuery)
          const matchesHandle = user.handle?.toLowerCase().includes(lowerQuery)
          const matchesBio = user.bio?.toLowerCase().includes(lowerQuery)
          return matchesName || matchesHandle || matchesBio
        }) as UserResult[]
      setUsers(usersData)

      // Search memories
      const memoriesSnapshot = await getDocs(collection(db, "memories"))
      const memoriesData = memoriesSnapshot.docs
        .map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        .filter((memory: any) => {
          const matchesCaption = memory.caption?.toLowerCase().includes(lowerQuery)
          const matchesUserName = memory.userName?.toLowerCase().includes(lowerQuery)
          return matchesCaption || matchesUserName
        }) as MemoryResult[]
      setMemories(memoriesData)
    } catch (error) {
      console.error("[v0] Search error:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`)
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
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  return (
    <div className="min-h-screen bg-background lg:ml-64 pt-20 lg:pt-0">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-4">Search</h1>

          {/* Search Bar */}
          <form onSubmit={handleSearch}>
            <div className="relative max-w-2xl">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search for users and memories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 h-12 text-lg"
                autoFocus
              />
            </div>
          </form>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : !query ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Search className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground">Enter a search term to find users and memories</p>
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue="users" className="w-full">
            <TabsList>
              <TabsTrigger value="users" className="gap-2">
                <User className="w-4 h-4" />
                Users
                <Badge variant="secondary">{users.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="memories" className="gap-2">
                <Camera className="w-4 h-4" />
                Memories
                <Badge variant="secondary">{memories.length}</Badge>
              </TabsTrigger>
            </TabsList>

            {/* Users Tab */}
            <TabsContent value="users" className="mt-6">
              {users.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <User className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                    <p className="text-muted-foreground">No users found matching "{query}"</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {users.map((user) => (
                    <Card
                      key={user.uid}
                      className="cursor-pointer hover:border-primary transition-colors"
                      onClick={() => router.push(`/profile/${user.uid}`)}
                    >
                      <CardHeader>
                        <div className="flex items-start gap-4">
                          <Avatar className="w-16 h-16">
                            <AvatarImage src={user.photoURL || "/placeholder.svg"} alt={user.fullName} />
                            <AvatarFallback>{getInitials(user.fullName)}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-lg truncate">{user.fullName}</CardTitle>
                            {user.handle && <p className="text-sm text-primary">@{user.handle}</p>}
                            <Badge variant="outline" className="mt-2 capitalize">
                              {user.role}
                            </Badge>
                          </div>
                        </div>
                      </CardHeader>
                      {user.bio && (
                        <CardContent>
                          <p className="text-sm text-muted-foreground line-clamp-2">{user.bio}</p>
                        </CardContent>
                      )}
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Memories Tab */}
            <TabsContent value="memories" className="mt-6">
              {memories.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Camera className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                    <p className="text-muted-foreground">No memories found matching "{query}"</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {memories.map((memory) => (
                    <div key={memory.id} className="cursor-pointer group" onClick={() => setSelectedMemory(memory)}>
                      <div className="bg-white p-3 shadow-lg transform rotate-1 hover:rotate-0 hover:scale-105 transition-all">
                        <img
                          src={memory.imageUrl || "/placeholder.svg"}
                          alt={memory.caption}
                          className="w-full aspect-square object-cover"
                        />
                        <p className="mt-2 text-sm font-handwriting text-center text-foreground line-clamp-2">
                          {memory.caption}
                        </p>
                        <p className="text-xs text-muted-foreground text-center mt-1">by {memory.userName}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>

      {/* Fullscreen Memory Dialog */}
      <Dialog open={!!selectedMemory} onOpenChange={(open) => !open && setSelectedMemory(null)}>
        <DialogContent className="max-w-4xl p-0">
          {selectedMemory && (
            <div className="relative">
              <button
                onClick={() => setSelectedMemory(null)}
                className="absolute top-4 right-4 z-10 bg-background/80 backdrop-blur-sm p-2 rounded-full hover:bg-background"
              >
                <X className="w-5 h-5" />
              </button>
              <img
                src={selectedMemory.imageUrl || "/placeholder.svg"}
                alt={selectedMemory.caption}
                className="w-full max-h-[80vh] object-contain"
              />
              <div className="p-6 bg-card">
                <p className="text-lg font-medium mb-2">{selectedMemory.caption}</p>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      router.push(`/profile/${selectedMemory.userId}`)
                      setSelectedMemory(null)
                    }}
                    className="hover:text-primary transition-colors"
                  >
                    {selectedMemory.userName}
                  </button>
                  <span>•</span>
                  <span>{formatDate(selectedMemory.createdAt)}</span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
