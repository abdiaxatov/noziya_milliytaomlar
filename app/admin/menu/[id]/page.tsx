"use client"

import { useState, useEffect } from "react"
import { collection, query, orderBy, onSnapshot, doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { MenuItemForm } from "@/components/menu-item-form"
import { Loader2 } from "lucide-react"
import type { Category, MenuItem } from "@/types"
import { useParams, useRouter } from "next/navigation"
import { useToast } from "@/components/ui/use-toast"

export default function EditMenuItemPage() {
    const params = useParams()
    const router = useRouter()
    const { toast } = useToast()

    const [categories, setCategories] = useState<Category[]>([])
    const [item, setItem] = useState<MenuItem | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        const id = params.id as string
        if (!id) return

        // Fetch Categories
        const categoriesQuery = query(collection(db, "categories"), orderBy("name"))
        const categoriesUnsubscribe = onSnapshot(categoriesQuery, (snapshot) => {
            const categoriesData: Category[] = []
            snapshot.forEach((doc) => {
                categoriesData.push({ id: doc.id, ...doc.data() } as Category)
            })
            setCategories(categoriesData)
        })

        // Fetch Item
        const fetchItem = async () => {
            try {
                const docRef = doc(db, "menuItems", id)
                const docSnap = await getDoc(docRef)

                if (docSnap.exists()) {
                    setItem({ id: docSnap.id, ...docSnap.data() } as MenuItem)
                } else {
                    toast({
                        title: "Topilmadi",
                        description: "Bunday taom topilmadi",
                        variant: "destructive"
                    })
                    router.push("/admin/menu")
                }
            } catch (error) {
                console.error("Error fetching item:", error)
                toast({
                    title: "Xatolik",
                    description: "Taom ma'lumotlarini yuklashda xatolik",
                    variant: "destructive"
                })
            } finally {
                setIsLoading(false)
            }
        }

        fetchItem()

        return () => categoriesUnsubscribe()
    }, [params.id, router, toast])

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    if (!item) return null

    return (
        <div className="p-4 md:p-8">
            <MenuItemForm item={item} categories={categories} />
        </div>
    )
}
