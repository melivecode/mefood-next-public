import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'
import sharp from 'sharp'
import { promises as fs } from 'fs'
import path from 'path'

const prisma = new PrismaClient()

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: _, itemId } = await params


    // Check if menu item exists and belongs to user
    const menuItem = await prisma.menuItem.findFirst({
      where: {
        id: itemId,
        userId: session.user.id
      }
    })

    if (!menuItem) {
      return NextResponse.json({ error: 'Menu item not found' }, { status: 404 })
    }

    const formData = await request.formData()
    const file = formData.get('image') as File

    if (!file) {
      return NextResponse.json({ error: 'No image file provided' }, { status: 400 })
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type. Only JPG, JPEG, and PNG are allowed.' }, { status: 400 })
    }

    // Create upload directory
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', session.user.id, itemId)
    await fs.mkdir(uploadsDir, { recursive: true })

    // Get next running number
    const existingFiles = await fs.readdir(uploadsDir).catch(() => [])
    const runningNumber = existingFiles.length + 1

    // Get file extension
    const extension = file.type === 'image/png' ? 'png' : 'jpg'
    const filename = `${runningNumber}.${extension}`
    const filepath = path.join(uploadsDir, filename)

    // Process image: resize to 512x512 and optimize
    const buffer = Buffer.from(await file.arrayBuffer())
    const processedImage = await sharp(buffer)
      .resize(512, 512, {
        fit: 'cover',
        position: 'center'
      })
      .jpeg({ quality: 85, mozjpeg: true })
      .toBuffer()

    // Save processed image
    await fs.writeFile(filepath, processedImage)

    // Update database with API endpoint path for dynamic serving
    // Using /api/images/ instead of /uploads/ to serve dynamically
    const imagePath = `/api/images/${session.user.id}/${itemId}/${filename}`
    
    await prisma.menuItem.update({
      where: { id: itemId },
      data: { image: imagePath }
    })

    return NextResponse.json({
      success: true,
      imagePath: imagePath,
      message: 'Image uploaded successfully'
    })

  } catch (error) {
    console.error('Image upload error:', error)
    return NextResponse.json(
      { error: 'Failed to upload image' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: _, itemId } = await params


    // Get menu item with current image
    const menuItem = await prisma.menuItem.findFirst({
      where: {
        id: itemId,
        userId: session.user.id
      }
    })

    if (!menuItem) {
      return NextResponse.json({ error: 'Menu item not found' }, { status: 404 })
    }

    const formData = await request.formData()
    const file = formData.get('image') as File

    if (!file) {
      return NextResponse.json({ error: 'No image file provided' }, { status: 400 })
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type. Only JPG, JPEG, and PNG are allowed.' }, { status: 400 })
    }

    // Delete old image file if exists
    if (menuItem.image) {
      const oldFilepath = path.join(process.cwd(), 'public', menuItem.image)
      try {
        await fs.unlink(oldFilepath)
      } catch (_) {
        // File might not exist, that's ok
        console.log('Old file not found, continuing...')
      }
    }

    // Create upload directory
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', session.user.id, itemId)
    await fs.mkdir(uploadsDir, { recursive: true })

    // Get next running number
    const existingFiles = await fs.readdir(uploadsDir).catch(() => [])
    const runningNumber = existingFiles.length + 1

    // Get file extension
    const extension = file.type === 'image/png' ? 'png' : 'jpg'
    const filename = `${runningNumber}.${extension}`
    const filepath = path.join(uploadsDir, filename)

    // Process image: resize to 512x512 and optimize
    const buffer = Buffer.from(await file.arrayBuffer())
    const processedImage = await sharp(buffer)
      .resize(512, 512, {
        fit: 'cover',
        position: 'center'
      })
      .jpeg({ quality: 85, mozjpeg: true })
      .toBuffer()

    // Save processed image
    await fs.writeFile(filepath, processedImage)

    // Update database with API endpoint path for dynamic serving
    // Using /api/images/ instead of /uploads/ to serve dynamically
    const imagePath = `/api/images/${session.user.id}/${itemId}/${filename}`
    
    await prisma.menuItem.update({
      where: { id: itemId },
      data: { image: imagePath }
    })

    return NextResponse.json({
      success: true,
      imagePath: imagePath,
      message: 'Image replaced successfully'
    })

  } catch (error) {
    console.error('Image replacement error:', error)
    return NextResponse.json(
      { error: 'Failed to replace image' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: _, itemId } = await params


    // Get menu item with current image
    const menuItem = await prisma.menuItem.findFirst({
      where: {
        id: itemId,
        userId: session.user.id
      }
    })

    if (!menuItem) {
      return NextResponse.json({ error: 'Menu item not found' }, { status: 404 })
    }

    // Delete physical file if exists
    if (menuItem.image) {
      const filepath = path.join(process.cwd(), 'public', menuItem.image)
      try {
        await fs.unlink(filepath)
      } catch (_) {
        // File might not exist, that's ok
        console.log('File not found, continuing...')
      }
    }

    // Update database to remove image path
    await prisma.menuItem.update({
      where: { id: itemId },
      data: { image: null }
    })

    return NextResponse.json({
      success: true,
      message: 'Image deleted successfully'
    })

  } catch (error) {
    console.error('Image delete error:', error)
    return NextResponse.json(
      { error: 'Failed to delete image' },
      { status: 500 }
    )
  }
}