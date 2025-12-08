'use client'

import { useState, useEffect } from 'react'
import { Typography, Box } from '@mui/material'
import { useSession } from 'next-auth/react'

interface RestaurantHeaderProps {
  /** Whether to show the restaurant name */
  showRestaurantName?: boolean
  /** Custom title to display below restaurant name */
  title?: string
  /** Typography variant for restaurant name */
  restaurantNameVariant?: 'h4' | 'h5' | 'h6' | 'subtitle1' | 'subtitle2'
  /** Typography variant for title */
  titleVariant?: 'h4' | 'h5' | 'h6' | 'subtitle1' | 'subtitle2'
  /** Custom styling for the container */
  sx?: any
  /** Whether to center align the text */
  center?: boolean
  /** Margin bottom for spacing */
  mb?: number
  /** Whether to display restaurant name and title on the same line */
  sameLine?: boolean
  /** Icon to display before the restaurant name */
  icon?: React.ReactNode
}

export function RestaurantHeader({
  showRestaurantName = true,
  title,
  restaurantNameVariant = 'h6',
  titleVariant = 'h5',
  sx,
  center = false,
  mb = 0,
  sameLine = false,
  icon
}: RestaurantHeaderProps) {
  const { data: session } = useSession()
  const [restaurantName, setRestaurantName] = useState<string>('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchRestaurantName = async () => {
      if (session?.user?.restaurantName && showRestaurantName) {
        setRestaurantName(session.user.restaurantName)
        setLoading(false)
      } else {
        setLoading(false)
      }
    }

    fetchRestaurantName()
  }, [session?.user?.restaurantName, showRestaurantName])

  if (loading) {
    return null
  }

  if (!showRestaurantName && !title) {
    return null
  }

  return (
    <Box 
      sx={{
        textAlign: center ? 'center' : 'left',
        mb,
        ...sx
      }}
    >
      {sameLine && showRestaurantName && restaurantName && title ? (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          {icon && (
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center',
              color: 'primary.dark',
              fontSize: {
                xs: restaurantNameVariant === 'h4' ? '1.75rem' : 
                     restaurantNameVariant === 'h5' ? '1.4rem' :
                     restaurantNameVariant === 'h6' ? '1.1rem' : '1rem',
                sm: restaurantNameVariant === 'h4' ? '2rem' : 
                     restaurantNameVariant === 'h5' ? '1.5rem' :
                     restaurantNameVariant === 'h6' ? '1.2rem' : '1.1rem',
                md: restaurantNameVariant === 'h4' ? '2.125rem' : 
                     restaurantNameVariant === 'h5' ? '1.6rem' :
                     restaurantNameVariant === 'h6' ? '1.25rem' : '1rem'
              }
            }}>
              {icon}
            </Box>
          )}
          <Typography 
            variant={restaurantNameVariant}
            sx={{ 
              fontWeight: 600, 
              color: 'primary.dark',
              fontSize: {
                xs: restaurantNameVariant === 'h4' ? '1.75rem' : 
                     restaurantNameVariant === 'h5' ? '1.4rem' :
                     restaurantNameVariant === 'h6' ? '1.1rem' : '1rem',
                sm: restaurantNameVariant === 'h4' ? '2rem' : 
                     restaurantNameVariant === 'h5' ? '1.5rem' :
                     restaurantNameVariant === 'h6' ? '1.2rem' : '1.1rem',
                md: restaurantNameVariant === 'h4' ? '2.125rem' : 
                     restaurantNameVariant === 'h5' ? '1.6rem' :
                     restaurantNameVariant === 'h6' ? '1.25rem' : '1rem'
              }
            }}
          >
            {restaurantName}
          </Typography>
          <Typography 
            variant="body1"
            sx={{ 
              color: 'text.secondary',
              fontSize: { xs: '0.875rem', sm: '1rem' }
            }}
          >
            •
          </Typography>
          <Typography 
            variant={titleVariant}
            sx={{ 
              fontWeight: 700, 
              color: 'primary.dark',
              fontSize: {
                xs: titleVariant === 'h4' ? '1.75rem' : 
                     titleVariant === 'h5' ? '1.3rem' :
                     titleVariant === 'h6' ? '1.1rem' : '1rem',
                sm: titleVariant === 'h4' ? '2rem' : 
                     titleVariant === 'h5' ? '1.4rem' :
                     titleVariant === 'h6' ? '1.2rem' : '1.1rem',
                md: titleVariant === 'h4' ? '2.125rem' : 
                     titleVariant === 'h5' ? '1.5rem' :
                     titleVariant === 'h6' ? '1.25rem' : '1rem'
              }
            }}
          >
            {title}
          </Typography>
        </Box>
      ) : (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {/* Icon on the left - centered vertically */}
          {icon && (
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center',
              color: 'primary.dark',
              fontSize: {
                xs: restaurantNameVariant === 'h4' ? '1.75rem' : 
                     restaurantNameVariant === 'h5' ? '1.4rem' :
                     restaurantNameVariant === 'h6' ? '1.1rem' : '1rem',
                sm: restaurantNameVariant === 'h4' ? '2rem' : 
                     restaurantNameVariant === 'h5' ? '1.5rem' :
                     restaurantNameVariant === 'h6' ? '1.2rem' : '1.1rem',
                md: restaurantNameVariant === 'h4' ? '2.125rem' : 
                     restaurantNameVariant === 'h5' ? '1.6rem' :
                     restaurantNameVariant === 'h6' ? '1.25rem' : '1rem'
              }
            }}>
              {icon}
            </Box>
          )}
          
          {/* Text content on the right */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {showRestaurantName && restaurantName && (
              <Typography 
                variant={restaurantNameVariant}
                sx={{ 
                  fontWeight: 600, 
                  color: 'primary.dark',
                  fontSize: {
                    xs: restaurantNameVariant === 'h4' ? '1.75rem' : 
                         restaurantNameVariant === 'h5' ? '1.4rem' :
                         restaurantNameVariant === 'h6' ? '1.1rem' : '1rem',
                    sm: restaurantNameVariant === 'h4' ? '2rem' : 
                         restaurantNameVariant === 'h5' ? '1.5rem' :
                         restaurantNameVariant === 'h6' ? '1.2rem' : '1.1rem',
                    md: restaurantNameVariant === 'h4' ? '2.125rem' : 
                         restaurantNameVariant === 'h5' ? '1.6rem' :
                         restaurantNameVariant === 'h6' ? '1.25rem' : '1rem'
                  }
                }}
              >
                {restaurantName}
              </Typography>
            )}
            {title && (
              <Typography 
                variant={titleVariant}
                sx={{ 
                  fontWeight: 700, 
                  color: 'primary.dark',
                  fontSize: {
                    xs: titleVariant === 'h4' ? '1.75rem' : 
                         titleVariant === 'h5' ? '1.3rem' :
                         titleVariant === 'h6' ? '1.1rem' : '1rem',
                    sm: titleVariant === 'h4' ? '2rem' : 
                         titleVariant === 'h5' ? '1.4rem' :
                         titleVariant === 'h6' ? '1.2rem' : '1.1rem',
                    md: titleVariant === 'h4' ? '2.125rem' : 
                         titleVariant === 'h5' ? '1.5rem' :
                         titleVariant === 'h6' ? '1.25rem' : '1rem'
                  }
                }}
              >
                {title}
              </Typography>
            )}
          </Box>
        </Box>
      )}
    </Box>
  )
}