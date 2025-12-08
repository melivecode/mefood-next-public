/**
 * Get the proper image URL for both development and production environments
 * @param imagePath - The image path from the database (e.g., "/uploads/restaurant/item/1.png")
 * @returns The full URL to access the image
 */
export function getImageUrl(imagePath: string | null): string | null {
  if (!imagePath) return null
  
  // In development and production, Next.js serves static files from public directory
  // The imagePath already includes the leading slash, so we can use it directly
  return imagePath
}

/**
 * Get the API-served image URL as fallback
 * @param imagePath - The image path from the database 
 * @returns The API endpoint URL to serve the image
 */
export function getImageApiUrl(imagePath: string | null): string | null {
  if (!imagePath) return null
  
  return `/api/serve-image?path=${encodeURIComponent(imagePath)}`
}