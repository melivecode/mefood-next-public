'use client'

import { useState, useEffect, use } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import {
  Box,
  Container,
  Typography,
  Button,
  Grid,
  Paper,
  Card,
  CardContent,
  CardMedia,
  CardActions,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  IconButton,
  Alert,
  Snackbar,
  CircularProgress,
  Tooltip,
  Tabs,
  Tab,
  Badge,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  TextField
} from '@mui/material'
import {
  Add,
  Remove,
  ShoppingCart,
  Restaurant,
  Category,
  ArrowBack,
  CheckCircle,
  Close,
  Delete,
  Receipt,
  MenuBook,
  Refresh,
  Payment
} from '@mui/icons-material'
import { RestaurantNavbar } from '@/lib/components/RestaurantNavbar'
import { Footer } from '@/lib/components/Footer'
import { DarkTextField } from '@/lib/components/DarkTextField'
import { DarkSelect } from '@/lib/components/DarkSelect'
import { RestaurantHeader } from '@/lib/components/RestaurantHeader'
import { useTranslation } from 'react-i18next'

interface MenuCategory {
  id: string
  name: string
  description: string | null
  sortOrder: number
  menuItems: MenuItem[]
}

interface MenuItem {
  id: string
  name: string
  description: string | null
  price: string
  image: string | null
  isAvailable: boolean
  sortOrder: number
  categoryId: string
  selections?: Selection[]
}

interface Selection {
  id: string
  name: string
  description: string | null
  isRequired: boolean
  allowMultiple: boolean
  options: SelectionOption[]
}

interface SelectionOption {
  id: string
  name: string
  description: string | null
  priceAdd: string
  isAvailable: boolean
}

interface TableInfo {
  id: string
  number: string
  name: string | null
  session: {
    id: string
    customerName: string | null
    partySize: number
    status: string
  } | null
}

interface CartItem {
  menuItem: MenuItem
  quantity: number
  selectedOptions: { [selectionId: string]: string[] }
  totalPrice: number
  notes?: string
  priceAdjustment: number
}

