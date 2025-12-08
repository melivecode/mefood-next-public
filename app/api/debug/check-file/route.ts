import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const filePath = searchParams.get('path')
    
    if (!filePath) {
      return NextResponse.json({ error: 'Path parameter is required' }, { status: 400 })
    }
    
    // Check if the file exists
    const absolutePath = path.join(process.cwd(), 'public', filePath)
    
    try {
      const stats = await fs.stat(absolutePath)
      return NextResponse.json({ 
        exists: true,
        path: absolutePath,
        size: stats.size,
        modified: stats.mtime,
        isFile: stats.isFile()
      })
    } catch (error) {
      return NextResponse.json({ 
        exists: false,
        path: absolutePath,
        error: (error as Error).message
      })
    }
    
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}