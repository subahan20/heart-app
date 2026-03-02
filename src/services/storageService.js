import { supabase } from './supabase'

export const storageService = {
  /**
   * Uploads a food image to Supabase Storage
   * @param {string} base64Data - Base64 string including metadata (data:image/jpeg;base64,...)
   * @param {string} userId - The user's ID for folder organization
   * @returns {Promise<string>} - The public URL of the uploaded image
   */
  uploadFoodImage: async (base64Data, userId) => {
    try {
      
      // 1. Convert base64 to Blob
      const [meta, data] = base64Data.split(',')
      if (!data) throw new Error('Invalid base64 data')
      
      const mimeType = meta.match(/:(.*?);/)?.[1] || 'image/jpeg'
      const binary = atob(data)
      const array = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i++) {
        array[i] = binary.charCodeAt(i)
      }
      const blob = new Blob([array], { type: mimeType })

      // 2. Generate unique file path
      const extension = mimeType.split('/')[1] || 'jpg'
      const fileName = `${Date.now()}.${extension}`
      const filePath = `${userId || 'anonymous'}/${fileName}`
      

      // 3. Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('food-images')
        .upload(filePath, blob, {
          contentType: mimeType,
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) {
        console.error('Supabase Storage Error:', uploadError)
        throw uploadError
      }


      // 4. Get Public URL
      const { data: { publicUrl } } = supabase.storage
        .from('food-images')
        .getPublicUrl(filePath)

      return publicUrl
    } catch (error) {
      console.error('Storage Upload Exception:', error)
      throw error
    }
  }
}
