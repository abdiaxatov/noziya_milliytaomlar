"use client";

import React, { useState, useEffect } from "react";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/hooks/use-language";

interface DiscountTimerProps {
    endsAt: string; // ISO Date string
    className?: string;
}

export function DiscountTimer({ endsAt, className }: DiscountTimerProps) {
    const [timeLeft, setTimeLeft] = useState<string>("");
    const [isExpired, setIsExpired] = useState(false);
    const { t, language } = useLanguage();

    useEffect(() => {
        const calculateTimeLeft = () => {
            const difference = +new Date(endsAt) - +new Date();

            if (difference > 0) {
                const days = Math.floor(difference / (1000 * 60 * 60 * 24));
                const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
                const minutes = Math.floor((difference / 1000 / 60) % 60);
                const seconds = Math.floor((difference / 1000) % 60);

                const pad = (n: number) => n.toString().padStart(2, "0");

                // Format: "2k 12:30:05" or "12:30:05"
                return days > 0
                    ? `${days}${language === "uz" ? "k" : language === "ru" ? "д" : "d"} ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
                    : `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
            } else {
                setIsExpired(true);
                return t("menu.outOfStock");
            }
        };

        setTimeLeft(calculateTimeLeft());

        const timer = setInterval(() => {
            setTimeLeft(calculateTimeLeft());
        }, 1000);

        return () => clearInterval(timer);
    }, [endsAt]);

    if (isExpired) return null;

    return (
        <div className={cn("flex items-center gap-1.5 text-xs font-semibold text-red-600 bg-red-50 px-2 py-1 rounded-md border border-red-100", className)}>
            <Clock className="w-3.5 h-3.5 animate-pulse" />
            <span className="tabular-nums tracking-wide">{timeLeft}</span>
        </div>
    );
}
