// Global cache to track loaded images
// This persists across component unmount/remount cycles

const loadedImages = new Set<string>();

export function isImageLoaded(url: string): boolean {
    return loadedImages.has(url);
}

export function markImageLoaded(url: string): void {
    loadedImages.add(url);
}

export function preloadImage(url: string): Promise<void> {
    return new Promise((resolve) => {
        if (loadedImages.has(url)) {
            resolve();
            return;
        }
        const img = new Image();
        img.onload = () => {
            loadedImages.add(url);
            resolve();
        };
        img.onerror = () => resolve();
        img.src = url;
    });
}
