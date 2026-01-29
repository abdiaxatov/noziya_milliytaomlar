"use client"

import { useState, useRef, useEffect } from "react"
import { collection, addDoc, updateDoc, doc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { Loader2, ImageIcon, Upload, X, ChevronLeft } from "lucide-react"
import type { Banner, Category } from "@/types"
import { uploadToGitHub } from "@/lib/github-upload"
import Image from "next/image"
import { useLanguage } from "@/hooks/use-language"

interface BannerFormProps {
    banner?: Banner | null
    categories: Category[]
    onSuccess?: () => void
    onCancel?: () => void
}

export function BannerForm({ banner, categories, onSuccess, onCancel }: BannerFormProps) {
    const [formData, setFormData] = useState({
        name: banner?.name || "",
        name_uz: banner?.name_uz || "",
        name_ru: banner?.name_ru || "",
        name_en: banner?.name_en || "",
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

    const { toast } = useToast()
    const { t, language } = useLanguage()
    const imageInputRef = useRef<HTMLInputElement>(null)

    const [imageFileName, setImageFileName] = useState(t("admin.form.fileNotSelected"))

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
                    title: t("admin.form.errors.invalidFormat"),
                    description: t("admin.form.errors.imageDesc"),
                    variant: "destructive",
                })
                setImageFileName(t("admin.form.fileNotSelected"))
            }
        } else {
            setImageFileName(t("admin.form.fileNotSelected"))
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
                    title: t("admin.form.imageUploaded"),
                    description: t("admin.form.bannerUploadedDesc") || "Banner rasmi muvaffaqiyatli yuklandi",
                })
            } else {
                toast({
                    title: t("admin.form.errors.uploadError"),
                    description: result.error || t("admin.form.errors.imageNotUploaded"),
                    variant: "destructive",
                })
            }
        } catch (error) {
            console.warn("Image upload error:", error)
            toast({
                title: t("common.error"),
                description: t("admin.form.errors.imageUploadError"),
                variant: "destructive",
            })
        } finally {
            setIsUploadingImage(false)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        const hasAnyName = (formData.name_uz || "").trim() || (formData.name_ru || "").trim() || (formData.name_en || "").trim() || (formData.name || "").trim()

        if (!hasAnyName || !formData.imageUrl) {
            toast({
                title: t("admin.form.errors.incomplete"),
                description: t("admin.form.errors.bannerRequired") || "Iltimos, nom va rasm maydonlarini to'ldiring",
                variant: "destructive",
            })
            return
        }

        setIsSubmitting(true)
        try {
            const mainName = (formData.name_uz || formData.name_ru || formData.name_en || formData.name || "").trim()
            const bannerData = {
                name: mainName,
                name_uz: (formData.name_uz || "").trim(),
                name_ru: (formData.name_ru || "").trim(),
                name_en: (formData.name_en || "").trim(),
                imageUrl: formData.imageUrl,
                categoryId: formData.categoryId === "all" ? null : formData.categoryId,
                active: formData.active,
                updatedAt: new Date(),
            }

            if (banner?.id) {
                await updateDoc(doc(db, "banners", banner.id), bannerData)
                toast({
                    title: t("admin.banner.updateSuccess") || "Banner yangilandi",
                    description: t("admin.form.saveSuccess") || "Muvaffaqiyatli saqlandi",
                })
            } else {
                await addDoc(collection(db, "banners"), {
                    ...bannerData,
                    createdAt: new Date(),
                })
                toast({
                    title: t("admin.banner.addSuccess") || "Banner yaratildi",
                    description: t("admin.banner.addDesc") || "Yangi banner qo'shildi",
                })
            }

            if (onSuccess) onSuccess()
        } catch (error) {
            console.error("Error saving banner:", error)
            toast({
                title: t("common.error"),
                description: t("admin.form.errors.saveError"),
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
                    {banner ? t("admin.menu.item.edit") : t("admin.banner.addBtn")}
                </h1>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
                {/* Image Preview / Upload */}
                <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-200 flex items-center gap-2">
                        <ImageIcon className="w-5 h-5 text-primary" />
                        {t("admin.form.bannerImage")}
                    </h3>

                    <div className="space-y-4">
                        {/* Preview */}
                        <div className="relative h-48 md:h-64 bg-gray-100 rounded-xl border-2 border-dashed border-gray-300 overflow-hidden shadow-inner flex items-center justify-center">
                            {isCheckingImage || isUploadingImage ? (
                                <div className="text-center">
                                    <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-3" />
                                    <p className="text-sm text-gray-600 font-medium">
                                        {isUploadingImage ? t("admin.form.uploading") : t("admin.form.checking")}
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
                                            {t("admin.form.expand")}
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center text-gray-400">
                                    <ImageIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                    <p className="text-sm font-medium">{t("admin.form.noImage")}</p>
                                </div>
                            )}
                        </div>

                        {/* Upload Controls */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="imageUrl">{t("admin.form.imageUrl")}</Label>
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
                                <Label>{t("admin.form.imageUpload")}</Label>
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
                                    {isUploadingImage ? t("admin.form.uploading") : t("admin.form.uploadFromPC")}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Info Fields */}
                <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm space-y-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-200">
                        {t("admin.form.basicInfo")}
                    </h3>

                    <div className="space-y-4">
                        <Tabs defaultValue={language} className="w-full">
                            <TabsList className="grid w-full grid-cols-3 mb-4">
                                <TabsTrigger value="uz">O'zbekcha</TabsTrigger>
                                <TabsTrigger value="ru" className="flex gap-1">Русский <span className="text-[10px] opacity-60 font-normal lowercase">{t("common.optional")}</span></TabsTrigger>
                                <TabsTrigger value="en" className="flex gap-1">English <span className="text-[10px] opacity-60 font-normal lowercase">{t("common.optional")}</span></TabsTrigger>
                            </TabsList>

                            <TabsContent value="uz" className="space-y-4 pt-2">
                                <div className="space-y-2">
                                    <Label htmlFor="name_uz">{t("admin.form.nameUz")} *</Label>
                                    <Input
                                        id="name_uz"
                                        name="name_uz"
                                        value={formData.name_uz}
                                        onChange={handleChange}
                                        required
                                        placeholder="Milliy taomlar haftaligi"
                                    />
                                </div>
                            </TabsContent>

                            <TabsContent value="ru" className="space-y-4 pt-2">
                                <div className="space-y-2">
                                    <Label htmlFor="name_ru">{t("admin.form.nameRu")}</Label>
                                    <Input
                                        id="name_ru"
                                        name="name_ru"
                                        value={formData.name_ru}
                                        onChange={handleChange}
                                        placeholder="Неделя национальных блюд"
                                    />
                                </div>
                            </TabsContent>

                            <TabsContent value="en" className="space-y-4 pt-2">
                                <div className="space-y-2">
                                    <Label htmlFor="name_en">{t("admin.form.nameEn")}</Label>
                                    <Input
                                        id="name_en"
                                        name="name_en"
                                        value={formData.name_en}
                                        onChange={handleChange}
                                        placeholder="National Dishes Week"
                                    />
                                </div>
                            </TabsContent>
                        </Tabs>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="categoryId">{t("admin.form.category")} ({t("common.optional")})</Label>
                        <Select
                            value={formData.categoryId}
                            onValueChange={(value) => handleSelectChange("categoryId", value)}
                        >
                            <SelectTrigger className="h-11">
                                <SelectValue placeholder={t("admin.form.selectCategory")} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{t("admin.banner.all")}</SelectItem>
                                {categories.map((cat) => (
                                    <SelectItem key={cat.id} value={cat.id}>
                                        {cat.name_uz || cat.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-gray-500">
                            {t("admin.form.bannerCategoryDesc")}
                        </p>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                            <Label htmlFor="active" className="font-medium text-gray-800">{t("admin.form.available")}</Label>
                            <p className="text-sm text-gray-600">{t("admin.form.availableDesc")}</p>
                        </div>
                        <Switch
                            id="active"
                            checked={formData.active}
                            onCheckedChange={(checked) => setFormData(prev => ({ ...prev, active: checked }))}
                        />
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
                        {t("admin.form.cancel")}
                    </Button>
                    <Button
                        type="submit"
                        disabled={isSubmitting || isUploadingImage}
                        className="px-8 py-2 h-11 bg-primary text-white shadow-lg hover:shadow-xl transition-all"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                {t("admin.form.saving")}
                            </>
                        ) : (
                            <>
                                <Upload className="mr-2 h-5 w-5" />
                                {banner ? t("admin.form.update") : t("admin.form.add")}
                            </>
                        )}
                    </Button>
                </div>
            </form >

            {/* Image Preview Modal */}
            {
                showImagePreview && formData.imageUrl && (
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
                )
            }
        </div >
    )
}
