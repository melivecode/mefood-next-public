'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Avatar,
  Alert,
  CircularProgress
} from '@mui/material'
import {
  Restaurant,
  MenuBook,
  ShoppingCart,
  Analytics,
  People,
  Settings,
  TableBar
} from '@mui/icons-material'
import { RestaurantNavbar } from '@/lib/components/RestaurantNavbar'
import { Footer } from '@/lib/components/Footer'
import { useTranslation } from 'react-i18next'

export default function RestaurantAdminPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  // Simplified for one-user-one-restaurant system
  const { t } = useTranslation()
  
  const [_loading, _setLoading] = useState(false)
  const hasRestaurant = !!(session?.user?.id && session?.user?.restaurantName)

  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/auth/signin')
      return
    }
    // All authenticated users can access this page
  }, [session, status, router])

  if (status === 'loading') {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          gap: 2
        }}
      >
        <CircularProgress size={40} />
        <Typography variant="h6">Loading...</Typography>
      </Box>
    )
  }

  if (!session) {
    return null
  }

  const adminCards = [
    {
      title: t('restaurantAdmin.restaurantDetails'),
      description: t('restaurantAdmin.restaurantDetailsDesc'),
      icon: <Restaurant fontSize="large" />,
      action: () => router.push('/restaurant-admin/details'),
      available: true,
      requiresRestaurantData: false
    },
    {
      title: t('restaurantAdmin.menuManagement'),
      description: t('restaurantAdmin.menuManagementDesc'),
      icon: <MenuBook fontSize="large" />,
      action: () => router.push('/restaurant-admin/menu'),
      available: hasRestaurant,
      requiresRestaurantData: true
    },
    {
      title: t('restaurantAdmin.tableManagement'),
      description: t('restaurantAdmin.tableManagementDesc'),
      icon: <TableBar fontSize="large" />,
      action: () => router.push('/restaurant-admin/tables'),
      available: hasRestaurant,
      requiresRestaurantData: true
    },
    {
      title: t('restaurantAdmin.orderManagement'),
      description: t('restaurantAdmin.orderManagementDesc'),
      icon: <ShoppingCart fontSize="large" />,
      action: () => router.push('/restaurant-admin/orders'),
      available: hasRestaurant,
      requiresRestaurantData: true
    },
    {
      title: t('restaurantAdmin.analytics'),
      description: t('restaurantAdmin.analyticsDesc'),
      icon: <Analytics fontSize="large" />,
      action: () => {},
      available: false
    },
    {
      title: t('restaurantAdmin.staffManagement'),
      description: t('restaurantAdmin.staffManagementDesc'),
      icon: <People fontSize="large" />,
      action: () => {},
      available: false
    },
    {
      title: t('restaurantAdmin.settings'),
      description: t('restaurantAdmin.settingsDesc'),
      icon: <Settings fontSize="large" />,
      action: () => {},
      available: false
    }
  ]

  return (
    <>
      <RestaurantNavbar 
        backButton={{
          href: '/restaurant',
          label: t('restaurantAdmin.backToRestaurant')
        }}
      />

      <Container maxWidth="xl" sx={{ py: 4 }}>

        {/* Welcome Section */}
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
            <Settings sx={{ fontSize: 24, color: '#2E5E45' }} />
            <Typography variant="h5" sx={{ fontWeight: 600, color: '#2E5E45', fontSize: { xs: '1.25rem', sm: '1.5rem', md: '1.75rem' } }}>
              {t('restaurantAdmin.title')}
            </Typography>
          </Box>
          <Typography variant="body2" sx={{ fontSize: { xs: '0.875rem', sm: '0.9375rem', md: '1rem' }, color: '#2E5E45', opacity: 0.7 }}>
            {t('restaurantAdmin.subtitle')}
          </Typography>
        </Box>

        {/* Restaurant Data Alert */}
        {!hasRestaurant && (
          <Alert 
            severity="info" 
            sx={{ mb: 3, borderRadius: 2 }}
          >
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              {t('restaurantAdmin.setupRequired')}
            </Typography>
            <Typography variant="body2" sx={{ mt: 0.5, opacity: 0.8 }}>
              {t('restaurantAdmin.setupRequiredDesc')}
            </Typography>
          </Alert>
        )}
        
        <Grid container spacing={3}>
          {adminCards.map((card, index) => (
            <Grid size={{ xs: 12, md: 6, lg: 4 }} key={index}>
              <Card 
                elevation={!card.available ? 1 : 4}
                sx={{ 
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  borderRadius: 4,
                  transition: 'all 0.3s ease',
                  opacity: !card.available ? 0.6 : 1,
                  cursor: !card.available ? 'not-allowed' : 'pointer',
                  background: !card.available 
                    ? 'linear-gradient(135deg, #f5f5f5 0%, #e0e0e0 100%)'
                    : 'linear-gradient(135deg, #ffffff 0%, #E9F8E6 100%)',
                  border: '1px solid',
                  borderColor: !card.available ? 'grey.300' : 'transparent',
                  position: 'relative',
                  overflow: 'hidden',
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: !card.available 
                      ? 'none'
                      : 'linear-gradient(45deg, rgba(163,220,154,0.05) 0%, rgba(46,94,69,0.05) 100%)',
                    pointerEvents: 'none',
                    opacity: 0,
                    transition: 'opacity 0.3s ease'
                  },
                  '&:hover': !card.available ? {} : {
                    boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
                    transform: 'translateY(-4px)',
                    '&::before': {
                      opacity: 1
                    }
                  }
                }}
                onClick={card.available ? card.action : undefined}
              >
                <CardContent sx={{ flexGrow: 1, textAlign: 'center', p: 3 }}>
                  <Avatar
                    sx={{
                      width: 80,
                      height: 80,
                      mx: 'auto',
                      mb: 2,
                      background: !card.available 
                        ? 'linear-gradient(135deg, #bdbdbd 0%, #9e9e9e 100%)'
                        : 'linear-gradient(135deg, #FFD55A 0%, #E5C147 100%)',
                      color: !card.available 
                        ? 'rgba(255,255,255,0.7)'
                        : '#2E5E45',
                      boxShadow: '0 8px 16px rgba(0,0,0,0.1)'
                    }}
                  >
                    {card.icon}
                  </Avatar>
                  
                  <Typography 
                    variant="h5" 
                    sx={{ 
                      fontWeight: 600, 
                      mb: 1, 
                      fontSize: { xs: '1.25rem', sm: '1.375rem', md: '1.5rem' },
                      color: !card.available ? 'text.disabled' : 'text.primary' 
                    }}
                  >
                    {card.title}
                  </Typography>
                  
                  <Typography 
                    variant="body1" 
                    sx={{ 
                      color: !card.available ? 'text.disabled' : 'text.secondary',
                      fontSize: { xs: '1rem', sm: '1.125rem', md: '1.1875rem' }
                    }}
                  >
                    {card.description}
                  </Typography>
                </CardContent>

                <CardActions sx={{ p: 2, pt: 0, mt: -1 }}>
                  <Button
                    variant="contained"
                    fullWidth
                    disabled={!card.available}
                    onClick={() => {
                      if (card.available) {
                        card.action()
                      }
                    }}
                    sx={{
                      borderRadius: 3,
                      textTransform: 'none',
                      fontWeight: 600,
                      py: 1.5,
                      fontSize: { xs: '1rem', sm: '1.125rem', md: '1.1875rem' },
                      background: !card.available 
                        ? 'linear-gradient(135deg, #e0e0e0 0%, #bdbdbd 100%)'
                        : 'linear-gradient(135deg, #FFD55A 0%, #E5C147 100%)',
                      color: !card.available 
                        ? 'rgba(0,0,0,0.4)'
                        : '#424242',
                      border: 'none',
                      boxShadow: !card.available ? 'none' : '0 4px 12px rgba(0,0,0,0.15)',
                      '&:hover': !card.available ? {} : {
                        background: 'linear-gradient(135deg, #E5C147 0%, #d1a83f 100%)',
                        color: '#2E5E45',
                        boxShadow: '0 6px 16px rgba(0,0,0,0.2)',
                        transform: 'translateY(-1px)'
                      },
                      '&:disabled': {
                        background: 'linear-gradient(135deg, #e0e0e0 0%, #bdbdbd 100%)',
                        color: 'rgba(0,0,0,0.4)'
                      }
                    }}
                  >
                    {card.available ? t('restaurantAdmin.open') : (card.requiresRestaurantData ? t('restaurantAdmin.createRestaurantFirst') : t('restaurantAdmin.comingSoon'))}
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>

      
      <Footer />
    </>
  )
}