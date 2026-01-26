"use client";

import { ReactLenis } from "lenis/react";

export default function SmoothScroll({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <ReactLenis
            root
            options={{
                lerp: 0.05, // Juda sekin
                duration: 3.0, // Uzoq animatsiya
                orientation: 'vertical',
                gestureOrientation: 'vertical',
                smoothWheel: true,
                wheelMultiplier: 0.2, // Juda sekin (5x slower)
                touchMultiplier: 0.2, // Juda sekin (5x slower)
            }}
        >
            {children}
        </ReactLenis>
    );
}
