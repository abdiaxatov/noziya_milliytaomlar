"use client"

import * as React from "react"
import { useLanguage } from "@/hooks/use-language"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Globe } from "lucide-react"
import { cn } from "@/lib/utils"

interface LanguageSwitcherProps {
    variant?: "ghost" | "outline" | "default"
    size?: "sm" | "icon" | "default"
    className?: string
    showLabel?: boolean
    isMobile?: boolean
}

const languages = [
    { code: "uz", label: "O'zbekcha", flag: "🇺🇿" },
    { code: "ru", label: "Русский", flag: "🇷🇺" },
    { code: "en", label: "English", flag: "🇺🇸" },
] as const

export function LanguageSwitcher({
    variant = "ghost",
    size = "sm",
    className,
    showLabel = false,
    isMobile = false,
}: LanguageSwitcherProps) {
    const { language, setLanguage } = useLanguage()

    const currentLang = languages.find((l) => l.code === language) || languages[0]

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant={variant}
                    size={size}
                    className={cn(
                        "flex items-center gap-2 px-3 transition-all duration-300",
                        isMobile ? "flex-col justify-center gap-1 p-2 h-auto text-muted-foreground hover:text-primary rounded-xl px-2" : "",
                        className
                    )}
                >
                    <Globe className={cn("text-primary transition-transform duration-200", isMobile ? "h-6 w-6" : "h-4 w-4")} />
                    <span className={cn("font-bold uppercase", isMobile ? "text-[10px]" : "text-xs")}>{language}</span>
                    {showLabel && !isMobile && (
                        <span className="text-sm font-medium">{currentLang.label}</span>
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[150px] p-1 shadow-xl border-primary/20 bg-background/95 backdrop-blur-sm">
                {languages.map((lang) => (
                    <DropdownMenuItem
                        key={lang.code}
                        className={cn(
                            "flex items-center justify-between gap-2 px-3 py-2 cursor-pointer transition-colors rounded-lg focus:bg-primary/10",
                            language === lang.code ? "bg-primary/5 text-primary font-bold" : ""
                        )}
                        onClick={() => setLanguage(lang.code)}
                    >
                        <div className="flex items-center gap-2">
                            <span className="text-lg">{lang.flag}</span>
                            <span className="text-xs font-medium">{lang.label}</span>
                        </div>
                        {language === lang.code && (
                            <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                        )}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
