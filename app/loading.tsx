import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
    return (
        <div className="flex min-h-screen flex-col pb-20 bg-primary/10">
            {/* Banner Skeleton */}
            <div className="relative w-full h-48 md:h-64 bg-gray-200">
                <Skeleton className="w-full h-full bg-gray-300" />
                <div className="absolute left-1/2 bottom-[-70px] -translate-x-1/2 z-10 flex flex-col items-center">
                    <div className="bg-primary rounded-3xl p-2 shadow-lg">
                        <Skeleton className="w-[120px] h-[120px] rounded-full bg-white/50" />
                    </div>
                    <Skeleton className="mt-2 h-8 w-40 bg-gray-300 rounded-lg" />
                </div>
            </div>

            {/* Tabs & Grid Skeleton */}
            <div className="p-4 mt-20 space-y-6">
                {/* Tabs Skeleton */}
                <div className="flex justify-center mb-6">
                    <Skeleton className="h-10 w-64 rounded-full bg-primary/20" />
                </div>

                {/* Grid Skeleton */}
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-3">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <div key={i} className="space-y-2">
                            <Skeleton className="aspect-square w-full rounded-xl bg-gray-300/50" />
                            <Skeleton className="h-4 w-3/4 bg-gray-300/50" />
                            <Skeleton className="h-4 w-1/2 bg-gray-300/50" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
