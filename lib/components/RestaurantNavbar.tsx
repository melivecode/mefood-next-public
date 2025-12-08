'use client'

import { useState, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import {
  Box,
  Button,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Typography,
  Avatar
} from '@mui/material'
import {
  ArrowBack,
  Menu as MenuIcon,
  Groups,
  Receipt,
  ExitToApp,
  Person,
  Close,
  Dashboard,
  MenuBook,
  Settings,
  TableBar
} from '@mui/icons-material'
import { Navbar } from '@/lib/components/Navbar'
import { LanguageSwitcher } from '@/lib/components/LanguageSwitcher'
import { useTranslation } from 'react-i18next'
import Image from 'next/image'

interface RestaurantNavbarProps {
  /** Back button configuration */
  backButton?: {
    href: string
    label: string
  }
  /** Custom left action component (overrides back button if provided) */
  leftAction?: ReactNode
  /** Whether to show language switcher on desktop */
  showLanguageSwitcher?: boolean
  /** Custom right action component (overrides language switcher if provided) */
  rightAction?: ReactNode
}

export function RestaurantNavbar({
  backButton,
  leftAction,
  showLanguageSwitcher = true,
  rightAction
}: RestaurantNavbarProps) {
  const { data: session } = useSession()
  const router = useRouter()
  // Simplified for one-user-one-restaurant system
  const { t, i18n } = useTranslation()
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false)

  // Mobile drawer handlers
  const handleMobileMenuToggle = () => {
    setMobileDrawerOpen(!mobileDrawerOpen)
  }

  const handleMobileMenuClose = () => {
    setMobileDrawerOpen(false)
  }

  const handleMobileNavigation = (path: string) => {
    router.push(path)
    setMobileDrawerOpen(false)
  }

  const handleSignOut = () => {
    signOut({ callbackUrl: '/auth/signin' })
  }

  const handleLanguageChange = (language: string) => {
    i18n.changeLanguage(language)
  }

  // Determine left action
  const getLeftAction = () => {
    if (leftAction) return leftAction

    if (backButton) {
      return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {/* Mobile Back Button Icon */}
          <IconButton
            color="inherit"
            onClick={() => router.push(backButton.href)}
            sx={{ 
              display: { xs: 'flex', md: 'none' }
            }}
          >
            <ArrowBack />
          </IconButton>
          
          {/* Desktop Back Button with Text */}
          <Button
            color="inherit"
            startIcon={<ArrowBack />}
            onClick={() => router.push(backButton.href)}
            sx={{ 
              display: { xs: 'none', md: 'flex' },
              textTransform: 'none',
              fontWeight: 500,
              fontSize: '1rem'
            }}
          >
            {backButton.label}
          </Button>

          {/* Mobile Burger Menu */}
          <IconButton
            color="inherit"
            onClick={handleMobileMenuToggle}
            sx={{ 
              display: { xs: 'flex', md: 'none' }
            }}
          >
            <MenuIcon />
          </IconButton>
        </Box>
      )
    }

    // Default mobile menu only
    return (
      <IconButton
        color="inherit"
        onClick={handleMobileMenuToggle}
        sx={{ 
          display: { xs: 'flex', md: 'none' }
        }}
      >
        <MenuIcon />
      </IconButton>
    )
  }

  // Determine right action
  const getRightAction = () => {
    if (rightAction) return rightAction

    if (showLanguageSwitcher) {
      return (
        <Box sx={{ display: { xs: 'none', md: 'block' } }}>
          <LanguageSwitcher />
        </Box>
      )
    }

    return null
  }

  return (
    <>
      <Navbar 
        leftAction={getLeftAction()}
        rightAction={getRightAction()}
      />

      {/* Mobile Drawer */}
      <Drawer
        anchor="left"
        open={mobileDrawerOpen}
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
              <Typography variant="h6">MeFood</Typography>
            </Box>
            <IconButton onClick={handleMobileMenuClose}>
              <Close />
            </IconButton>
          </Box>
          <Divider />
          
          {/* User Profile Section (Mobile) */}
          {session && (
            <>
              <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar 
                  src={session.user?.image || undefined}
                  sx={{ 
                    width: 48, 
                    height: 48,
                    bgcolor: 'primary.main',
                    color: 'white',
                    fontWeight: 600
                  }}
                >
                  {!session.user?.image && (session.user?.ownerName ? session.user.ownerName.charAt(0).toUpperCase() : 'U')}
                </Avatar>
                <Box>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    {session.user?.ownerName || 'User'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {session.user?.restaurantName || 'Restaurant Owner'}
                  </Typography>
                </Box>
              </Box>
              <Divider />
            </>
          )}
          
          {/* Navigation Menu */}
          <List>
            {session ? (
              <>
                <ListItem disablePadding>
                  <ListItemButton onClick={() => handleMobileNavigation('/restaurant')}>
                    <ListItemIcon>
                      <Dashboard />
                    </ListItemIcon>
                    <ListItemText primary={t('navbar.dashboard')} />
                  </ListItemButton>
                </ListItem>
                
                {/* Language Switcher before Tables */}
                <ListItem disablePadding>
                  <Box sx={{ p: 2, width: '100%', display: 'flex', gap: 1, justifyContent: 'center' }}>
                    <Button
                      variant={i18n.language === 'en' ? 'contained' : 'outlined'}
                      size="small"
                      onClick={() => handleLanguageChange('en')}
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
                      onClick={() => handleLanguageChange('th')}
                      sx={{ 
                        minWidth: '60px',
                        fontWeight: i18n.language === 'th' ? 600 : 400
                      }}
                    >
                      TH
                    </Button>
                  </Box>
                </ListItem>
                <Divider />

                <ListItem disablePadding>
                  <ListItemButton onClick={() => handleMobileNavigation('/restaurant/table')}>
                    <ListItemIcon>
                      <TableBar />
                    </ListItemIcon>
                    <ListItemText primary={t('navbar.tables')} />
                  </ListItemButton>
                </ListItem>
                
                <ListItem disablePadding>
                  <ListItemButton onClick={() => handleMobileNavigation(`/menu/${session?.user?.id}`)}>
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
              <ListItem disablePadding>
                <ListItemButton onClick={() => handleMobileNavigation('/auth/signin')}>
                  <ListItemIcon>
                    <Person />
                  </ListItemIcon>
                  <ListItemText primary={t('navbar.signIn')} />
                </ListItemButton>
              </ListItem>
            )}
          </List>
        </Box>
      </Drawer>
    </>
  )
}