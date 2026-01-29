export function getLocalizedName<T extends { name: string; name_uz?: string; name_ru?: string; name_en?: string }>(
    item: T,
    language: string
): string {
    if (language === "uz" && item.name_uz) return item.name_uz;
    if (language === "ru" && item.name_ru) return item.name_ru;
    if (language === "en" && item.name_en) return item.name_en;
    return item.name;
}

export function getLocalizedDescription<T extends { description?: string; description_uz?: string; description_ru?: string; description_en?: string }>(
    item: T,
    language: string
): string {
    if (language === "uz" && item.description_uz) return item.description_uz;
    if (language === "ru" && item.description_ru) return item.description_ru;
    if (language === "en" && item.description_en) return item.description_en;
    return item.description || "";
}
