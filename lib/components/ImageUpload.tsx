'use client'

import { useState, useRef, useImperativeHandle, forwardRef } from 'react'
import {
  Box,
  Button,
  Typography,
  Alert,
  CircularProgress,
  IconButton,
  Paper,
  Dialog,
  DialogContent,
} from '@mui/material'
import {
  CloudUpload,
  Delete,
  Image as ImageIcon,
  Close
} from '@mui/icons-material'
import { getImageUrl } from '@/lib/utils/imageUrl'

export interface ImageUploadRef {
  uploadSelectedFile: () => Promise<string | null>
  hasSelectedFile: () => boolean
  hasPendingDeletion: () => boolean
  deleteImage: () => Promise<void>
}

interface ImageUploadProps {
  restaurantId: string
  menuItemId?: string | null
  currentImage?: string | null
  onImageUploaded?: (imagePath: string) => void
  onImageDeleted?: () => void
  onFileSelected?: (file: File | null) => void
  disabled?: boolean
}

export const ImageUpload = forwardRef<ImageUploadRef, ImageUploadProps>(({
  restaurantId,
  menuItemId,
  currentImage,
  onImageUploaded,
  onImageDeleted: _onImageDeleted,
  onFileSelected,
  disabled = false
}, ref) => {
  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [pendingDeletion, setPendingDeletion] = useState(false)
  const [zoomOpen, setZoomOpen] = useState(false)
  const [zoomImage, setZoomImage] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    uploadSelectedFile: async () => {
      if (!selectedFile || !menuItemId) return null
      
      try {
        setUploading(true)
        setError(null)

        const formData = new FormData()
        formData.append('image', selectedFile)

        // Use PUT method when replacing an existing image, POST when uploading new
        const method = currentImage ? 'PUT' : 'POST'
        const response = await fetch(`/api/restaurant/${restaurantId}/menu-items/${menuItemId}/image`, {
          method,
          body: formData
        })

        const result = await response.json()

        if (!response.ok) {
          throw new Error(result.error || 'Failed to upload image')
        }

        // Clear the selected file and preview
        setPreview(null)
        setSelectedFile(null)
        onFileSelected?.(null)
        
        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }

        return result.imagePath
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to upload image')
        throw err
      } finally {
        setUploading(false)
      }
    },
    hasSelectedFile: () => !!selectedFile,
    hasPendingDeletion: () => pendingDeletion,
    deleteImage: async () => {
      if (!menuItemId || !currentImage) return
      
      try {
        setDeleting(true)
        setError(null)

        const response = await fetch(`/api/restaurant/${restaurantId}/menu-items/${menuItemId}/image`, {
          method: 'DELETE'
        })

        const result = await response.json()

        if (!response.ok) {
          throw new Error(result.error || 'Failed to delete image')
        }

        // Reset pending deletion state
        setPendingDeletion(false)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete image')
        throw err
      } finally {
        setDeleting(false)
      }
    }
  }))

  const handleFileSelect = () => {
    if (disabled || !menuItemId) return
    fileInputRef.current?.click()
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png']
    if (!allowedTypes.includes(file.type)) {
      setError('Invalid file type. Only JPG, JPEG, and PNG are allowed.')
      setPreview(null)
      setSelectedFile(null)
      return
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setError('File size too large. Maximum size is 5MB.')
      setPreview(null)
      setSelectedFile(null)
      return
    }

    setError(null)
    setSelectedFile(file)
    onFileSelected?.(file)

    // Create preview URL
    const reader = new FileReader()
    reader.onload = (e) => {
      setPreview(e.target?.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleUpload = async () => {
    if (!selectedFile || !menuItemId) return

    setUploading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('image', selectedFile)

      // Use PUT method when replacing an existing image, POST when uploading new
      const method = currentImage ? 'PUT' : 'POST'
      const response = await fetch(`/api/restaurant/${restaurantId}/menu-items/${menuItemId}/image`, {
        method,
        body: formData
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to upload image')
      }

      onImageUploaded?.(result.imagePath)
      setPreview(null)
      setSelectedFile(null)
      onFileSelected?.(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload image')
    } finally {
      setUploading(false)
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleCancelPreview = () => {
    setPreview(null)
    setSelectedFile(null)
    onFileSelected?.(null)
    setError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleDeleteImage = () => {
    if (!menuItemId || !currentImage) return
    // Just mark for deletion instead of actually deleting
    setPendingDeletion(true)
    // Clear any selected file since we're deleting the image
    setSelectedFile(null)
    setPreview(null)
    onFileSelected?.(null)
  }

  const handleCancelDeletion = () => {
    setPendingDeletion(false)
  }

  const handleImageClick = (imageSrc: string | null) => {
    const imageUrl = getImageUrl(imageSrc)
    if (imageUrl) {
      setZoomImage(imageUrl)
      setZoomOpen(true)
    }
  }

  const handleCloseZoom = () => {
    setZoomOpen(false)
    setZoomImage(null)
  }

  return (
    <Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Current Image Display */}
      {currentImage && !pendingDeletion && (
        <Paper 
          sx={{ 
            mb: 1.5
          }}
        >
          
          <Box sx={{ position: 'relative', width: '100%' }}>
            <Box
              sx={{
                width: '100%',
                height: 210,
                borderRadius: 2,
                overflow: 'hidden',
                borderColor: 'primary.dark'
              }}
            >
              <img
                src={getImageUrl(currentImage) || ''}
                alt="Current menu item image"
                onClick={() => handleImageClick(currentImage)}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  cursor: 'pointer'
                }}
              />
            </Box>
            <IconButton
              onClick={handleDeleteImage}
              disabled={disabled || deleting}
              size="small"
              sx={{
                position: 'absolute',
                top: -8,
                right: -8,
                backgroundColor: 'error.main',
                color: 'white',
                width: 24,
                height: 24,
                '&:hover': {
                  backgroundColor: 'error.dark'
                },
                '&:disabled': {
                  backgroundColor: 'grey.400'
                }
              }}
            >
              {deleting ? <CircularProgress size={12} color="inherit" /> : <Close sx={{ fontSize: 14 }} />}
            </IconButton>
          </Box>
        </Paper>
      )}

      {/* Pending Deletion Display */}
      {currentImage && pendingDeletion && (
        <Paper 
          sx={{ 
            mb: 1.5
          }}
        >
          <Box sx={{ position: 'relative', width: '100%' }}>
            <Box
              sx={{
                width: '100%',
                height: 210,
                borderRadius: 2,
                overflow: 'hidden',
                opacity: 0.6
              }}
            >
              <img
                src={getImageUrl(currentImage) || ''}
                alt="Image marked for deletion"
                onClick={() => handleImageClick(currentImage)}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  cursor: 'pointer'
                }}
              />
            </Box>
            <Button
              variant="outlined"
              size="small"
              onClick={handleCancelDeletion}
              disabled={disabled}
              sx={{
                position: 'absolute',
                top: 8,
                right: 8,
                backgroundColor: 'white',
                color: 'error.main',
                borderColor: 'error.main',
                '&:hover': {
                  backgroundColor: 'error.50',
                  borderColor: 'error.dark'
                }
              }}
            >
              Undo Delete
            </Button>
          </Box>
        </Paper>
      )}

      {/* Image Preview */}
      {preview && (
        <Box sx={{ mb: 1.5 }}>
          <img
            src={preview}
            alt="Preview"
            onClick={() => handleImageClick(preview)}
            style={{
              width: '100%',
              height: '160px',
              objectFit: 'cover',
              cursor: 'pointer',
              borderRadius: '8px',
              display: 'block',
              marginBottom: '16px'
            }}
          />
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Selected: {selectedFile?.name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Will be resized to 512x512 pixels
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              startIcon={<Delete />}
              onClick={handleCancelPreview}
              disabled={uploading}
              size="small"
              sx={{ 
                borderRadius: 2,
                textTransform: 'none',
                color: 'text.primary',
                borderColor: 'text.secondary'
              }}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              startIcon={uploading ? <CircularProgress size={16} color="inherit" /> : <CloudUpload />}
              onClick={handleUpload}
              disabled={uploading || !selectedFile}
              size="small"
              sx={{ 
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 600
              }}
            >
              {uploading ? 'Uploading...' : (currentImage ? 'Replace Image' : 'Upload Image')}
            </Button>
          </Box>
        </Box>
      )}

      {/* Upload Area */}
      {!preview && !pendingDeletion && (
        <Paper
          elevation={1}
          sx={{
            p: 2,
            border: '2px dashed',
            borderColor: currentImage ? 'divider' : 'primary.main',
            backgroundColor: disabled ? 'action.disabledBackground' : 'background.paper',
            cursor: disabled || !menuItemId ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s ease',
            '&:hover': {
              borderColor: disabled || !menuItemId ? 'divider' : 'primary.dark',
              backgroundColor: disabled || !menuItemId ? 'action.disabledBackground' : 'primary.50'
            }
          }}
          onClick={handleFileSelect}
        >
          <Box sx={{ textAlign: 'center' }}>
            <Box sx={{ mb: 2 }}>
              <ImageIcon sx={{ fontSize: 40, color: 'primary.dark' }} />
            </Box>
            
            <Typography variant="body1" sx={{ fontWeight: 600, mb: 1 }}>
              {currentImage ? 'Replace Image' : 'Upload Image'}
            </Typography>
            
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {!menuItemId 
                ? 'Save menu item first to enable image upload'
                : 'Click to select JPG, JPEG or PNG (max 5MB)'
              }
            </Typography>

            <Typography variant="caption" color="text.secondary">
              Images will be automatically resized to 512x512 pixels
            </Typography>
          </Box>
        </Paper>
      )}

      {/* Upload Area for Pending Deletion */}
      {!preview && pendingDeletion && (
        <Paper
          elevation={1}
          sx={{
            p: 2,
            border: '2px dashed',
            borderColor: 'primary.main',
            backgroundColor: disabled ? 'action.disabledBackground' : 'background.paper',
            cursor: disabled || !menuItemId ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s ease',
            '&:hover': {
              borderColor: disabled || !menuItemId ? 'divider' : 'primary.dark',
              backgroundColor: disabled || !menuItemId ? 'action.disabledBackground' : 'primary.50'
            }
          }}
          onClick={handleFileSelect}
        >
          <Box sx={{ textAlign: 'center' }}>
            <Box sx={{ mb: 2 }}>
              <ImageIcon sx={{ fontSize: 40, color: 'primary.dark' }} />
            </Box>
            
            <Typography variant="body1" sx={{ fontWeight: 600, mb: 1 }}>
              Upload New Image
            </Typography>
            
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {!menuItemId 
                ? 'Save menu item first to enable image upload'
                : 'Click to select JPG, JPEG or PNG (max 5MB)'
              }
            </Typography>

            <Typography variant="caption" color="text.secondary">
              Images will be automatically resized to 512x512 pixels
            </Typography>
          </Box>
        </Paper>
      )}

      {/* Image Zoom Dialog */}
      <Dialog
        open={zoomOpen}
        onClose={handleCloseZoom}
        maxWidth="md"
        fullWidth
        sx={{
          '& .MuiDialog-paper': {
            backgroundColor: 'transparent',
            boxShadow: 'none'
          }
        }}
      >
        <DialogContent sx={{ p: 0, display: 'flex', justifyContent: 'center' }}>
          {zoomImage && (
            <Box
              onClick={handleCloseZoom}
              sx={{
                cursor: 'pointer',
                maxWidth: '100%',
                maxHeight: '80vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <img
                src={zoomImage}
                alt="Zoomed image"
                style={{
                  maxWidth: '100%',
                  maxHeight: '80vh',
                  objectFit: 'contain',
                  borderRadius: '8px',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
                }}
              />
            </Box>
          )}
        </DialogContent>
      </Dialog>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png"
        onChange={handleFileChange}
        style={{ display: 'none' }}
        disabled={disabled || !menuItemId}
      />
    </Box>
  )
})

ImageUpload.displayName = 'ImageUpload'