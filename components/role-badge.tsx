"use client"

import { useTheme } from "next-themes"
import Image from "next/image"
import { useEffect, useState } from "react"

interface RoleBadgeProps {
  role: "student" | "teacher" | "admin" | "principal"
  size?: number
}

export function RoleBadge({ role, size = 20 }: RoleBadgeProps) {
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (role === "student" || !mounted) {
    return null
  }

  const badgeSrc =
    role === "admin"
      ? resolvedTheme === "dark"
        ? "/badges/admin-dark.png"
        : "/badges/admin-light.png"
      : role === "teacher"
        ? resolvedTheme === "dark"
          ? "/badges/teacher-dark.png"
          : "/badges/teacher-light.png"
        : resolvedTheme === "dark"
          ? "/badges/principal-dark.png"
          : "/badges/principal-light.png"

  return (
    <Image
      src={badgeSrc || "/placeholder.svg"}
      alt={`${role} badge`}
      width={size}
      height={size}
      className="inline-block"
      title={role.charAt(0).toUpperCase() + role.slice(1)}
    />
  )
}
