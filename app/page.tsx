"use client"

import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Camera, Users, Sparkles, QrCode, MessageSquare } from "lucide-react"
import { useEffect, useState } from "react"

export default function LandingPage() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // Force light theme on landing page
    const html = document.documentElement
    html.classList.remove("dark")
    html.style.colorScheme = "light"
    setMounted(true)
    return () => {
      html.style.colorScheme = ""
    }
  }, [])

  if (!mounted) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white text-foreground light">
      {/* Navigation */}
      <nav className="container mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Image
            src="/icon-light.png"
            alt="Recollect icon"
            width={36}
            height={36}
            className="w-9 h-9"
          />
          <Image
            src="/logo-light.png"
            alt="Recollect"
            width={120}
            height={32}
            className="h-7 w-auto"
          />
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login">
            <Button variant="outline" className="font-medium text-secondary border-primary hover:bg-primary/5">Log in</Button>
          </Link>
          <Link href="/signup">
            <Button className="font-medium px-6">Sign up</Button>
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="container mx-auto px-6 py-24 md:py-36 text-center">
        <h1 className="text-5xl md:text-7xl font-bold text-primary mb-6 text-balance leading-tight">
          Capture Every Moment,<br />Celebrate Every Memory
        </h1>
        <p className="text-5xl text-xl font-normal text-secondary mb-6 text-balance leading-tight">
          Your digital yearbook where school memories come alive through<br />polaroid-style photos, heartfelt messages, and QR memory books.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/signup">
            <Button size="lg" className="text-base px-10 py-6 rounded-full font-semibold">
              Start Creating Memories
            </Button>
          </Link>
          <Link href="/login">
            <Button size="lg" variant="outline" className="text-base px-10 py-6 rounded-full font-semibold bg-transparent">
              Log in
            </Button>
          </Link>
        </div>
      </div>

      {/* Polaroid Preview */}
      <div className="container mx-auto px-6 pb-24">
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { src: "/students-at-school-sporting-event.jpg", caption: "Game day spirit!" },
            { src: "/friends-laughing-together-at-school.jpg", caption: "Best friends forever" },
            { src: "/graduation-celebration.png", caption: "We made it!" },
          ].map((item, i) => (
            <div
              key={i}
              className={`bg-card border p-4 rounded-lg shadow-lg transition-transform hover:scale-105 ${
                i === 0 ? "rotate-[-2deg]" : i === 1 ? "rotate-[2deg]" : "rotate-[-1deg]"
              }`}
            >
              <div className="aspect-square bg-muted rounded-md mb-3 overflow-hidden">
                <img src={item.src} alt="School memory" className="w-full h-full object-cover" />
              </div>
              <p className="text-sm text-center font-handwriting text-foreground">{item.caption}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Features */}
      <div className="bg-muted py-24">
        <div className="container mx-auto px-6">
          <h2 className="text-4xl md:text-5xl font-bold text-center text-foreground mb-16 text-balance">
            Everything You Need to Preserve School Memories
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {[
              { icon: <Camera className="w-6 h-6 text-primary-foreground" />, title: "Polaroid Gallery", desc: "Upload and share memories in beautiful polaroid-style frames with captions." },
              { icon: <QrCode className="w-6 h-6 text-primary-foreground" />, title: "QR Memory Books", desc: "Generate a personal QR code that friends can scan to leave you messages and memories." },
              { icon: <MessageSquare className="w-6 h-6 text-primary-foreground" />, title: "Rich Messages", desc: "Friends can leave text, images, voice notes, and videos in your personal memory book." },
              { icon: <Users className="w-6 h-6 text-primary-foreground" />, title: "Class Community", desc: "Connect with classmates and build a collaborative yearbook for your school year." },
            ].map((f, i) => (
              <div key={i} className="bg-card border p-6 rounded-xl shadow-sm">
                <div className="w-11 h-11 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  {f.icon}
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="bg-primary py-24">
        <div className="container mx-auto px-6 text-center">
          <Sparkles className="w-12 h-12 mx-auto mb-6 text-primary-foreground" />
          <h2 className="text-4xl md:text-5xl font-bold mb-6 text-primary-foreground text-balance">
            Ready to Start Your Memory Journey?
          </h2>
          <p className="text-lg mb-10 max-w-xl mx-auto text-primary-foreground/80 leading-relaxed">
            Join students already capturing their school memories with Recollect.
          </p>
          <Link href="/signup">
            <Button size="lg" variant="secondary" className="text-base px-10 py-6 rounded-full font-semibold">
              Get Started Free
            </Button>
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-muted border-t py-10">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
              <Image
                src="/icon-light.png"
                alt="Recollect"
                width={28}
                height={28}
                className="w-7 h-7"
              />
              <Image
                src="/logo-light.png"
                alt="Recollect"
                width={90}
                height={24}
                className="h-5 w-auto"
              />
            </div>
            <div className="flex gap-6 text-sm text-muted-foreground">
              <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
              <Link href="/terms" className="hover:text-foreground transition-colors">Terms</Link>
              <Link href="/contact" className="hover:text-foreground transition-colors">Contact</Link>
            </div>
            <p className="text-sm text-muted-foreground">© 2026 Recollect. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
