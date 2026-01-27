import type { ReactNode } from "react"
import { AdminLayoutClient } from "@/components/admin/admin-layout-client"
import { AdminAuthProvider } from "@/components/admin/admin-auth-provider"

export const metadata = {
  title: "Noziya Milliy Taomlar - Admin",
  description: "Zamonaviy restoran ovqat buyurtma tizimi",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icon-192.png" },
    ],
    shortcut: ["/icon-192.png"],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Noziya Milliy Taomlar",
  },
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <AdminAuthProvider>
      <AdminLayoutClient>{children}</AdminLayoutClient>
    </AdminAuthProvider>
  )
}
