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
  CardMedia,
  Chip,
  Skeleton,
  Tabs,
  Tab,
  Alert
} from '@mui/material'
import { Navbar } from '@/lib/components/Navbar'
import { Footer } from '@/lib/components/Footer'
import { useTranslation } from 'react-i18next'
import { LanguageSwitcher } from '@/lib/components/LanguageSwitcher'

interface MenuItem {
  id: string
  name: string
  description: string | null
  price: number
  categoryId: string
  available: boolean
  imageUrl: string | null
  selections?: any[]
}

interface Category {
  id: string
  name: string
  description: string | null
  displayOrder: number
  items?: MenuItem[]
}

export default function RestaurantMenuPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { t } = useTranslation()
  // Removed useRoles hook - using session.user.id instead
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCategory, setSelectedCategory] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'loading') return
    if (!session) router.push('/auth/signin')
  }, [session, status, router])

  useEffect(() => {
    const fetchMenu = async () => {
      if (!session?.user?.id) {
        setError('No user session found')
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        const response = await fetch(`/api/restaurant/menu`)
        if (!response.ok) {
          throw new Error('Failed to fetch menu')
        }
        const data = await response.json()
        
        // Group items by category
        const categoryMap = new Map<string, Category>()
        
        data.menuItems.forEach((item: MenuItem) => {
          if (!categoryMap.has(item.categoryId)) {
            categoryMap.set(item.categoryId, {
              id: item.categoryId,
              name: 'Category',
              description: null,
              displayOrder: 0,
              items: []
            })
          }
          categoryMap.get(item.categoryId)?.items?.push(item)
        })

        // Fetch categories to get proper names
        const categoriesResponse = await fetch(`/api/restaurant/categories`)
        if (categoriesResponse.ok) {
          const categoriesData = await categoriesResponse.json()
          categoriesData.forEach((cat: Category) => {
            if (categoryMap.has(cat.id)) {
              const category = categoryMap.get(cat.id)!
              category.name = cat.name
              category.description = cat.description
              category.displayOrder = cat.displayOrder
            }
          })
        }

        const sortedCategories = Array.from(categoryMap.values()).sort((a, b) => a.displayOrder - b.displayOrder)
        setCategories(sortedCategories)
        setError(null)
      } catch (err) {
        setError('Failed to load menu')
      } finally {
        setLoading(false)
      }
    }

    fetchMenu()
  }, [session?.user?.id])

  if (status === 'loading') {
    return null
  }

  const handleCategoryChange = (event: React.SyntheticEvent, newValue: number) => {
    setSelectedCategory(newValue)
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(price)
  }

  return (
    <>
      <Navbar 
        rightAction={<LanguageSwitcher />}
      />
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Paper elevation={2} sx={{ p: 3, mb: 3, backgroundColor: 'primary.50', borderRadius: 3 }}>
          <Typography variant="h4" sx={{ fontWeight: 600, color: 'primary.dark' }}>
            {t('restaurant.menu')}
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
            {t('restaurant.menuDesc')}
          </Typography>
        </Paper>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Box>
            <Skeleton variant="rectangular" height={48} sx={{ mb: 3, borderRadius: 1 }} />
            <Grid container spacing={3}>
              {[1, 2, 3, 4, 5, 6].map((item) => (
                <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={item}>
                  <Card>
                    <Skeleton variant="rectangular" height={200} />
                    <CardContent>
                      <Skeleton variant="text" height={32} />
                      <Skeleton variant="text" height={20} />
                      <Skeleton variant="text" height={28} width="40%" />
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>
        ) : categories.length === 0 ? (
          <Paper sx={{ p: 6, textAlign: 'center' }}>
            <Typography variant="h6" color="text.secondary">
              {t('restaurant.noMenuItems')}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {t('restaurant.addMenuItemsFirst')}
            </Typography>
          </Paper>
        ) : (
          <>
            <Paper sx={{ mb: 3 }}>
              <Tabs
                value={selectedCategory}
                onChange={handleCategoryChange}
                variant="scrollable"
                scrollButtons="auto"
                sx={{ borderBottom: 1, borderColor: 'divider' }}
              >
                {categories.map((category) => (
                  <Tab 
                    key={category.id} 
                    label={`${category.name} (${category.items?.length || 0})`}
                  />
                ))}
              </Tabs>
            </Paper>

            <Grid container spacing={3}>
              {categories[selectedCategory]?.items?.map((item) => (
                <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={item.id}>
                  <Card 
                    sx={{ 
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      opacity: item.available ? 1 : 0.6
                    }}
                  >
                    {item.imageUrl ? (
                      <CardMedia
                        component="img"
                        height="200"
                        image={item.imageUrl}
                        alt={item.name}
                        sx={{ objectFit: 'cover' }}
                      />
                    ) : (
                      <Box
                        sx={{
                          height: 200,
                          backgroundColor: 'grey.200',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <Typography variant="body2" color="text.secondary">
                          No Image
                        </Typography>
                      </Box>
                    )}
                    <CardContent sx={{ flexGrow: 1 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                        <Typography variant="h6" component="div" sx={{ fontWeight: 600 }}>
                          {item.name}
                        </Typography>
                        {!item.available && (
                          <Chip
                            label={t('restaurant.unavailable')}
                            size="small"
                            color="error"
                          />
                        )}
                      </Box>
                      {item.description && (
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                          {item.description}
                        </Typography>
                      )}
                      <Typography variant="h6" color="primary" sx={{ fontWeight: 600 }}>
                        {formatPrice(item.price)}
                      </Typography>
                      {item.selections && item.selections.length > 0 && (
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                          {t('restaurant.customizable')}
                        </Typography>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </>
        )}
      </Container>
      <Footer />
    </>
  )
}