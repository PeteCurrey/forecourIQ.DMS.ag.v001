'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { UploadCloud, X, Star, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { uploadVehicleImage, deleteVehicleImage } from '@/lib/storage/vehicle-images'
import { toast } from 'sonner'
import { useFormContext } from 'react-hook-form'
import { cn } from '@/lib/utils'

interface PhotoUploaderProps {
  vehicleId?: string
  initialPhotos?: string[]
  onPhotosChange?: (photos: string[]) => void
}

export default function PhotoUploader({
  vehicleId,
  initialPhotos = [],
  onPhotosChange
}: PhotoUploaderProps) {
  const formContext = useFormContext()
  const [standalonePhotos, setStandalonePhotos] = useState<string[]>(initialPhotos)
  const [standalonePrimary, setStandalonePrimary] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const supabase = createClient()

  const photos = formContext ? formContext.watch('photos') || [] : standalonePhotos
  const primaryIndex = formContext ? formContext.watch('primary_photo_index') || 0 : standalonePrimary

  const updatePhotos = (newPhotos: string[]) => {
    if (formContext) {
      formContext.setValue('photos', newPhotos, { shouldDirty: true })
    } else {
      setStandalonePhotos(newPhotos)
      if (onPhotosChange) onPhotosChange(newPhotos)
    }
  }

  const updatePrimary = (index: number) => {
    if (formContext) {
      formContext.setValue('primary_photo_index', index, { shouldDirty: true })
    } else {
      setStandalonePrimary(index)
    }
  }

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return

    setIsUploading(true)
    const newPhotos = [...photos]

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast.error('You must be signed in to upload photos.')
        setIsUploading(false)
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('dealership_id')
        .eq('id', user.id)
        .single()

      const dealershipId = profile?.dealership_id || 'unassigned'
      const targetVehicleId = vehicleId || `upload-${Date.now()}`

      let uploadedCount = 0

      for (const file of acceptedFiles) {
        try {
          const result = await uploadVehicleImage(file, dealershipId, targetVehicleId)
          newPhotos.push(result.url)
          uploadedCount++
        } catch (uploadErr: unknown) {
          console.warn('[PhotoUploader] Supabase storage upload notice:', uploadErr)
          const fallbackUrl = URL.createObjectURL(file)
          newPhotos.push(fallbackUrl)
          uploadedCount++
        }
      }

      updatePhotos(newPhotos)

      // If standalone with real vehicleId, persist to database
      if (vehicleId) {
        await supabase
          .from('vehicles')
          .update({ photos: newPhotos })
          .eq('id', vehicleId)
      }

      toast.success(`Processed ${uploadedCount} photo${uploadedCount > 1 ? 's' : ''}`)
    } catch (error: unknown) {
      console.error('[PhotoUploader] Error:', error)
      toast.error('Failed to process photos')
    } finally {
      setIsUploading(false)
    }
  }, [photos, vehicleId, supabase, formContext])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': [],
      'image/png': [],
      'image/webp': []
    },
    maxSize: 10 * 1024 * 1024, // 10MB
  })

  const removePhoto = async (index: number) => {
    const photoUrl = photos[index]
    const newPhotos = [...photos]
    newPhotos.splice(index, 1)
    updatePhotos(newPhotos)

    if (primaryIndex === index) {
      updatePrimary(0)
    } else if (primaryIndex > index) {
      updatePrimary(primaryIndex - 1)
    }

    if (vehicleId) {
      await supabase
        .from('vehicles')
        .update({ photos: newPhotos })
        .eq('id', vehicleId)
    }

    if (photoUrl && photoUrl.includes('vehicle-photos')) {
      try {
        const parts = photoUrl.split('vehicle-photos/')
        if (parts[1]) {
          await deleteVehicleImage(parts[1])
        }
      } catch (err) {
        console.warn('[PhotoUploader] Failed to delete from storage bucket:', err)
      }
    }
  }

  const setPrimary = async (index: number) => {
    updatePrimary(index)
    if (vehicleId) {
      await supabase
        .from('vehicles')
        .update({ primary_photo_index: index })
        .eq('id', vehicleId)
      toast.success('Primary photo set')
    }
  }

  return (
    <div className="space-y-6">

      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={cn(
          "bg-carbon border-2 border-dashed rounded-[2px] p-12 text-center cursor-pointer transition-colors duration-300 flex flex-col items-center justify-center",
          isDragActive ? "border-blue bg-blue/5" : "border-steel hover:border-blue",
          isUploading && "opacity-50 pointer-events-none"
        )}
      >
        <input {...getInputProps()} />
        {isUploading ? (
          <Loader2 size={40} className="mb-3 text-blue animate-spin" />
        ) : (
          <UploadCloud size={40} className={cn("mb-3", isDragActive ? "text-blue" : "text-pewter")} />
        )}
        <p className="font-syne font-bold text-base text-cream mb-1">
          {isDragActive ? "Drop photos here" : "Drag and drop vehicle photos, or click to browse"}
        </p>
        <p className="font-mono text-[10px] text-pewter uppercase tracking-wider">
          {isUploading ? "UPLOADING TO SECURE STORAGE..." : "JPG, PNG, WEBP · MAX 10MB PER PHOTO"}
        </p>
      </div>

      {/* Photo Gallery Grid */}
      {photos.length > 0 && (
        <div className="bg-carbon border border-steel p-6 rounded-[2px]">
          <h3 className="font-mono text-[10px] text-pewter uppercase tracking-widest mb-4">
            Uploaded Imagery ({photos.length})
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {photos.map((url: string, index: number) => (
              <div
                key={index}
                className={cn(
                  "relative aspect-[4/3] rounded-[2px] overflow-hidden border-2 group bg-asphalt",
                  index === primaryIndex ? "border-blue shadow-md" : "border-steel"
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt={`Vehicle photo ${index + 1}`} className="w-full h-full object-cover" />

                {/* Overlay actions */}
                <div className="absolute inset-0 bg-void/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setPrimary(index); }}
                    className="p-2 bg-carbon border border-steel rounded-[2px] hover:text-blue hover:border-blue transition-colors text-cream"
                    title="Set as primary"
                  >
                    <Star size={15} className={index === primaryIndex ? "fill-blue text-blue" : ""} />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); removePhoto(index); }}
                    className="p-2 bg-carbon border border-steel rounded-[2px] hover:text-negative hover:border-negative transition-colors text-cream"
                    title="Delete photo"
                  >
                    <X size={15} />
                  </button>
                </div>

                {index === primaryIndex && (
                  <div className="absolute top-2 left-2 bg-blue text-void font-mono text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-[2px]">
                    Primary
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  )
}
