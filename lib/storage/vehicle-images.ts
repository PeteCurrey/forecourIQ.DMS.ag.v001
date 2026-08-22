import { createClient } from '@/lib/supabase/client'

export interface UploadedVehicleImage {
  id?: string
  storagePath: string
  url: string
  fileName: string
  fileSize: number
  mimeType: string
}

export const STORAGE_BUCKET_VEHICLES = 'vehicle-photos'
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024 // 10MB

/**
 * Client-side helper for uploading vehicle images directly to Supabase Storage.
 * Scoped by dealershipId and vehicleId/tempSessionId.
 */
export async function uploadVehicleImage(
  file: File,
  dealershipId: string,
  vehicleIdOrTemp: string
): Promise<UploadedVehicleImage> {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    throw new Error('Invalid file type. Only JPG, PNG, and WebP images are allowed.')
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error('File size exceeds the maximum limit of 10MB.')
  }

  const supabase = createClient()
  const fileExt = file.name.split('.').pop() || 'jpg'
  const randomSuffix = Math.random().toString(36).substring(2, 9)
  const safeName = `${Date.now()}-${randomSuffix}.${fileExt}`
  const storagePath = `${dealershipId}/${vehicleIdOrTemp}/${safeName}`

  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKET_VEHICLES)
    .upload(storagePath, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type,
    })

  if (uploadError) {
    // If bucket doesn't exist yet in development, provide clear feedback
    console.error('[Storage] Upload error:', uploadError)
    throw new Error(`Upload failed: ${uploadError.message}`)
  }

  const { data: { publicUrl } } = supabase.storage
    .from(STORAGE_BUCKET_VEHICLES)
    .getPublicUrl(storagePath)

  return {
    storagePath,
    url: publicUrl,
    fileName: file.name,
    fileSize: file.size,
    mimeType: file.type,
  }
}

/**
 * Delete a vehicle image from Supabase Storage.
 */
export async function deleteVehicleImage(storagePath: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.storage
    .from(STORAGE_BUCKET_VEHICLES)
    .remove([storagePath])

  if (error) {
    console.error('[Storage] Delete error:', error)
    throw new Error(`Failed to delete image: ${error.message}`)
  }
}
