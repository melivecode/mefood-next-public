'use client'

import { useState } from 'react'

interface MenuItemImageProps {
  imagePath: string | null
  alt: string
  style?: React.CSSProperties
  className?: string
}

export function MenuItemImage({ imagePath, alt, style, className }: MenuItemImageProps) {
  const [imageError, setImageError] = useState(false)

  if (!imagePath) return null

  // Handle both old (/uploads/) and new (/api/images/) URLs
  let imageUrl = imagePath
  
  // If it's an old /uploads/ URL and we get an error, try the API endpoint
  if (imageError && imagePath.startsWith('/uploads/')) {
    imageUrl = imagePath.replace('/uploads/', '/api/images/')
  }

  const handleError = () => {
    if (!imageError && imagePath.startsWith('/uploads/')) {
      // Try the API endpoint as fallback
      setImageError(true)
    }
  }

  return (
    <img
      src={imageUrl}
      alt={alt}
      style={style}
      className={className}
      onError={handleError}
      loading="lazy"
    />
  )
}