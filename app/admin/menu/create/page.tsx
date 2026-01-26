        "use client"

import { useState, useEffect } from "react"
import { collection, query, orderBy, onSnapshot } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { MenuItemForm } from "@/components/menu-item-form"
import { Loader2 } from "lucide-react"
import type { Category } from "@/types"

export default function CreateMenuItemPage() {
    const [categories, setCategories] = useState<Category[]>([])
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        const categoriesQuery = query(collection(db, "categories"), orderBy("name"))

        const unsubscribe = onSnapshot(categoriesQuery, (snapshot) => {
            const categoriesData: Category[] = []
            snapshot.forEach((doc) => {
                categoriesData.push({ id: doc.id, ...doc.data() } as Category)
            })
            setCategories(categoriesData)
            setIsLoading(false)
        })

        return () => unsubscribe()
    }, [])

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <div className="p-4 md:p-8">
            <MenuItemForm categories={categories} />
        </div>
    )
}
