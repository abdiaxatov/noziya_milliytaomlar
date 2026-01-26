"use client";

import React, { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Eye, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { optimizeImage } from "@/lib/image-optimizer";
import { PriceDisplay } from "@/components/price-display";
import { DiscountTimer } from "@/components/discount-timer";
import type { MenuItem as MenuItemType } from "@/types";

interface MenuItemProps {
  item: MenuItemType;
  priority?: boolean;
  onClick?: () => void;
}

export const MenuItemComponent = React.memo(function MenuItemComponent({
  item,
  priority = false,
  onClick,
}: MenuItemProps) {
  const router = useRouter();
  const [is3DLoading, setIs3DLoading] = useState(false);

  // Memoize CDN URL to prevent recalculation
  const optimizedUrl = useMemo(
    () => optimizeImage(item.imageUrl, 500),
    [item.imageUrl]
  );

  const remainingServings = item.remainingServings ?? item.servesCount ?? 0;
  const isOutOfStock = remainingServings <= 0;

  const handle3DView = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setIs3DLoading(true);
      router.push(`/3d-view/${item.id}`);
    },
    [router, item.id]
  );

  const handleImageClick = useCallback(() => {
    onClick?.();
  }, [onClick]);

  return (
    <Card
      className={cn(
        "overflow-hidden transition-shadow hover:shadow-md menu-item-card",
        isOutOfStock && "opacity-60"
      )}
      style={{
        contain: "layout style paint",
        willChange: "transform",
      }}
    >
      <div
        className="relative aspect-square overflow-hidden cursor-pointer menu-item-image"
        onClick={handleImageClick}
        style={{
          contain: "strict",
          backgroundColor: "#e5e7eb", // gray-200 as intrinsic fallback
        }}
      >
        <Image
          src={optimizedUrl}
          alt={item.name}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
          loading={priority ? "eager" : "lazy"}
          priority={priority}
          unoptimized
        />

        {isOutOfStock ? (
          <Badge className="absolute left-1.5 top-1.5 bg-red-500 text-white text-[10px] py-0.5 px-1.5">
            Все кончено.
          </Badge>
        ) : (
          !isOutOfStock &&
          item.discountEndsAt &&
          new Date(item.discountEndsAt) > new Date() && (
            <div className="absolute top-1.5 right-1.5 z-10">
              <DiscountTimer
                endsAt={item.discountEndsAt}
                className="text-[10px] px-1.5 py-0.5 bg-red-600 text-white border-none shadow-sm font-bold gap-1 rounded-sm"
              />
            </div>
          )
        )}
      </div>

      <CardContent className="p-2">
        <h3 className="font-medium text-sm mb-1 line-clamp-1">{item.name}</h3>
        <PriceDisplay
          price={item.price}
          discountPrice={
            item.discountEndsAt && new Date(item.discountEndsAt) > new Date()
              ? item.discountPrice
              : undefined
          }
          vertical={false}
          className="items-baseline gap-2"
        />
      </CardContent>

      <CardFooter className="p-2 pt-0">
        {isOutOfStock ? (
          <Button
            disabled
            className="w-full h-7 text-[11px] bg-transparent"
            size="sm"
            variant="outline"
          >
            Все кончено.
          </Button>
        ) : item.modelUrl ? (
          <Button
            onClick={handle3DView}
            className="w-full h-7 text-[11px]"
            size="sm"
            variant="default"
            disabled={is3DLoading}
          >
            {is3DLoading ? (
              <>
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                Загрузка...
              </>
            ) : (
              <>
                <Eye className="mr-1 h-3 w-3" />
                3D-модель
              </>
            )}
          </Button>
        ) : null}
      </CardFooter>
    </Card>
  );
});

