"use client"

import * as React from "react"
import { useState, useEffect, useCallback } from "react"
import useEmblaCarousel from "embla-carousel-react"
import Autoplay from "embla-carousel-autoplay"
import { Banner } from "@/types"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

interface BannerCarouselProps {
    banners: Banner[]
    onBannerClick?: (categoryId: string) => void
}

export function BannerCarousel({ banners, onBannerClick }: BannerCarouselProps) {
    const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true }, [
        Autoplay({ delay: 5000, stopOnInteraction: false }),
    ])
    const [selectedIndex, setSelectedIndex] = useState(0)

    const onSelect = useCallback(() => {
        if (!emblaApi) return
        setSelectedIndex(emblaApi.selectedScrollSnap())
    }, [emblaApi])

    useEffect(() => {
        if (!emblaApi) return
        onSelect()
        emblaApi.on("select", onSelect)
        return () => {
            emblaApi.off("select", onSelect)
        }
    }, [emblaApi, onSelect])

    if (!banners.length) return null

    return (
        <div className="relative w-full overflow-hidden rounded-xl md:rounded-2xl shadow-lg my-4 group">
            <div className="overflow-hidden" ref={emblaRef}>
                <div className="flex">
                    {banners.map((banner) => (
                        <div
                            key={banner.id}
                            className="relative flex-[0_0_100%] min-w-0"
                            onClick={() => banner.categoryId && onBannerClick?.(banner.categoryId)}
                        >
                            <div className="relative w-full h-[160px] md:h-[240px] cursor-pointer">
                                <Image
                                    src={banner.imageUrl}
                                    alt={banner.name}
                                    fill
                                    className="object-cover transition-transform duration-700 hover:scale-105"
                                    priority
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                                <div className="absolute bottom-4 left-4 right-4 text-white">
                                    <h3 className="text-xl md:text-3xl font-bold mb-1 drop-shadow-md line-clamp-1">
                                        {banner.name}
                                    </h3>
                                    {banner.categoryId && (
                                        <div className="flex items-center gap-1 text-xs md:text-sm font-medium opacity-90">
                                            <span>Kategoriyaga o'tish</span>
                                            <ChevronRight className="w-3 h-3 md:w-4 md:h-4" />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {banners.length > 1 && (
                <div className="absolute bottom-2 right-4 flex gap-1.5 z-10">
                    {banners.map((_, index) => (
                        <div
                            key={index}
                            className={cn(
                                "h-1.5 rounded-full transition-all duration-300 shadow-sm",
                                index === selectedIndex ? "w-4 bg-white" : "w-1.5 bg-white/50"
                            )}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}
