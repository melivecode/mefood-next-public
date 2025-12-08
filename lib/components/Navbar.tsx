'use client'

import { useState, useEffect, MouseEvent } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter, usePathname } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  IconButton,
  Avatar,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Box,
  useTheme,
  useMediaQuery,
  Drawer,
  List,
  ListItem,
  ListItemButton
} from '@mui/material'
import {
  Menu as MenuIcon,
  ExitToApp,
  Dashboard,
  Close,
  ArrowBack,
  Receipt,
  TableBar,
  MenuBook,
  Groups,
  Settings,
  Login,
  PersonAdd
} from '@mui/icons-material'
import { useTranslation } from 'react-i18next'

interface NavbarProps {
  title?: string
  color?: 'default' | 'inherit' | 'primary' | 'secondary' | 'transparent' | 'error' | 'info' | 'success' | 'warning'
  leftAction?: React.ReactNode
  rightAction?: React.ReactNode
}

export function Navbar({ 
  title = "MeFood", 
  color = "primary",
  leftAction,
  rightAction
}: NavbarProps) {
  // Hooks
  const { data: session } = useSession()
  const { t, i18n } = useTranslation()
  const router = useRouter()
  const pathname = usePathname()
  // Since we now have one user = one restaurant, simplify the logic
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))

  // State
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [isClient, setIsClient] = useState(false)
  const open = Boolean(anchorEl)

  // Client-side hydration check
  useEffect(() => {
    setIsClient(true)
  }, [])

  // Clock update effect
  useEffect(() => {
    if (!isClient) return
    
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    return () => clearInterval(timer)
  }, [isClient])


  // Event Handlers
  const handleProfileClick = (event: MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleClose = () => {
    setAnchorEl(null)
  }

  const handleSignOut = async () => {
    handleClose()
    setMobileMenuOpen(false)
    await signOut({ callbackUrl: '/' })
  }

  const handleMenuItemClick = (href: string) => {
    handleClose()
    router.push(href)
  }

  const handleMobileMenuToggle = () => {
    setMobileMenuOpen(!mobileMenuOpen)
  }

  const handleMobileMenuClose = () => {
    setMobileMenuOpen(false)
  }

  const handleMobileNavigation = (href: string) => {
    setMobileMenuOpen(false)
    router.push(href)
  }

  const handleBackNavigation = () => {
    router.push(backButtonConfig.destination)
  }

  // Check if we should show the back button
  const showBackButton = pathname === '/restaurant/table' || pathname.startsWith('/restaurant/table/') || pathname === '/restaurant/billing' || pathname === '/restaurant/billing-history' || pathname === '/restaurant/billing-history' || pathname === '/restaurant/order-staff-view'
  
  // Determine back button text and destination
  const getBackButtonConfig = () => {
    if (pathname === '/restaurant/table') {
      return { text: t('navbar.backToRestaurant'), destination: '/restaurant' }
    } else if (pathname.startsWith('/restaurant/table/')) {
      return { text: t('navbar.backToTables'), destination: '/restaurant/table' }
    } else if (pathname === '/restaurant/billing') {
      return { text: t('navbar.backToTable'), destination: '/restaurant/table' }
    } else if (pathname === '/restaurant/billing-history') {
      return { text: t('navbar.backToRestaurant'), destination: '/restaurant' }
    } else if (pathname === '/restaurant/billing-history') {
      return { text: t('navbar.backToRestaurant'), destination: '/restaurant' }
    } else if (pathname === '/restaurant/order-staff-view') {
      return { text: t('navbar.backToRestaurant'), destination: '/restaurant' }
    }
    return { text: t('navbar.back'), destination: '/' }
  }
  
  const backButtonConfig = getBackButtonConfig()

  return (
    <>
      {/* Main Navigation Bar */}
      <AppBar position="static" color={color}>
        <Toolbar>
          
          {/* Custom Left Action */}
          {leftAction && (
            <Box sx={{ mr: 2 }}>
              {leftAction}
            </Box>
          )}
          
          {/* Back Button - Show for /restaurant/table paths */}
          {!leftAction && showBackButton && (
            isMobile ? (
              <IconButton
                color="inherit"
                onClick={handleBackNavigation}
                sx={{ mr: 0.5 }}
              >
                <ArrowBack />
              </IconButton>
            ) : (
              <Button
                color="inherit"
                startIcon={<ArrowBack />}
                onClick={handleBackNavigation}
                sx={{ 
                  mr: 2,
                  textTransform: 'none',
                  fontWeight: 500,
                  fontSize: '1rem'
                }}
              >
                {backButtonConfig.text}
              </Button>
            )
          )}
          
          {/* Mobile Menu Button - Show even with back button */}
          {isMobile && !leftAction && (
            <IconButton
              size="large"
              edge="start"
              color="inherit"
              aria-label="menu"
              onClick={handleMobileMenuToggle}
              sx={{ mr: showBackButton ? 1 : 2 }}
            >
              <MenuIcon />
            </IconButton>
          )}
          
          {/* Logo Section - Hide text on mobile when drawer is available */}
          <Box 
            component={Link} 
            href="/"
            sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              mr: 2, 
              textDecoration: 'none', 
              color: 'inherit',
              cursor: 'pointer',
              flex: 1
            }}
          >
            <Box sx={{ mr: 1, display: 'flex', alignItems: 'center' }}>
              <Image
                src="/logo.png"
                alt="MeFood Logo"
                width={32}
                height={32}
                style={{ objectFit: 'contain' }}
              />
            </Box>
            {/* Hide title on mobile */}
            <Typography 
              variant="h6" 
              component="div" 
              sx={{ 
                fontWeight: 'bold',
                display: isMobile ? 'none' : 'block'
              }}
            >
              {title}
            </Typography>
          </Box>
          
          {/* Clock - Centered */}
          <Box sx={{ 
            position: 'absolute',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex', 
            alignItems: 'center'
          }}>
            {isClient && (
              <Typography 
                variant="h6" 
                color="inherit" 
                sx={{ 
                  fontWeight: 600,
                  fontSize: { xs: '1rem', md: '1.25rem' },
                  fontFamily: 'monospace'
                }}
              >
                {currentTime.toLocaleTimeString('en-US', {
                  hour12: false,
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit'
                })}
              </Typography>
            )}
          </Box>
          
          {/* Spacer for right side */}
          <Box sx={{ flex: 1 }} />
          
          {/* Custom Right Action - Hide on mobile */}
          {rightAction && (
            <Box sx={{ 
              flexGrow: 0, 
              mr: 2,
              display: isMobile ? 'none' : 'flex'
            }}>
              {rightAction}
            </Box>
          )}
          
          {/* Authentication Section */}
          {session ? (
            // Authenticated User
            <Box sx={{ flexGrow: 0, display: 'flex', alignItems: 'center', gap: 2 }}>
              {/* User Info - Desktop Only */}
              {!isMobile && (
                <Box sx={{ textAlign: 'right' }}>
                  <Typography variant="body2" color="inherit" sx={{ fontWeight: 500 }}>
                    {session.user?.ownerName || 'User'}
                  </Typography>
                  <Typography variant="caption" color="inherit" sx={{ opacity: 0.8 }}>
                    {session.user?.restaurantName || 'Restaurant Owner'}
                  </Typography>
                </Box>
              )}
              
              <IconButton onClick={handleProfileClick} sx={{ p: 0 }}>
                <Avatar
                  alt={session.user?.ownerName || 'User'}
                  src={session.user?.image || ''}
                  sx={{ width: 32, height: 32 }}
                >
                  {session.user?.ownerName?.charAt(0).toUpperCase() || 'U'}
                </Avatar>
              </IconButton>
              
              {/* Profile Dropdown Menu */}
              <Menu
                sx={{ mt: '45px' }}
                id="menu-appbar"
                anchorEl={anchorEl}
                anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
                keepMounted
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                open={open}
                onClose={handleClose}
              >
                {/* Language Switcher in Profile Menu */}
                <MenuItem sx={{ opacity: 1, justifyContent: 'center' }}>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      variant={i18n.language === 'en' ? 'contained' : 'outlined'}
                      size="small"
                      onClick={() => {
                        i18n.changeLanguage('en')
                        localStorage.setItem('i18nextLng', 'en')
                      }}
                      sx={{ 
                        minWidth: '60px',
                        fontWeight: i18n.language === 'en' ? 600 : 400
                      }}
                    >
                      EN
                    </Button>
                    <Button
                      variant={i18n.language === 'th' ? 'contained' : 'outlined'}
                      size="small"
                      onClick={() => {
                        i18n.changeLanguage('th')
                        localStorage.setItem('i18nextLng', 'th')
                      }}
                      sx={{ 
                        minWidth: '60px',
                        fontWeight: i18n.language === 'th' ? 600 : 400
                      }}
                    >
                      TH
                    </Button>
                  </Box>
                </MenuItem>
                <Divider />
                
                {/* Navigation Menu Items */}
                <MenuItem onClick={() => handleMenuItemClick('/restaurant')}>
                  <ListItemIcon>
                    <Dashboard fontSize="small" />
                  </ListItemIcon>
                  <ListItemText>{t('navbar.dashboard')}</ListItemText>
                </MenuItem>
                
                <MenuItem onClick={() => handleMenuItemClick('/restaurant/table')}>
                  <ListItemIcon>
                    <TableBar fontSize="small" />
                  </ListItemIcon>
                  <ListItemText>{t('navbar.tables')}</ListItemText>
                </MenuItem>
                
                <MenuItem onClick={() => handleMenuItemClick(`/menu/${session.user.id}`)}>
                  <ListItemIcon>
                    <MenuBook fontSize="small" />
                  </ListItemIcon>
                  <ListItemText>{t('navbar.menu')}</ListItemText>
                </MenuItem>
                
                <MenuItem onClick={() => handleMenuItemClick('/restaurant/order-staff-view')}>
                  <ListItemIcon>
                    <Groups fontSize="small" />
                  </ListItemIcon>
                  <ListItemText>{t('navbar.staffView')}</ListItemText>
                </MenuItem>
                
                <MenuItem onClick={() => handleMenuItemClick('/restaurant/billing-history')}>
                  <ListItemIcon>
                    <Receipt fontSize="small" />
                  </ListItemIcon>
                  <ListItemText>{t('navbar.billingHistory')}</ListItemText>
                </MenuItem>
                
                <MenuItem onClick={() => handleMenuItemClick('/restaurant-admin')}>
                  <ListItemIcon>
                    <Settings fontSize="small" />
                  </ListItemIcon>
                  <ListItemText>{t('navbar.restaurantSettings')}</ListItemText>
                </MenuItem>
                
                <Divider />
                <MenuItem onClick={handleSignOut}>
                  <ListItemIcon>
                    <ExitToApp fontSize="small" />
                  </ListItemIcon>
                  <ListItemText>{t('navbar.signOut')}</ListItemText>
                </MenuItem>
              </Menu>
            </Box>
          ) : (
            // Unauthenticated User
            <Box sx={{ display: 'flex', gap: 1 }}>
              {isMobile ? (
                // Mobile: Icon-only button
                <IconButton
                  color="inherit"
                  component={Link}
                  href="/auth/signin"
                  size="small"
                >
                  <Login />
                </IconButton>
              ) : (
                // Desktop: Text button
                <Button
                  color="inherit"
                  startIcon={<Login />}
                  component={Link}
                  href="/auth/signin"
                >
                  {t('navbar.signIn')}
                </Button>
              )}
            </Box>
          )}
        </Toolbar>
      </AppBar>
      
      {/* Mobile Drawer Navigation */}
      <Drawer
        anchor="left"
        open={mobileMenuOpen}
        onClose={handleMobileMenuClose}
      >
        <Box sx={{ width: 280 }} role="presentation">
          {/* Mobile Drawer Header */}
          <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Box sx={{ mr: 1, display: 'flex', alignItems: 'center' }}>
                <Image
                  src="/logo.png"
                  alt="MeFood Logo"
                  width={28}
                  height={28}
                  style={{ objectFit: 'contain' }}
                />
              </Box>
              <Typography variant="h6">{title}</Typography>
            </Box>
            <IconButton onClick={handleMobileMenuClose}>
              <Close />
            </IconButton>
          </Box>
          <Divider />
          
          {/* User Profile Section (Mobile) */}
          {session && (
            <>
              <Box sx={{ p: 2, display: 'flex', alignItems: 'center' }}>
                <Avatar
                  src={session.user?.image || ''}
                  sx={{ width: 40, height: 40, mr: 2 }}
                >
                  {session.user?.ownerName?.charAt(0).toUpperCase() || 'U'}
                </Avatar>
                <Box>
                  <Typography variant="subtitle1" color="text.primary">
                    {session.user?.ownerName || 'User'}
                  </Typography>
                  <Typography variant="body2" color="text.primary">
                    {session.user?.email}
                  </Typography>
                </Box>
              </Box>
              <Divider />
            </>
          )}
          
          {/* Language Switcher in Mobile Drawer */}
          <Box sx={{ p: 2, display: 'flex', gap: 1, justifyContent: 'center' }}>
            <Button
              variant={i18n.language === 'en' ? 'contained' : 'outlined'}
              size="small"
              onClick={() => {
                i18n.changeLanguage('en')
                localStorage.setItem('i18nextLng', 'en')
              }}
              sx={{ minWidth: '80px' }}
            >
              EN
            </Button>
            <Button
              variant={i18n.language === 'th' ? 'contained' : 'outlined'}
              size="small"
              onClick={() => {
                i18n.changeLanguage('th')
                localStorage.setItem('i18nextLng', 'th')
              }}
              sx={{ minWidth: '80px' }}
            >
              TH
            </Button>
          </Box>
          <Divider />
          
          {/* Mobile Navigation Menu */}
          <List>
            {session ? (
              // Authenticated User Menu
              <>
                <ListItem disablePadding>
                  <ListItemButton onClick={() => handleMobileNavigation('/restaurant')}>
                    <ListItemIcon>
                      <Dashboard />
                    </ListItemIcon>
                    <ListItemText primary={t('navbar.dashboard')} />
                  </ListItemButton>
                </ListItem>
                
                <ListItem disablePadding>
                  <ListItemButton onClick={() => handleMobileNavigation('/restaurant/table')}>
                    <ListItemIcon>
                      <TableBar />
                    </ListItemIcon>
                    <ListItemText primary={t('navbar.tables')} />
                  </ListItemButton>
                </ListItem>
                
                <ListItem disablePadding>
                  <ListItemButton onClick={() => handleMobileNavigation(`/menu/${session.user.id}`)}>
                    <ListItemIcon>
                      <MenuBook />
                    </ListItemIcon>
                    <ListItemText primary={t('navbar.menu')} />
                  </ListItemButton>
                </ListItem>
                
                <ListItem disablePadding>
                  <ListItemButton onClick={() => handleMobileNavigation('/restaurant/order-staff-view')}>
                    <ListItemIcon>
                      <Groups />
                    </ListItemIcon>
                    <ListItemText primary={t('navbar.staffView')} />
                  </ListItemButton>
                </ListItem>
                
                <ListItem disablePadding>
                  <ListItemButton onClick={() => handleMobileNavigation('/restaurant/billing-history')}>
                    <ListItemIcon>
                      <Receipt />
                    </ListItemIcon>
                    <ListItemText primary={t('navbar.billingHistory')} />
                  </ListItemButton>
                </ListItem>
                
                <ListItem disablePadding>
                  <ListItemButton onClick={() => handleMobileNavigation('/restaurant-admin')}>
                    <ListItemIcon>
                      <Settings />
                    </ListItemIcon>
                    <ListItemText primary={t('navbar.restaurantSettings')} />
                  </ListItemButton>
                </ListItem>
                
                <Divider />
                <ListItem disablePadding>
                  <ListItemButton onClick={handleSignOut}>
                    <ListItemIcon>
                      <ExitToApp />
                    </ListItemIcon>
                    <ListItemText primary={t('navbar.signOut')} />
                  </ListItemButton>
                </ListItem>
              </>
            ) : (
              // Unauthenticated User Menu
              <>
                <ListItem disablePadding>
                  <ListItemButton onClick={() => handleMobileNavigation('/auth/signup')}>
                    <ListItemIcon>
                      <PersonAdd />
                    </ListItemIcon>
                    <ListItemText primary="เริ่มต้นใช้งาน" />
                  </ListItemButton>
                </ListItem>
                <ListItem disablePadding>
                  <ListItemButton onClick={() => handleMobileNavigation('/auth/signin')}>
                    <ListItemIcon>
                      <Login />
                    </ListItemIcon>
                    <ListItemText primary={t('navbar.signIn')} />
                  </ListItemButton>
                </ListItem>
              </>
            )}
          </List>
        </Box>
      </Drawer>
    </>
  )
}