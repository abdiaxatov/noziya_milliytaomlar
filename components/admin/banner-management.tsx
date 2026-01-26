"use client"

import { useState, useEffect } from "react"
import { collection, query, orderBy, onSnapshot, doc, deleteDoc, updateDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Plus, Trash2, Edit, Loader2, ImageIcon, Power } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog"
import Image from "next/image"
import {
    Drawer,
    DrawerContent,
    DrawerTitle,
} from "@/components/ui/drawer"
import type { Banner, Category } from "@/types"
import { BannerForm } from "./banner-form"

interface BannerManagementProps {
    categories: Category[]
}

export function BannerManagement({ categories }: BannerManagementProps) {
    const [banners, setBanners] = useState<Banner[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false)
    const [isEditDrawerOpen, setIsEditDrawerOpen] = useState(false)
    const [editingBanner, setEditingBanner] = useState<Banner | null>(null)
    const [itemToDelete, setItemToDelete] = useState<Banner | null>(null)
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)

    const { toast } = useToast()

    useEffect(() => {
        const q = query(collection(db, "banners"), orderBy("createdAt", "desc"))
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Banner[]
            setBanners(data)
            setIsLoading(false)
        })
        return () => unsubscribe()
    }, [])

    const handleCreate = () => setIsCreateDrawerOpen(true)

    const handleEdit = (banner: Banner) => {
        setEditingBanner(banner)
        setIsEditDrawerOpen(true)
    }

    const handleDeleteClick = (banner: Banner) => {
        setItemToDelete(banner)
        setIsDeleteDialogOpen(true)
    }

    const handleDeleteConfirm = async () => {
        if (!itemToDelete) return
        setIsDeleting(true)
        try {
            await deleteDoc(doc(db, "banners", itemToDelete.id))
            toast({ title: "Banner o'chirildi" })
            setIsDeleteDialogOpen(false)
        } catch (error) {
            toast({ title: "Xatolik", variant: "destructive" })
        } finally {
            setIsDeleting(false)
        }
    }

    const toggleActive = async (banner: Banner) => {
        try {
            await updateDoc(doc(db, "banners", banner.id), {
                active: !banner.active
            })
            toast({ title: banner.active ? "Banner o'chirildi (No-faol)" : "Banner yoqildi (Faol)" })
        } catch (error) {
            toast({ title: "Xatolik", variant: "destructive" })
        }
    }

    const getCategoryName = (id?: string) => {
        if (!id || id === "all") return "Barchasi"
        return categories.find(c => c.id === id)?.name || "Noma'lum"
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold">Bannerlar</h2>
                <Button onClick={handleCreate} className="shadow-md bg-primary hover:bg-primary/90">
                    <Plus className="mr-2 h-4 w-4" />
                    Yangi Banner
                </Button>
            </div>

            {isLoading ? (
                <div className="flex justify-center p-8">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            ) : banners.length === 0 ? (
                <div className="text-center p-12 border-2 border-dashed rounded-xl bg-gray-50">
                    <ImageIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">Hozircha bannerlar yo'q</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {banners.map((banner) => (
                        <Card key={banner.id} className="overflow-hidden group hover:shadow-lg transition-all">
                            <div className="relative h-48 bg-gray-100">
                                <Image
                                    src={banner.imageUrl}
                                    alt={banner.name}
                                    fill
                                    className={`object-cover transition-opacity ${banner.active ? 'opacity-100' : 'opacity-50 grayscale'}`}
                                />
                                <div className="absolute top-2 right-2 flex gap-2">
                                    <Button
                                        size="icon"
                                        variant={banner.active ? "default" : "secondary"}
                                        className={`rounded-full h-8 w-8 shadow-sm ${banner.active ? 'bg-green-500 hover:bg-green-600' : 'bg-gray-200'}`}
                                        onClick={() => toggleActive(banner)}
                                    >
                                        <Power className="w-4 h-4" />
                                    </Button>
                                    <Button
                                        size="icon"
                                        variant="secondary"
                                        className="rounded-full h-8 w-8 shadow-sm bg-white/90"
                                        onClick={() => handleEdit(banner)}
                                    >
                                        <Edit className="w-4 h-4 text-gray-700" />
                                    </Button>
                                    <Button
                                        size="icon"
                                        variant="destructive"
                                        className="rounded-full h-8 w-8 shadow-sm"
                                        onClick={() => handleDeleteClick(banner)}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                                <Badge className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-sm text-white border-0">
                                    {getCategoryName(banner.categoryId)}
                                </Badge>
                            </div>
                            <CardContent className="p-4">
                                <div className="flex justify-between items-center">
                                    <h3 className="font-semibold text-lg">{banner.name}</h3>
                                    <Badge variant={banner.active ? "default" : "outline"}>
                                        {banner.active ? "Faol" : "No-faol"}
                                    </Badge>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Create Drawer */}
            <Drawer open={isCreateDrawerOpen} onOpenChange={setIsCreateDrawerOpen}>
                <DrawerContent className="max-h-[96vh] h-full rounded-t-[30px] border-0 outline-none flex flex-col bg-gray-50/95 backdrop-blur-sm">
                    <DrawerTitle className="sr-only">Yangi banner</DrawerTitle>
                    <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-24">
                        <BannerForm
                            categories={categories}
                            onSuccess={() => setIsCreateDrawerOpen(false)}
                            onCancel={() => setIsCreateDrawerOpen(false)}
                        />
                    </div>
                </DrawerContent>
            </Drawer>

            {/* Edit Drawer */}
            <Drawer open={isEditDrawerOpen} onOpenChange={setIsEditDrawerOpen}>
                <DrawerContent className="max-h-[96vh] h-full rounded-t-[30px] border-0 outline-none flex flex-col bg-gray-50/95 backdrop-blur-sm">
                    <DrawerTitle className="sr-only">Bannerni tahrirlash</DrawerTitle>
                    <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-24">
                        {editingBanner && (
                            <BannerForm
                                banner={editingBanner}
                                categories={categories}
                                onSuccess={() => { setIsEditDrawerOpen(false); setEditingBanner(null); }}
                                onCancel={() => { setIsEditDrawerOpen(false); setEditingBanner(null); }}
                            />
                        )}
                    </div>
                </DrawerContent>
            </Drawer>

            {/* Delete Dialog */}
            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Bannerni o'chirish</DialogTitle>
                        <DialogDescription>
                            Haqiqatan ham <b>{itemToDelete?.name}</b> ni o'chirmoqchimisiz?
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>Bekor qilish</Button>
                        <Button variant="destructive" onClick={handleDeleteConfirm} disabled={isDeleting}>
                            {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            O'chirish
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
