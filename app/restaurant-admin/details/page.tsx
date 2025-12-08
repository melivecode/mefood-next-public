'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import {
  Box,
  Container,
  Typography,
  Paper,
  Button,
  Alert,
  CircularProgress,
  Snackbar,
  Switch,
  FormControlLabel,
  Grid,
  Stack
} from '@mui/material'
import {
  Restaurant,
  LocationOn,
  Phone,
  Email,
  Description,
  Edit,
  Save,
  Cancel,
  Business,
  ContactPhone,
  Settings
} from '@mui/icons-material'
import { RestaurantNavbar } from '@/lib/components/RestaurantNavbar'
import { DarkTextField } from '@/lib/components/DarkTextField'
import { Footer } from '@/lib/components/Footer'
import { useTranslation } from 'react-i18next'

interface RestaurantDetails {
  id: string
  name: string
  description: string | null
  address: string | null
  phone: string | null
  email: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
  _count?: {
    users: number
  }
}

export default function RestaurantDetailsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  // Removed useRoles hook - using session.user.id instead
  const { t } = useTranslation()

  const [restaurant, setRestaurant] = useState<RestaurantDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const hasFetched = useRef(false)

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    address: '',
    phone: '',
    email: '',
    isActive: true
  })


  useEffect(() => {
    if (status === 'loading') return
    if (!session) router.push('/auth/signin')
    // All authenticated users can access this page
  }, [session, status, router])

  useEffect(() => {
    const fetchRestaurantDetails = async () => {
      if (hasFetched.current) return // Prevent multiple fetches
      
      try {
        hasFetched.current = true
        // Always try to fetch user data from the API to get the most current information
        // Don't rely solely on session data which might be stale
        
        // Fetch current user data (which contains restaurant info)
        const response = await fetch(`/api/user/profile`)
        if (!response.ok) throw new Error('Failed to fetch user profile')
        const userData = await response.json()
        
        // Check if user has restaurant data
        if (!userData.restaurantName) {
          // User doesn't have restaurant data yet, show create form
          setLoading(false)
          setIsEditing(true) // Start in editing mode for creation
          return
        }
        
        // Transform user data to restaurant format for compatibility
        const restaurantData = {
          id: userData.id,
          name: userData.restaurantName,
          description: userData.restaurantDescription,
          address: userData.restaurantAddress, 
          phone: userData.restaurantPhone,
          email: userData.restaurantEmail,
          isActive: userData.isRestaurantActive,
          createdAt: userData.createdAt,
          updatedAt: userData.updatedAt
        }
        
        setRestaurant(restaurantData)
        setFormData({
          name: restaurantData.name || '',
          description: restaurantData.description || '',
          address: restaurantData.address || '',
          phone: restaurantData.phone || '',
          email: restaurantData.email || '',
          isActive: restaurantData.isActive
        })
        
        // Start in view mode for users with restaurant data
        setIsEditing(false)
      } catch (error) {
        console.error('Error fetching restaurant details:', error)
        setError('Failed to load restaurant details')
      } finally {
        setLoading(false)
      }
    }

    if (session && !hasFetched.current) {
      fetchRestaurantDetails()
    }
  }, [session])

  const handleEdit = () => {
    setIsEditing(true)
    setError(null)
    setSuccess(null)
  }

  const handleCancel = () => {
    if (restaurant) {
      setFormData({
        name: restaurant.name || '',
        description: restaurant.description || '',
        address: restaurant.address || '',
        phone: restaurant.phone || '',
        email: restaurant.email || '',
        isActive: restaurant.isActive
      })
    }
    setIsEditing(false)
    setError(null)
    setSuccess(null)
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const isCreating = !restaurant
      
      if (isCreating) {
        // Update user profile with restaurant data
        const response = await fetch('/api/user/profile', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            restaurantName: formData.name,
            restaurantDescription: formData.description,
            restaurantAddress: formData.address,
            restaurantPhone: formData.phone,
            restaurantEmail: formData.email,
            isRestaurantActive: formData.isActive
          })
        })

        if (!response.ok) throw new Error('Failed to create restaurant')
        
        const updatedUser = await response.json()
        const newRestaurant = {
          id: updatedUser.id,
          name: updatedUser.restaurantName,
          description: updatedUser.restaurantDescription,
          address: updatedUser.restaurantAddress,
          phone: updatedUser.restaurantPhone,
          email: updatedUser.restaurantEmail,
          isActive: updatedUser.isRestaurantActive,
          createdAt: updatedUser.createdAt,
          updatedAt: updatedUser.updatedAt
        }
        setRestaurant(newRestaurant)
        setIsEditing(false)
        setSuccess('Restaurant created successfully')
        
        // Redirect to restaurant admin page after successful creation
        setTimeout(() => {
          window.location.href = '/restaurant-admin'
        }, 1000)
      } else {
        // Update user profile with restaurant data
        const response = await fetch('/api/user/profile', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            restaurantName: formData.name,
            restaurantDescription: formData.description,
            restaurantAddress: formData.address,
            restaurantPhone: formData.phone,
            restaurantEmail: formData.email,
            isRestaurantActive: formData.isActive
          })
        })

        if (!response.ok) throw new Error('Failed to update restaurant details')
        
        const updatedUser = await response.json()
        const updatedRestaurant = {
          id: updatedUser.id,
          name: updatedUser.restaurantName,
          description: updatedUser.restaurantDescription,
          address: updatedUser.restaurantAddress,
          phone: updatedUser.restaurantPhone,
          email: updatedUser.restaurantEmail,
          isActive: updatedUser.isRestaurantActive,
          createdAt: updatedUser.createdAt,
          updatedAt: updatedUser.updatedAt
        }
        setRestaurant(updatedRestaurant)
        setIsEditing(false)
        setSuccess('Restaurant details updated successfully')
      }
    } catch (err) {
      setError(isCreating ? 'Failed to create restaurant' : 'Failed to update restaurant details')
    } finally {
      setSaving(false)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    )
  }

  if (!session) {
    return null
  }

  // For users without restaurant data, show creation form
  const isCreating = !restaurant && isEditing

  if (!restaurant && !isCreating) {
    return (
      <>
        <RestaurantNavbar 
          backButton={{
            href: '/restaurant-admin',
            label: t('restaurantDetails.backToRestaurantAdmin')
          }}
        />
        <Container maxWidth="xl" sx={{ py: 4 }}>
          <Paper elevation={3} sx={{ p: 4 }}>
            <Alert severity="error">
              Restaurant details not found or you don't have access to view them.
            </Alert>
          </Paper>
        </Container>
        <Footer />
      </>
    )
  }

  return (
    <>
      <RestaurantNavbar 
        backButton={{
          href: '/restaurant-admin',
          label: t('restaurantDetails.backToRestaurantAdmin')
        }}
      />

      <Container maxWidth="xl" sx={{ py: 4 }}>

        {/* Snackbar Notifications */}
        <Snackbar
          open={!!error}
          autoHideDuration={6000}
          onClose={() => setError(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          <Alert severity="error" onClose={() => setError(null)} sx={{ width: '100%' }}>
            {error}
          </Alert>
        </Snackbar>

        <Snackbar
          open={!!success}
          autoHideDuration={4000}
          onClose={() => setSuccess(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          <Alert severity="success" onClose={() => setSuccess(null)} sx={{ width: '100%' }}>
            {success}
          </Alert>
        </Snackbar>

        <Stack spacing={4}>
          {/* Header Section */}
          <Paper elevation={3} sx={{ p: 4 }}>
            <Box sx={{ 
              display: 'flex', 
              flexDirection: { xs: 'column', sm: 'row' },
              justifyContent: 'space-between', 
              alignItems: { xs: 'stretch', sm: 'center' }, 
              gap: 3
            }}>
              <Box>
                <Typography 
                  variant="h4" 
                  component="h1"
                  sx={{ 
                    fontWeight: 700,
                    color: 'primary.dark',
                    mb: 1
                  }}
                >
{isCreating ? t('restaurantDetails.createYourRestaurant') : restaurant?.name}
                </Typography>
                <Typography variant="subtitle1" color="text.secondary">
                  {isCreating ? t('restaurantDetails.setupMessage') : t('restaurantDetails.restaurantManagementDashboard')}
                </Typography>
              </Box>
              
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                {isCreating ? (
                  <Button
                    variant="contained"
                    startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <Save />}
                    onClick={handleSave}
                    disabled={saving || !formData.name.trim()}
                    size="large"
                    sx={{
                      borderRadius: 2,
                      fontWeight: 600,
                      textTransform: 'none',
                      boxShadow: 2,
                      '&:hover': { boxShadow: 4 }
                    }}
                  >
{saving ? t('restaurantDetails.creating') : t('restaurantDetails.createRestaurantBtn')}
                  </Button>
                ) : !isEditing ? (
                  <Button
                    variant="contained"
                    startIcon={<Edit />}
                    onClick={handleEdit}
                    size="large"
                    sx={{ 
                      borderRadius: 2,
                      fontWeight: 600,
                      textTransform: 'none',
                      boxShadow: 2,
                      '&:hover': { boxShadow: 4 }
                    }}
                  >
{t('restaurantDetails.editDetails')}
                  </Button>
                ) : (
                  <>
                    <Button
                      variant="outlined"
                      startIcon={<Cancel />}
                      onClick={handleCancel}
                      disabled={saving}
                      size="large"
                      sx={{ 
                        borderRadius: 2,
                        fontWeight: 600,
                        textTransform: 'none'
                      }}
                    >
                      {t('restaurantDetails.cancel')}
                    </Button>
                    <Button
                      variant="contained"
                      startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <Save />}
                      onClick={handleSave}
                      disabled={saving || !formData.name.trim()}
                      size="large"
                      sx={{
                        borderRadius: 2,
                        fontWeight: 600,
                        textTransform: 'none',
                        boxShadow: 2,
                        '&:hover': { boxShadow: 4 }
                      }}
                    >
{saving ? t('restaurantDetails.saving') : t('restaurantDetails.saveChanges')}
                    </Button>
                  </>
                )}
              </Box>
            </Box>
          </Paper>

          {/* Form Content - Responsive Grid Layout */}
          <Grid container spacing={4}>
            {/* Basic Information - Left Column */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Paper elevation={3} sx={{ p: 4, height: 'fit-content' }}>
                <Typography variant="h5" gutterBottom sx={{ mb: 3, color: 'primary.dark' }}>
                  <Business sx={{ mr: 1, verticalAlign: 'middle' }} />
{t('restaurantDetails.basicInformation')}
                </Typography>
                
                <Stack spacing={3}>
                  <DarkTextField
label={t('restaurantDetails.restaurantName')}
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    disabled={!isEditing}
                    fullWidth
                    required
                    InputProps={{
                      startAdornment: <Restaurant sx={{ mr: 1.5, color: 'primary.dark' }} />
                    }}
                  />

                  <DarkTextField
label={t('restaurantDetails.description')}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    disabled={!isEditing}
                    fullWidth
                    multiline
                    rows={4}
                    InputProps={{
                      startAdornment: <Description sx={{ mr: 1.5, color: 'primary.dark', alignSelf: 'flex-start', mt: 2 }} />
                    }}
                  />

                  <DarkTextField
label={t('restaurantDetails.address')}
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    disabled={!isEditing}
                    fullWidth
                    multiline
                    rows={3}
                    InputProps={{
                      startAdornment: <LocationOn sx={{ mr: 1.5, color: 'primary.dark', alignSelf: 'flex-start', mt: 2 }} />
                    }}
                  />
                </Stack>
              </Paper>
            </Grid>

            {/* Right Column - Contact & Status */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Stack spacing={4}>
                {/* Contact Information */}
                <Paper elevation={3} sx={{ p: 4 }}>
                  <Typography variant="h5" gutterBottom sx={{ mb: 3, color: 'primary.dark' }}>
                    <ContactPhone sx={{ mr: 1, verticalAlign: 'middle' }} />
{t('restaurantDetails.contactInformation')}
                  </Typography>
                  
                  <Stack spacing={3}>
                    <DarkTextField
label={t('restaurantDetails.phoneNumber')}
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      disabled={!isEditing}
                      fullWidth
                      InputProps={{
                        startAdornment: <Phone sx={{ mr: 1.5, color: 'primary.dark' }} />
                      }}
                    />

                    <DarkTextField
label={t('restaurantDetails.emailAddress')}
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      disabled={!isEditing}
                      fullWidth
                      InputProps={{
                        startAdornment: <Email sx={{ mr: 1.5, color: 'primary.dark' }} />
                      }}
                    />
                  </Stack>
                </Paper>

                {/* Restaurant Status */}
                <Paper elevation={3} sx={{ p: 4 }}>
                  <Typography variant="h5" gutterBottom sx={{ mb: 3, color: 'primary.dark' }}>
                    <Settings sx={{ mr: 1, verticalAlign: 'middle' }} />
                    Restaurant Status
                  </Typography>
                  
                  <Box sx={{ 
                    p: 3, 
                    borderRadius: 2, 
                    backgroundColor: 'grey.50',
                    border: '2px solid',
                    borderColor: 'divider'
                  }}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={formData.isActive}
                          onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                          disabled={!isEditing}
                          sx={{
                            '& .MuiSwitch-switchBase.Mui-checked': { color: 'primary.dark' },
                            '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: 'primary.dark' }
                          }}
                        />
                      }
                      label={
                        <Box sx={{ ml: 2 }}>
                          <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                            {formData.isActive ? 'Active' : 'Inactive'}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {formData.isActive 
                              ? 'Your restaurant is visible to customers and accepting orders'
                              : 'Your restaurant is currently unavailable to customers'
                            }
                          </Typography>
                        </Box>
                      }
                    />
                  </Box>
                </Paper>
              </Stack>
            </Grid>
          </Grid>
        </Stack>
      </Container>
      
      <Footer />
    </>
  )
}