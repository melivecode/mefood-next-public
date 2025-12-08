'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  Box,
  Container,
  Typography,
  Grid,
  Paper,
  Card,
  CardContent,
  CardActions,
  Button,
  Avatar,
  Chip,
  Tooltip
} from '@mui/material'
import {
  TableBar,
  Kitchen,
  AdminPanelSettings,
  Restaurant,
  Receipt,
  Group,
  MenuBook
} from '@mui/icons-material'
import { RestaurantNavbar } from '@/lib/components/RestaurantNavbar'
import { PageTitle } from '@/lib/components/PageTitle'
import { Footer } from '@/lib/components/Footer'
import { useTranslation } from 'react-i18next'

export default function RestaurantMenuPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  // Simplified for one-user-one-restaurant system
  const { t } = useTranslation()
  const [restaurantName, setRestaurantName] = useState<string>('')
  const [hasRestaurantDetails, setHasRestaurantDetails] = useState<boolean>(false)
  const [hasMenu, setHasMenu] = useState<boolean>(false)
  const [hasTables, setHasTables] = useState<boolean>(false)
  const [loading, setLoading] = useState<boolean>(true)

  useEffect(() => {
    if (status === 'loading') return
    if (!session) router.push('/auth/signin')
  }, [session, status, router])

  useEffect(() => {
    const fetchRestaurantData = async () => {
      if (session?.user?.id) {
        setLoading(true)
        try {
          // Get restaurant name from session
          setRestaurantName(session.user.restaurantName || 'Restaurant')
          setHasRestaurantDetails(!!(session.user.restaurantName && session.user.restaurantName.trim() !== ''))

          // Check menu items
          const menuResponse = await fetch(`/api/restaurant/menu`)
          if (menuResponse.ok) {
            const menuData = await menuResponse.json()
            setHasMenu(Array.isArray(menuData.categories) && menuData.categories.length > 0)
          }

          // Check tables (using simplified API)
          const tablesResponse = await fetch(`/api/restaurant/tables`)
          if (tablesResponse.ok) {
            const tablesData = await tablesResponse.json()
            setHasTables(Array.isArray(tablesData) && tablesData.length > 0)
          }
        } catch (error) {
          setRestaurantName('Restaurant')
          setHasRestaurantDetails(false)
          setHasMenu(false)
          setHasTables(false)
        } finally {
          setLoading(false)
        }
      }
    }

    if (session?.user?.id) {
      fetchRestaurantData()
    }
  }, [session?.user?.id, session?.user?.restaurantName])

  if (status === 'loading') {
    return null
  }

  // Check if user has restaurant setup completed
  const hasRestaurantId = !!(session?.user?.id && session?.user?.restaurantName)
  
  // Check if menu item should be disabled
  const isMenuItemDisabled = (index: number, item: any) => {
    // If user has restaurantId, enable all menus
    if (hasRestaurantId) {
      return false
    }
    
    // Restaurant Admin is always available
    if (item.title === 'Restaurant Admin') {
      return false
    }
    
    // All other menus are disabled if loading or missing any restaurant data
    return loading || !hasRestaurantDetails || !hasMenu || !hasTables
  }

  // Get disabled message for tooltip
  const getDisabledMessage = (index: number) => {
    if (loading) return 'Loading...'
    
    // If user has restaurantId, no disabled message needed
    if (hasRestaurantId) return ''
    
    const missing = []
    if (!hasRestaurantDetails) missing.push(t('restaurant.restaurantDetails'))
    if (!hasMenu) missing.push(t('restaurant.menuItems'))
    if (!hasTables) missing.push(t('restaurant.tables'))
    
    if (missing.length === 0) return ''
    
    return t('restaurant.pleaseConfigureFirst', { items: missing.join(', ') })
  }

  // Determine priority based on restaurant setup
  const needsSetup = !hasRestaurantId || !hasRestaurantDetails || !hasMenu || !hasTables

  const allMenuItems = [
    {
      title: t('restaurant.tableManagement'),
      description: t('restaurant.tableManagementDesc'),
      icon: <TableBar sx={{ fontSize: 40 }} />,
      color: 'primary',
      path: '/restaurant/table',
      features: [],
      priority: hasRestaurantId ? 1 : 2
    },
    {
      title: t('restaurant.menu'),
      description: t('restaurant.menuDesc'),
      icon: <MenuBook sx={{ fontSize: 40 }} />,
      color: 'primary',
      path: `/menu/${session?.user?.id}`,
      features: [],
      priority: hasRestaurantId ? 2 : 5
    },
    {
      title: t('restaurant.orderStaffView'),
      description: t('restaurant.orderStaffViewDesc'),
      icon: <Kitchen sx={{ fontSize: 40 }} />,
      color: 'success',
      path: '/restaurant/order-staff-view',
      features: [],
      priority: hasRestaurantId ? 3 : 3
    },
    {
      title: t('restaurant.billingHistory'),
      description: t('restaurant.billingHistoryDesc'),
      icon: <Receipt sx={{ fontSize: 40 }} />,
      color: 'info',
      path: '/restaurant/billing-history',
      features: [],
      priority: hasRestaurantId ? 4 : 4
    },
    {
      title: t('restaurant.restaurantAdmin'),
      description: t('restaurant.restaurantAdminDesc'),
      icon: <AdminPanelSettings sx={{ fontSize: 40 }} />,
      color: 'warning',
      path: '/restaurant-admin',
      features: [],
      priority: hasRestaurantId ? 5 : 1
    }
  ]

  // Sort menu items by priority
  const menuItems = allMenuItems.sort((a, b) => a.priority - b.priority)

  return (
    <>
      <RestaurantNavbar />
      <Container maxWidth="xl" sx={{ py: 4 }}>

        {/* Welcome Section */}
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
            {hasRestaurantDetails && (
              <Restaurant sx={{ fontSize: 24, color: '#2E5E45' }} />
            )}
            <Typography variant="h5" sx={{ fontWeight: 600, color: '#2E5E45', fontSize: { xs: '1.25rem', sm: '1.5rem', md: '1.75rem' } }}>
              {hasRestaurantDetails ? restaurantName : t('restaurant.welcomeToMeFood')}
            </Typography>
          </Box>
          <Typography variant="body2" sx={{ fontSize: { xs: '0.875rem', sm: '0.9375rem', md: '1rem' }, color: '#2E5E45', opacity: 0.7 }}>
            {hasRestaurantDetails 
              ? t('restaurant.manageOperations')
              : t('restaurant.completeSetup')
            }
          </Typography>
        </Box>

        {/* Menu Cards */}
        <Grid container spacing={3}>
          {menuItems.map((item, index) => {
            const disabled = isMenuItemDisabled(index, item)
            const disabledMessage = getDisabledMessage(index)
            
            return (
              <Grid size={{ xs: 12, md: 6, lg: 4 }} key={index}>
                <Tooltip
                  title={disabled ? disabledMessage : ''}
                  placement="top"
                  arrow
                >
                  <Card 
                    elevation={disabled ? 1 : 4}
                    sx={{ 
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      borderRadius: 4,
                      transition: 'all 0.3s ease',
                      opacity: disabled ? 0.6 : 1,
                      cursor: disabled ? 'not-allowed' : 'pointer',
                      background: disabled 
                        ? 'linear-gradient(135deg, #f5f5f5 0%, #e0e0e0 100%)'
                        : 'linear-gradient(135deg, #ffffff 0%, #E9F8E6 100%)',
                      border: '1px solid',
                      borderColor: disabled ? 'grey.300' : 'transparent',
                      position: 'relative',
                      overflow: 'hidden',
                      '&::before': {
                        content: '""',
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: disabled 
                          ? 'none'
                          : 'linear-gradient(45deg, rgba(163,220,154,0.05) 0%, rgba(46,94,69,0.05) 100%)',
                        pointerEvents: 'none',
                        opacity: 0,
                        transition: 'opacity 0.3s ease'
                      },
                      '&:hover': disabled ? {} : {
                        boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
                        transform: 'translateY(-4px)',
                        '&::before': {
                          opacity: 1
                        }
                      }
                    }}
                  >
                    <CardContent sx={{ flexGrow: 1, textAlign: 'center', p: 3 }}>
                      <Avatar
                        sx={{
                          width: 80,
                          height: 80,
                          mx: 'auto',
                          mb: 2,
                          background: disabled 
                            ? 'linear-gradient(135deg, #bdbdbd 0%, #9e9e9e 100%)'
                            : item.color === 'primary' 
                              ? 'linear-gradient(135deg, #A3DC9A 0%, #2E5E45 100%)'
                              : item.color === 'success'
                              ? 'linear-gradient(135deg, #A3DC9A 0%, #2E5E45 100%)'
                              : item.color === 'info'
                              ? 'linear-gradient(135deg, #A3DC9A 0%, #2E5E45 100%)'
                              : item.color === 'warning'
                              ? 'linear-gradient(135deg, #FFD55A 0%, #E5C147 100%)'
                              : 'linear-gradient(135deg, #A3DC9A 0%, #2E5E45 100%)',
                          color: disabled 
                            ? 'rgba(255,255,255,0.7)'
                            : item.color === 'warning'
                            ? '#2E5E45'
                            : 'white',
                          boxShadow: '0 8px 16px rgba(0,0,0,0.1)'
                        }}
                      >
                        {item.icon}
                      </Avatar>
                      
                      <Typography 
                        variant="h5" 
                        sx={{ 
                          fontWeight: 600, 
                          mb: 1, 
                          fontSize: { xs: '1.25rem', sm: '1.375rem', md: '1.5rem' },
                          color: disabled ? 'text.disabled' : 'text.primary' 
                        }}
                      >
                        {item.title}
                      </Typography>
                      
                      <Typography 
                        variant="body1" 
                        sx={{ 
                          color: disabled ? 'text.disabled' : 'text.secondary',
                          fontSize: { xs: '1rem', sm: '1.125rem', md: '1.1875rem' }
                        }}
                      >
                        {item.description}
                      </Typography>
                    </CardContent>

                    <CardActions sx={{ p: 2, pt: 0, mt: -1 }}>
                      <Button
                        variant="contained"
                        fullWidth
                        disabled={disabled}
                        onClick={() => {
                          if (!disabled) {
                            if (item.title === t('restaurant.menu')) {
                              window.open(item.path, '_blank')
                            } else {
                              router.push(item.path)
                            }
                          }
                        }}
                        sx={{
                          borderRadius: 3,
                          textTransform: 'none',
                          fontWeight: 600,
                          py: 1.5,
                          fontSize: { xs: '1rem', sm: '1.125rem', md: '1.1875rem' },
                          background: disabled 
                            ? 'linear-gradient(135deg, #e0e0e0 0%, #bdbdbd 100%)'
                            : item.color === 'primary' 
                              ? 'linear-gradient(135deg, #A3DC9A 0%, #2E5E45 100%)'
                              : item.color === 'success'
                              ? 'linear-gradient(135deg, #A3DC9A 0%, #2E5E45 100%)'
                              : item.color === 'info'
                              ? 'linear-gradient(135deg, #A3DC9A 0%, #2E5E45 100%)'
                              : item.color === 'warning'
                              ? 'linear-gradient(135deg, #FFD55A 0%, #E5C147 100%)'
                              : 'linear-gradient(135deg, #A3DC9A 0%, #2E5E45 100%)',
                          color: disabled 
                            ? 'rgba(0,0,0,0.4)'
                            : item.color === 'warning'
                            ? '#424242'
                            : 'white',
                          border: 'none',
                          boxShadow: disabled ? 'none' : '0 4px 12px rgba(0,0,0,0.15)',
                          '&:hover': disabled ? {} : {
                            background: item.color === 'primary' 
                              ? 'linear-gradient(135deg, #2E5E45 0%, #1a3326 100%)'
                              : item.color === 'success'
                              ? 'linear-gradient(135deg, #2E5E45 0%, #1a3326 100%)'
                              : item.color === 'info'
                              ? 'linear-gradient(135deg, #2E5E45 0%, #1a3326 100%)'
                              : item.color === 'warning'
                              ? 'linear-gradient(135deg, #E5C147 0%, #d1a83f 100%)'
                              : 'linear-gradient(135deg, #2E5E45 0%, #1a3326 100%)',
                            color: item.color === 'warning' ? '#2E5E45' : 'white',
                            boxShadow: '0 6px 16px rgba(0,0,0,0.2)',
                            transform: 'translateY(-1px)'
                          },
                          '&:disabled': {
                            background: 'linear-gradient(135deg, #e0e0e0 0%, #bdbdbd 100%)',
                            color: 'rgba(0,0,0,0.4)'
                          }
                        }}
                      >
                        {disabled ? t('restaurant.configureFirst') : t('restaurant.open')}
                      </Button>
                    </CardActions>
                  </Card>
                </Tooltip>
              </Grid>
            )
          })}
        </Grid>
      </Container>
      <Footer />
    </>
  )
}