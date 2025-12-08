'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useTheme } from '@mui/material/styles'
import {
  Box,
  Container,
  Typography,
  Button,
  Alert,
  CircularProgress,
  Snackbar,
  Switch,
  FormControlLabel,
  Grid,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  MenuItem,
  Chip,
  IconButton,
  Stack,
  useMediaQuery
} from '@mui/material'
import {
  MenuBook,
  Add,
  Edit,
  Save,
  Cancel,
  Business,
  ContactPhone,
  Settings,
  Category as CategoryIcon,
  Restaurant,
  AttachMoney,
  Visibility,
  Warning,
  Delete
} from '@mui/icons-material'
import { RestaurantNavbar } from '@/lib/components/RestaurantNavbar'
import { DarkTextField } from '@/lib/components/DarkTextField'
import { DarkSelect } from '@/lib/components/DarkSelect'
import { Footer } from '@/lib/components/Footer'
import { ImageUpload, ImageUploadRef } from '@/lib/components/ImageUpload'
import { SelectionsManager } from '@/lib/components/SelectionsManager'
import { useTranslation } from 'react-i18next'

interface Category {
  id: string
  name: string
  description: string | null
  isActive: boolean
  sortOrder: number
  _count: {
    menuItems: number
  }
  createdAt: string
  updatedAt: string
}

interface SelectionOption {
  id?: string
  name: string
  priceAdd: number
  isAvailable: boolean
  sortOrder: number
}

interface Selection {
  id?: string
  name: string
  description?: string
  isRequired: boolean
  allowMultiple: boolean
  sortOrder: number
  options: SelectionOption[]
}

interface MenuItem {
  id: string
  name: string
  description: string | null
  price: number | string
  image: string | null
  isActive: boolean
  isAvailable: boolean
  sortOrder: number
  categoryId: string
  category: {
    id: string
    name: string
  }
  selections?: Selection[]
  createdAt: string
  updatedAt: string
}

