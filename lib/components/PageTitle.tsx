'use client'

import { Box, Typography, Button, useTheme, useMediaQuery } from '@mui/material'
import { ArrowBack } from '@mui/icons-material'
import { useRouter } from 'next/navigation'

interface PageTitleProps {
  title: string
  showBackButton?: boolean
  backButtonProps?: {
    label?: string
    href?: string
  }
}

export function PageTitle({ 
  title, 
  showBackButton = false, 
  backButtonProps 
}: PageTitleProps) {
  const router = useRouter()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))

  const handleBackClick = () => {
    if (backButtonProps?.href) {
      router.push(backButtonProps.href)
    } else {
      router.back()
    }
  }

  if (isMobile) {
    // Mobile layout - back button above title
    return (
      <Box sx={{ mb: 2 }}>
        {showBackButton && (
          <Button
            startIcon={<ArrowBack />}
            onClick={handleBackClick}
            sx={{ mb: 1 }}
            variant="text"
            color="inherit"
          >
            {backButtonProps?.label || 'Back'}
          </Button>
        )}
        
        <Typography variant="h4" component="h1" sx={{ mb: 0.5 }}>
          {title}
        </Typography>
      </Box>
    )
  }

  // Desktop layout - back button on the right side
  return (
    <Box sx={{ mb: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h4" component="h1" sx={{ mb: 0.5 }}>
            {title}
          </Typography>
        </Box>
        
        {showBackButton && (
          <Button
            startIcon={<ArrowBack />}
            onClick={handleBackClick}
            variant="text"
            color="inherit"
            sx={{ flexShrink: 0, ml: 3 }}
          >
            {backButtonProps?.label || 'Back'}
          </Button>
        )}
      </Box>
    </Box>
  )
}