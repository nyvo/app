import { supabase } from '@/lib/supabase'

// Storage bucket names
const COURSE_IMAGES_BUCKET = 'course-images'
const SELLER_LOGOS_BUCKET = 'seller-logos'

// Accepted image types
export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
export const MAX_IMAGE_SIZE = 5 * 1024 * 1024 // 5MB

// Generate unique file path for course image
function generateCourseImagePath(courseId: string, fileName: string): string {
  const extension = fileName.split('.').pop()?.toLowerCase() || 'jpg'
  const timestamp = Date.now()
  return `courses/${courseId}/${timestamp}.${extension}`
}

// Upload course image
export async function uploadCourseImage(
  courseId: string,
  file: File
): Promise<{ url: string | null; error: Error | null }> {
  // Validate file type
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    return {
      url: null,
      error: new Error('Ugyldig filtype. Bruk JPG, PNG eller WebP.')
    }
  }

  // Validate file size
  if (file.size > MAX_IMAGE_SIZE) {
    return {
      url: null,
      error: new Error('Bildet er for stort. Maks 5 MB.')
    }
  }

  const filePath = generateCourseImagePath(courseId, file.name)

  const { error: uploadError } = await supabase.storage
    .from(COURSE_IMAGES_BUCKET)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false
    })

  if (uploadError) {
    return { url: null, error: uploadError as Error }
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from(COURSE_IMAGES_BUCKET)
    .getPublicUrl(filePath)

  return { url: urlData.publicUrl, error: null }
}

// Delete course image by URL with ownership verification
export async function deleteCourseImage(
  courseId: string,
  imageUrl: string,
  sellerId: string
): Promise<{ error: Error | null }> {
  // 1. Verify course belongs to the seller
  const { data: course, error: courseError } = await supabase
    .from('courses')
    .select('seller_id')
    .eq('id', courseId)
    .single<{ seller_id: string }>()

  if (courseError || !course) {
    return { error: new Error('Fant ikke kurset.') }
  }

  if (course.seller_id !== sellerId) {
    return { error: new Error('Mangler tilgang til å slette dette bildet.') }
  }

  // 2. Extract file path from URL
  const urlParts = imageUrl.split(`${COURSE_IMAGES_BUCKET}/`)
  if (urlParts.length !== 2) {
    return { error: new Error('Bildet kunne ikke slettes. Prøv igjen.') }
  }

  const filePath = urlParts[1]

  // 3. Verify the file path belongs to this course (prevent path traversal)
  const expectedPrefix = `courses/${courseId}/`
  if (!filePath.startsWith(expectedPrefix)) {
    return { error: new Error('Bildet tilhører ikke dette kurset.') }
  }

  // 4. Delete the file
  const { error } = await supabase.storage
    .from(COURSE_IMAGES_BUCKET)
    .remove([filePath])

  if (error) {
    return { error: error as Error }
  }

  return { error: null }
}

// Utility: Create object URL for preview (client-side only)
export function createImagePreviewUrl(file: File): string {
  return URL.createObjectURL(file)
}

// Utility: Revoke preview URL to free memory
export function revokeImagePreviewUrl(url: string): void {
  URL.revokeObjectURL(url)
}

// Upload seller logo / teacher photo. Used by onboarding and the seller
// profile editor. Returns the public URL on success.
export async function uploadSellerLogo(
  sellerId: string,
  file: File,
): Promise<{ url: string | null; error: Error | null }> {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    return { url: null, error: new Error('Ugyldig filtype. Bruk JPG, PNG eller WebP.') }
  }
  if (file.size > MAX_IMAGE_SIZE) {
    return { url: null, error: new Error('Bildet er for stort. Maks 5 MB.') }
  }

  const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const filePath = `${sellerId}/${Date.now()}.${extension}`

  const { error: uploadError } = await supabase.storage
    .from(SELLER_LOGOS_BUCKET)
    .upload(filePath, file, { cacheControl: '3600', upsert: false })

  if (uploadError) {
    return { url: null, error: uploadError as Error }
  }

  const { data: urlData } = supabase.storage.from(SELLER_LOGOS_BUCKET).getPublicUrl(filePath)
  return { url: urlData.publicUrl, error: null }
}

// Delete a seller logo by URL. The logo path is prefixed with the seller id, so
// we verify the URL belongs to this seller before removing (prevents path
// traversal into another seller's folder).
export async function deleteSellerLogo(
  sellerId: string,
  logoUrl: string,
): Promise<{ error: Error | null }> {
  const urlParts = logoUrl.split(`${SELLER_LOGOS_BUCKET}/`)
  if (urlParts.length !== 2) {
    return { error: new Error('Bildet kunne ikke slettes. Prøv igjen.') }
  }

  const filePath = urlParts[1]
  if (!filePath.startsWith(`${sellerId}/`)) {
    return { error: new Error('Bildet tilhører ikke dette studioet.') }
  }

  const { error } = await supabase.storage.from(SELLER_LOGOS_BUCKET).remove([filePath])
  if (error) {
    return { error: error as Error }
  }

  return { error: null }
}
