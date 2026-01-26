export function optimizeImage(url: string | undefined | null, width: number = 800) {
    if (!url) return "/placeholder.svg";

    // If it's already a placeholder or local image, return as is
    if (url.startsWith("/") || url.startsWith("data:")) return url;

    // Utilize wsrv.nl for on-the-fly optimization
    // w: width
    // q: quality (default 80)
    // output: webp (modern format)
    return `https://wsrv.nl/?url=${encodeURIComponent(url)}&w=${width}&q=75&output=webp`;
}
