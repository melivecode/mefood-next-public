'use client'

import { useState, useEffect } from 'react'
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
  Chip,
  IconButton,
  Alert,
  Snackbar,
  CircularProgress,
  Divider,
  Avatar
} from '@mui/material'
import {
  Kitchen,
  AccessTime,
  CheckCircle,
  PlayArrow,
  Done,
  TableBar,
  Person,
  Refresh,
  LocalDining,
  Pause,
  PlayCircle,
  Sync,
  KitchenOutlined
} from '@mui/icons-material'
import { RestaurantNavbar } from '@/lib/components/RestaurantNavbar'
import { RestaurantHeader } from '@/lib/components/RestaurantHeader'
import { Footer } from '@/lib/components/Footer'
import { useTranslation } from 'react-i18next'

interface OrderItem {
  id: string
  quantity: number
  price: number
  notes: string | null
  selections: string | null
  menuItem: {
    id: string
    name: string
    price: number
    selections?: {
      id: string
      name: string
      options: {
        id: string
        name: string
        priceAdd: string
      }[]
    }[]
  }
}

interface Order {
  id: string
  orderNumber: string
  status: string
  totalAmount: number
  customerName: string | null
  notes: string | null
  orderedAt: string
  preparingAt: string | null
  readyAt: string | null
  table: {
    id: string
    number: string
    name: string | null
  } | null
  session: {
    id: string
    customerName: string | null
    partySize: number
  } | null
  items: OrderItem[]
  waiter: {
    id: string
    name: string | null
  } | null
  cook: {
    id: string
    name: string | null
  } | null
}

