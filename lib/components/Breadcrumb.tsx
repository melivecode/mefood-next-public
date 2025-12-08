'use client'

import { 
  Breadcrumbs, 
  Link, 
  Typography, 
  Box 
} from '@mui/material'
import { usePathname, useRouter } from 'next/navigation'
import { Home } from '@mui/icons-material'

interface BreadcrumbItem {
  label: string
  href?: string
}

export interface BreadcrumbProps {
  items?: BreadcrumbItem[]
}

export function Breadcrumb({ items }: BreadcrumbProps) {
  const pathname = usePathname()
  const router = useRouter()

  const generateBreadcrumbsFromPath = (): BreadcrumbItem[] => {
    if (items) return items

    const segments = pathname.split('/').filter(Boolean)
    const breadcrumbItems: BreadcrumbItem[] = [
      { label: 'Home', href: '/' }
    ]

    let currentPath = ''
    segments.forEach((segment, index) => {
      currentPath += `/${segment}`
      const isLast = index === segments.length - 1
      
      let label = segment.charAt(0).toUpperCase() + segment.slice(1)
      
      // Replace common path names with more readable labels
      const pathMappings: Record<string, string> = {
        'admin': 'Admin Panel',
        'restaurant-admin': 'Restaurant Admin',
        'dashboard': 'Dashboard',
        'auth': 'Authentication',
        'signin': 'Sign In',
        'signup': 'Sign Up',
        'unauthorized': 'Unauthorized'
      }
      
      if (pathMappings[segment]) {
        label = pathMappings[segment]
      }

      breadcrumbItems.push({
        label,
        href: isLast ? undefined : currentPath
      })
    })

    return breadcrumbItems
  }

  const breadcrumbItems = generateBreadcrumbsFromPath()

  if (breadcrumbItems.length <= 1) {
    return null
  }

  return (
    <Box sx={{ mb: 2 }}>
      <Breadcrumbs aria-label="breadcrumb">
        {breadcrumbItems.map((item, index) => {
          const isLast = index === breadcrumbItems.length - 1
          
          if (index === 0 && item.href) {
            return (
              <Link
                key={index}
                color="inherit"
                href={item.href}
                onClick={(e) => {
                  e.preventDefault()
                  router.push(item.href!)
                }}
                sx={{ 
                  display: 'flex', 
                  alignItems: 'center',
                  textDecoration: 'none',
                  '&:hover': {
                    textDecoration: 'underline'
                  }
                }}
              >
                <Home sx={{ mr: 0.5, fontSize: 16 }} />
                {item.label}
              </Link>
            )
          }

          if (isLast || !item.href) {
            return (
              <Typography key={index} color="text.primary">
                {item.label}
              </Typography>
            )
          }

          return (
            <Link
              key={index}
              color="inherit"
              href={item.href}
              onClick={(e) => {
                e.preventDefault()
                router.push(item.href!)
              }}
              sx={{ 
                textDecoration: 'none',
                '&:hover': {
                  textDecoration: 'underline'
                }
              }}
            >
              {item.label}
            </Link>
          )
        })}
      </Breadcrumbs>
    </Box>
  )
}