export default function MenuManagementPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  // Removed useRoles hook - using session.user.id instead
  const theme = useTheme()
  const { t } = useTranslation()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))

  const [restaurant, setRestaurant] = useState<{ id: string; name: string } | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [currentTab, setCurrentTab] = useState(0)
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const hasFetched = useRef(false)
  const imageUploadRef = useRef<ImageUploadRef>(null)


  // Dialog states
  const [categoryDialog, setCategoryDialog] = useState(false)
  const [itemDialog, setItemDialog] = useState(false)
  const [deleteDialog, setDeleteDialog] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null)
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null)
  const [deletingItem, setDeletingItem] = useState<MenuItem | null>(null)
  const [itemDeleteDialog, setItemDeleteDialog] = useState(false)

  // Form states
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    description: '',
    isActive: true
  })

  const [itemForm, setItemForm] = useState({
    name: '',
    description: '',
    price: '',
    categoryId: '',
    isActive: true,
    isAvailable: true
  })

  const [itemSelections, setItemSelections] = useState<Selection[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('')

  useEffect(() => {
    if (status === 'loading') return
    if (!session) router.push('/auth/signin')
    // All authenticated users can access this page
  }, [session, status, router])

  useEffect(() => {
    const fetchData = async () => {
      if (hasFetched.current) return
      
      try {
        hasFetched.current = true
        if (!session?.user?.id) {
          throw new Error('No user session available')
        }
        
        // Fetch restaurant info, categories, and menu items
        const [restaurantRes, categoriesRes, itemsRes] = await Promise.all([
          fetch(`/api/user/profile`),
          fetch(`/api/restaurant/categories`),
          fetch(`/api/restaurant/menu-items`)
        ])

        if (!restaurantRes.ok || !categoriesRes.ok || !itemsRes.ok) {
          throw new Error('Failed to fetch menu data')
        }

        const [userData, categoriesData, itemsData] = await Promise.all([
          restaurantRes.json(),
          categoriesRes.json(),
          itemsRes.json()
        ])

        // Transform user data to restaurant format
        const restaurantData = {
          id: userData.id,
          name: userData.restaurantName
        }
        setRestaurant(restaurantData)
        setCategories(Array.isArray(categoriesData) ? categoriesData : [])
        setMenuItems(Array.isArray(itemsData) ? itemsData : [])
      } catch {
        setError(t('menu.failedToLoadMenuData'))
      } finally {
        setLoading(false)
      }
    }

    if (session && !hasFetched.current) {
      fetchData()
    }
  }, [session])


  const handleSaveCategory = async () => {
    try {
      setSaving(true)
      setError(null)
      setSuccess(null)
      
      if (!categoryForm.name.trim()) {
        setError(t('menu.categoryNameRequired'))
        return
      }

      const url = editingCategory 
        ? `/api/restaurant/categories/${editingCategory.id}` 
        : `/api/restaurant/categories`
      const method = editingCategory ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...categoryForm,
          name: categoryForm.name.trim(),
          description: categoryForm.description.trim() || null
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || t('menu.failedToSaveCategory'))
      }
      
      const savedCategory = await response.json()
      
      // Update categories state in place instead of refreshing
      if (editingCategory) {
        // Update existing category
        setCategories(prevCategories => 
          prevCategories.map(cat => 
            cat.id === editingCategory.id ? savedCategory : cat
          )
        )
      } else {
        // Add new category
        setCategories(prevCategories => [...prevCategories, savedCategory])
      }
      
      setCategoryDialog(false)
      setSuccess(editingCategory 
        ? t('menu.categoryUpdatedSuccess', { name: categoryForm.name })
        : t('menu.categoryCreatedSuccess', { name: categoryForm.name })
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : t('menu.failedToSaveCategory'))
    } finally {
      setSaving(false)
    }
  }

  const handleSaveItem = async () => {
    try {
      setSaving(true)
      setError(null)
      setSuccess(null)
      
      if (!itemForm.name.trim()) {
        setError(t('menu.menuItemNameRequired'))
        return
      }

      if (!itemForm.price || isNaN(parseFloat(itemForm.price)) || parseFloat(itemForm.price) <= 0) {
        setError(t('menu.validPriceRequired'))
        return
      }

      if (!itemForm.categoryId) {
        setError(t('menu.categoryRequired'))
        return
      }

      const url = editingItem 
        ? `/api/restaurant/menu-items/${editingItem.id}` 
        : `/api/restaurant/menu-items`
      const method = editingItem ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...itemForm,
          name: itemForm.name.trim(),
          description: itemForm.description.trim() || null,
          price: parseFloat(itemForm.price),
          // Preserve current image when updating (will be overridden if uploading/deleting)
          image: editingItem?.image || null
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || t('menu.failedToSaveMenuItem'))
      }

      const savedItem = await response.json()
      
      // Update editingItem with the saved data (important for new items to get ID)
      setEditingItem(savedItem)
      
      // Save selections if any
      if (itemSelections.length > 0) {
        try {
          // Delete existing selections for updates
          if (editingItem?.id) {
            const existingSelections = editingItem.selections || []
            for (const selection of existingSelections) {
              if (selection.id) {
                await fetch(`/api/restaurant/menu-items/${savedItem.id}/selections/${selection.id}`, {
                  method: 'DELETE'
                })
              }
            }
          }

          // Create new selections
          for (const selection of itemSelections) {
            const response = await fetch(`/api/restaurant/menu-items/${savedItem.id}/selections`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(selection)
            })

            if (!response.ok) {
              throw new Error(t('menu.failedToSaveSelection'))
            }
          }
        } catch (selectionError) {
          setError(t('menu.menuItemSavedSelectionsError', { error: selectionError instanceof Error ? selectionError.message : 'Unknown error' }))
          return
        }
      }
      
      // Handle image operations
      let uploadedImagePath: string | null = null
      let imageDeleted = false
      
      // Check if there's a pending image deletion
      if (imageUploadRef.current?.hasPendingDeletion()) {
        try {
          await imageUploadRef.current.deleteImage()
          savedItem.image = null
          imageDeleted = true
        } catch (imageError) {
          // Image deletion failed, but menu item was saved
          setError(t('menu.menuItemSavedImageDeleteError', { error: imageError instanceof Error ? imageError.message : 'Unknown error' }))
          return
        }
      }
      
      // Check if there's a selected image to upload
      if (imageUploadRef.current?.hasSelectedFile()) {
        try {
          uploadedImagePath = await imageUploadRef.current.uploadSelectedFile()
          if (uploadedImagePath) {
            savedItem.image = uploadedImagePath
          }
        } catch (imageError) {
          // Image upload failed, but menu item was saved
          setError(t('menu.menuItemSavedImageUploadError', { error: imageError instanceof Error ? imageError.message : 'Unknown error' }))
          return
        }
      }
      
      // Update the menu items state in place instead of refreshing
      if (editingItem) {
        // Update existing item
        setMenuItems(prevItems => 
          prevItems.map(item => 
            item.id === savedItem.id ? savedItem : item
          )
        )
      } else {
        // Add new item
        setMenuItems(prevItems => [...prevItems, savedItem])
      }
      
      // Update editingItem with the final saved data
      setEditingItem(savedItem)
      
      let successMessageSuffix = ''
      if (imageDeleted && uploadedImagePath) {
        successMessageSuffix = t('menu.withImageReplaced')
      } else if (imageDeleted) {
        successMessageSuffix = t('menu.andImageDeleted')
      } else if (uploadedImagePath) {
        successMessageSuffix = t('menu.withImage')
      }
      
      const successMessage = editingItem 
        ? t('menu.menuItemUpdatedSuccess', { name: itemForm.name, suffix: successMessageSuffix })
        : t('menu.menuItemCreatedSuccess', { name: itemForm.name, suffix: successMessageSuffix || t('menu.canUploadImageLater') })
      
      setSuccess(successMessage)
      
      // Close dialog if this was an edit, or if new item was created and image was uploaded
      if (editingItem || uploadedImagePath || imageDeleted) {
        setItemDialog(false)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save menu item')
    } finally {
      setSaving(false)
    }
  }

  const handleCreateCategory = () => {
    setEditingCategory(null)
    setCategoryForm({ name: '', description: '', isActive: true })
    setCategoryDialog(true)
  }

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category)
    setCategoryForm({
      name: category.name,
      description: category.description || '',
      isActive: category.isActive
    })
    setCategoryDialog(true)
  }

  const handleDeleteCategory = (category: Category) => {
    setDeletingCategory(category)
    setDeleteDialog(true)
  }

  const confirmDeleteCategory = async () => {
    if (!deletingCategory) return
    
    try {
      setSaving(true)
      setError(null)
      setSuccess(null)
      
      const response = await fetch(`/api/restaurant/categories/${deletingCategory.id}`, {
        method: 'DELETE'
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || t('menu.failedToDeleteCategory'))
      }
      
      // Remove category from state
      setCategories(prevCategories => 
        prevCategories.filter(cat => cat.id !== deletingCategory.id)
      )
      
      setDeleteDialog(false)
      setSuccess(t('menu.categoryDeletedSuccess', { name: deletingCategory.name }))
    } catch (err) {
      setError(err instanceof Error ? err.message : t('menu.failedToDeleteCategory'))
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteItem = (item: MenuItem) => {
    setDeletingItem(item)
    setItemDeleteDialog(true)
  }

  const confirmDeleteItem = async () => {
    if (!deletingItem) return
    
    try {
      setSaving(true)
      setError(null)
      setSuccess(null)
      
      const response = await fetch(`/api/restaurant/menu-items/${deletingItem.id}`, {
        method: 'DELETE'
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || t('menu.failedToDeleteItem'))
      }
      
      // Remove item from state
      setMenuItems(prevItems => 
        prevItems.filter(item => item.id !== deletingItem.id)
      )
      
      setItemDeleteDialog(false)
      setSuccess(t('menu.itemDeletedSuccess', { name: deletingItem.name }))
    } catch (err) {
      setError(err instanceof Error ? err.message : t('menu.failedToDeleteItem'))
    } finally {
      setSaving(false)
    }
  }

  const handleCreateItem = (preSelectedCategoryId?: string) => {
    setEditingItem(null)
    setItemForm({
      name: '',
      description: '',
      price: '',
      categoryId: preSelectedCategoryId || selectedCategory || (categories.length > 0 ? categories[0].id : ''),
      isActive: true,
      isAvailable: true
    })
    setItemSelections([])
    setItemDialog(true)
  }

  const handleEditItem = (item: MenuItem) => {
    setEditingItem(item)
    setItemForm({
      name: item.name,
      description: item.description || '',
      price: item.price.toString(),
      categoryId: item.categoryId,
      isActive: item.isActive,
      isAvailable: item.isAvailable
    })
    setItemSelections(item.selections || [])
    setItemDialog(true)
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

  return (
    <>
      <RestaurantNavbar 
        backButton={{
          href: '/restaurant-admin',
          label: t('menu.backToRestaurantAdmin')
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

        {/* Tabs Paper */}
        <Paper elevation={3} sx={{ mb: 3 }}>
          {/* View Public Menu Button - Mobile first row */}
          <Box sx={{ 
            display: { xs: 'block', md: 'none' },
            p: 2,
            borderBottom: 1,
            borderColor: 'divider'
          }}>
            <Button
              variant="outlined"
              color="primary"
              size="small"
              startIcon={<Visibility />}
              onClick={() => window.open(`/menu/${session?.user?.id}`, '_blank')}
              fullWidth
              sx={{
                textTransform: 'none',
                fontWeight: 500,
                borderRadius: 2,
                py: 1.5,
                fontSize: '0.875rem',
                '&:hover': {
                  backgroundColor: 'primary.50'
                }
              }}
            >
              {t('menu.viewPublicMenu')}
            </Button>
          </Box>

          <Box sx={{ 
            borderBottom: 1, 
            borderColor: 'divider',
            position: 'relative'
          }}>
            {/* View Public Menu Button - Desktop */}
            <Box sx={{ 
              display: { xs: 'none', md: 'block' },
              position: 'absolute',
              top: 8,
              right: 16,
              zIndex: 1
            }}>
              <Button
                variant="outlined"
                color="primary"
                size="small"
                startIcon={<Visibility />}
                onClick={() => window.open(`/menu/${session?.user?.id}`, '_blank')}
                sx={{
                  textTransform: 'none',
                  fontWeight: 500,
                  borderRadius: 2,
                  px: 2,
                  py: 1,
                  fontSize: '0.875rem',
                  '&:hover': {
                    backgroundColor: 'primary.50'
                  }
                }}
              >
                {t('menu.viewPublicMenu')}
              </Button>
            </Box>

            <Tabs 
              value={currentTab} 
              onChange={(_, newValue) => setCurrentTab(newValue)}
              sx={{
                '& .MuiTab-root': {
                  color: 'text.primary',
                  fontWeight: 500,
                  '&.Mui-selected': {
                    color: 'primary.dark',
                    fontWeight: 700
                  },
                  '&:hover': {
                    color: 'primary.dark',
                    backgroundColor: `${theme.palette.primary.main}05`
                  }
                },
                '& .MuiTabs-indicator': {
                  backgroundColor: 'primary.dark',
                  height: 3,
                  borderRadius: '2px 2px 0 0'
                }
              }}
            >
              <Tab 
                label={`${t('menu.menu')} (${menuItems.length})`} 
                icon={<Restaurant />}
                iconPosition="start"
                sx={{ 
                  fontSize: { xs: '0.875rem', sm: '1rem' }, 
                  minHeight: 64,
                  textTransform: 'none',
                  px: { xs: 2, sm: 3 }
                }}
              />
              <Tab 
                label={`${t('menu.categories')} (${categories.length})`} 
                icon={<CategoryIcon />}
                iconPosition="start"
                sx={{ 
                  fontSize: { xs: '0.875rem', sm: '1rem' }, 
                  minHeight: 64,
                  textTransform: 'none',
                  px: { xs: 2, sm: 3 }
                }}
              />
            </Tabs>
          </Box>

          {/* Menu Tab */}
          {currentTab === 0 && (
            <Box sx={{ p: 4 }}>
              {/* Mobile Layout - Title and Button in different rows */}
              <Box sx={{ display: { xs: 'block', md: 'none' }, mb: 3 }}>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: 'primary.dark' }}>
                    <Restaurant sx={{ mr: 1, verticalAlign: 'middle' }} />
                    {t('menu.menuManagement')}
                  </Typography>
                </Box>
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={() => handleCreateItem()}
                  disabled={categories.length === 0}
                  fullWidth
                  sx={{ 
                    borderRadius: 2,
                    fontWeight: 600,
                    textTransform: 'none',
                    boxShadow: 2,
                    py: 1.5,
                    '&:hover': { boxShadow: 4 }
                  }}
                >
                  {t('menu.addItem')}
                </Button>
              </Box>

              {/* Desktop Layout - Title and Button in same row */}
              <Box sx={{ display: { xs: 'none', md: 'flex' }, justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: 'primary.dark' }}>
                    <Restaurant sx={{ mr: 1, verticalAlign: 'middle' }} />
                    {t('menu.menuManagement')}
                  </Typography>
                </Box>
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={() => handleCreateItem()}
                  disabled={categories.length === 0}
                  sx={{ 
                    borderRadius: 2,
                    fontWeight: 600,
                    textTransform: 'none',
                    boxShadow: 2,
                    '&:hover': { boxShadow: 4 }
                  }}
                >
                  {t('menu.addItem')}
                </Button>
              </Box>

              {/* Group menu items by category */}
              {(categories || [])
                .filter(category => (menuItems || []).some(item => item.categoryId === category.id))
                .map((category) => {
                  const categoryItems = (menuItems || []).filter(item => item.categoryId === category.id)
                  
                  return (
                    <Paper 
                      key={category.id} 
                      elevation={2} 
                      sx={{ 
                        mb: 3, 
                        p: 2, 
                        backgroundColor: 'grey.50',
                        border: '1px solid',
                        borderColor: 'divider'
                      }}
                    >
                      {/* Category Header - Mobile Layout */}
                      <Box sx={{ display: { xs: 'block', md: 'none' }, mb: 2 }}>
                        {/* Category name and count row */}
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                          <CategoryIcon sx={{ mr: 2, color: 'primary.dark', fontSize: '1.5rem' }} />
                          <Typography variant="h5" sx={{ fontWeight: 700, color: 'primary.dark', flex: 1 }}>
                            {category.name}
                          </Typography>
                          <Chip 
                            label={t('menu.items', { count: categoryItems.length })}
                            color="primary"
                            size="small"
                            variant="outlined"
                            sx={{ fontWeight: 600 }}
                          />
                        </Box>
                        {/* Action buttons row */}
                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                          <IconButton
                            size="small"
                            onClick={() => handleEditCategory(category)}
                            sx={{ 
                              color: 'primary.main',
                              '&:hover': { backgroundColor: 'primary.50' }
                            }}
                          >
                            <Edit />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => handleDeleteCategory(category)}
                            sx={{ 
                              color: 'error.main',
                              '&:hover': { backgroundColor: 'error.50' }
                            }}
                          >
                            <Delete />
                          </IconButton>
                          <Button
                            variant="contained"
                            size="small"
                            startIcon={<Add />}
                            onClick={() => {
                              handleCreateItem(category.id)
                            }}
                            sx={{ 
                              borderRadius: 2,
                              fontWeight: 600,
                              textTransform: 'none',
                              boxShadow: 1,
                              flex: 1,
                              '&:hover': { boxShadow: 2 }
                            }}
                          >
                            {t('menu.addItem')}
                          </Button>
                        </Box>
                      </Box>

                      {/* Category Header - Desktop Layout */}
                      <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', mb: 2 }}>
                        <CategoryIcon sx={{ mr: 2, color: 'primary.dark', fontSize: '1.5rem' }} />
                        <Typography variant="h5" sx={{ fontWeight: 700, color: 'primary.dark', flex: 1 }}>
                          {category.name}
                        </Typography>
                        <Chip 
                          label={t('menu.items', { count: categoryItems.length })}
                          color="primary"
                          size="small"
                          variant="outlined"
                          sx={{ fontWeight: 600, mr: 2 }}
                        />
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <IconButton
                            size="small"
                            onClick={() => handleEditCategory(category)}
                            sx={{ 
                              color: 'primary.main',
                              '&:hover': { backgroundColor: 'primary.50' }
                            }}
                          >
                            <Edit />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => handleDeleteCategory(category)}
                            sx={{ 
                              color: 'error.main',
                              '&:hover': { backgroundColor: 'error.50' }
                            }}
                          >
                            <Delete />
                          </IconButton>
                          <Button
                            variant="contained"
                            size="small"
                            startIcon={<Add />}
                            onClick={() => {
                              handleCreateItem(category.id)
                            }}
                            sx={{ 
                              borderRadius: 2,
                              fontWeight: 600,
                              textTransform: 'none',
                              boxShadow: 1,
                              '&:hover': { boxShadow: 2 }
                            }}
                          >
                            {t('menu.addItem')}
                          </Button>
                        </Box>
                      </Box>

                      {/* Category Items Grid */}
                      <Grid container spacing={4}>
                        {categoryItems.map((item) => (
                          <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={item.id}>
                            <Paper 
                              elevation={3} 
                              sx={{ 
                                height: '100%',
                                display: 'flex',
                                flexDirection: 'column',
                                overflow: 'hidden',
                                transition: 'all 0.3s ease',
                                '&:hover': {
                                  transform: 'translateY(-4px)',
                                  boxShadow: 6
                                }
                              }}
                            >
                      {/* Image Section */}
                      <Box 
                        sx={{ 
                          position: 'relative',
                          width: '100%',
                          height: 280,
                          backgroundColor: item.image ? 'grey.100' : 'primary.50',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        {item.image ? (
                          <img
                            src={item.image}
                            alt={item.name}
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover'
                            }}
                          />
                        ) : (
                          <Restaurant sx={{ 
                            color: 'primary.dark', 
                            fontSize: '3rem',
                            opacity: 0.6 
                          }} />
                        )}
                        
                        {/* Action Buttons Overlay */}
                        <Box
                          sx={{
                            position: 'absolute',
                            top: 12,
                            right: 12,
                            display: 'flex',
                            gap: 1
                          }}
                        >
                          <Box
                            sx={{
                              backgroundColor: 'rgba(255, 255, 255, 0.95)',
                              borderRadius: '50%',
                              backdropFilter: 'blur(8px)',
                              boxShadow: 2
                            }}
                          >
                            <IconButton 
                              size="medium" 
                              onClick={() => handleEditItem(item)}
                              sx={{ 
                                color: 'primary.dark',
                                '&:hover': {
                                  backgroundColor: 'primary.50'
                                }
                              }}
                            >
                              <Edit />
                            </IconButton>
                          </Box>
                          <Box
                            sx={{
                              backgroundColor: 'rgba(255, 255, 255, 0.95)',
                              borderRadius: '50%',
                              backdropFilter: 'blur(8px)',
                              boxShadow: 2
                            }}
                          >
                            <IconButton 
                              size="medium" 
                              onClick={() => handleDeleteItem(item)}
                              sx={{ 
                                color: 'error.main',
                                '&:hover': {
                                  backgroundColor: 'error.50'
                                }
                              }}
                            >
                              <Delete />
                            </IconButton>
                          </Box>
                        </Box>
                      </Box>

                      {/* Content Section */}
                      <Box sx={{ p: 3, flex: 1, display: 'flex', flexDirection: 'column' }}>
                        {/* Title and Price */}
                        <Box sx={{ mb: 2 }}>
                          <Typography 
                            variant="h6" 
                            sx={{ 
                              fontWeight: 700, 
                              color: 'primary.dark',
                              mb: 1,
                              lineHeight: 1.2,
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis'
                            }}
                          >
                            {item.name}
                          </Typography>
                          
                          <Typography 
                            variant="h6" 
                            sx={{ 
                              color: 'primary.dark', 
                              fontWeight: 700,
                              fontSize: '1.1rem'
                            }}
                          >
                            B {Number(item.price).toFixed(2)}
                          </Typography>
                        </Box>

                        {/* Description */}
                        <Box sx={{ flex: 1, mb: 2 }}>
                          {item.description && (
                            <Typography 
                              variant="body2" 
                              color="text.secondary" 
                              sx={{ 
                                lineHeight: 1.4,
                                display: '-webkit-box',
                                WebkitLineClamp: 1,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'pre-wrap'
                              }}
                            >
                              {item.description}
                            </Typography>
                          )}
                        </Box>

                        {/* Status Chips */}
                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                          <Chip 
                            label={item.category.name}
                            variant="outlined"
                            size="small"
                            color="primary"
                            sx={{ 
                              fontWeight: 600,
                              fontSize: '0.75rem',
                              height: 24
                            }}
                          />
                          <Chip 
                            label={item.isActive ? t('menu.active') : t('menu.inactive')}
                            color={item.isActive ? 'success' : 'error'}
                            size="small"
                            sx={{ 
                              fontWeight: 600,
                              fontSize: '0.75rem',
                              height: 24
                            }}
                          />
                          <Chip 
                            label={item.isAvailable ? t('menu.available') : t('menu.outOfStock')}
                            color={item.isAvailable ? 'success' : 'warning'}
                            size="small"
                            variant="outlined"
                            sx={{ 
                              fontWeight: 600,
                              fontSize: '0.75rem',
                              height: 24,
                              color: item.isAvailable ? 'success.dark' : 'warning.dark'
                            }}
                          />
                        </Stack>
                          </Box>
                          </Paper>
                        </Grid>
                      ))}
                    </Grid>
                    </Paper>
                  )
                })}

              {/* Empty Categories */}
              {(categories || [])
                .filter(category => !(menuItems || []).some(item => item.categoryId === category.id))
                .map((category) => (
                  <Paper 
                    key={category.id} 
                    elevation={1} 
                    sx={{ 
                      mb: 3, 
                      p: 2, 
                      backgroundColor: 'grey.25',
                      border: '2px dashed',
                      borderColor: 'divider'
                    }}
                  >
                    {/* Empty Category Header - Mobile Layout */}
                    <Box sx={{ display: { xs: 'block', md: 'none' }, mb: 2 }}>
                      {/* Category name and empty label row */}
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <CategoryIcon sx={{ mr: 2, color: 'text.secondary', fontSize: '1.5rem' }} />
                        <Typography variant="h5" sx={{ fontWeight: 700, color: 'text.secondary', flex: 1 }}>
                          {category.name}
                        </Typography>
                        <Chip 
                          label={t('menu.empty')}
                          color="default"
                          size="small"
                          variant="outlined"
                          sx={{ fontWeight: 600 }}
                        />
                      </Box>
                      {/* Action buttons row */}
                      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                        <IconButton
                          size="small"
                          onClick={() => handleEditCategory(category)}
                          sx={{ 
                            color: 'primary.main',
                            '&:hover': { backgroundColor: 'primary.50' }
                          }}
                        >
                          <Edit />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleDeleteCategory(category)}
                          sx={{ 
                            color: 'error.main',
                            '&:hover': { backgroundColor: 'error.50' }
                          }}
                        >
                          <Delete />
                        </IconButton>
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<Add />}
                          onClick={() => {
                            handleCreateItem(category.id)
                          }}
                          sx={{ 
                            borderRadius: 2,
                            fontWeight: 600,
                            textTransform: 'none',
                            flex: 1
                          }}
                        >
                          {t('menu.addFirstItem')}
                        </Button>
                      </Box>
                    </Box>

                    {/* Empty Category Header - Desktop Layout */}
                    <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', mb: 2 }}>
                      <CategoryIcon sx={{ mr: 2, color: 'text.secondary', fontSize: '1.5rem' }} />
                      <Typography variant="h5" sx={{ fontWeight: 700, color: 'text.secondary', flex: 1 }}>
                        {category.name}
                      </Typography>
                      <Chip 
                        label={t('menu.empty')}
                        color="default"
                        size="small"
                        variant="outlined"
                        sx={{ fontWeight: 600, mr: 2 }}
                      />
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <IconButton
                          size="small"
                          onClick={() => handleEditCategory(category)}
                          sx={{ 
                            color: 'primary.main',
                            '&:hover': { backgroundColor: 'primary.50' }
                          }}
                        >
                          <Edit />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleDeleteCategory(category)}
                          sx={{ 
                            color: 'error.main',
                            '&:hover': { backgroundColor: 'error.50' }
                          }}
                        >
                          <Delete />
                        </IconButton>
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<Add />}
                          onClick={() => {
                            handleCreateItem(category.id)
                          }}
                          sx={{ 
                            borderRadius: 2,
                            fontWeight: 600,
                            textTransform: 'none'
                          }}
                        >
                          {t('menu.addFirstItem')}
                        </Button>
                      </Box>
                    </Box>
                    <Box sx={{ textAlign: 'center', py: 2 }}>
                      <Restaurant sx={{ fontSize: '3rem', color: 'text.secondary', mb: 1 }} />
                      <Typography variant="body2" color="text.secondary">
                        {t('menu.noItemsInCategory')}
                      </Typography>
                    </Box>
                  </Paper>
                ))}

              {categories.length === 0 && (
                <Box sx={{ textAlign: 'center', py: 8 }}>
                  <Restaurant sx={{ fontSize: '4rem', color: 'text.secondary', mb: 2 }} />
                  <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
                    {t('menu.noCategoriesYet')}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {t('menu.createCategoriesFirst')}
                  </Typography>
                </Box>
              )}
            </Box>
          )}

          {/* Categories Tab */}
          {currentTab === 1 && (
            <Box sx={{ p: 4 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: 'primary.dark' }}>
                    <CategoryIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                    {t('menu.categoriesManagement')}
                  </Typography>
                </Box>
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={handleCreateCategory}
                  sx={{ 
                    borderRadius: 2,
                    fontWeight: 600,
                    textTransform: 'none',
                    boxShadow: 2,
                    '&:hover': { boxShadow: 4 }
                  }}
                >
                  {t('menu.addCategory')}
                </Button>
              </Box>

              <Grid container spacing={4}>
                {(categories || []).map((category) => (
                  <Grid size={{ xs: 12, sm: 12, md: 6, lg: 6 }} key={category.id}>
                    <Paper elevation={3} sx={{ p: 4, height: 'fit-content' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                        <CategoryIcon sx={{ color: 'primary.dark', fontSize: '1.5rem' }} />
                        <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.dark', flex: 1 }}>
                          {category.name}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          <IconButton 
                            size="small" 
                            onClick={() => handleEditCategory(category)}
                            sx={{ color: 'primary.dark' }}
                          >
                            <Edit fontSize="small" />
                          </IconButton>
                          <IconButton 
                            size="small" 
                            onClick={() => handleDeleteCategory(category)}
                            disabled={category._count?.menuItems > 0}
                            sx={{ 
                              color: (category._count?.menuItems || 0) > 0 ? 'text.disabled' : 'error.main',
                              '&:hover': {
                                backgroundColor: (category._count?.menuItems || 0) > 0 ? 'transparent' : 'error.50'
                              }
                            }}
                          >
                            <Delete fontSize="small" />
                          </IconButton>
                        </Box>
                      </Box>

                      {category.description && (
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                            {category.description}
                          </Typography>
                        </Box>
                      )}

                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Chip 
                            label={category.isActive ? t('menu.active') : t('menu.inactive')}
                            color={category.isActive ? 'success' : 'error'}
                            size="small"
                            sx={{ fontWeight: 600 }}
                          />
                          <Chip 
                            label={t('menu.items', { count: category._count?.menuItems || 0 })}
                            variant="outlined"
                            size="small"
                            color="primary"
                            sx={{ fontWeight: 600 }}
                          />
                        </Box>
                      </Box>
                    </Paper>
                  </Grid>
                ))}
              </Grid>

              {categories.length === 0 && (
                <Box sx={{ textAlign: 'center', py: 8 }}>
                  <CategoryIcon sx={{ fontSize: '4rem', color: 'text.secondary', mb: 2 }} />
                  <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
                    {t('menu.noCategoriesYet')}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {t('menu.createFirstCategory')}
                  </Typography>
                  <Button
                    variant="contained"
                    startIcon={<Add />}
                    onClick={handleCreateCategory}
                    sx={{ 
                      borderRadius: 2,
                      fontWeight: 600,
                      textTransform: 'none',
                      boxShadow: 2,
                      '&:hover': { boxShadow: 4 }
                    }}
                  >
                    {t('menu.addFirstCategory')}
                  </Button>
                </Box>
              )}
            </Box>
          )}
        </Paper>

        {/* Category Dialog */}
        <Dialog 
          open={categoryDialog} 
          onClose={() => setCategoryDialog(false)} 
          maxWidth="sm" 
          fullWidth
        >
          <DialogTitle sx={{ pb: 1, fontWeight: 700 }}>
            {editingCategory ? t('menu.editCategory') : t('menu.createNewCategory')}
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={{ xs: 2, md: 3 }}>
              <Grid size={{ xs: 12 }}>
                <Box sx={{ 
                  p: { xs: 3, md: 4 }, 
                  borderRadius: 2, 
                  backgroundColor: theme.palette.grey[50],
                  border: `1px solid ${theme.palette.divider}`
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                    <Box sx={{ 
                      p: 1, 
                      borderRadius: 2, 
                      backgroundColor: `${theme.palette.primary.main}20`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <CategoryIcon sx={{ color: theme.palette.primary.main, fontSize: '1.25rem' }} />
                    </Box>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: theme.palette.text.primary }}>
                      {t('menu.categoryDetails')}
                    </Typography>
                  </Box>
                  
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 1.5, sm: 2, md: 2.5 } }}>
                    <DarkTextField
                      label={t('menu.categoryName')}
                      value={categoryForm.name}
                      onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                      fullWidth
                      required
                      sx={{ backgroundColor: 'white' }}
                    />
                    <DarkTextField
                      label={t('menu.description')}
                      value={categoryForm.description}
                      onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                      fullWidth
                      multiline
                      rows={3}
                      sx={{ backgroundColor: 'white' }}
                    />
                    
                    <Box sx={{ 
                      p: 3, 
                      borderRadius: 2, 
                      backgroundColor: 'white',
                      border: `2px solid ${theme.palette.divider}`
                    }}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={categoryForm.isActive}
                            onChange={(e) => setCategoryForm({ ...categoryForm, isActive: e.target.checked })}
                            sx={{
                              '& .MuiSwitch-switchBase.Mui-checked': {
                                color: 'primary.dark'
                              },
                              '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                                backgroundColor: 'primary.dark'
                              }
                            }}
                          />
                        }
                        label={
                          <Box sx={{ ml: 1 }}>
                            <Typography variant="h6" sx={{ fontWeight: 700 }}>
                              {categoryForm.isActive ? t('menu.active') : t('menu.inactive')}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {categoryForm.isActive 
                                ? t('menu.activeDescription')
                                : t('menu.inactiveDescription')
                              }
                            </Typography>
                          </Box>
                        }
                      />
                    </Box>
                  </Box>
                </Box>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ p: 3, gap: 1 }}>
            <Button 
              onClick={() => setCategoryDialog(false)}
              disabled={saving}
              sx={{
                borderRadius: 2,
                fontWeight: 600,
                textTransform: 'none',
                color: 'text.primary'
              }}
            >
              {t('menu.cancel')}
            </Button>
            <Button 
              onClick={handleSaveCategory} 
              variant="contained"
              disabled={saving}
              startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <Save />}
              sx={{
                borderRadius: 2,
                fontWeight: 600,
                textTransform: 'none',
                boxShadow: 2,
                '&:hover': { boxShadow: 4 }
              }}
            >
              {saving ? t('menu.saving') : (editingCategory ? t('menu.update') : t('menu.create'))}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Menu Item Dialog */}
        <Dialog 
          open={itemDialog} 
          onClose={() => setItemDialog(false)} 
          maxWidth="lg" 
          fullWidth
        >
          <DialogTitle sx={{ pb: 1, fontWeight: 700 }}>
            {editingItem ? t('menu.editMenuItem') : t('menu.createNewMenuItem')}
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={{ xs: 2, md: 3 }}>
              <Grid size={{ xs: 12, md: 6 }}>
                <Box sx={{ 
                  p: { xs: 3, md: 4 }, 
                  borderRadius: 2, 
                  backgroundColor: theme.palette.grey[50],
                  border: `1px solid ${theme.palette.divider}`,
                  height: 'fit-content'
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                    <Box sx={{ 
                      p: 1, 
                      borderRadius: 2, 
                      backgroundColor: `${theme.palette.primary.main}20`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <Restaurant sx={{ color: theme.palette.primary.main, fontSize: '1.25rem' }} />
                    </Box>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: theme.palette.text.primary }}>
                      {t('menu.itemDetails')}
                    </Typography>
                  </Box>
                  
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 1.5, sm: 2, md: 2.5 } }}>
                    <DarkTextField
                      label={t('menu.itemName')}
                      value={itemForm.name}
                      onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                      fullWidth
                      required
                      sx={{ backgroundColor: 'white' }}
                    />
                    <DarkTextField
                      label={t('menu.price')}
                      type="number"
                      value={itemForm.price}
                      onChange={(e) => setItemForm({ ...itemForm, price: e.target.value })}
                      fullWidth
                      required
                      inputProps={{
                        min: 0,
                        step: 0.01
                      }}
                      InputProps={{
                        startAdornment: <Typography sx={{ mr: 1, color: 'primary.dark', fontWeight: 600 }}>B</Typography>
                      }}
                      sx={{ backgroundColor: 'white' }}
                    />
                    <DarkSelect
                      label={t('menu.category')}
                      value={itemForm.categoryId}
                      onChange={(e) => setItemForm({ ...itemForm, categoryId: e.target.value as string })}
                      fullWidth
                      required
                      formControlProps={{ sx: { backgroundColor: 'white', borderRadius: 1 } }}
                    >
                      {(categories || []).filter(cat => cat.isActive).map((category) => (
                        <MenuItem key={category.id} value={category.id}>
                          {category.name}
                        </MenuItem>
                      ))}
                    </DarkSelect>
                    <DarkTextField
                      label={t('menu.description')}
                      value={itemForm.description}
                      onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
                      fullWidth
                      multiline
                      rows={2}
                      placeholder={t('menu.describeMenuItem')}
                      sx={{ backgroundColor: 'white' }}
                    />
                    
                    {/* Active Switch */}
                    <Box sx={{ 
                      p: 2, 
                      borderRadius: 2, 
                      backgroundColor: 'white',
                      border: `1px solid`,
                      borderColor: 'divider'
                    }}>
                      <FormControlLabel
                        control={
                          <Switch
                            size="small"
                            checked={itemForm.isActive}
                            onChange={(e) => setItemForm({ ...itemForm, isActive: e.target.checked })}
                            sx={{
                              '& .MuiSwitch-switchBase.Mui-checked': {
                                color: 'primary.dark'
                              },
                              '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                                backgroundColor: 'primary.dark'
                              }
                            }}
                          />
                        }
                        label={
                          <Box sx={{ ml: 0.5 }}>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {t('menu.activeVisibleOnMenu')}
                            </Typography>
                          </Box>
                        }
                      />
                    </Box>
                    
                    {/* Available Switch */}
                    <Box sx={{ 
                      p: 2, 
                      borderRadius: 2, 
                      backgroundColor: 'white',
                      border: `1px solid`,
                      borderColor: 'divider'
                    }}>
                      <FormControlLabel
                        control={
                          <Switch
                            size="small"
                            checked={itemForm.isAvailable}
                            onChange={(e) => setItemForm({ ...itemForm, isAvailable: e.target.checked })}
                            sx={{
                              '& .MuiSwitch-switchBase.Mui-checked': {
                                color: 'primary.dark'
                              },
                              '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                                backgroundColor: 'primary.dark'
                              }
                            }}
                          />
                        }
                        label={
                          <Box sx={{ ml: 0.5 }}>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {t('menu.availableInStock')}
                            </Typography>
                          </Box>
                        }
                      />
                    </Box>
                  </Box>
                </Box>
              </Grid>

              <Grid size={{ xs: 12, md: 6 }}>
                <Box sx={{ 
                  p: 4, 
                  borderRadius: 2, 
                  backgroundColor: 'grey.50',
                  border: `1px solid`,
                  borderColor: 'divider',
                  height: 'fit-content'
                }}>
                  <Typography variant="h6" gutterBottom sx={{ mb: 2, color: 'primary.dark' }}>
                    <Settings sx={{ mr: 1, verticalAlign: 'middle' }} />
                    {t('menu.imageUpload')}
                  </Typography>
                  
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 1.5, sm: 2, md: 2.5 } }}>
                    {/* Image Upload Section */}
                    <Box sx={{ 
                      p: 3, 
                      borderRadius: 2, 
                      backgroundColor: 'white',
                      border: `2px solid`,
                      borderColor: 'divider'
                    }}>
                      <ImageUpload
                        key={editingItem?.id || 'new'}
                        ref={imageUploadRef}
                        restaurantId={session?.user?.id || ''}
                        menuItemId={editingItem?.id}
                        currentImage={editingItem?.image}
                        onImageUploaded={(imagePath) => {
                          setSuccess('Image uploaded successfully')
                          // Update editingItem to show image immediately
                          if (editingItem) {
                            setEditingItem({ ...editingItem, image: imagePath })
                          }
                          // Update menuItems array to reflect the change
                          setMenuItems(prevItems => 
                            prevItems.map(item => 
                              item.id === editingItem?.id 
                                ? { ...item, image: imagePath }
                                : item
                            )
                          )
                        }}
                        onImageDeleted={() => {
                          setSuccess('Image deleted successfully')
                          // Update editingItem to remove image immediately
                          if (editingItem) {
                            setEditingItem({ ...editingItem, image: null })
                          }
                          // Update menuItems array to reflect the change
                          setMenuItems(prevItems => 
                            prevItems.map(item => 
                              item.id === editingItem?.id 
                                ? { ...item, image: null }
                                : item
                            )
                          )
                        }}
                        disabled={saving}
                      />
                    </Box>
                  </Box>
                </Box>
              </Grid>

              <Grid size={{ xs: 12 }}>
                <SelectionsManager
                  menuItemId={editingItem?.id}
                  restaurantId={session?.user?.id || ''}
                  selections={itemSelections}
                  onSelectionsChange={setItemSelections}
                  disabled={saving}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ p: 3, gap: 1 }}>
            <Button 
              onClick={() => setItemDialog(false)}
              disabled={saving}
              sx={{
                borderRadius: 2,
                fontWeight: 600,
                textTransform: 'none',
                color: 'text.primary'
              }}
            >
              {t('menu.cancel')}
            </Button>
            <Button 
              onClick={handleSaveItem} 
              variant="contained"
              disabled={saving}
              startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <Save />}
              sx={{
                borderRadius: 2,
                fontWeight: 600,
                textTransform: 'none',
                boxShadow: 2,
                '&:hover': { boxShadow: 4 }
              }}
            >
              {saving 
                ? (() => {
                    const hasFile = imageUploadRef.current?.hasSelectedFile()
                    const hasPendingDeletion = imageUploadRef.current?.hasPendingDeletion()
                    if (hasFile && hasPendingDeletion) return t('menu.savingUploadingDeleting')
                    if (hasFile) return t('menu.savingUploading')
                    if (hasPendingDeletion) return t('menu.savingDeleting')
                    return t('menu.saving')
                  })()
                : (editingItem ? t('menu.update') : t('menu.create'))
              }
            </Button>
          </DialogActions>
        </Dialog>
        {/* Delete Confirmation Dialog */}
        <Dialog 
          open={deleteDialog} 
          onClose={() => setDeleteDialog(false)}
          maxWidth="sm" 
          fullWidth
        >
          <DialogTitle sx={{ pb: 1, fontWeight: 700, color: 'error.main' }}>
            {t('menu.deleteCategory')}
          </DialogTitle>
          <DialogContent>
            <Typography variant="body1" sx={{ mb: 2 }}>
              {t('menu.deleteCategoryConfirm', { name: deletingCategory?.name })}
            </Typography>
            {deletingCategory?._count.menuItems === 0 ? (
              <Typography variant="body2" color="text.secondary">
                {t('menu.deleteCategoryWarning')}
              </Typography>
            ) : (
              <Alert severity="warning" sx={{ mt: 2 }}>
                <Typography variant="body2">
                  {t('menu.cannotDeleteCategoryWithItems', { count: deletingCategory?._count.menuItems })}
                </Typography>
              </Alert>
            )}
          </DialogContent>
          <DialogActions sx={{ p: 3, gap: 1 }}>
            <Button 
              onClick={() => setDeleteDialog(false)}
              disabled={saving}
              sx={{
                borderRadius: 2,
                fontWeight: 600,
                textTransform: 'none',
                color: 'text.primary'
              }}
            >
              {t('menu.cancel')}
            </Button>
            <Button 
              onClick={confirmDeleteCategory}
              variant="contained"
              color="error"
              disabled={saving || (deletingCategory?._count.menuItems || 0) > 0}
              startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <Delete />}
              sx={{
                borderRadius: 2,
                fontWeight: 600,
                textTransform: 'none',
                boxShadow: 2,
                '&:hover': { boxShadow: 4 }
              }}
            >
              {saving ? t('menu.deleting') : t('menu.delete')}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Delete Menu Item Confirmation Dialog */}
        <Dialog 
          open={itemDeleteDialog} 
          onClose={() => setItemDeleteDialog(false)}
          maxWidth="sm" 
          fullWidth
        >
          <DialogTitle sx={{ pb: 1, fontWeight: 700, color: 'error.main' }}>
            {t('menu.deleteItem')}
          </DialogTitle>
          <DialogContent>
            <Typography variant="body1" sx={{ mb: 2 }}>
              {t('menu.deleteItemConfirm', { name: deletingItem?.name })}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t('menu.deleteItemWarning')}
            </Typography>
          </DialogContent>
          <DialogActions sx={{ p: 3, gap: 1 }}>
            <Button 
              onClick={() => setItemDeleteDialog(false)}
              disabled={saving}
              sx={{
                borderRadius: 2,
                fontWeight: 600,
                textTransform: 'none',
                color: 'text.primary'
              }}
            >
              {t('menu.cancel')}
            </Button>
            <Button 
              onClick={confirmDeleteItem}
              variant="contained"
              color="error"
              disabled={saving}
              startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <Delete />}
              sx={{
                borderRadius: 2,
                fontWeight: 600,
                textTransform: 'none',
                boxShadow: 2,
                '&:hover': { boxShadow: 4 }
              }}
            >
              {saving ? t('menu.deleting') : t('menu.delete')}
            </Button>
          </DialogActions>
        </Dialog>

      </Container>

      <Footer />
    </>
  )
}