export default function KitchenViewPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  // Removed useRoles hook - using session.user.id instead
  const { t } = useTranslation()

  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [processing, setProcessing] = useState<string | null>(null)
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    if (status === 'loading') return
    if (!session) router.push('/auth/signin')
    // All authenticated users can access this page
  }, [session, status, router])

  useEffect(() => {
    if (session?.user?.id) {
      fetchOrders(true) // Show loading on initial fetch
    }
  }, [session?.user?.id])

  // Auto-refresh effect
  useEffect(() => {
    if (!session?.user?.id || !autoRefreshEnabled) return

    const interval = setInterval(() => {
      fetchOrders()
    }, 10000) // Refresh every 10 seconds

    return () => clearInterval(interval)
  }, [session?.user?.id, autoRefreshEnabled])

  const fetchOrders = async (showLoading = false) => {
    try {
      if (showLoading) setLoading(true)
      if (!showLoading) setRefreshing(true)
      
      const response = await fetch(`/api/restaurant/orders`)
      if (response.ok) {
        const ordersData = await response.json()
        
        // Filter orders relevant to kitchen (not completed or cancelled)
        const kitchenOrders = ordersData.filter((order: Order) => 
          ['PENDING', 'CONFIRMED', 'PREPARING', 'READY'].includes(order.status)
        )
        setOrders(kitchenOrders)
        setLastUpdated(new Date())
      }
    } catch (err) {
      if (showLoading) {
        setError(t('orderStaffView.failedToLoadOrders'))
      }
      // For auto-refresh, fail silently to avoid annoying users
    } finally {
      if (showLoading) setLoading(false)
      if (!showLoading) {
        // Brief delay to show refresh indicator
        setTimeout(() => setRefreshing(false), 500)
      }
    }
  }

  const handleStartCooking = async (orderId: string) => {
    try {
      setProcessing(orderId)
      setError(null)

      const response = await fetch(`/api/restaurant/orders/${orderId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: 'PREPARING',
          preparingAt: new Date().toISOString()
        })
      })

      if (response.ok) {
        const updatedOrder = await response.json()
        setOrders(orders.map(order => 
          order.id === orderId ? updatedOrder : order
        ))
        setSuccess(t('orderStaffView.startedPreparingOrder'))
      } else {
        throw new Error(t('orderStaffView.failedToStartCooking'))
      }
    } catch (err) {
      setError(t('orderStaffView.failedToStartCooking'))
    } finally {
      setProcessing(null)
    }
  }

  const handleMarkReady = async (orderId: string) => {
    try {
      setProcessing(orderId)
      setError(null)

      const response = await fetch(`/api/restaurant/orders/${orderId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: 'READY',
          readyAt: new Date().toISOString()
        })
      })

      if (response.ok) {
        const updatedOrder = await response.json()
        setOrders(orders.map(order => 
          order.id === orderId ? updatedOrder : order
        ))
        setSuccess(t('orderStaffView.orderMarkedReady'))
      } else {
        throw new Error(t('orderStaffView.failedToMarkReady'))
      }
    } catch (err) {
      setError(t('orderStaffView.failedToMarkReady'))
    } finally {
      setProcessing(null)
    }
  }

  const handleServeOrder = async (orderId: string) => {
    try {
      setProcessing(orderId)
      setError(null)

      const response = await fetch(`/api/restaurant/orders/${orderId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: 'DELIVERED',
          servedAt: new Date().toISOString(),
          servedBy: session?.user?.id
        })
      })

      if (response.ok) {
        // Remove the served order from the kitchen view
        setOrders(orders.filter(order => order.id !== orderId))
        setSuccess(t('orderStaffView.orderServedRemoved'))
      } else {
        throw new Error(t('orderStaffView.failedToServeOrder'))
      }
    } catch (err) {
      setError(t('orderStaffView.failedToServeOrder'))
    } finally {
      setProcessing(null)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'warning'
      case 'CONFIRMED': return 'info'
      case 'PREPARING': return 'primary'
      case 'READY': return 'success'
      default: return 'default'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING': return <AccessTime />
      case 'CONFIRMED': return <PlayArrow />
      case 'PREPARING': return <Kitchen />
      case 'READY': return <CheckCircle />
      default: return <AccessTime />
    }
  }

  const getTimeElapsed = (timestamp: string) => {
    const minutes = Math.floor((Date.now() - new Date(timestamp).getTime()) / (1000 * 60))
    return t('orderStaffView.minsAgo', { mins: minutes })
  }

  const renderItemDetails = (item: OrderItem) => {
    const selectedOptions = item.selections ? JSON.parse(item.selections) : null
    
    return (
      <Box sx={{ pl: 2 }}>
        <Typography variant="body2" sx={{ fontWeight: 500 }}>
          {item.quantity}x {item.menuItem.name}
        </Typography>
        
        {selectedOptions && Object.keys(selectedOptions).length > 0 && (
          <Box sx={{ pl: 2, mt: 0.5 }}>
            {Object.entries(selectedOptions).map(([selectionId, optionIds]: [string, any]) => {
              const selection = item.menuItem.selections?.find(s => s.id === selectionId)
              if (!selection) return null
              
              const selectedOptionNames = (optionIds as string[]).map(optionId => {
                const option = selection.options.find(o => o.id === optionId)
                return option?.name || ''
              }).filter(Boolean).join(', ')
              
              if (!selectedOptionNames) return null
              
              return (
                <Typography key={selectionId} variant="caption" sx={{ display: 'block', color: '#424242', fontWeight: 500 }}>
                  • {selection.name}: {selectedOptionNames}
                </Typography>
              )
            })}
          </Box>
        )}
        
        {item.notes && (
          <Typography variant="caption" sx={{ 
            display: 'block', 
            mt: 0.5,
            pl: 2,
            color: 'warning.dark',
            fontStyle: 'italic'
          }}>
            📝 {item.notes}
          </Typography>
        )}
      </Box>
    )
  }

  if (status === 'loading' || loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress size={40} />
      </Box>
    )
  }

  const pendingOrders = orders.filter(o => o.status === 'PENDING' || o.status === 'CONFIRMED')
  const preparingOrders = orders.filter(o => o.status === 'PREPARING')
  const readyOrders = orders.filter(o => o.status === 'READY')

  return (
    <>
      <RestaurantNavbar 
        backButton={{
          href: '/restaurant',
          label: t('orderStaffView.backToRestaurant')
        }}
      />
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <RestaurantHeader 
          title={t('orderStaffView.title')}
          restaurantNameVariant="h5"
          titleVariant="h5"
          mb={4}
          sameLine={false}
          icon={<KitchenOutlined sx={{ fontSize: { xs: '1.4rem', sm: '1.5rem', md: '1.6rem' } }} />}
        />

        {/* Responsive Layout */}
        <Box sx={{ 
          display: 'flex', 
          flexDirection: { xs: 'column', md: 'row' },
          justifyContent: { md: 'space-between' },
          alignItems: { xs: 'center', md: 'center' },
          gap: { xs: 2, md: 4 },
          mb: 4 
        }}>
          {/* Status Counters */}
          <Box sx={{ 
            display: 'flex', 
            gap: 3,
            justifyContent: { xs: 'center', md: 'flex-start' }
          }}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4" sx={{ fontWeight: 700, color: 'warning.main' }}>
                {pendingOrders.length}
              </Typography>
              <Typography variant="body2" sx={{ color: '#424242', fontWeight: 500 }}>
                {t('orderStaffView.pending')}
              </Typography>
            </Box>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4" sx={{ fontWeight: 700, color: 'primary.main' }}>
                {preparingOrders.length}
              </Typography>
              <Typography variant="body2" sx={{ color: '#424242', fontWeight: 500 }}>
                {t('orderStaffView.preparing')}
              </Typography>
            </Box>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4" sx={{ fontWeight: 700, color: 'success.main' }}>
                {readyOrders.length}
              </Typography>
              <Typography variant="body2" sx={{ color: '#424242', fontWeight: 500 }}>
                {t('orderStaffView.ready')}
              </Typography>
            </Box>
          </Box>

          {/* Control Panel */}
          <Box sx={{ 
            display: 'flex', 
            flexDirection: { xs: 'row', md: 'row-reverse' },
            gap: 2, 
            alignItems: 'center', 
            justifyContent: 'flex-end' 
          }}>
            {/* Manual refresh */}
            <Button
              variant="outlined"
              startIcon={<Refresh />}
              onClick={() => fetchOrders(true)}
              sx={{ 
                borderRadius: 2, 
                textTransform: 'none',
                minWidth: { xs: 'auto', md: 'unset' },
                '& .MuiButton-startIcon': {
                  margin: { xs: 0, md: '0 8px 0 -4px' }
                }
              }}
            >
              <Box sx={{ display: { xs: 'none', md: 'block' } }}>
                {t('orderStaffView.refresh')}
              </Box>
            </Button>

            {/* Auto-refresh toggle */}
            <Button
              variant="outlined"
              size="small"
              startIcon={autoRefreshEnabled ? <Pause /> : <PlayCircle />}
              onClick={() => setAutoRefreshEnabled(!autoRefreshEnabled)}
              sx={{ 
                borderRadius: 2, 
                textTransform: 'none',
                color: autoRefreshEnabled ? 'warning.main' : 'success.main',
                borderColor: autoRefreshEnabled ? 'warning.main' : 'success.main',
                minWidth: { xs: 'auto', md: 'unset' },
                '& .MuiButton-startIcon': {
                  margin: { xs: 0, md: '0 8px 0 -4px' }
                },
                '&:hover': {
                  borderColor: autoRefreshEnabled ? 'warning.dark' : 'success.dark',
                  backgroundColor: autoRefreshEnabled ? 'warning.50' : 'success.50'
                }
              }}
            >
              <Box sx={{ display: { xs: 'none', md: 'block' } }}>
                {autoRefreshEnabled ? t('orderStaffView.pauseAuto') : t('orderStaffView.startAuto')}
              </Box>
            </Button>

            {/* Auto-refresh status */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {lastUpdated && !refreshing && (
                <Typography variant="caption" sx={{ fontSize: '0.7rem', color: '#424242', fontWeight: 500 }}>
                  {t('orderStaffView.updated')}: {lastUpdated.toLocaleTimeString('en-GB', { hour12: false })}
                </Typography>
              )}
              <Sync 
                sx={{ 
                  fontSize: 18, 
                  color: refreshing ? 'primary.main' : autoRefreshEnabled ? 'success.main' : 'text.disabled',
                  animation: (autoRefreshEnabled || refreshing) ? 'spin 2s linear infinite' : 'none',
                  '@keyframes spin': {
                    '0%': { transform: 'rotate(0deg)' },
                    '100%': { transform: 'rotate(360deg)' }
                  }
                }} 
              />
              <Typography variant="caption" sx={{ 
                color: refreshing ? 'primary.main' : autoRefreshEnabled ? 'success.main' : 'text.disabled',
                fontWeight: 500,
                minWidth: 80
              }}>
                {refreshing ? t('orderStaffView.updating') : autoRefreshEnabled ? t('orderStaffView.autoRefresh') : t('orderStaffView.manual')}
              </Typography>
            </Box>
          </Box>
        </Box>

        <Grid container spacing={3}>
          {/* Pending Orders */}
          <Grid size={{ xs: 12, lg: 4 }}>
            <Paper elevation={3} sx={{ borderRadius: 3, overflow: 'hidden', height: 'fit-content' }}>
              <Box sx={{ p: 3, backgroundColor: 'warning.50', borderBottom: 1, borderColor: 'divider' }}>
                <Typography variant="h6" sx={{ fontWeight: 700, color: 'warning.dark' }}>
                  <AccessTime sx={{ mr: 1, verticalAlign: 'middle' }} />
                  {t('orderStaffView.pendingOrders')} ({pendingOrders.length})
                </Typography>
              </Box>
              <Box sx={{ p: 2, maxHeight: '70vh', overflow: 'auto' }}>
                {pendingOrders.length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <AccessTime sx={{ fontSize: '3rem', color: '#424242', mb: 2 }} />
                    <Typography variant="body2" sx={{ color: '#424242', fontWeight: 500 }}>
                      {t('orderStaffView.noPendingOrders')}
                    </Typography>
                  </Box>
                ) : (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {pendingOrders.map((order) => (
                      <Card key={order.id} elevation={2} sx={{ '&:hover': { boxShadow: 4 } }}>
                        <CardContent sx={{ p: 2 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                            <Typography variant="h6" sx={{ fontWeight: 600 }}>
                              #{order.orderNumber}
                            </Typography>
                            <Chip 
                              label={order.status}
                              color={getStatusColor(order.status) as any}
                              size="small"
                              icon={getStatusIcon(order.status)}
                              sx={{ fontWeight: 600 }}
                            />
                          </Box>
                          
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            <TableBar sx={{ fontSize: 16, color: '#424242' }} />
                            <Typography variant="body2" sx={{ color: '#424242', fontWeight: 500 }}>
                              {t('orderStaffView.table', { number: order.table?.number })} • {t('orderStaffView.guests', { count: order.session?.partySize || 1 })}
                            </Typography>
                          </Box>
                          
                          <Typography variant="caption" sx={{ display: 'block', mb: 2, color: '#424242', fontWeight: 500 }}>
                            {t('orderStaffView.ordered')}: {getTimeElapsed(order.orderedAt)}
                          </Typography>
                          
                          <Box sx={{ mb: 2 }}>
                            {order.items.map((item, index) => (
                              <Box key={index} sx={{ mb: 1 }}>
                                {renderItemDetails(item)}
                              </Box>
                            ))}
                          </Box>
                          
                          {order.notes && (
                            <Typography variant="caption" sx={{ 
                              display: 'block', 
                              p: 1, 
                              backgroundColor: 'grey.100', 
                              borderRadius: 1, 
                              mb: 2,
                              fontStyle: 'italic' 
                            }}>
                              {t('orderStaffView.note')}: {order.notes}
                            </Typography>
                          )}
                          
                          <Button
                            variant="contained"
                            fullWidth
                            startIcon={<PlayArrow />}
                            onClick={() => handleStartCooking(order.id)}
                            disabled={processing === order.id}
                            sx={{ 
                              borderRadius: 2, 
                              textTransform: 'none',
                              fontWeight: 600,
                              backgroundColor: 'primary.main'
                            }}
                          >
                            {processing === order.id ? <CircularProgress size={20} /> : t('orderStaffView.startCooking')}
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </Box>
                )}
              </Box>
            </Paper>
          </Grid>

          {/* Preparing Orders */}
          <Grid size={{ xs: 12, lg: 4 }}>
            <Paper elevation={3} sx={{ borderRadius: 3, overflow: 'hidden', height: 'fit-content' }}>
              <Box sx={{ p: 3, backgroundColor: 'primary.50', borderBottom: 1, borderColor: 'divider' }}>
                <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.dark' }}>
                  <Kitchen sx={{ mr: 1, verticalAlign: 'middle' }} />
                  {t('orderStaffView.preparingOrders')} ({preparingOrders.length})
                </Typography>
              </Box>
              <Box sx={{ p: 2, maxHeight: '70vh', overflow: 'auto' }}>
                {preparingOrders.length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <Kitchen sx={{ fontSize: '3rem', color: '#424242', mb: 2 }} />
                    <Typography variant="body2" sx={{ color: '#424242', fontWeight: 500 }}>
                      {t('orderStaffView.noOrdersPreparing')}
                    </Typography>
                  </Box>
                ) : (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {preparingOrders.map((order) => (
                      <Card key={order.id} elevation={2} sx={{ 
                        '&:hover': { boxShadow: 4 },
                        border: '2px solid',
                        borderColor: 'primary.main'
                      }}>
                        <CardContent sx={{ p: 2 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                            <Typography variant="h6" sx={{ fontWeight: 600 }}>
                              #{order.orderNumber}
                            </Typography>
                            <Chip 
                              label={t('orderStaffView.preparing').toUpperCase()}
                              color="primary"
                              size="small"
                              icon={<Kitchen />}
                              sx={{ fontWeight: 600 }}
                            />
                          </Box>
                          
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            <TableBar sx={{ fontSize: 16, color: '#424242' }} />
                            <Typography variant="body2" sx={{ color: '#424242', fontWeight: 500 }}>
                              {t('orderStaffView.table', { number: order.table?.number })} • {t('orderStaffView.guests', { count: order.session?.partySize || 1 })}
                            </Typography>
                          </Box>
                          
                          <Typography variant="caption" sx={{ display: 'block', mb: 2, color: '#424242', fontWeight: 500 }}>
                            {t('orderStaffView.started')}: {order.preparingAt ? getTimeElapsed(order.preparingAt) : t('orderStaffView.justNow')}
                          </Typography>
                          
                          <Box sx={{ mb: 2 }}>
                            {order.items.map((item, index) => (
                              <Box key={index} sx={{ mb: 1 }}>
                                {renderItemDetails(item)}
                              </Box>
                            ))}
                          </Box>
                          
                          <Button
                            variant="contained"
                            fullWidth
                            startIcon={<CheckCircle />}
                            onClick={() => handleMarkReady(order.id)}
                            disabled={processing === order.id}
                            sx={{ 
                              borderRadius: 2, 
                              textTransform: 'none',
                              fontWeight: 600,
                              backgroundColor: 'success.main',
                              '&:hover': { backgroundColor: 'success.dark' }
                            }}
                          >
                            {processing === order.id ? <CircularProgress size={20} /> : t('orderStaffView.markReady')}
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </Box>
                )}
              </Box>
            </Paper>
          </Grid>

          {/* Ready Orders */}
          <Grid size={{ xs: 12, lg: 4 }}>
            <Paper elevation={3} sx={{ borderRadius: 3, overflow: 'hidden', height: 'fit-content' }}>
              <Box sx={{ p: 3, backgroundColor: 'success.50', borderBottom: 1, borderColor: 'divider' }}>
                <Typography variant="h6" sx={{ fontWeight: 700, color: 'success.dark' }}>
                  <CheckCircle sx={{ mr: 1, verticalAlign: 'middle' }} />
                  {t('orderStaffView.readyToServe')} ({readyOrders.length})
                </Typography>
              </Box>
              <Box sx={{ p: 2, maxHeight: '70vh', overflow: 'auto' }}>
                {readyOrders.length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <CheckCircle sx={{ fontSize: '3rem', color: '#424242', mb: 2 }} />
                    <Typography variant="body2" sx={{ color: '#424242', fontWeight: 500 }}>
                      {t('orderStaffView.noOrdersReady')}
                    </Typography>
                  </Box>
                ) : (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {readyOrders.map((order) => (
                      <Card key={order.id} elevation={2} sx={{ 
                        '&:hover': { boxShadow: 4 },
                        border: '2px solid',
                        borderColor: 'success.main'
                      }}>
                        <CardContent sx={{ p: 2 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                            <Typography variant="h6" sx={{ fontWeight: 600 }}>
                              #{order.orderNumber}
                            </Typography>
                            <Chip 
                              label={t('orderStaffView.ready').toUpperCase()}
                              color="success"
                              size="small"
                              icon={<CheckCircle />}
                              sx={{ fontWeight: 600 }}
                            />
                          </Box>
                          
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            <TableBar sx={{ fontSize: 16, color: '#424242' }} />
                            <Typography variant="body2" sx={{ color: '#424242', fontWeight: 500 }}>
                              {t('orderStaffView.table', { number: order.table?.number })} • {t('orderStaffView.guests', { count: order.session?.partySize || 1 })}
                            </Typography>
                          </Box>
                          
                          <Typography variant="caption" color="success.main" sx={{ display: 'block', mb: 2, fontWeight: 600 }}>
                            {t('orderStaffView.readyTime')}: {order.readyAt ? getTimeElapsed(order.readyAt) : t('orderStaffView.justNow')}
                          </Typography>
                          
                          <Box sx={{ mb: 1 }}>
                            {order.items.map((item, index) => (
                              <Box key={index} sx={{ mb: 1 }}>
                                {renderItemDetails(item)}
                              </Box>
                            ))}
                          </Box>
                          
                          <Button
                            variant="contained"
                            fullWidth
                            startIcon={<LocalDining />}
                            onClick={() => handleServeOrder(order.id)}
                            disabled={processing === order.id}
                            sx={{ 
                              borderRadius: 2, 
                              textTransform: 'none',
                              fontWeight: 600,
                              backgroundColor: 'warning.main',
                              color: 'warning.contrastText',
                              '&:hover': { backgroundColor: 'warning.dark' },
                              mb: 1
                            }}
                          >
                            {processing === order.id ? <CircularProgress size={20} /> : t('orderStaffView.serveAndRemove')}
                          </Button>
                          
                          <Typography variant="caption" sx={{ 
                            display: 'block', 
                            p: 1, 
                            backgroundColor: 'success.50', 
                            borderRadius: 1, 
                            textAlign: 'center',
                            fontWeight: 600,
                            color: 'success.dark'
                          }}>
                            {t('orderStaffView.readyForPickup')}
                          </Typography>
                        </CardContent>
                      </Card>
                    ))}
                  </Box>
                )}
              </Box>
            </Paper>
          </Grid>
        </Grid>

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