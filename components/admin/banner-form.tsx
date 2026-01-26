"use client"

import { useState, useRef, useEffect } from "react"
import { collection, addDoc, updateDoc, doc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { Loader2, ImageIcon, Upload, X, ChevronLeft } from "lucide-react"
import type { Banner, Category } from "@/types"
import { uploadToGitHub } from "@/lib/github-upload"
import Image from "next/image"

interface BannerFormProps {
    banner?: Banner | null
    categories: Category[]
    onSuccess?: () => void
    onCancel?: () => void
}

export function BannerForm({ banner, categories, onSuccess, onCancel }: BannerFormProps) {
    const [formData, setFormData] = useState({
        name: banner?.name || "",
        imageUrl: banner?.imageUrl || "",
        categoryId: banner?.categoryId || "all", // "all" for general banner
        active: banner?.active !== false,
    })

    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isImageValid, setIsImageValid] = useState(false)
    const [isCheckingImage, setIsCheckingImage] = useState(false)
    const [imageFile, setImageFile] = useState<File | null>(null)
    const [isUploadingImage, setIsUploadingImage] = useState(false)
    const [showImagePreview, setShowImagePreview] = useState(false)
    const [imageFileName, setImageFileName] = useState("Hech qanday fayl tanlanmagan")

    const imageInputRef = useRef<HTMLInputElement>(null)
    const { toast } = useToast()

    // Check image validity when imageUrl changes
    useEffect(() => {
        if (formData.imageUrl) {
            setIsCheckingImage(true)
            setIsImageValid(false)
            const img = new window.Image()
            img.onload = () => {
                setIsImageValid(true)
                setIsCheckingImage(false)
            }
            img.onerror = () => {
                setIsImageValid(false)
                setIsCheckingImage(false)
            }
            img.src = formData.imageUrl
        } else {
            setIsImageValid(false)
            setIsCheckingImage(false)
        }
    }, [formData.imageUrl])

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target
        setFormData((prev) => ({ ...prev, [name]: value }))
    }

    const handleSelectChange = (name: string, value: string) => {
        setFormData((prev) => ({ ...prev, [name]: value }))
    }

    const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0]
            if (file.type.startsWith("image/")) {
                setImageFile(file)
                setImageFileName(file.name)
                uploadImageFile(file)
            } else {
                toast({
                    title: "Noto'g'ri fayl formati",
                    description: "Faqat rasm fayllar qabul qilinadi",
                    variant: "destructive",
                })
                setImageFileName("Hech qanday fayl tanlanmagan")
            }
        } else {
            setImageFileName("Hech qanday fayl tanlanmagan")
        }
    }

    const uploadImageFile = async (file: File) => {
        setIsUploadingImage(true)
        try {
            const fileName = `banner_${Date.now()}_${file.name}`
            const result = await uploadToGitHub(file, fileName, "banners")

            if (result.success && result.url) {
                setFormData((prev) => ({ ...prev, imageUrl: result.url }))
                setImageFile(null)
                toast({
                    title: "Rasm yuklandi",
                    description: "Banner rasmi muvaffaqiyatli yuklandi",
                })
            } else {
                toast({
                    title: "Yuklashda xatolik",
                    description: result.error || "Rasm yuklanmadi",
                    variant: "destructive",
                })
            }
        } catch (error) {
            console.warn("Image upload error:", error)
            toast({
                title: "Xatolik",
                description: "Rasm yuklashda xatolik yuz berdi",
                variant: "destructive",
            })
        } finally {
            setIsUploadingImage(false)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!formData.name || !formData.imageUrl) {
            toast({
                title: "To'ldirilmagan maydonlar",
                description: "Iltimos, nom va rasm maydonlarini to'ldiring",
                variant: "destructive",
            })
            return
        }

        setIsSubmitting(true)
        try {
            const bannerData = {
                name: formData.name,
                imageUrl: formData.imageUrl,
                categoryId: formData.categoryId === "all" ? null : formData.categoryId,
                active: formData.active,
                updatedAt: new Date(),
            }

            if (banner?.id) {
                await updateDoc(doc(db, "banners", banner.id), bannerData)
                toast({
                    title: "Banner yangilandi",
                    description: "Muvaffaqiyatli saqlandi",
                })
            } else {
                await addDoc(collection(db, "banners"), {
                    ...bannerData,
                    createdAt: new Date(),
                })
                toast({
                    title: "Banner yaratildi",
                    description: "Yangi banner qo'shildi",
                })
            }

            if (onSuccess) onSuccess()
        } catch (error) {
            console.error("Error saving banner:", error)
            toast({
                title: "Xatolik",
                description: "Saqlashda xatolik yuz berdi",
                variant: "destructive",
            })
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="max-w-3xl mx-auto pb-10">
            <div className="flex items-center gap-4 mb-6">
                <Button variant="outline" size="icon" onClick={onCancel} className="h-10 w-10 rounded-full border-gray-200">
                    <ChevronLeft className="h-5 w-5" />
                </Button>
                <h1 className="text-2xl font-bold text-gray-900">
                    {banner ? "Bannerni tahrirlash" : "Yangi banner qo'shish"}
                </h1>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
                {/* Image Preview / Upload */}
                <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-200 flex items-center gap-2">
                        <ImageIcon className="w-5 h-5 text-primary" />
                        Banner Rasmi
                    </h3>

                    <div className="space-y-4">
                        {/* Preview */}
                        <div className="relative h-48 md:h-64 bg-gray-100 rounded-xl border-2 border-dashed border-gray-300 overflow-hidden shadow-inner flex items-center justify-center">
                            {isCheckingImage || isUploadingImage ? (
                                <div className="text-center">
                                    <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-3" />
                                    <p className="text-sm text-gray-600 font-medium">
                                        {isUploadingImage ? "Yuklanmoqda..." : "Tekshirilmoqda..."}
                                    </p>
                                </div>
                            ) : formData.imageUrl && isImageValid ? (
                                <div className="relative w-full h-full group">
                                    <Image
                                        src={formData.imageUrl}
                                        alt="Banner Preview"
                                        fill
                                        className="object-cover"
                                    />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <Button
                                            type="button"
                                            variant="secondary"
                                            size="sm"
                                            onClick={() => setShowImagePreview(true)}
                                            className="gap-2"
                                        >
                                            <ImageIcon className="w-4 h-4" />
                                            Kengaytirish
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center text-gray-400">
                                    <ImageIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                    <p className="text-sm font-medium">Rasm yo'q</p>
                                </div>
                            )}
                        </div>

                        {/* Upload Controls */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="imageUrl">Rasm URL</Label>
                                <Input
                                    id="imageUrl"
                                    name="imageUrl"
                                    value={formData.imageUrl}
                                    onChange={handleChange}
                                    placeholder="https://..."
                                    className="bg-gray-50"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Fayl yuklash</Label>
                                <input
                                    type="file"
                                    accept="image/*"
                                    ref={imageInputRef}
                                    onChange={handleImageFileChange}
                                    className="hidden"
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="w-full border-dashed border-2 h-10 hover:bg-gray-50"
                                    onClick={() => imageInputRef.current?.click()}
                                    disabled={isUploadingImage}
                                >
                                    <Upload className="w-4 h-4 mr-2" />
                                    {isUploadingImage ? "Yuklanmoqda..." : "Kompyuterdan yuklash"}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Info Fields */}
                <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm space-y-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-200">
                        Ma'lumotlar
                    </h3>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Banner Nomi <span className="text-red-500">*</span></Label>
                            <Input
                                id="name"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                placeholder="Masalan: Yangi yil chegirmalari"
                                required
                                className="h-11"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="categoryId">Kategoriya (Ixtiyoriy)</Label>
                            <Select
                                value={formData.categoryId}
                                onValueChange={(value) => handleSelectChange("categoryId", value)}
                            >
                                <SelectTrigger className="h-11">
                                    <SelectValue placeholder="Kategoriyani tanlang" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Barchasi (Umumiy)</SelectItem>
                                    {categories.map((cat) => (
                                        <SelectItem key={cat.id} value={cat.id}>
                                            {cat.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-gray-500">
                                Agar kategoriya tanlansa, banner bosilganda ushbu kategoriya ochiladi.
                            </p>
                        </div>

                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div>
                                <Label htmlFor="active" className="font-medium text-gray-800">Faol holat</Label>
                                <p className="text-sm text-gray-600">Saytda ko'rinishi</p>
                            </div>
                            <Switch
                                id="active"
                                checked={formData.active}
                                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, active: checked }))}
                            />
                        </div>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="fixed bottom-0 left-0 right-0 p-4 border-t border-gray-200 bg-white/95 backdrop-blur-sm flex items-center justify-end gap-3 z-50 md:static md:bg-transparent md:p-0 md:border-0">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onCancel}
                        className="px-6 py-2 h-11"
                    >
                        Bekor qilish
                    </Button>
                    <Button
                        type="submit"
                        disabled={isSubmitting || isUploadingImage}
                        className="px-8 py-2 h-11 bg-primary text-white shadow-lg hover:shadow-xl transition-all"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                Saqlanmoqda...
                            </>
                        ) : (
                            <>
                                <Upload className="mr-2 h-5 w-5" />
                                {banner ? "Yangilash" : "Yaratish"}
                            </>
                        )}
                    </Button>
                </div>
            </form>

            {/* Image Preview Modal */}
            {showImagePreview && formData.imageUrl && (
                <div className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center p-4">
                    <div className="relative max-w-4xl max-h-full">
                        <Button
                            onClick={() => setShowImagePreview(false)}
                            variant="outline"
                            size="sm"
                            className="absolute -top-12 right-0 bg-white/20 text-white border-white/40"
                        >
                            <X className="w-4 h-4" />
                        </Button>
                        <Image
                            src={formData.imageUrl}
                            alt="Banner Full"
                            width={1000}
                            height={600}
                            className="object-contain max-h-[80vh] rounded-lg"
                        />
                    </div>
                </div>
            )}
        </div>
    )
}
