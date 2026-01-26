"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { AdminSidebar } from "./admin-sidebar"
import { useAuth } from "./admin-auth-provider"
import { WaiterPage } from "./waiter-page"
import { usePathname } from "next/navigation"
import { SidebarProvider, useSidebar } from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"

export function AdminLayoutClient({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AdminLayoutInner>{children}</AdminLayoutInner>
    </SidebarProvider>
  )
}

function AdminLayoutInner({ children }: { children: React.ReactNode }) {
  const { userRole } = useAuth()
  const { open } = useSidebar()
  const [isMounted, setIsMounted] = useState(false)
  const pathname = usePathname()

  // Check if current page is login page
  const isLoginPage = pathname === "/admin/login"

  useEffect(() => {
    setIsMounted(true)
  }, [])

  if (!isMounted) {
    return null
  }

  // If it's the login page, render only the children without sidebar
  if (isLoginPage) {
    return <>{children}</>
  }

  // If user is a waiter, show only the waiter page without sidebar
  if (userRole === "waiter") {
    return <WaiterPage />
  }

  return (
    <div className="flex min-h-screen w-full bg-gray-50/50">
      <AdminSidebar />
      {/* Main content area - responsive margin based on sidebar state */}
      <main
        className={cn(
          "flex-1 w-full min-w-0 transition-[margin] duration-300 ease-in-out",
          "pb-20 md:pb-0", // Mobile bottom padding
          // Desktop margins matching sidebar width
          open ? "md:ml-[220px] lg:ml-[260px]" : "md:ml-[64px] lg:ml-[70px]"
        )}
      >
        <div className="h-full w-full p-2 md:p-6">
          {children}
        </div>
      </main>
    </div>
  )
}
