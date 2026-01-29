"use client";

import { motion } from "framer-motion";
import Image from "next/image";

import { useLanguage } from "@/hooks/use-language";

export function LogoLoader() {
    const { t } = useLanguage();
    return (
        <motion.div
            className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
        >
            <div className="relative flex items-center justify-center">
                {/* Premium Pulse Effect */}
                <motion.div
                    className="absolute rounded-full bg-primary/20"
                    initial={{ width: "120px", height: "120px", opacity: 0 }}
                    animate={{
                        width: ["120px", "200px", "120px"],
                        height: ["120px", "200px", "120px"],
                        opacity: [0.3, 0, 0.3],
                    }}
                    transition={{
                        duration: 2.5,
                        repeat: Infinity,
                        ease: "easeInOut",
                    }}
                />

                {/* Logo Container */}
                <motion.div
                    className="relative z-10 h-32 w-32 overflow-hidden rounded-full border-4 border-background bg-background shadow-2xl ring-1 ring-border/20"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                >
                    <div className="relative w-full h-full p-4">
                        <Image
                            src="/Logo.png"
                            alt="Noziya Milliy Taomlar"
                            fill
                            className="object-contain"
                            priority
                            sizes="128px"
                        />
                    </div>
                </motion.div>
            </div>

            {/* Loading text */}
            <motion.p
                className="mt-8 text-primary font-medium tracking-widest uppercase text-sm"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
            >
                {t("common.loading")}
            </motion.p>
        </motion.div>
    );
}
