"use client"

import { useEffect, useRef, Suspense } from "react"
import { rtdb } from "@/lib/firebase"
import { ref, onValue, push, onDisconnect, set, serverTimestamp, update } from "firebase/database"
import { usePathname, useSearchParams } from "next/navigation"
import { v4 as uuidv4 } from "uuid"

// Helper to get OS
const getOS = (userAgent: string) => {
    const ua = userAgent.toLowerCase()
    if (/android/i.test(ua)) return "Android"
    if (/ipad|iphone|ipod/.test(ua)) return "iOS"
    if (/windows phone/i.test(ua)) return "Windows Phone"
    if (/win/i.test(ua)) return "Windows"
    if (/mac/i.test(ua)) return "MacOS"
    if (/linux/i.test(ua)) return "Linux"
    if (/cros/i.test(ua)) return "Chrome OS"
    return "Unknown OS"
}

// Helper to get Browser
const getBrowser = (userAgent: string) => {
    const ua = userAgent.toLowerCase()
    if (/edg/.test(ua)) return "Edge"
    if (/opr\//.test(ua) || /opera/.test(ua)) return "Opera"
    if (/chrome|crios/.test(ua)) {
        if (/brave/.test(ua)) return "Brave"
        return "Chrome"
    }
    if (/firefox|fxios/.test(ua)) return "Firefox"
    if (/safari/.test(ua)) return "Safari"
    return "Unknown Browser"
}

// Helper to get Device Model (Approximation)
const getDeviceModel = (userAgent: string) => {
    const ua = userAgent.toLowerCase()
    if (/ipad/.test(ua)) return "iPad"
    if (/iphone/.test(ua)) return "iPhone"
    if (/android/.test(ua)) {
        // Try to extract model from UA string "Android ...; Model Build/..."
        const match = ua.match(/android.+;\s([a-z0-9\s\-_]+)\sbuild\//)
        if (match && match[1]) return match[1].toUpperCase()
        return "Android Device"
    }
    if (/mac/.test(ua)) return "Mac"
    if (/win/.test(ua)) return "Windows PC"
    return "Desktop/Laptop"
}

// Helper to guess Country by Timezone
const getCountryByTimezone = () => {
    try {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
        if (!tz) return "Unknown"

        // Simple mapping for common timezones
        if (tz.includes("Tashkent") || tz.includes("Samarkand") || tz.includes("Bukhara")) return "Uzbekistan"
        if (tz.includes("Moscow") || tz.includes("Vladivostok") || tz.includes("Yekaterinburg")) return "Russia"
        if (tz.includes("New_York") || tz.includes("Los_Angeles") || tz.includes("Chicago") || tz.includes("Denver")) return "USA"
        if (tz.includes("London")) return "UK"
        if (tz.includes("Seoul")) return "South Korea"
        if (tz.includes("Dubai")) return "UAE"
        if (tz.includes("Istanbul")) return "Turkey"
        if (tz.includes("Almaty") || tz.includes("Astana")) return "Kazakhstan"

        // Fallback: Return the region part of the timezone (e.g. "Asia" from "Asia/Tashkent")
        // Or if it splits by /, take the 2nd part which is often the city/country proxy
        const parts = tz.split("/")
        if (parts.length > 1) return parts[1].replace("_", " ") // "New_York" -> "New York"

        return tz
    } catch (e) {
        return "Unknown"
    }
}

export default function AnalyticsTracker() {
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const sessionIdRef = useRef<string | null>(null)

    useEffect(() => {
        if (typeof window === "undefined") return

        // 1. Initialize Session
        let sessionId = sessionStorage.getItem("analytics_session_id")
        const isNewSession = !sessionId

        if (!sessionId) {
            sessionId = uuidv4()
            sessionStorage.setItem("analytics_session_id", sessionId)
        }
        sessionIdRef.current = sessionId

        const userAgent = window.navigator.userAgent
        const deviceType = /mobile|android|iphone|ipad|ipod/i.test(userAgent) ? "Mobile" : "Desktop"
        const os = getOS(userAgent)
        const browser = getBrowser(userAgent)
        const country = getCountryByTimezone()
        const language = window.navigator.language
        const screenRes = `${window.screen.width}x${window.screen.height}`

        const deviceModel = getDeviceModel(userAgent)

        const today = new Date().toISOString().split('T')[0]
        const sessionRef = ref(rtdb, `analytics/sessions/${today}/${sessionId}`)

        // 2. Set Session Data
        if (isNewSession) {
            set(sessionRef, {
                id: sessionId,
                startTime: serverTimestamp(),
                lastActive: serverTimestamp(),
                device: deviceType,
                deviceModel, // Added
                os,
                browser,
                country,
                screen: screenRes,
                language,
                path: pathname,
                referrer: document.referrer || "Direct",
                status: "active"
            })
        } else {
            // Just update activity
            update(sessionRef, {
                lastActive: serverTimestamp(),
                status: "active",
                country: country, // Force update country for existing sessions to fix "Unknown"
                deviceModel, // Ensure model is updated too
                path: pathname
            })
        }

        // 3. Online Presence with Heartbeat
        const onlineRef = ref(rtdb, `analytics/online/${sessionId}`)
        const connectedRef = ref(rtdb, ".info/connected")

        const unsubConnected = onValue(connectedRef, (snap) => {
            if (snap.val() === true) {
                onDisconnect(onlineRef).remove()
                onDisconnect(sessionRef).update({
                    status: "ended",
                    lastActive: serverTimestamp()
                })

                set(onlineRef, {
                    id: sessionId,
                    device: deviceType,
                    deviceModel, // Added
                    os,
                    browser,
                    country,
                    path: pathname,
                    startTime: serverTimestamp()
                })
            }
        })

        // 4. Track Page Views
        // Note: We use a path-safe key
        const pageViewRef = ref(rtdb, `analytics/sessions/${today}/${sessionId}/pages`)
        push(pageViewRef, {
            path: pathname,
            timestamp: serverTimestamp(),
            title: document.title
        })

        // Update current path in online status
        update(onlineRef, {
            path: pathname
        })

        return () => {
            unsubConnected()
        }
    }, [pathname, searchParams])

    return null
}
