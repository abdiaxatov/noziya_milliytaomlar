"use client";

import { motion } from "framer-motion";
import Image from "next/image";

export function LogoLoader() {
    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-white/80 backdrop-blur-sm">
            <div className="relative flex items-center justify-center">
                {/* Pulsing rings */}
                <motion.div
                    className="absolute rounded-full bg-primary/20"
                    initial={{ width: "100px", height: "100px", opacity: 0.5 }}
                    animate={{
                        width: ["100px", "150px", "100px"],
                        height: ["100px", "150px", "100px"],
                        opacity: [0.5, 0.1, 0.5],
                    }}
                    transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut",
                    }}
                />
                <motion.div
                    className="absolute rounded-full bg-primary/10"
                    initial={{ width: "120px", height: "120px", opacity: 0.3 }}
                    animate={{
                        width: ["120px", "180px", "120px"],
                        height: ["120px", "180px", "120px"],
                        opacity: [0.3, 0.1, 0.3],
                    }}
                    transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut",
                        delay: 0.2,
                    }}
                />

                {/* Circular Logo Container */}
                <motion.div
                    className="relative z-10 h-24 w-24 overflow-hidden rounded-full border-4 border-white bg-white shadow-xl ring-2 ring-primary/20"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                >
                    <Image
                        src="/Logo.png"
                        alt="Loading..."
                        fill
                        className="object-cover"
                        priority
                    />
                </motion.div>
            </div>
        </div>
    );
}
