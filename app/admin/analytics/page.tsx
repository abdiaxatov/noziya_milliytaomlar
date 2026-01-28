"use client"

import { useEffect, useState, useMemo } from "react"

import { rtdb } from "@/lib/firebase"
import { ref, onValue, get, child } from "firebase/database"
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription
} from "@/components/ui/card"
import {
    Activity,
    Users,
    Smartphone,
    Monitor,
    Clock,
    Globe,
    MousePointerClick,
    ArrowUpRight,
    ArrowDownRight,
    Map as MapIcon,
    BarChart3,
    LineChart as LineChartIcon,
    PieChart as PieChartIcon,
    Laptop,
    Chrome
} from "lucide-react"
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    Legend,
    BarChart,
    Bar,
    LineChart,
    Line
} from "recharts"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
// Use try-catch or conditional import if possible, but for Next.js explicit import is better.
// Assuming WorldMap is created in previous step.
import WorldMap from "@/components/admin/analytics/world-map"

// --- TYPES ---
type SessionData = {
    id: string
    device: string
    os: string
    browser: string
    screen: string
    language: string
    country?: string
    status: string
    startTime: number
    lastActive: number
    path: string
    referrer: string
    pages?: Record<string, { title: string, path: string, timestamp: number }>
}

type OnlineUser = {
    id: string
    device: string
    os: string
    browser: string
    country?: string
    path: string
    startTime: number
}

