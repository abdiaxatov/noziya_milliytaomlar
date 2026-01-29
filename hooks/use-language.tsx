"use client"

import React, { createContext, useContext, useState, useEffect, useCallback } from "react"
import uz from "../locales/uz.json"
import ru from "../locales/ru.json"
import en from "../locales/en.json"

type Language = "uz" | "ru" | "en"
type Translations = typeof uz

const translations: Record<Language, any> = { uz, ru, en }

interface LanguageContextType {
    language: Language
    setLanguage: (lang: Language) => void
    t: (key: string) => string
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function LanguageProvider({ children }: { children: React.ReactNode }) {
    const [language, setLanguageState] = useState<Language>("uz")

    useEffect(() => {
        const savedLang = localStorage.getItem("language") as Language
        if (savedLang && ["uz", "ru", "en"].includes(savedLang)) {
            setLanguageState(savedLang)
        }
    }, [])

    const setLanguage = useCallback((lang: Language) => {
        setLanguageState(lang)
        localStorage.setItem("language", lang)
    }, [])

    const t = useCallback(
        (key: string) => {
            const keys = key.split(".")
            let value: any = translations[language]

            for (const k of keys) {
                if (value && value[k]) {
                    value = value[k]
                } else {
                    return key // Return key if translation not found
                }
            }

            return value as string
        },
        [language]
    )

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    )
}

export function useLanguage() {
    const context = useContext(LanguageContext)
    if (context === undefined) {
        throw new Error("useLanguage must be used within a LanguageProvider")
    }
    return context
}
