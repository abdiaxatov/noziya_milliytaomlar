import { formatCurrency, cn } from "@/lib/utils";
import { useLanguage } from "@/hooks/use-language";

interface PriceDisplayProps {
    price: number;
    discountPrice?: number;
    className?: string;
}

export function PriceDisplay({ price, discountPrice, className }: PriceDisplayProps) {
    const { language } = useLanguage();
    const hasDiscount = discountPrice && discountPrice > 0 && discountPrice < price;

    if (!hasDiscount) {
        return (
            <span className={cn("font-bold text-primary", className)}>
                {formatCurrency(price, language)}
            </span>
        );
    }

    return (
        <div className={cn("flex flex-col items-start leading-none", className)}>
            <span className="text-xs text-gray-400 line-through decoration-red-500/80 decoration-[1.5px] -rotate-2 origin-left scale-90 opacity-70">
                {formatCurrency(price, language)}
            </span>
            <span className="font-black text-red-600 text-lg tracking-tight">
                {formatCurrency(discountPrice, language)}
            </span>
        </div>
    );
}