// --- CONSTANTS ---
// Professional Colors based on Primary (Blue/Indigo usually)
const COLORS = ['bg-primary', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']
const PRIMARY_GRADIENT = ["bg-primary", "#eff6ff"] // Indigo/Blue based

export default function AnalyticsPage() {
    // --- STATE ---
    const [dateRange, setDateRange] = useState<"today" | "week" | "month" | "year">("today")
    const [chartType, setChartType] = useState<"area" | "bar" | "line">("area")
    const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([])
    const [sessions, setSessions] = useState<SessionData[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    // --- DATA FETCHING ---
    useEffect(() => {
        setLoading(true)
        setError(null)

        // 1. Online Users (Real-time)
        const onlineRef = ref(rtdb, "analytics/online")
        const unsubOnline = onValue(onlineRef,
            (snap) => {
                if (snap.exists()) {
                    setOnlineUsers(Object.values(snap.val()))
                } else {
                    setOnlineUsers([])
                }
            },

            (err) => {
                console.error("Online Error:", err)
                setError(err.message)
                setLoading(false)
            }
        )

        // Safety timeout in case Firebase hangs
        const timeoutId = setTimeout(() => {
            setLoading((prev) => {
                if (prev) {
                    console.warn("Analytics data fetch timed out")
                    return false
                }
                return prev
            })
        }, 5000)

        // 2. Session History (Multi-day support)
        const fetchSessions = async () => {
            try {
                const dates: string[] = []
                const today = new Date()

                let daysToFetch = 1
                if (dateRange === 'week') daysToFetch = 7
                if (dateRange === 'month') daysToFetch = 30
                if (dateRange === 'year') daysToFetch = 365

                for (let i = 0; i < daysToFetch; i++) {
                    const d = new Date()
                    d.setDate(today.getDate() - i)
                    dates.push(d.toISOString().split('T')[0])
                }

                // We listen to "Today" in real-time
                // We fetch past days once to avoid too many listeners

                const todayStr = dates[0]
                const pastDates = dates.slice(1)
                let allSessions: SessionData[] = []

                // Fetch past
                if (pastDates.length > 0) {
                    // This is a bit heavy, in production use an aggregated node
                    const promises = pastDates.map(date => {
                        return get(child(ref(rtdb), `analytics/sessions/${date}`))
                    })
                    const snapshots = await Promise.all(promises)
                    snapshots.forEach(snap => {
                        if (snap.exists()) {
                            // @ts-ignore
                            allSessions = [...allSessions, ...Object.values(snap.val())]
                        }
                    })
                }

                // Listen to Today
                const todayRef = ref(rtdb, `analytics/sessions/${todayStr}`)
                const unsubToday = onValue(todayRef, (snap) => {
                    let todaySessions: any[] = []
                    if (snap.exists()) {
                        todaySessions = Object.values(snap.val())
                    }

                    // Combine Past + Today
                    // We need to deduplicate if logic changes, but here dates are distinct keys
                    setSessions([...todaySessions, ...allSessions])
                    setLoading(false)
                }, (err) => {
                    console.error("Today Sessions Error:", err)
                    setError(err.message)
                    setLoading(false)
                })

                return () => unsubToday()
            } catch (e: any) {
                console.error("Fetch Error:", e)
                setError(e.message)
                setLoading(false)
                return () => { }
            }
        }

        const cleanupPromise = fetchSessions()

        return () => {
            unsubOnline()
            clearTimeout(timeoutId)
            cleanupPromise.then(cleanup => cleanup && cleanup())
        }
    }, [dateRange])

    // --- AGGREGATIONS ---
    const metrics = useMemo(() => {
        const totalVisits = sessions.length
        const totalPageviews = sessions.reduce((acc, s) => acc + (s.pages ? Object.keys(s.pages).length : 1), 0)

        // Avg Duration (FIXED NaN and Huge Numbers)
        // 1. Filter out sessions with missing or invalid start times (e.g. 0)
        // 2. Filter out active sessions that just started (might have crazy diffs if clocks drift, but usually ok)
        const validSessions = sessions.filter(s => s.startTime && s.startTime > 1600000000000) // Basic sanity check (ensure it's a recent timestamp)

        const totalDurationMs = validSessions.reduce((acc, s) => {
            const start = s.startTime
            const end = s.lastActive || start
            const duration = end - start
            // Ignore valid-looking but negative or excessively long durations (e.g. > 24 hours) as glitches
            if (duration < 0 || duration > 86400000) return acc
            return acc + duration
        }, 0)

        const avgDurationSec = validSessions.length > 0 ? Math.round((totalDurationMs / validSessions.length) / 1000) : 0
        const formatDuration = (sec: number) => {
            if (isNaN(sec)) return "0m 0s"
            const min = Math.floor(sec / 60)
            const s = sec % 60
            return `${min}m ${s}s`
        }

        // Device Stats
        const devices: Record<string, number> = {}
        validSessions.forEach(s => {
            const d = s.device || "Unknown"
            devices[d] = (devices[d] || 0) + 1
        })
        const deviceData = Object.entries(devices).map(([name, value]) => ({ name, value }))

        // Country Stats (For Map)
        const countries: Record<string, number> = {}
        validSessions.forEach(s => {
            const c = s.country || "Unknown"
            countries[c] = (countries[c] || 0) + 1
        })
        const countryData = Object.entries(countries)
            .sort(([, a], [, b]) => b - a)
            .map(([name, value]) => ({ name, value }))

        // OS Stats
        const osCounts: Record<string, number> = {}
        validSessions.forEach(s => {
            const os = s.os || "Boshqa"
            osCounts[os] = (osCounts[os] || 0) + 1
        })
        const osData = Object.entries(osCounts).map(([name, value]) => ({ name, value }))

        // Browser Stats
        const browserCounts: Record<string, number> = {}
        validSessions.forEach(s => {
            const b = s.browser || "Boshqa"
            browserCounts[b] = (browserCounts[b] || 0) + 1
        })
        const browserData = Object.entries(browserCounts).map(([name, value]) => ({ name, value }))

        // Chart Data Aggregation based on DateRange
        let chartData: { label: string, visits: number }[] = []

        if (dateRange === 'today') {
            const hours = new Array(24).fill(0)
            validSessions.forEach(s => {
                const d = new Date(s.startTime)
                hours[d.getHours()]++
            })
            chartData = hours.map((visits, h) => ({ label: `${h}:00`, visits }))
        } else if (dateRange === 'week') {
            const dayNames = ["Yak", "Du", "Se", "Chor", "Pay", "Ju", "Sha"]
            const last7Days: Record<string, number> = {}
            for (let i = 6; i >= 0; i--) {
                const d = new Date()
                d.setDate(d.getDate() - i)
                last7Days[d.toISOString().split('T')[0]] = 0
            }
            validSessions.forEach(s => {
                const dateKey = new Date(s.startTime).toISOString().split('T')[0]
                if (last7Days[dateKey] !== undefined) last7Days[dateKey]++
            })
            chartData = Object.entries(last7Days).map(([date, visits]) => {
                const d = new Date(date)
                return { label: dayNames[d.getDay()], visits }
            })
        } else if (dateRange === 'month') {
            const last30Days: Record<string, number> = {}
            for (let i = 29; i >= 0; i--) {
                const d = new Date()
                d.setDate(d.getDate() - i)
                last30Days[d.toISOString().split('T')[0]] = 0
            }
            validSessions.forEach(s => {
                const dateKey = new Date(s.startTime).toISOString().split('T')[0]
                if (last30Days[dateKey] !== undefined) last30Days[dateKey]++
            })
            chartData = Object.entries(last30Days).map(([date, visits]) => {
                const d = new Date(date)
                return { label: d.getDate().toString(), visits }
            })
        } else if (dateRange === 'year') {
            const monthNames = ["Yan", "Feb", "Mar", "Apr", "May", "Iyun", "Iyul", "Avg", "Sen", "Okt", "Noy", "Dek"]
            const yearData = new Array(12).fill(0)
            const currentYear = new Date().getFullYear()
            validSessions.forEach(s => {
                const d = new Date(s.startTime)
                if (d.getFullYear() === currentYear) {
                    yearData[d.getMonth()]++
                }
            })
            chartData = yearData.map((visits, m) => ({ label: monthNames[m], visits }))
        }

        // Top Pages
        const pageCounts: Record<string, number> = {}
        validSessions.forEach(s => {
            if (s.pages) {
                Object.values(s.pages).forEach(p => {
                    // Extra safety for page timestamps if we ever use them for Date
                    pageCounts[p.path] = (pageCounts[p.path] || 0) + 1
                })
            } else {
                pageCounts[s.path] = (pageCounts[s.path] || 0) + 1
            }
        })
        const topPages = Object.entries(pageCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([name, value]) => ({ name, value }))

        // Referrer Stats
        const referrerCounts: Record<string, number> = {}
        validSessions.forEach(s => {
            // Parse referrer to get domain or "Direct"
            let refStr = s.referrer || "Direct"
            if (refStr !== "Direct" && refStr.startsWith("http")) {
                try {
                    const url = new URL(refStr)
                    refStr = url.hostname
                } catch (e) { /* ignore */ }
            }
            referrerCounts[refStr] = (referrerCounts[refStr] || 0) + 1
        })
        const referrerData = Object.entries(referrerCounts).map(([name, value]) => ({ name, value }))

        // Device Model Stats (replacing OS for more detail or adding alongside)
        const modelCounts: Record<string, number> = {}
        validSessions.forEach(s => {
            // @ts-ignore - deviceModel might be missing in old data
            const model = s.deviceModel || s.os || "Unknown"
            modelCounts[model] = (modelCounts[model] || 0) + 1
        })
        const modelData = Object.entries(modelCounts).map(([name, value]) => ({ name, value }))

        return {
            totalVisits,
            totalPageviews,
            avgDuration: formatDuration(avgDurationSec),
            deviceData,
            osData,
            browserData,
            countryData,
            chartData, // Dynamically aggregated
            topPages,
            referrerData,
            modelData,
            bounceRate: "0%"
        }
    }, [sessions])

    // --- CHART RENDERER ---
    const renderMainChart = () => {
        // Use CSS variable for color (extracted via simple string or just use a helper if possible, 
        // strictly recharts wants hex usually, but we can stick to a safe default that matches the CSS or use a known hex derived from 217 80% 10% which is #05152e)
        const PrimaryColor = "#0f172a" // Approximation of the primary color from CSS (slate-900)

        const CommonProps = {
            data: metrics.chartData,
            margin: { top: 10, right: 10, left: 0, bottom: 0 }
        }

        if (chartType === 'bar') {
            return (
                <BarChart {...CommonProps}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#eee" />
                    <XAxis dataKey="label" axisLine={false} tickLine={false} stroke="#888" fontSize={11} />
                    <YAxis axisLine={false} tickLine={false} stroke="#888" fontSize={12} />
                    <Tooltip contentStyle={{ borderRadius: '12px' }} />
                    <Bar dataKey="visits" fill={PrimaryColor} radius={[4, 4, 0, 0]} />
                </BarChart>
            )
        }
        if (chartType === 'line') {
            return (
                <LineChart {...CommonProps}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#eee" />
                    <XAxis dataKey="label" axisLine={false} tickLine={false} stroke="#888" fontSize={11} />
                    <YAxis axisLine={false} tickLine={false} stroke="#888" fontSize={12} />
                    <Tooltip contentStyle={{ borderRadius: '12px' }} />
                    <Line type="monotone" dataKey="visits" stroke={PrimaryColor} strokeWidth={3} dot={{ r: 4 }} />
                </LineChart>
            )
        }
        return (
            <AreaChart {...CommonProps}>
                <defs>
                    <linearGradient id="colorTraffic" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={PrimaryColor} stopOpacity={0.8} />
                        <stop offset="95%" stopColor={PrimaryColor} stopOpacity={0} />
                    </linearGradient>
                </defs>
                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#eee" />
                <XAxis dataKey="label" axisLine={false} tickLine={false} stroke="#888" fontSize={11} />
                <YAxis axisLine={false} tickLine={false} stroke="#888" fontSize={12} />
                <Tooltip contentStyle={{ borderRadius: '12px' }} />
                <Area type="monotone" dataKey="visits" stroke={PrimaryColor} strokeWidth={3} fillOpacity={1} fill="url(#colorTraffic)" />
            </AreaChart>
        )
    }

    // --- UI RENDER ---
    if (error && error.includes("permission_denied")) {
        return (
            <div className="flex flex-col items-center justify-center h-[80vh] space-y-4 animate-in fade-in">
                <div className="p-4 bg-red-100 dark:bg-red-900/20 text-red-600 rounded-full">
                    <Users className="w-12 h-12" />
                </div>
                <h2 className="text-2xl font-bold">Ruxsat Berilmadi</h2>
                <p className="text-center max-w-md text-muted-foreground">
                    Firebase Database Rules sozlanmagan. Iltimos, Firebase Console ga kirib "Rules" bo'limiga ruxsatlarni qo'shing.
                </p>
                <Button onClick={() => window.location.reload()}>Qayta Yuklash</Button>
            </div>
        )
    }

    if (loading) {
        return (
            <div className="p-6 space-y-8 animate-in fade-in">
                <div className="space-y-2">
                    <div className="h-8 w-64 bg-muted/50 rounded animate-pulse" />
                    <div className="h-4 w-40 bg-muted/50 rounded animate-pulse" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    {[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-muted/50 rounded-xl animate-pulse" />)}
                </div>
                <div className="h-64 bg-muted/50 rounded-xl animate-pulse" />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-background/50 p-4 md:p-6 space-y-6 md:space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight bg-primary bg-clip-text text-transparent">
                        Analitika Dashboard
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Mukammal statistik tahlil
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 bg-card p-1 rounded-lg border shadow-sm self-start lg:self-auto">
                    {["today", "week", "month", "year"].map((r) => (
                        <Button
                            key={r}
                            variant={dateRange === r ? "default" : "ghost"}
                            onClick={() => setDateRange(r as any)}
                            className="capitalize rounded-md h-8 text-xs md:text-sm px-3"
                        >
                            {r === "today" ? "Bugun" : r === "week" ? "Hafta" : r === "month" ? "Oy" : "Yil"}
                        </Button>
                    ))}
                    <Button
                        variant="outline"
                        onClick={() => window.location.reload()}
                        className="h-8 w-8 p-0 ml-2"
                        title="Yangilash"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-rotate-cw"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" /><path d="M21 3v5h-5" /></svg>
                    </Button>
                </div>
            </div>

            {/* Metrics -- SCROLLABLE ON MOBILE */}
            <div className="flex overflow-x-auto pb-4 gap-4 md:grid md:grid-cols-2 lg:grid-cols-4 md:gap-6 snap-x snap-mandatory -mx-4 px-4 md:mx-0 md:px-0 scrollbar-hide">
                <div className="min-w-[280px] snap-center">
                    <MetricCard
                        title="Jami Tashriflar"
                        value={metrics.totalVisits}
                        icon={<Users className="w-4 h-4 text-blue-500" />}
                        desc="+12% kechagidan" trend="up"
                    />
                </div>
                <div className="min-w-[280px] snap-center">
                    <MetricCard
                        title="Ko'rilgan Sahifalar"
                        value={metrics.totalPageviews}
                        icon={<MousePointerClick className="w-4 h-4 text-purple-500" />}
                        desc="Sahifa/Tashrif: 3.2" trend="up"
                    />
                </div>
                <div className="min-w-[280px] snap-center">
                    <MetricCard
                        title="O'rtacha Vaqt"
                        value={metrics.avgDuration}
                        icon={<Clock className="w-4 h-4 text-green-500" />}
                        desc="Juda yaxshi natija" trend="up"
                    />
                </div>
                <div className="min-w-[280px] snap-center">
                    <Card className="border-none shadow-xl bg-primary text-white relative overflow-hidden group h-full">
                        {/* Decorative Elements */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl group-hover:bg-white/20 transition-all" />
                        <CardHeader className="flex flex-row items-center justify-between pb-2 z-10 relative">
                            <CardTitle className="text-sm font-medium text-white/80">Hozir Online</CardTitle>
                            <Activity className="h-4 w-4 animate-pulse text-white" />
                        </CardHeader>
                        <CardContent className="z-10 relative">
                            <div className="text-4xl font-bold">{onlineUsers.length}</div>
                            <p className="text-xs text-white/70 mt-1">Real vaqt rejimida</p>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Main Chart Section */}
            <div className="grid grid-cols-1 lg:grid-cols-7 gap-6">
                <Card className="col-span-1 lg:col-span-4 border-none shadow-lg bg-card/60 backdrop-blur-sm">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle>Tashriflar Dinamikasi</CardTitle>
                            <CardDescription>{dateRange === 'today' ? 'Soatlar kesimida' : dateRange === 'week' ? 'Kunlar kesimida' : dateRange === 'month' ? 'Sanalar kesimida' : 'Oylar kesimida'}</CardDescription>
                        </div>
                        <div className="flex bg-muted rounded-lg p-1 gap-1">
                            <Button size="icon" variant={chartType === 'area' ? 'secondary' : 'ghost'} className="h-6 w-6" onClick={() => setChartType('area')}><Activity className="w-4 h-4" /></Button>
                            <Button size="icon" variant={chartType === 'bar' ? 'secondary' : 'ghost'} className="h-6 w-6" onClick={() => setChartType('bar')}><BarChart3 className="w-4 h-4" /></Button>
                            <Button size="icon" variant={chartType === 'line' ? 'secondary' : 'ghost'} className="h-6 w-6" onClick={() => setChartType('line')}><LineChartIcon className="w-4 h-4" /></Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[350px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                {renderMainChart()}
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* World Map & Country List -- Enhanced Layout */}
                <Card className="col-span-1 lg:col-span-3 border-none shadow-lg bg-card/60 backdrop-blur-sm overflow-hidden flex flex-col">
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2"><Globe className="w-5 h-5 text-blue-500" /> Geografiya</CardTitle>
                        <CardDescription>Foydalanuvchilar qayerdan kirmoqda?</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0 flex-1 flex flex-col md:flex-row">
                        <div className="flex-1 min-h-[250px] md:min-h-[300px] bg-blue-50/30 dark:bg-blue-900/10 relative">
                            {/* Map Overlay info */}
                            <div className="absolute top-4 left-4 z-10 bg-background/80 backdrop-blur px-3 py-1 rounded-full border text-xs font-medium shadow-sm">
                                {metrics.countryData.length} Davlat
                            </div>
                            <WorldMap data={metrics.countryData} />
                        </div>
                        <div className="md:w-[250px] border-t md:border-t-0 md:border-l border-border/50 bg-background/40">
                            <div className="p-3 border-b border-border/50 bg-muted/20">
                                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Top Davlatlar</span>
                            </div>
                            <ScrollArea className="h-[250px] md:h-[300px]">
                                {metrics.countryData.length === 0 && <p className="text-center text-muted-foreground text-sm py-8">Ma'lumot yo'q</p>}
                                {metrics.countryData.map((c, i) => (
                                    <div key={i} className="flex items-center justify-between py-3 px-4 hover:bg-muted/50 transition-colors border-b border-border/30 last:border-0 relative group">
                                        <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-blue-500 scale-y-0 group-hover:scale-y-100 transition-transform origin-center" />
                                        <div className="flex items-center gap-3">
                                            <span className="text-sm font-medium">{c.name}</span>
                                        </div>
                                        <Badge variant="secondary" className="font-bold">{c.value}</Badge>
                                    </div>
                                ))}
                            </ScrollArea>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Tech Specs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <TechCard title="Qurilma Turi" icon={<Smartphone className="w-4 h-4 text-pink-500" />} data={metrics.modelData} />
                <TechCard title="Operatsion Tizim" icon={<Laptop className="w-4 h-4 text-blue-500" />} data={metrics.osData} />
                <TechCard title="Brauzer" icon={<Chrome className="w-4 h-4 text-orange-500" />} data={metrics.browserData} />
                <TechCard title="Manba (Referrer)" icon={<ArrowUpRight className="w-4 h-4 text-green-500" />} data={metrics.referrerData} />
            </div>

            {/* Live Feed */}
            <Card className="border-none shadow-lg bg-card/60 backdrop-blur-sm">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><MapIcon className="w-4 h-4 text-green-500" /> Jonli Efir</CardTitle>
                </CardHeader>
                <CardContent>
                    <ScrollArea className="h-[200px]">
                        {onlineUsers.length === 0 && <p className="text-muted-foreground text-center py-8">Hozircha hech kim yo'q</p>}
                        {onlineUsers.map((u, i) => (
                            <div key={i} className="flex items-center justify-between py-3 border-b last:border-0 hover:bg-muted/50 px-4 rounded transition-all animate-in slide-in-from-left-2">
                                <div className="flex items-center gap-3">
                                    <div className={`w-2.5 h-2.5 rounded-full ${u.device === 'Mobile' ? 'bg-pink-500' : 'bg-blue-500'} animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.5)]`} />
                                    <div className="flex flex-col">
                                        <span className="text-sm font-bold flex items-center gap-2">
                                            {u.country || "Unknown"} <span className="text-muted-foreground font-normal">• {u.os}</span>
                                        </span>
                                        <span className="text-xs text-muted-foreground">{u.path}</span>
                                    </div>
                                </div>
                                <Badge variant="outline" className="bg-background/50 backdrop-blur">{new Date(u.startTime).toLocaleTimeString()}</Badge>
                            </div>
                        ))}
                    </ScrollArea>
                </CardContent>
            </Card>
        </div>
    )
}

function MetricCard({ title, value, icon, desc, trend }: any) {
    return (
        <Card className="border-none shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-1 bg-card/80 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
                <div className="p-2 bg-muted rounded-full opacity-80">{icon}</div>
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{value}</div>
                <div className="flex items-center gap-1 mt-1">
                    {trend === "up" ? (
                        <ArrowUpRight className="w-3 h-3 text-green-500" />
                    ) : (
                        <ArrowDownRight className="w-3 h-3 text-red-500" />
                    )}
                    <p className={`text-xs ${trend === "up" ? "text-green-500" : "text-red-500"}`}>
                        {desc}
                    </p>
                </div>
            </CardContent>
        </Card>
    )
}

function TechCard({ title, icon, data }: any) {
    const total = data.reduce((acc: number, item: any) => acc + item.value, 0)

    return (
        <Card className="border-none shadow-lg bg-card/60 backdrop-blur-sm overflow-hidden group">
            <CardHeader className="flex flex-row items-center gap-2 pb-2 bg-muted/20">
                <div className="p-1.5 bg-background rounded-md shadow-sm">{icon}</div>
                <CardTitle className="text-sm font-bold tracking-tight">{title}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                <div className="p-4 space-y-4">
                    <div className="h-[120px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={data}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={35}
                                    outerRadius={55}
                                    paddingAngle={2}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {data.map((entry: any, index: number) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    trigger="hover"
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 8px 16px rgba(0,0,0,0.1)', fontSize: '12px' }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="space-y-2 px-4 pb-4">
                        {data.slice(0, 4).map((item: any, i: number) => (
                            <div key={i} className="flex flex-col gap-1">
                                <div className="flex justify-between text-xs font-medium">
                                    <span className="text-muted-foreground truncate max-w-[120px]">{item.name}</span>
                                    <span>{Math.round((item.value / total) * 100)}%</span>
                                </div>
                                <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                                    <div
                                        className="h-full transition-all duration-500"
                                        style={{
                                            width: `${(item.value / total) * 100}%`,
                                            backgroundColor: COLORS[i % COLORS.length]
                                        }}
                                    />
                                </div>
                            </div>
                        ))}
                        {data.length === 0 && <p className="text-center text-xs text-muted-foreground py-4">Ma'lumot yo'q</p>}
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
