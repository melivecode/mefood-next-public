import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

// This endpoint dynamically serves images from the uploads directory
// It bypasses Next.js static file serving which requires rebuild/restart
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: imagePath } = await params
    
    if (!imagePath || imagePath.length === 0) {
      return NextResponse.json({ error: 'Invalid path' }, { status: 400 })
    }
    
    // Reconstruct the path: /api/images/restaurantId/itemId/filename.ext
    const fullPath = imagePath.join('/')
    
    // Build absolute path to the image file
    const absolutePath = path.join(process.cwd(), 'public', 'uploads', fullPath)
    
    // Security: Ensure path doesn't escape uploads directory
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads')
    const normalizedPath = path.normalize(absolutePath)
    
    if (!normalizedPath.startsWith(uploadsDir)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }
    
    // Check if file exists
    try {
      const stats = await fs.stat(absolutePath)
      if (!stats.isFile()) {
        return NextResponse.json({ error: 'Not a file' }, { status: 400 })
      }
    } catch (_) {
      // File doesn't exist
      return NextResponse.json({ error: 'Image not found' }, { status: 404 })
    }
    
    // Read the file
    const fileBuffer = await fs.readFile(absolutePath)
    
    // Determine content type from extension
    const ext = path.extname(absolutePath).toLowerCase()
    let contentType = 'application/octet-stream'
    
    switch (ext) {
      case '.jpg':
      case '.jpeg':
        contentType = 'image/jpeg'
        break
      case '.png':
        contentType = 'image/png'
        break
      case '.gif':
        contentType = 'image/gif'
        break
      case '.webp':
        contentType = 'image/webp'
        break
      case '.svg':
        contentType = 'image/svg+xml'
        break
    }
    
    // Return image with proper headers
    // Convert Buffer to Uint8Array for Response constructor
    return new Response(new Uint8Array(fileBuffer), {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': fileBuffer.length.toString(),
        // Cache for 1 year since images are immutable (new uploads get new filenames)
        'Cache-Control': 'public, max-age=31536000, immutable',
        // Allow image to be displayed in img tags
        'Content-Disposition': 'inline',
      },
    })
    
  } catch (error) {
    console.error('Image serving error:', error)
    return NextResponse.json(
      { error: 'Failed to serve image' },
      { status: 500 }
    )
  }
}