export default function TableOrderingPage(props: { params: Promise<{ tableId: string }> }) {
  const params = use(props.params)
  const { data: session, status } = useSession()
  const router = useRouter()
  // Removed useRoles hook - using session.user.id instead
  const { t } = useTranslation()

  const [tableInfo, setTableInfo] = useState<TableInfo | null>(null)
  const [categories, setCategories] = useState<MenuCategory[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState(0)
  const [itemDialog, setItemDialog] = useState(false)
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null)
  const [itemQuantity, setItemQuantity] = useState(1)
  const [selectedOptions, setSelectedOptions] = useState<{ [selectionId: string]: string[] }>({})
  const [itemNotes, setItemNotes] = useState('')
  const [priceAdjustment, setPriceAdjustment] = useState(0)
  const [cartDialog, setCartDialog] = useState(false)
  const [orderNotes, setOrderNotes] = useState('')
  const [mainTab, setMainTab] = useState<'menu' | 'orders' | 'billing'>('menu')
  const [sessionOrders, setSessionOrders] = useState<any[]>([])
  const [allSessionOrders, setAllSessionOrders] = useState<any[]>([]) // Store all orders before filtering
  const [sessionPayments, setSessionPayments] = useState<any[]>([])
  const [deletingItem, setDeletingItem] = useState<{ orderId: string, itemId: string } | null>(null)
  const [ordersLoading, setOrdersLoading] = useState(false)

  useEffect(() => {
    if (status === 'loading') return
    if (!session) router.push('/auth/signin')
    // All authenticated users can access this page
  }, [session, status, router])

  useEffect(() => {
    if (session?.user?.id) {
      fetchData()
    }
  }, [session?.user?.id, params.tableId])

  const fetchData = async () => {
    try {
      const [tableRes, menuRes] = await Promise.all([
        fetch(`/api/restaurant/tables/${params.tableId}`),
        fetch(`/api/restaurant/categories`)
      ])

      if (tableRes.ok && menuRes.ok) {
        const tableData = await tableRes.json()
        const categoriesData = await menuRes.json()

        // Fetch all menu items
        const menuItemsRes = await fetch(`/api/restaurant/menu-items`)
        let menuItems = []
        if (menuItemsRes.ok) {
          menuItems = await menuItemsRes.json()
        }

        // Group menu items by category
        const categoriesWithItems = categoriesData
          .filter((cat: any) => cat.isActive)
          .map((category: any) => {
            const categoryItems = menuItems.filter((item: any) => 
              item.categoryId === category.id && item.isActive && item.isAvailable
            )
            return {
              ...category,
              menuItems: categoryItems
            }
          })

        setTableInfo(tableData)
        setCategories(categoriesWithItems.sort((a: any, b: any) => a.sortOrder - b.sortOrder))
        
        // Fetch orders and payments for this session with fresh data
        if (tableData.session?.id) {
          fetchSessionOrders(tableData.session.id, true) // Skip cache for fresh data
          fetchSessionPayments(tableData.session.id)
        }
      }
    } catch (err) {
      setError(t('tableOrder.failedToLoadData'))
    } finally {
      setLoading(false)
    }
  }

  const fetchSessionOrders = async (sessionId: string, skipCache: boolean = false) => {
    setOrdersLoading(true)
    try {
      const cacheParam = skipCache ? `?_t=${Date.now()}` : ''
      const response = await fetch(`/api/restaurant/orders${cacheParam}`)
      
      if (response.ok) {
        const allOrders = await response.json()
        
        // Filter orders for this session - each order is now independent
        const ordersForSession = allOrders.filter((order: any) => order.sessionId === sessionId)
        
        // Update both states together to ensure consistency
        setAllSessionOrders(ordersForSession)
        
        // Filter and set active orders immediately (exclude COMPLETED and CANCELLED)
        const activeOrders = ordersForSession.filter((order: any) => 
          order.status !== 'COMPLETED' && order.status !== 'CANCELLED'
        )
        setSessionOrders(activeOrders)
      }
    } catch (err) {
      setError('Failed to fetch session orders')
    } finally {
      setOrdersLoading(false)
    }
  }

  const filterOrdersToPending = (orders: any[]) => {
    // Show orders that are not completed and not cancelled
    const activeOrders = orders.filter((order: any) => 
      order.status !== 'COMPLETED' && order.status !== 'CANCELLED'
    )
    setSessionOrders(activeOrders)
  }

  const fetchSessionPayments = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/restaurant/payments?sessionId=${sessionId}`)
      if (response.ok) {
        const payments = await response.json()
        setSessionPayments(payments)
        
        // Don't re-filter orders here - let fetchSessionOrders handle it
        // This avoids race conditions and stale data issues
      }
    } catch (err) {
      setError('Failed to fetch session payments')
    }
  }

  const handleAddToCart = () => {
    if (!selectedItem) return

    const optionPrices = Object.entries(selectedOptions).reduce((total, [selectionId, optionIds]) => {
      const selection = selectedItem.selections?.find(s => s.id === selectionId)
      if (!selection) return total

      return total + optionIds.reduce((sum, optionId) => {
        const option = selection.options.find(o => o.id === optionId)
        return sum + (option ? parseFloat(option.priceAdd) : 0)
      }, 0)
    }, 0)

    const totalPrice = (parseFloat(selectedItem.price) + optionPrices + priceAdjustment) * itemQuantity

    const cartItem: CartItem = {
      menuItem: selectedItem,
      quantity: itemQuantity,
      selectedOptions,
      totalPrice,
      notes: itemNotes,
      priceAdjustment
    }

    setCart([...cart, cartItem])
    setSuccess(t('tableOrder.itemAddedToCart'))
    setItemDialog(false)
    resetItemDialog()
  }

  const resetItemDialog = () => {
    setSelectedItem(null)
    setItemQuantity(1)
    setSelectedOptions({})
    setItemNotes('')
    setPriceAdjustment(0)
  }

  const handleRemoveFromCart = (index: number) => {
    setCart(cart.filter((_, i) => i !== index))
  }

  const handleSubmitOrder = async () => {
    if (cart.length === 0) {
      setError(t('tableOrder.cartIsEmpty'))
      return
    }

    if (!tableInfo?.session) {
      setError(t('tableOrder.noActiveSessionError'))
      return
    }

    const totalAmount = getTotalPrice()
    
    const orderData = {
      sessionId: tableInfo.session.id,
      tableId: params.tableId,
      customerName: tableInfo.session.customerName,
      totalAmount: totalAmount,
      notes: orderNotes,
      items: cart.map(item => ({
        menuItemId: item.menuItem.id,
        quantity: item.quantity,
        price: item.totalPrice / item.quantity,
        notes: item.notes || null,
        selectedOptions: item.selectedOptions
      }))
    }

    // Create optimistic order for immediate UI update
    const optimisticOrder = {
      id: `temp_${Date.now()}`,
      orderNumber: `ORD-PENDING-${Date.now()}`,
      status: 'PENDING',
      sessionId: tableInfo.session.id,
      totalAmount: totalAmount.toString(),
      notes: orderNotes || null,
      orderedAt: new Date().toISOString(),
      items: cart.map(item => ({
        id: `temp_item_${Date.now()}_${item.menuItem.id}`,
        quantity: item.quantity,
        price: (item.totalPrice / item.quantity).toString(),
        notes: item.notes || null,
        selections: item.selectedOptions ? JSON.stringify(item.selectedOptions) : null,
        menuItem: {
          id: item.menuItem.id,
          name: item.menuItem.name,
          image: item.menuItem.image,
          selections: item.menuItem.selections || []
        }
      }))
    }

    // Optimistically add the order to the UI immediately
    setAllSessionOrders(prev => [optimisticOrder, ...prev])
    setSessionOrders(prev => [optimisticOrder, ...prev])
    setCart([])
    setCartDialog(false)
    setMainTab('orders')

    try {
      const response = await fetch(`/api/restaurant/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
      })

      if (response.ok) {
        const orderResponse = await response.json()
        
        setSuccess(t('tableOrder.orderSubmittedSuccess'))
        
        // Replace optimistic order with real order data
        setAllSessionOrders(prev => prev.map(order => 
          order.id === optimisticOrder.id ? orderResponse : order
        ))
        setSessionOrders(prev => prev.map(order => 
          order.id === optimisticOrder.id ? orderResponse : order
        ))
        
        // Also refresh from server to ensure sync (but don't wait for it)
        if (tableInfo.session?.id) {
          fetchSessionOrders(tableInfo.session.id, true).catch(() => {})
        }
      } else {
        // Remove optimistic order on failure
        setAllSessionOrders(prev => prev.filter(order => order.id !== optimisticOrder.id))
        setSessionOrders(prev => prev.filter(order => order.id !== optimisticOrder.id))
        
        setError(t('tableOrder.failedToSubmitOrder'))
      }
    } catch (err) {
      // Remove optimistic order on error
      setAllSessionOrders(prev => prev.filter(order => order.id !== optimisticOrder.id))
      setSessionOrders(prev => prev.filter(order => order.id !== optimisticOrder.id))
      
      setError('Failed to submit order')
    }
  }

  const getTotalPrice = () => {
    return cart.reduce((total, item) => total + item.totalPrice, 0)
  }

  const getTotalItems = () => {
    return cart.reduce((total, item) => total + item.quantity, 0)
  }

  const handleRemoveOrderItem = async (orderId: string, itemId: string, itemName?: string) => {
    // Show confirmation dialog
    if (!confirm(t('tableOrder.confirmRemoveItem', { itemName: itemName || t('tableOrder.thisItem') }))) {
      return
    }
    
    if (!session?.user?.id) return

    setDeletingItem({ orderId, itemId })
    try {
      const response = await fetch(
        `/api/restaurant/orders/${orderId}/items/${itemId}`,
        {
          method: 'DELETE',
        }
      )

      if (response.ok) {
        setSuccess(t('tableOrder.itemRemovedSuccess'))
        // Refresh the orders
        if (tableInfo?.session?.id) {
          fetchSessionOrders(tableInfo.session.id)
        }
      } else {
        const error = await response.json()
        setError(error.error || t('tableOrder.failedToRemoveItem'))
      }
    } catch (err) {
      setError(t('tableOrder.failedToRemoveItem'))
    } finally {
      setDeletingItem(null)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress size={40} />
      </Box>
    )
  }

  if (!tableInfo) {
    return (
      <>
        <RestaurantNavbar />
        <Container maxWidth="xl" sx={{ py: { xs: 2, md: 4 }, px: { xs: 1, sm: 2, md: 3 } }}>
          <Alert severity="error">{t('tableOrder.tableNotFound')}</Alert>
        </Container>
        <Footer />
      </>
    )
  }

  if (!tableInfo.session) {
    return (
      <>
        <RestaurantNavbar />
        <Container maxWidth="xl" sx={{ py: { xs: 2, md: 4 }, px: { xs: 1, sm: 2, md: 3 } }}>
          <Alert severity="warning">{t('tableOrder.noActiveSession')}</Alert>
          <Button 
            startIcon={<ArrowBack />} 
            onClick={() => router.push('/restaurant/table')}
            sx={{ mt: 2 }}
          >
            {t('tableOrder.backToCheckIn')}
          </Button>
        </Container>
        <Footer />
      </>
    )
  }

  return (
    <>
      <RestaurantNavbar 
        backButton={{
          href: '/restaurant/table',
          label: t('tableOrder.backToAllTables')
        }}
      />
      <Container maxWidth="xl" sx={{ py: { xs: 2, md: 4 }, px: { xs: 1, sm: 2, md: 3 } }}>
        <Box sx={{ mb: 3 }}>
          <Paper elevation={2} sx={{ p: { xs: 1.5, md: 2 }, backgroundColor: 'primary.50' }}>
            <RestaurantHeader 
              showRestaurantName={true}
              restaurantNameVariant="h6"
              mb={1}
            />
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              <Typography variant="h5" sx={{ fontWeight: 700, color: 'primary.dark', fontSize: { xs: '1.3rem', sm: '1.4rem', md: '1.5rem' } }}>
                <Restaurant sx={{ mr: 1, verticalAlign: 'middle', fontSize: { xs: '1.5rem', sm: '1.6rem', md: '1.7rem' } }} />
                {t('tableOrder.tableNumber', { number: tableInfo.number })}
              </Typography>
              <Typography variant="body1" component="span" sx={{ mx: 1 }}>•</Typography>
              <Typography variant="body1" component="span">
                <strong>{t('tableOrder.customer')}:</strong> {tableInfo.session.customerName || t('tableOrder.walkIn')}
              </Typography>
              <Typography variant="body1" component="span" sx={{ mx: 1 }}>•</Typography>
              <Typography variant="body1" component="span">
                <strong>{t('tableOrder.partySize')}:</strong> {tableInfo.session.partySize}
              </Typography>
              <Typography variant="body1" component="span" sx={{ mx: 1 }}>•</Typography>
              <Typography variant="body1" component="span">
                <strong>{t('tableOrder.status')}:</strong>
              </Typography>
              <Chip size="small" label={tableInfo.session.status} color="success" sx={{ ml: 0.5 }} />
            </Box>
          </Paper>
        </Box>

        {/* Main Tabs for Menu and Orders */}
        <Paper elevation={3} sx={{ borderRadius: 3, mb: 3 }}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs 
              value={mainTab} 
              onChange={(e, v) => {
                const newTab = v as 'menu' | 'orders' | 'billing'
                setMainTab(newTab)
                // Refresh data when switching tabs
                if (tableInfo?.session?.id) {
                  if (newTab === 'orders') {
                    fetchSessionOrders(tableInfo.session.id, true)
                    fetchSessionPayments(tableInfo.session.id)
                  } else if (newTab === 'billing') {
                    fetchSessionPayments(tableInfo.session.id)
                  }
                }
              }}
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
                    backgroundColor: 'primary.50'
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
                value="menu" 
                label={t('tableOrder.menu')} 
                icon={<MenuBook />}
                iconPosition="start"
                sx={{ 
                  fontSize: { xs: '0.875rem', sm: '1rem' }, 
                  minHeight: 64,
                  textTransform: 'none',
                  px: { xs: 2, sm: 3 }
                }}
              />
              <Tab 
                value="orders" 
                label={ordersLoading ? t('tableOrder.ordersLoading') : t('tableOrder.ordersCount', { count: sessionOrders.length })} 
                icon={<Receipt />}
                iconPosition="start"
                sx={{ 
                  fontSize: { xs: '0.875rem', sm: '1rem' }, 
                  minHeight: 64,
                  textTransform: 'none',
                  px: { xs: 2, sm: 3 }
                }}
              />
              <Tab 
                value="billing" 
                label={t('tableOrder.paymentsCount', { count: sessionPayments.length })} 
                icon={<Payment />}
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
          
          {/* Tab Content */}
          <Box sx={{ p: { xs: 2, md: 3 } }}>
            {mainTab === 'menu' ? (
              <Grid container spacing={{ xs: 1, sm: 2, md: 3 }}>
                <Grid size={{ xs: 12, md: 8, lg: 9 }}>
                  <Box sx={{ borderBottom: 1, borderColor: 'divider', backgroundColor: 'background.paper', borderRadius: 2, overflow: 'hidden' }}>
                  <Tabs 
                    value={selectedCategory} 
                    onChange={(e, v) => setSelectedCategory(v)}
                    variant="scrollable"
                    scrollButtons="auto"
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
                          backgroundColor: 'primary.50'
                        }
                      },
                      '& .MuiTabs-indicator': {
                        backgroundColor: 'primary.dark',
                        height: 3,
                        borderRadius: '2px 2px 0 0'
                      }
                    }}
                  >
                    {categories.map((category, index) => (
                      <Tab 
                        key={category.id} 
                        label={category.name} 
                        icon={<Category />}
                        iconPosition="start"
                        sx={{
                          fontSize: { xs: '0.875rem', sm: '1rem' },
                          textTransform: 'none',
                          minHeight: 60
                        }}
                      />
                    ))}
                  </Tabs>
                </Box>

              <Box sx={{ p: { xs: 2, md: 3 } }}>
                {categories[selectedCategory] && (
                  <>
                    <Grid container spacing={{ xs: 1, sm: 2 }}>
                      {categories[selectedCategory].menuItems.map((item) => (
                        <Grid size={{ xs: 6, sm: 4, md: 4, lg: 3 }} key={item.id}>
                          <Card 
                            elevation={3} 
                            sx={{ 
                              height: '100%', 
                              display: 'flex', 
                              flexDirection: 'column',
                              transition: 'all 0.3s ease',
                              '&:hover': {
                                transform: 'translateY(-4px)',
                                boxShadow: 6
                              }
                            }}
                          >
                            <Box 
                              sx={{ 
                                position: 'relative',
                                width: '100%',
                                height: { xs: 120, sm: 160, md: 200 },
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
                            </Box>
                            <CardContent sx={{ flexGrow: 1, p: { xs: 1.5, md: 2 } }}>
                              <Typography 
                                variant="h6" 
                                sx={{ 
                                  fontWeight: 700, 
                                  color: 'primary.dark',
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
                              {item.description && (
                                <Typography variant="body2" color="text.secondary">
                                  {item.description}
                                </Typography>
                              )}
                              <Typography 
                                variant="h6" 
                                sx={{ 
                                  color: 'primary.dark', 
                                  fontWeight: 700,
                                  fontSize: { xs: '1rem', md: '1.1rem' }
                                }}
                              >
                                B {parseFloat(item.price).toFixed(2)}
                              </Typography>
                            </CardContent>
                            <CardActions>
                              <Button 
                                fullWidth
                                variant="contained"
                                startIcon={<Add />}
                                onClick={() => {
                                  setSelectedItem(item)
                                  setPriceAdjustment(0)
                                  setItemDialog(true)
                                }}
                                sx={{ 
                                  borderRadius: 2, 
                                  fontWeight: 600, 
                                  textTransform: 'none',
                                  boxShadow: 2,
                                  '&:hover': { boxShadow: 4 }
                                }}
                              >
                                {t('tableOrder.addToCart')}
                              </Button>
                            </CardActions>
                          </Card>
                        </Grid>
                      ))}
                    </Grid>
                  </>
                )}
                  </Box>
                </Grid>

          <Grid size={{ xs: 12, md: 4, lg: 3 }}>
            <Paper elevation={3} sx={{ borderRadius: 3, position: { md: 'sticky' }, top: 20 }}>
              <Box sx={{ p: { xs: 2, md: 3 }, backgroundColor: 'primary.dark', color: 'white', borderRadius: '12px 12px 0 0' }}>
                <Typography variant="h6" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', color: 'white' }}>
                  <ShoppingCart sx={{ mr: 1, color: 'white' }} />
                  {t('tableOrder.shoppingCart')}
                  {cart.length > 0 && (
                    <Badge badgeContent={getTotalItems()} color="error" sx={{ ml: 2 }} />
                  )}
                </Typography>
              </Box>
              <Box sx={{ p: { xs: 2, md: 3 } }}>
                {cart.length === 0 ? (
                  <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                    {t('tableOrder.cartEmpty')}
                  </Typography>
                ) : (
                  <>
                    <List sx={{ maxHeight: { xs: 300, md: 400 }, overflow: 'auto' }}>
                      {cart.map((item, index) => (
                        <Box key={index}>
                          <ListItem alignItems="flex-start" sx={{ px: 0 }}>
                            <ListItemText
                              primary={
                                <Typography variant="body1" sx={{ fontWeight: 600, color: 'primary.dark' }}>
                                  {item.quantity}x {item.menuItem.name}
                                </Typography>
                              }
                              secondary={
                                <Box component="span">
                                  {Object.entries(item.selectedOptions).map(([selectionId, optionIds]) => {
                                    const selection = item.menuItem.selections?.find(s => s.id === selectionId)
                                    return (
                                      <Typography key={selectionId} variant="caption" component="span" sx={{ display: 'block' }}>
                                        {selection?.name}: {optionIds.map(id => 
                                          selection?.options.find(o => o.id === id)?.name
                                        ).join(', ')}
                                      </Typography>
                                    )
                                  })}
                                  {item.notes && (
                                    <Typography variant="caption" component="span" sx={{ fontStyle: 'italic', display: 'block' }}>
                                      {t('tableOrder.note')}: {item.notes}
                                    </Typography>
                                  )}
                                  <Typography variant="body2" component="span" sx={{ fontWeight: 700, mt: 0.5, color: 'primary.dark', display: 'block' }}>
                                    B {item.totalPrice.toFixed(2)}
                                  </Typography>
                                </Box>
                              }
                            />
                            <ListItemSecondaryAction>
                              <IconButton 
                                edge="end" 
                                size="small"
                                onClick={() => handleRemoveFromCart(index)}
                              >
                                <Delete />
                              </IconButton>
                            </ListItemSecondaryAction>
                          </ListItem>
                          {index < cart.length - 1 && <Divider />}
                        </Box>
                      ))}
                    </List>
                    <Divider sx={{ my: 2 }} />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                      <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.dark' }}>
                        {t('tableOrder.total')}:
                      </Typography>
                      <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.dark' }}>
                        B {getTotalPrice().toFixed(2)}
                      </Typography>
                    </Box>
                    <Button
                      fullWidth
                      variant="contained"
                      size="large"
                      startIcon={<CheckCircle />}
                      onClick={() => setCartDialog(true)}
                      sx={{ 
                        borderRadius: 2, 
                        fontWeight: 600, 
                        textTransform: 'none',
                        boxShadow: 2,
                        '&:hover': { boxShadow: 4 }
                      }}
                    >
                      {t('tableOrder.reviewAndSubmit')}
                    </Button>
                  </>
                )}
              </Box>
            </Paper>
          </Grid>
        </Grid>
            ) : mainTab === 'orders' ? (
              /* Orders Summary Tab */
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h5" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', color: 'primary.dark' }}>
                    <Receipt sx={{ mr: 2 }} />
                    {t('tableOrder.orderSummary')}
                  </Typography>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<Refresh />}
                    onClick={() => {
                      if (tableInfo?.session?.id) {
                        fetchSessionOrders(tableInfo.session.id, true)
                        fetchSessionPayments(tableInfo.session.id)
                      }
                    }}
                    sx={{ 
                      borderRadius: 2, 
                      textTransform: 'none',
                      fontWeight: 500
                    }}
                  >
                    {t('tableOrder.refresh')}
                  </Button>
                </Box>
            
            {sessionOrders.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: { xs: 4, md: 8 } }}>
                <Receipt sx={{ fontSize: '4rem', color: 'text.secondary' }} />
                <Typography variant="h6" color="text.secondary">
                  {t('tableOrder.noPendingOrders')}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  {t('tableOrder.switchToMenu')}
                </Typography>
              </Box>
            ) : (
              <Box>
                {sessionOrders
                  .sort((a, b) => new Date(a.orderedAt).getTime() - new Date(b.orderedAt).getTime())
                  .map((order, orderIndex) => (
                  <Box key={order.id}>
                    <Paper elevation={2} sx={{ p: { xs: 2, md: 3 }, backgroundColor: 'grey.50', border: '1px solid', borderColor: 'divider' }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <Box>
                          <Typography variant="h6" sx={{ fontWeight: 600, color: 'primary.dark' }}>
                            {t('tableOrder.orderNumber', { number: order.orderNumber })}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {new Date(order.orderedAt).toLocaleDateString('en-GB', {
                              day: '2-digit',
                              month: '2-digit', 
                              year: 'numeric'
                            })} {new Date(order.orderedAt).toLocaleTimeString('en-GB', {
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                              hour12: false
                            })}
                          </Typography>
                        </Box>
                        <Chip 
                          label={order.status} 
                          color={
                            order.status === 'READY' ? 'success' : 
                            order.status === 'PREPARING' ? 'warning' : 
                            order.status === 'DELIVERED' ? 'success' :
                            'default'
                          }
                          size="small"
                        />
                      </Box>
                      
                      <Divider sx={{ my: 2 }} />
                      
                      {/* Order Items */}
                      {order.items.map((item: any, itemIndex: number) => {
                        const selections = item.selections ? JSON.parse(item.selections) : null
                        const isDeleting = deletingItem?.orderId === order.id && deletingItem?.itemId === item.id
                        const deletableStatuses = ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'SERVING', 'DELIVERED']
                        const canDeleteItem = deletableStatuses.includes(order.status)
                        return (
                          <Box key={itemIndex}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <Box sx={{ display: 'flex', gap: 2, flex: 1 }}>
                                {/* Menu Item Image */}
                                {item.menuItem.image && (
                                  <Box sx={{ 
                                    width: 60, 
                                    height: 60, 
                                    borderRadius: 1,
                                    overflow: 'hidden',
                                    flexShrink: 0,
                                    border: '1px solid',
                                    borderColor: 'divider'
                                  }}>
                                    <img 
                                      src={item.menuItem.image} 
                                      alt={item.menuItem.name}
                                      style={{ 
                                        width: '100%', 
                                        height: '100%', 
                                        objectFit: 'cover' 
                                      }}
                                    />
                                  </Box>
                                )}
                                
                                <Box sx={{ flex: 1 }}>
                                  <Typography variant="h6" sx={{ fontWeight: 600, color: 'primary.dark', fontSize: { xs: '1.1rem', md: '1.25rem' } }}>
                                    {item.quantity}x {item.menuItem.name}
                                  </Typography>
                                
                                  {/* Show selections */}
                                  {selections && Object.keys(selections).length > 0 && (
                                    <Box sx={{ mt: 0.5 }}>
                                      {Object.entries(selections).map(([selectionId, optionIds]: [string, any]) => {
                                        const selection = item.menuItem.selections?.find((s: any) => s.id === selectionId)
                                        if (!selection) return null
                                        
                                        const selectedOptionNames = (optionIds as string[]).map(optionId => {
                                          const option = selection.options.find((o: any) => o.id === optionId)
                                          return option?.name || ''
                                        }).filter(Boolean).join(', ')
                                        
                                        if (!selectedOptionNames) return null
                                        
                                        return (
                                          <Typography key={selectionId} variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.9rem', md: '1rem' } }}>
                                            • {selection.name}: {selectedOptionNames}
                                          </Typography>
                                        )
                                      })}
                                    </Box>
                                  )}
                                  
                                  {/* Show item notes */}
                                  {item.notes && (
                                    <Typography variant="body2" color="text.secondary" sx={{ display: 'block', fontStyle: 'italic', mt: 0.5, fontSize: { xs: '0.9rem', md: '1rem' } }}>
                                      {t('tableOrder.note')}: {item.notes}
                                    </Typography>
                                  )}
                                </Box>
                              </Box>
                              
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography variant="h6" sx={{ fontWeight: 600, color: 'primary.dark', fontSize: { xs: '1.1rem', md: '1.25rem' } }}>
                                  B {(parseFloat(item.price) * item.quantity).toFixed(2)}
                                </Typography>
                                {canDeleteItem && (
                                  <Tooltip title={t('tableOrder.removeItem')}>
                                    <IconButton
                                      size="medium"
                                      onClick={() => handleRemoveOrderItem(order.id, item.id, item.menuItem.name)}
                                      disabled={isDeleting}
                                      sx={{ 
                                        color: 'error.main',
                                        backgroundColor: 'error.50',
                                        '&:hover': { 
                                          backgroundColor: 'error.100',
                                          transform: 'scale(1.1)'
                                        },
                                        '&:disabled': {
                                          opacity: 0.5
                                        },
                                        transition: 'all 0.2s'
                                      }}
                                    >
                                      {isDeleting ? (
                                        <CircularProgress size={20} color="error" />
                                      ) : (
                                        <Delete fontSize="medium" />
                                      )}
                                    </IconButton>
                                  </Tooltip>
                                )}
                              </Box>
                            </Box>
                          </Box>
                        )
                      })}
                      
                      {/* Order Notes */}
                      {order.notes && (
                        <>
                          <Divider sx={{ my: 2 }} />
                          <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                            {t('tableOrder.orderNote')}: {order.notes}
                          </Typography>
                        </>
                      )}
                      
                      <Divider sx={{ my: 2 }} />
                      
                      {/* Total */}
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.dark' }}>
                          {t('tableOrder.subtotal')}
                        </Typography>
                        <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.dark' }}>
                          B {parseFloat(order.totalAmount).toFixed(2)}
                        </Typography>
                      </Box>
                    </Paper>
                  </Box>
                ))}
                
                {/* Grand Total */}
                <Paper elevation={3} sx={{ p: { xs: 2, md: 4 }, backgroundColor: 'primary.50', mt: 3, border: '1px solid', borderColor: 'divider' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="h5" sx={{ fontWeight: 700, color: 'primary.dark' }}>
                      {t('tableOrder.totalAmount')}
                    </Typography>
                    <Typography variant="h5" sx={{ fontWeight: 700, color: 'primary.dark' }}>
                      B {sessionOrders.reduce((sum, order) => sum + parseFloat(order.totalAmount), 0).toFixed(2)}
                    </Typography>
                  </Box>
                  
                  <Divider sx={{ my: 2 }} />
                  
                  <Box sx={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    gap: 2,
                    flexDirection: { xs: 'column', sm: 'row' },
                    textAlign: { xs: 'center', sm: 'left' }
                  }}>
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        {t('tableOrder.totalOrders')}: {sessionOrders.length}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {t('tableOrder.totalItemsCount')}: {sessionOrders.reduce((sum, order) => sum + order.items.reduce((itemSum: number, item: any) => itemSum + item.quantity, 0), 0)}
                      </Typography>
                    </Box>
                    <Button 
                      variant="contained" 
                      size="large"
                      onClick={() => router.push(`/restaurant/billing?tableId=${params.tableId}`)}
                      sx={{ 
                        borderRadius: 2, 
                        fontWeight: 600, 
                        textTransform: 'none',
                        boxShadow: 2,
                        '&:hover': { boxShadow: 4 },
                        minWidth: { sm: 200 },
                        width: { xs: '100%', sm: 'auto' },
                        fontSize: { xs: '0.875rem', md: '1rem' }
                      }}
                    >
                      {t('tableOrder.proceedToBilling')}
                    </Button>
                  </Box>
                </Paper>
              </Box>
            )}
              </Box>
            ) : (
              /* Billing Tab */
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h5" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', color: 'primary.dark' }}>
                    <Payment sx={{ mr: 2 }} />
                    {t('tableOrder.paymentHistory')}
                  </Typography>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<Refresh />}
                    onClick={() => {
                      if (tableInfo?.session?.id) {
                        fetchSessionPayments(tableInfo.session.id)
                      }
                    }}
                    sx={{ 
                      borderRadius: 2, 
                      textTransform: 'none',
                      fontWeight: 500
                    }}
                  >
                    {t('tableOrder.refresh')}
                  </Button>
                </Box>
            
            {sessionPayments.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: { xs: 4, md: 8 } }}>
                <Payment sx={{ fontSize: '4rem', color: 'text.secondary' }} />
                <Typography variant="h6" color="text.secondary">
                  {t('tableOrder.noPaymentsYet')}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  {t('tableOrder.processOrdersFirst')}
                </Typography>
              </Box>
            ) : (
              <Box>
                {sessionPayments.map((payment, index) => (
                  <Paper key={payment.id} elevation={2} sx={{ p: { xs: 2, md: 3 }, mb: 2, backgroundColor: 'grey.50', border: '1px solid', borderColor: 'divider' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Box>
                        <Typography variant="h6" sx={{ fontWeight: 600, color: 'primary.dark' }}>
                          {t('tableOrder.paymentNumber', { number: payment.paymentNumber })}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {new Date(payment.createdAt).toLocaleDateString('en-GB', {
                            day: '2-digit',
                            month: '2-digit', 
                            year: 'numeric'
                          })} {new Date(payment.createdAt).toLocaleTimeString('en-GB', {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                            hour12: false
                          })}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {t('tableOrder.method')}: {payment.paymentMethod}
                        </Typography>
                      </Box>
                      <Chip label={t('tableOrder.paid')} color="success" size="small" />
                    </Box>
                    
                    <Divider sx={{ my: 2 }} />
                    
                    {/* Payment Items */}
                    {payment.items.map((item: any, itemIndex: number) => (
                      <Box key={itemIndex}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="body1" sx={{ fontWeight: 600, color: 'primary.dark' }}>
                            {item.quantity}x {item.menuItemName}
                          </Typography>
                          <Typography variant="body1" sx={{ fontWeight: 600, color: 'primary.dark' }}>
                            B {(parseFloat(item.totalPrice)).toFixed(2)}
                          </Typography>
                        </Box>
                        {itemIndex < payment.items.length - 1 && <Divider sx={{ my: 1 }} />}
                      </Box>
                    ))}
                    
                    <Divider sx={{ my: 2 }} />
                    
                    {/* Payment Summary */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.dark' }}>
                        {t('tableOrder.totalPaid')}
                      </Typography>
                      <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.dark' }}>
                        B {parseFloat(payment.finalAmount).toFixed(2)}
                      </Typography>
                    </Box>
                    
                    <Divider sx={{ my: 2 }} />
                    
                    {/* Receipt Button */}
                    <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                      <Button
                        variant="outlined"
                        startIcon={<Receipt />}
                        onClick={() => router.push(`/restaurant/receipt?paymentId=${payment.id}`)}
                        sx={{ 
                          borderRadius: 2, 
                          fontWeight: 600, 
                          textTransform: 'none',
                          minWidth: { sm: 150 },
                          width: { xs: '100%', sm: 'auto' },
                          fontSize: { xs: '0.875rem', md: '1rem' }
                        }}
                      >
                        {t('tableOrder.viewReceipt')}
                      </Button>
                    </Box>
                  </Paper>
                ))}
              </Box>
            )}
              </Box>
            )}
          </Box>
        </Paper>

        {/* Item Dialog */}
        <Dialog open={itemDialog} onClose={() => setItemDialog(false)} maxWidth="md" fullWidth>
          <DialogTitle sx={{ pb: 1, fontWeight: 700, color: 'primary.dark' }}>
            {selectedItem?.name}
            <IconButton
              onClick={() => setItemDialog(false)}
              sx={{ position: 'absolute', right: 8, top: 8 }}
            >
              <Close />
            </IconButton>
          </DialogTitle>
          <DialogContent sx={{ p: { xs: 2, md: 3 } }}>
            {selectedItem && (
              <>
                {selectedItem.description && (
                  <Typography variant="body2" color="text.secondary">
                    {selectedItem.description}
                  </Typography>
                )}
                
                <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.dark', mb: 2 }}>
                  B {parseFloat(selectedItem.price).toFixed(2)}
                </Typography>

                {selectedItem.selections && selectedItem.selections.map(selection => (
                  <Box key={selection.id} sx={{ mb: 2 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                      {selection.name} {selection.isRequired && <Chip size="small" label={t('tableOrder.required')} />}
                    </Typography>
                    {selection.description && (
                      <Typography variant="body2" color="text.secondary">
                        {selection.description}
                      </Typography>
                    )}
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      {selection.options.filter(o => o.isAvailable).map(option => (
                        <Button
                          key={option.id}
                          variant={selectedOptions[selection.id]?.includes(option.id) ? "contained" : "outlined"}
                          onClick={() => {
                            if (selection.allowMultiple) {
                              const current = selectedOptions[selection.id] || []
                              if (current.includes(option.id)) {
                                setSelectedOptions({
                                  ...selectedOptions,
                                  [selection.id]: current.filter(id => id !== option.id)
                                })
                              } else {
                                setSelectedOptions({
                                  ...selectedOptions,
                                  [selection.id]: [...current, option.id]
                                })
                              }
                            } else {
                              setSelectedOptions({
                                ...selectedOptions,
                                [selection.id]: [option.id]
                              })
                            }
                          }}
                          sx={{ justifyContent: 'space-between', textTransform: 'none' }}
                        >
                          <span>{option.name}</span>
                          {parseFloat(option.priceAdd) > 0 && (
                            <span>+B {parseFloat(option.priceAdd).toFixed(2)}</span>
                          )}
                        </Button>
                      ))}
                    </Box>
                  </Box>
                ))}

                <DarkTextField
                  label={t('tableOrder.specialInstructions')}
                  value={itemNotes}
                  onChange={(e) => setItemNotes(e.target.value)}
                  fullWidth
                  multiline
                  rows={2}
                  sx={{ backgroundColor: 'white', mb: 2 }}
                />

                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 2 }}>
                  <DarkTextField
                    label={t('tableOrder.priceAdjustment')}
                    value={priceAdjustment}
                    onChange={(e) => setPriceAdjustment(Math.max(0, parseFloat(e.target.value) || 0))}
                    type="number"
                    fullWidth
                    inputProps={{ min: 0, step: 0.01 }}
                    InputProps={{
                      startAdornment: (
                        <Typography sx={{ color: 'primary.dark', fontWeight: 600 }}>+</Typography>
                      )
                    }}
                    helperText={t('tableOrder.priceAdjustmentHelper')}
                    sx={{ backgroundColor: 'white' }}
                  />
                  <IconButton
                    onClick={() => setPriceAdjustment(0)}
                    sx={{ 
                      mt: 1,
                      color: 'primary.main',
                      '&:hover': { backgroundColor: 'primary.50' }
                    }}
                    title={t('tableOrder.resetPriceAdjustment')}
                  >
                    <Refresh />
                  </IconButton>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                  <IconButton 
                    onClick={() => setItemQuantity(Math.max(1, itemQuantity - 1))}
                    sx={{ border: 1, borderColor: 'divider' }}
                  >
                    <Remove />
                  </IconButton>
                  <Typography variant="h6" sx={{ minWidth: 40, textAlign: 'center' }}>
                    {itemQuantity}
                  </Typography>
                  <IconButton 
                    onClick={() => setItemQuantity(itemQuantity + 1)}
                    sx={{ border: 1, borderColor: 'divider' }}
                  >
                    <Add />
                  </IconButton>
                </Box>
              </>
            )}
          </DialogContent>
          <DialogActions sx={{ p: 3, gap: 1 }}>
            <Button 
              onClick={() => setItemDialog(false)}
              sx={{
                borderRadius: 2,
                fontWeight: 600,
                textTransform: 'none',
                color: 'text.primary'
              }}
            >
              {t('tableOrder.cancel')}
            </Button>
            <Button 
              onClick={handleAddToCart}
              variant="contained"
              sx={{
                borderRadius: 2,
                fontWeight: 600,
                textTransform: 'none',
                boxShadow: 2,
                '&:hover': { boxShadow: 4 }
              }}
            >
              {t('tableOrder.addToCart')} (B {((parseFloat(selectedItem?.price || '0') + 
                Object.entries(selectedOptions).reduce((total, [selectionId, optionIds]) => {
                  const selection = selectedItem?.selections?.find(s => s.id === selectionId)
                  if (!selection) return total
                  return total + optionIds.reduce((sum, optionId) => {
                    const option = selection.options.find(o => o.id === optionId)
                    return sum + (option ? parseFloat(option.priceAdd) : 0)
                  }, 0)
                }, 0) + priceAdjustment) * itemQuantity).toFixed(2)})
            </Button>
          </DialogActions>
        </Dialog>

        {/* Cart Review Dialog */}
        <Dialog open={cartDialog} onClose={() => setCartDialog(false)} maxWidth="lg" fullWidth>
          <DialogTitle sx={{ pb: 1, fontWeight: 700, color: 'primary.dark' }}>
            {t('tableOrder.reviewOrder')}
          </DialogTitle>
          <DialogContent sx={{ p: { xs: 2, md: 3 } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body1" component="span">
                <strong>{t('tableOrder.tableNumber', { number: tableInfo.number })}</strong>
              </Typography>
              <Typography variant="body1" component="span">•</Typography>
              <Typography variant="body1" component="span">
                {tableInfo.session.customerName || t('tableOrder.walkIn')}
              </Typography>
            </Box>
            
            <List>
              {cart.map((item, index) => (
                <Box key={index}>
                  <ListItem sx={{ px: 0 }}>
                    <ListItemText
                      primary={`${item.quantity}x ${item.menuItem.name}`}
                      secondary={
                        <Box component="span">
                          {Object.entries(item.selectedOptions).map(([selectionId, optionIds]) => {
                            const selection = item.menuItem.selections?.find(s => s.id === selectionId)
                            return (
                              <Typography key={selectionId} variant="caption" component="span" sx={{ display: 'block' }}>
                                {selection?.name}: {optionIds.map(id => 
                                  selection?.options.find(o => o.id === id)?.name
                                ).join(', ')}
                              </Typography>
                            )
                          })}
                          {item.notes && (
                            <Typography variant="caption" component="span" sx={{ fontStyle: 'italic', display: 'block' }}>
                              Note: {item.notes}
                            </Typography>
                          )}
                        </Box>
                      }
                    />
                    <Typography variant="body1" sx={{ fontWeight: 600, color: 'primary.dark' }}>
                      B {item.totalPrice.toFixed(2)}
                    </Typography>
                  </ListItem>
                  {index < cart.length - 1 && <Divider />}
                </Box>
              ))}
            </List>

            <DarkTextField
              label={t('tableOrder.orderNotes')}
              value={orderNotes}
              onChange={(e) => setOrderNotes(e.target.value)}
              fullWidth
              multiline
              rows={2}
              sx={{ mt: 2, backgroundColor: 'white' }}
              placeholder={t('tableOrder.orderNotesPlaceholder')}
            />

            <Divider sx={{ my: 2 }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.dark' }}>
                {t('tableOrder.totalItemsFormat', { count: getTotalItems() })}
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.dark' }}>
                B {getTotalPrice().toFixed(2)}
              </Typography>
            </Box>
          </DialogContent>
          <DialogActions sx={{ p: 3, gap: 1 }}>
            <Button 
              onClick={() => setCartDialog(false)}
              sx={{
                borderRadius: 2,
                fontWeight: 600,
                textTransform: 'none',
                color: 'text.primary'
              }}
            >
              {t('tableOrder.backToMenu')}
            </Button>
            <Button 
              onClick={handleSubmitOrder}
              variant="contained"
              color="success"
              sx={{
                borderRadius: 2,
                fontWeight: 600,
                textTransform: 'none',
                boxShadow: 2,
                '&:hover': { boxShadow: 4 }
              }}
            >
              {t('tableOrder.submitOrder')}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Success/Error Snackbar */}
        <Snackbar open={!!success} autoHideDuration={6000} onClose={() => setSuccess(null)}>
          <Alert onClose={() => setSuccess(null)} severity="success">{success}</Alert>
        </Snackbar>
        <Snackbar open={!!error} autoHideDuration={6000} onClose={() => setError(null)}>
          <Alert onClose={() => setError(null)} severity="error">{error}</Alert>
        </Snackbar>
      </Container>
      <Footer />
    </>
  )
}