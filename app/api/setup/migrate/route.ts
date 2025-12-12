import { NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import { canAccessSetup, checkSetupStatus } from '@/lib/utils/setupCheck'

const execAsync = promisify(exec)

// Determine if we're on Windows
const isWindows = process.platform === 'win32'

export async function POST() {
  try {
    // Security: Only allow if setup is needed
    const canAccess = await canAccessSetup()
    if (!canAccess) {
      return NextResponse.json(
        { error: 'Setup already completed' },
        { status: 403 }
      )
    }

    // Run Prisma db push to create/sync tables
    // Using db push instead of migrate for simpler setup flow
    // On Windows, we need to use shell: true for npx to work properly
    const execOptions = {
      cwd: process.cwd(),
      env: process.env,
      shell: isWindows ? 'cmd.exe' : undefined
    }

    let stdout = ''
    let commandError = null

    try {
      const result = await execAsync('npx prisma db push --accept-data-loss', execOptions)
      stdout = result.stdout
    } catch (err) {
      // Prisma sometimes exits with non-zero even on success with warnings
      commandError = err
      console.log('Prisma db push output:', err)
    }

    try {
      // Also generate the Prisma client
      await execAsync('npx prisma generate', execOptions)
    } catch (err) {
      console.log('Prisma generate output:', err)
    }

    // Verify tables were actually created by checking setup status
    const status = await checkSetupStatus()

    if (status.tablesExist) {
      return NextResponse.json({
        success: true,
        message: 'Database tables created successfully',
        details: stdout || 'Tables synchronized'
      })
    }

    // Tables weren't created - return error
    const errorMessage = commandError instanceof Error ? commandError.message : 'Unknown error'
    const stderr = (commandError as { stderr?: string })?.stderr || ''

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create database tables',
        details: stderr || errorMessage
      },
      { status: 500 }
    )
  } catch (error) {
    console.error('Migration error:', error)

    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create database tables',
        details: errorMessage
      },
      { status: 500 }
    )
  }
}
