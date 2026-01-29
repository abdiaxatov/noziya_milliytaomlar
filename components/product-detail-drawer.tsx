"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import Image from "next/image";
import { Loader2, Minus, Plus, RotateCcw, Edit, Trash2 } from "lucide-react";
import { PriceDisplay } from "@/components/price-display";
import { DiscountTimer } from "@/components/discount-timer";
import { useLanguage } from "@/hooks/use-language";
import { getLocalizedName, getLocalizedDescription } from "@/lib/localization";
import {
    Drawer,
    DrawerContent,
    DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { optimizeImage } from "@/lib/image-optimizer";
import type { MenuItem } from "@/types";

// ...

interface ProductDetailDrawerProps {
    item: MenuItem | null;
    isOpen: boolean;
    onClose: () => void;
    onNext: () => void;
    onPrev: () => void;
    isAdmin?: boolean;
    onEdit?: () => void;
    onDelete?: () => void;
}

export function ProductDetailDrawer({
    item,
    isOpen,
    onClose,
    onNext,
    onPrev,
    isAdmin = false,
    onEdit,
    onDelete,
}: ProductDetailDrawerProps) {
    const { t, language } = useLanguage();
    // ... setup ...

    // ... render ...


    const [zoomLevel, setZoomLevel] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [modalImageLoading, setModalImageLoading] = useState(true);

    // Gestures for Pan/Zoom/Swipe
    const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
    const prevDistRef = useRef<number | null>(null);
    const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 }); // Refs are better for mutable gesture tracking without re-renders for every pixel
    const isDraggingRef = useRef(false);

    // We still use state for 'pan' and 'zoomLevel' for rendering, but refs for calculation

    // Reset state when item changes
    useEffect(() => {
        if (isOpen) {
            setZoomLevel(1);
            setPan({ x: 0, y: 0 });
            setModalImageLoading(true);
        }
    }, [item?.id, isOpen]);

    const handleModalImageLoad = useCallback(() => {
        setModalImageLoading(false);
    }, []);

    const handlePointerDown = (e: React.PointerEvent) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

        // Track Drag Start
        if (pointersRef.current.size === 1) {
            isDraggingRef.current = true;
            // For Pan: relative to current pan.
            // For Swipe: absolute start position.
            // We can store both behaviors or derive them.
            // Let's store the "Client" start position for Swipe calculation, 
            // and the "Pan" offset for Panning.
            dragStartRef.current = { x: e.clientX, y: e.clientY };
            setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y }); // This state is used for Pan calculation
            setIsDragging(true);
        }

        if (pointersRef.current.size === 2) {
            const points = Array.from(pointersRef.current.values());
            const dist = Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
            prevDistRef.current = dist;
        }
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (pointersRef.current.has(e.pointerId)) {
            pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
        }

        // 1. Handle Pinch Zoom (priority)
        if (pointersRef.current.size === 2 && prevDistRef.current !== null) {
            const points = Array.from(pointersRef.current.values());
            const dist = Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);

            if (dist > 0) {
                const factor = dist / prevDistRef.current;
                setZoomLevel(prev => Math.min(Math.max(0.5, prev * factor), 4));
                prevDistRef.current = dist;
            }
            return;
        }

        // 2. Handle 1-finger Move
        if (isDraggingRef.current && pointersRef.current.size === 1) {
            // Logic split:
            if (zoomLevel === 1) {
                // SWIPE MODE: Do NOT Pan. Do NOT move image visually (unless we implement rubber band).
                // user request: "rasimni orsam otib ketyapdi" -> implied they assume image shouldn't move if it switches?
                // or they want "ideal". Ideal is: slight movement giving feedback.
                // Let's implement slight resistance to show "swiping".
                // But strict separating is safer: "qotib tursin".
                // So no Pan update.
            } else {
                // PAN MODE
                setPan({
                    x: e.clientX - dragStart.x,
                    y: e.clientY - dragStart.y,
                });
            }
        }
    };

    const handlePointerUp = (e: React.PointerEvent) => {
        pointersRef.current.delete(e.pointerId);
        e.currentTarget.releasePointerCapture(e.pointerId);

        // Check Swipe on release of the PRIMARY finger (if it was the only one)
        if (isDraggingRef.current && pointersRef.current.size === 0) {
            if (zoomLevel === 1) {
                // Calculate total distance moved
                const totalDx = e.clientX - dragStartRef.current.x;
                const totalDy = e.clientY - dragStartRef.current.y;

                // Check if horizontal swipe and not much vertical (to filter scrolling intent?)
                if (Math.abs(totalDx) > 50 && Math.abs(totalDy) < 100) {
                    if (totalDx > 0) {
                        onPrev();
                    } else {
                        onNext();
                    }
                }
            }
        }

        if (pointersRef.current.size < 2) {
            prevDistRef.current = null;
        }
        if (pointersRef.current.size === 0) {
            isDraggingRef.current = false;
            setIsDragging(false);
        }
        if (pointersRef.current.size === 1) {
            // Reset drag start for the remaining finger to prevent jump
            const remaining = pointersRef.current.values().next().value;
            setDragStart({ x: remaining.x - pan.x, y: remaining.y - pan.y });
            dragStartRef.current = { x: remaining.x, y: remaining.y };
        }
    };

    if (!item) return null;

    return (
        <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DrawerContent className="max-h-[96vh] h-full rounded-t-[30px] bg-primary/10 backdrop-blur-md border-0 flex flex-col overflow-hidden outline-none">
                <DrawerTitle className="sr-only">{getLocalizedName(item, language)}</DrawerTitle>

                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-50 h-10 w-10 flex items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-md transition-transform active:scale-95 hover:bg-white/20"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                </button>

                {/* Admin Actions */}
                {isAdmin && (
                    <div className="absolute top-4 left-4 z-50 flex flex-col gap-3 animate-in fade-in slide-in-from-left-4 duration-500 delay-150">
                        <Button
                            onClick={(e) => { e.stopPropagation(); onEdit?.(); }}
                            size="icon"
                            className="h-10 w-10 rounded-full bg-white/10 text-white backdrop-blur-md hover:bg-white/20 border border-white/10 shadow-xl ring-1 ring-black/5"
                        >
                            <Edit className="h-5 w-5" />
                        </Button>
                        <Button
                            onClick={(e) => { e.stopPropagation(); onDelete?.(); }}
                            size="icon"
                            variant="destructive"
                            className="h-10 w-10 rounded-full shadow-xl ring-1 ring-black/5"
                        >
                            <Trash2 className="h-5 w-5" />
                        </Button>
                    </div>
                )}



                {/* Navigation Hints (Optional visual cues) */}
                {/* <div className="absolute top-1/2 left-2 z-40 -translate-y-1/2 opacity-20 pointer-events-none text-white"><ChevronLeft size={40} /></div> */}
                {/* <div className="absolute top-1/2 right-2 z-40 -translate-y-1/2 opacity-20 pointer-events-none text-white"><ChevronRight size={40} /></div> */}

                <div
                    className="flex-1 overflow-hidden relative flex flex-col"
                >
                    {/* Zoomable Image Container */}
                    <div
                        className={cn(
                            "relative w-full h-full flex items-center justify-center overflow-hidden touch-none",
                            zoomLevel > 1 ? "cursor-move" : "cursor-zoom-in"
                        )}
                        onPointerDown={(e) => {
                            e.stopPropagation(); // Stop Drawer drag
                            handlePointerDown(e);
                        }}
                        onPointerMove={(e) => {
                            e.stopPropagation();
                            handlePointerMove(e);
                        }}
                        onPointerUp={(e) => {
                            e.stopPropagation();
                            handlePointerUp(e);
                        }}
                        onPointerLeave={(e) => {
                            e.stopPropagation();
                            handlePointerUp(e);
                        }}
                        onDoubleClick={() => setZoomLevel(prev => prev > 1 ? 1 : 2)}
                        data-vaul-no-drag
                    >
                        {modalImageLoading && (
                            <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                                <Loader2 className="h-10 w-10 animate-spin text-white" />
                            </div>
                        )}

                        {/* Image wrapper for zoom transform */}
                        <div
                            className="relative w-full h-full transition-transform duration-100 ease-linear origin-center will-change-transform"
                            style={{
                                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoomLevel})`,
                            }}
                        >
                            <Image
                                src={optimizeImage(item.imageUrl, 1200)}
                                alt={getLocalizedName(item, language)}
                                fill
                                className="object-contain pointer-events-none select-none"
                                sizes="100vw"
                                priority
                                onLoad={handleModalImageLoad}
                                draggable={false}
                            />
                        </div>
                    </div>

                    {/* Advanced Zoom Controls */}
                    <div className="absolute bottom-52 left-0 right-0 z-50 flex justify-center gap-4 pointer-events-auto">
                        <div className="flex items-center gap-1 bg-black/40 backdrop-blur-md p-1.5 rounded-full border border-white/10">
                            <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => setZoomLevel(prev => Math.max(0.5, prev - 0.5))}
                                className="h-8 w-8 rounded-full text-white hover:bg-white/20 hover:text-white"
                            >
                                <Minus className="h-4 w-4" />
                            </Button>

                            <div className="w-8 text-center text-xs font-bold text-white">
                                {Math.round(zoomLevel * 100)}%
                            </div>

                            <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => {
                                    setZoomLevel(1);
                                    setPan({ x: 0, y: 0 });
                                }}
                                className="h-8 w-8 rounded-full text-white hover:bg-white/20 hover:text-white"
                            >
                                <RotateCcw className="h-3.5 w-3.5" />
                            </Button>

                            <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => setZoomLevel(prev => Math.min(3, prev + 0.5))}
                                className="h-8 w-8 rounded-full text-white hover:bg-white/20 hover:text-white"
                            >
                                <Plus className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>

                    {/* Info Overlay (Stable) */}
                    <div className="absolute bottom-0 left-0 right-0 z-40 p-6 pt-24 bg-gradient-to-t from-black via-black/80 to-transparent pointer-events-none">
                        <div className="space-y-4 pointer-events-auto">
                            <div>
                                <h2 className="text-3xl font-black text-white mb-2 leading-tight tracking-tight drop-shadow-2xl">
                                    {getLocalizedName(item, language)}
                                </h2>
                                <p className="text-gray-300 text-sm leading-relaxed line-clamp-3 font-medium text-shadow-sm">
                                    {getLocalizedDescription(item, language)}
                                </p>
                            </div>

                            <div className="w-full pt-2">
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">{t("menu.price")}</span>
                                    {item?.discountEndsAt && new Date(item.discountEndsAt) > new Date() && (
                                        <span className="text-xs text-red-500/80 font-bold uppercase tracking-wider">{t("menu.discountEnds")}</span>
                                    )}
                                </div>
                                <div className="flex items-center justify-between w-full">
                                    <div className="bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/5">
                                        <PriceDisplay
                                            price={item.price}
                                            discountPrice={(item.discountEndsAt && new Date(item.discountEndsAt) > new Date()) ? item.discountPrice : undefined}
                                            className="text-white"
                                        />
                                    </div>
                                    {item?.discountEndsAt && new Date(item.discountEndsAt) > new Date() && (
                                        <DiscountTimer endsAt={item.discountEndsAt} className="text-xs px-3 py-1.5 bg-red-600/90 text-white border-0 shadow-lg font-bold backdrop-blur-md rounded-lg" />
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </DrawerContent>
        </Drawer>
    );
}
