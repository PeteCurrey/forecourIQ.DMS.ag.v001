'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { UploadCloud, X, Star } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { useFormContext } from 'react-hook-form'
import { cn } from '@/lib/utils'

export default function PhotoUploader() {
  const { setValue, watch } = useFormContext()
  const photos = watch('photos') || []
  const primaryIndex = watch('primary_photo_index') || 0
  
  const [isUploading, setIsUploading] = useState(false)
  const supabase = createClient()

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return

    setIsUploading(true)
    const newPhotos = [...photos]
    
    // In a real app we'd get this from context/session
    // For demo purposes, we'll simulate the upload by creating object URLs
    // The actual supabase upload would look like:
    // const { data } = await supabase.storage.from('vehicle-photos').upload(`${dealershipId}/${vehicleId}/${file.name}`, file)
    
    try {
      for (const file of acceptedFiles) {
        // Mock upload - just use local object URL for the preview during creation
        const url = URL.createObjectURL(file)
        newPhotos.push(url)
      }
      
      setValue('photos', newPhotos)
      toast.success(`Uploaded ${acceptedFiles.length} photos`)
    } catch (error) {
      toast.error('Failed to upload photos')
    } finally {
      setIsUploading(false)
    }
  }, [photos, setValue])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': [],
      'image/png': [],
      'image/webp': []
    },
    maxSize: 10 * 1024 * 1024, // 10MB
  })

  const removePhoto = (index: number) => {
    const newPhotos = [...photos]
    newPhotos.splice(index, 1)
    setValue('photos', newPhotos)
    
    if (primaryIndex === index) {
      setValue('primary_photo_index', 0)
    } else if (primaryIndex > index) {
      setValue('primary_photo_index', primaryIndex - 1)
    }
  }

  const setPrimary = (index: number) => {
    setValue('primary_photo_index', index)
  }

  return (
    <div className="space-y-6">
      
      {/* Dropzone */}
      <div 
        {...getRootProps()} 
        className={cn(
          "bg-carbon border-2 border-dashed rounded-[2px] p-16 text-center cursor-pointer transition-colors duration-300 flex flex-col items-center justify-center",
          isDragActive ? "border-blue bg-blue/5" : "border-slate hover:border-blue",
          isUploading && "opacity-50 pointer-events-none"
        )}
      >
        <input {...getInputProps()} />
        <UploadCloud size={48} className={cn("mb-4", isDragActive ? "text-blue" : "text-pewter")} />
        <p className="font-syne font-bold text-lg text-cream mb-2">
          {isDragActive ? "Drop photos here" : "Drop photos here or click to browse"}
        </p>
        <p className="font-mono text-[11px] text-pewter">
          {isUploading ? "UPLOADING..." : "JPG, PNG, WEBP · MAX 10MB PER PHOTO"}
        </p>
      </div>

      {/* Grid */}
      {photos.length > 0 && (
        <div className="bg-carbon border border-steel p-6 rounded-[2px]">
          <h3 className="font-mono text-[11px] text-pewter uppercase tracking-widest mb-4">Uploaded Photos ({photos.length})</h3>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {photos.map((url: string, index: number) => (
              <div 
                key={index} 
                className={cn(
                  "relative aspect-[4/3] rounded-[2px] overflow-hidden border-2 group",
                  index === primaryIndex ? "border-blue" : "border-steel"
                )}
              >
                <img src={url} alt={`Vehicle photo ${index + 1}`} className="w-full h-full object-cover" />
                
                {/* Overlay actions */}
                <div className="absolute inset-0 bg-void/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button 
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setPrimary(index); }}
                    className="p-2 bg-carbon border border-steel rounded-[2px] hover:text-blue hover:border-blue transition-colors text-cream"
                    title="Set as primary"
                  >
                    <Star size={16} className={index === primaryIndex ? "fill-blue text-blue" : ""} />
                  </button>
                  <button 
                    type="button"
                    onClick={(e) => { e.stopPropagation(); removePhoto(index); }}
                    className="p-2 bg-carbon border border-steel rounded-[2px] hover:text-negative hover:border-negative transition-colors text-cream"
                    title="Delete photo"
                  >
                    <X size={16} />
                  </button>
                </div>

                {index === primaryIndex && (
                  <div className="absolute top-2 left-2 bg-blue text-void font-mono text-[9px] uppercase tracking-wider px-2 py-1 rounded-[2px]">
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
