'use client'

import React, { useState, useEffect, useRef } from 'react'
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
  Grid,
  Card,
  CardContent,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  TextField,
  Stack
} from '@mui/material'
import {
  ShoppingCart,
  Visibility,
  Schedule,
  CheckCircle,
  LocalShipping,
  Cancel,
  Person,
  Phone,
  Email,
  AttachMoney,
  FilterList,
  TrendingUp,
  Receipt as ReceiptIcon
} from '@mui/icons-material'
import { RestaurantNavbar } from '@/lib/components/RestaurantNavbar'
import { useTranslation } from 'react-i18next'

interface OrderItem {
  id: string
  quantity: number
  price: number | string
  menuItem: {
    id: string
    name: string
  }
}

interface Order {
  id: string
  orderNumber: string
  status: string
  totalAmount: number | string
  customerName: string | null
  customerPhone: string | null
  customerEmail: string | null
  notes: string | null
  items: OrderItem[]
  createdAt: string
  updatedAt: string
}

interface GroupedOrder {
  orderNumber: string
  orders: Order[]
  totalAmount: number
  customerName: string | null
  customerPhone: string | null
  customerEmail: string | null
  status: string
  createdAt: string
  itemCount: number
}

const statusConfig = {
  PENDING: { color: 'warning' as const, icon: Schedule, label: 'Pending' },
  CONFIRMED: { color: 'info' as const, icon: CheckCircle, label: 'Confirmed' },
  PREPARING: { color: 'primary' as const, icon: Schedule, label: 'Preparing' },
  READY: { color: 'success' as const, icon: CheckCircle, label: 'Ready' },
  DELIVERED: { color: 'success' as const, icon: LocalShipping, label: 'Delivered' },
  CANCELLED: { color: 'error' as const, icon: Cancel, label: 'Cancelled' }
}

export default function OrdersPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  // Removed useRoles hook - using session.user.id instead
  const theme = useTheme()
  const { t } = useTranslation()

  const [orders, setOrders] = useState<Order[]>([])
  const [groupedOrders, setGroupedOrders] = useState<GroupedOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [selectedOrderGroup, setSelectedOrderGroup] = useState<GroupedOrder | null>(null)
  const [orderDialog, setOrderDialog] = useState(false)
  const [fromDate, setFromDate] = useState(() => {
    const today = new Date()
    today.setDate(today.getDate() - 7) // Default to last 7 days
    return today.toISOString().split('T')[0]
  })
  const [toDate, setToDate] = useState(() => {
    const today = new Date()
    return today.toISOString().split('T')[0]
  })
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const hasFetched = useRef(false)

  const statusOptions = [
    { value: 'ALL', label: 'All Status' },
    { value: 'PENDING', label: 'Pending' },
    { value: 'CONFIRMED', label: 'Confirmed' },
    { value: 'PREPARING', label: 'Preparing' },
    { value: 'READY', label: 'Ready' },
    { value: 'DELIVERED', label: 'Delivered' },
    { value: 'CANCELLED', label: 'Cancelled' }
  ]

  // Function to group orders by orderNumber
  const groupOrdersByNumber = (orderList: Order[]): GroupedOrder[] => {
    const grouped: { [key: string]: Order[] } = {}
    
    // Group orders by orderNumber
    orderList.forEach(order => {
      if (!grouped[order.orderNumber]) {
        grouped[order.orderNumber] = []
      }
      grouped[order.orderNumber].push(order)
    })
    
    // Convert to GroupedOrder format
    return Object.entries(grouped).map(([orderNumber, orders]) => {
      const totalAmount = orders.reduce((sum, order) => sum + Number(order.totalAmount), 0)
      const itemCount = orders.reduce((sum, order) => sum + order.items.length, 0)
      const firstOrder = orders[0]
      
      // Determine overall status (prioritize active statuses)
      const statusPriority = { 'PENDING': 0, 'CONFIRMED': 1, 'PREPARING': 2, 'READY': 3, 'DELIVERED': 4, 'CANCELLED': 5 }
      const mainStatus = orders.reduce((prevStatus, order) => 
        statusPriority[order.status as keyof typeof statusPriority] < statusPriority[prevStatus as keyof typeof statusPriority] 
          ? order.status 
          : prevStatus
      , orders[0].status)
      
      return {
        orderNumber,
        orders,
        totalAmount,
        customerName: firstOrder.customerName,
        customerPhone: firstOrder.customerPhone,
        customerEmail: firstOrder.customerEmail,
        status: mainStatus,
        createdAt: firstOrder.createdAt,
        itemCount
      }
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }

  useEffect(() => {
    if (status === 'loading') return
    if (!session) router.push('/auth/signin')
    // All authenticated users can access this page
  }, [session, status, router])

  useEffect(() => {
    const fetchOrders = async () => {
      if (hasFetched.current) return
      
      try {
        hasFetched.current = true
        if (!session?.user?.id) {
          throw new Error('No user session available')
        }
        
        const response = await fetch(`/api/restaurant/orders`)
        if (!response.ok) throw new Error('Failed to fetch orders')
        const data = await response.json()
        
        setOrders(data)
        // Group orders by orderNumber and set grouped state
        const grouped = groupOrdersByNumber(data)
        setGroupedOrders(grouped)
      } catch {
        setError('Failed to load orders')
      } finally {
        setLoading(false)
      }
    }

    if (session && !hasFetched.current) {
      fetchOrders()
    }
  }, [session])

  const handleViewOrderGroup = (orderGroup: GroupedOrder) => {
    setSelectedOrderGroup(orderGroup)
    setOrderDialog(true)
  }

  const handleUpdateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      setError(null)
      setSuccess(null)
      
      const response = await fetch(`/api/restaurant/orders/${orderId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update order status')
      }

      const updatedOrder = await response.json()
      
      // Update orders in state
      setOrders(orders.map(order => 
        order.id === orderId ? updatedOrder : order
      ))
      
      // Update grouped orders and selected order group
      const newGroupedOrders = groupOrdersByNumber(orders.map(order => 
        order.id === orderId ? updatedOrder : order
      ))
      setGroupedOrders(newGroupedOrders)
      
      // Update selected order group if it contains the updated order
      if (selectedOrderGroup && selectedOrderGroup.orders.some(order => order.id === orderId)) {
        const updatedGroup = newGroupedOrders.find(group => group.orderNumber === selectedOrderGroup.orderNumber)
        if (updatedGroup) {
          setSelectedOrderGroup(updatedGroup)
        }
      }
      
      setSuccess(`Order status updated to ${statusConfig[newStatus as keyof typeof statusConfig]?.label || newStatus}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update order status')
    }
  }

  // Filter orders by date range and status
  const filteredOrderGroups = groupedOrders.filter(group => {
    const orderDate = new Date(group.createdAt).toISOString().split('T')[0]
    const isInDateRange = orderDate >= fromDate && orderDate <= toDate
    const matchesStatus = statusFilter === 'ALL' || group.status === statusFilter
    return isInDateRange && matchesStatus
  })

  // Calculate summary data
  const summaryData = {
    totalOrderGroups: filteredOrderGroups.length,
    totalOrders: filteredOrderGroups.reduce((sum, group) => sum + group.orders.length, 0),
    totalAmount: filteredOrderGroups.reduce((sum, group) => sum + group.totalAmount, 0),
    totalItems: filteredOrderGroups.reduce((sum, group) => sum + group.itemCount, 0),
    statusBreakdown: statusOptions.slice(1).map(status => ({
      status: status.value,
      label: status.label,
      count: filteredOrderGroups.filter(group => group.status === status.value).length,
      amount: filteredOrderGroups
        .filter(group => group.status === status.value)
        .reduce((sum, group) => sum + group.totalAmount, 0)
    }))
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
          label: t('orders.backToRestaurantAdmin')
        }}
      />

      <Container maxWidth="xl" sx={{ mt: { xs: 1, sm: 2, md: 3 }, mb: { xs: 2, sm: 3, md: 4 }, px: { xs: 1, sm: 2, md: 3, lg: 4 } }}>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess(null)}>
            {success}
          </Alert>
        )}

        {/* Filters and Summary Card */}
        <Card sx={{ mb: 4, borderRadius: 3, boxShadow: 3 }}>
          <CardContent sx={{ p: 3 }}>
            {/* Header */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
              <Box sx={{ 
                p: 1.5, 
                borderRadius: 2, 
                backgroundColor: `${theme.palette.primary.main}15`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <ShoppingCart sx={{ color: theme.palette.primary.main, fontSize: '2rem' }} />
              </Box>
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 700, color: theme.palette.text.primary }}>
                  {t('orders.orderManagement')}
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  {t('orders.orderManagementDesc')}
                </Typography>
              </Box>
            </Box>

            {/* Filters */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <FilterList /> Filters
              </Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
                <TextField
                  label="From Date"
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  size="small"
                  sx={{ minWidth: 160 }}
                />
                <TextField
                  label="To Date"
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  size="small"
                  sx={{ minWidth: 160 }}
                />
                <FormControl size="small" sx={{ minWidth: 140 }}>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={statusFilter}
                    label="Status"
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    {statusOptions.map(option => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Stack>
            </Box>

            {/* Summary */}
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <TrendingUp /> Summary
              </Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 6, sm: 3 }}>
                  <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'primary.50' }}>
                    <Typography variant="h5" sx={{ fontWeight: 700, color: 'text.primary' }}>
                      {summaryData.totalOrderGroups}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Order Groups
                    </Typography>
                  </Paper>
                </Grid>
                <Grid size={{ xs: 6, sm: 3 }}>
                  <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'info.50' }}>
                    <Typography variant="h5" sx={{ fontWeight: 700, color: 'text.primary' }}>
                      {summaryData.totalOrders}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Orders
                    </Typography>
                  </Paper>
                </Grid>
                <Grid size={{ xs: 6, sm: 3 }}>
                  <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'warning.50' }}>
                    <Typography variant="h5" sx={{ fontWeight: 700, color: 'text.primary' }}>
                      {summaryData.totalItems}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Items
                    </Typography>
                  </Paper>
                </Grid>
                <Grid size={{ xs: 6, sm: 3 }}>
                  <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'success.50' }}>
                    <Typography variant="h5" sx={{ fontWeight: 700, color: 'text.primary' }}>
                      ${summaryData.totalAmount.toFixed(2)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Amount
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>
            </Box>
          </CardContent>
        </Card>

        {/* Orders Table */}
        <Card sx={{ mb: 4, borderRadius: 3, boxShadow: 2 }}>
          <Box sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
              <ReceiptIcon /> Order Groups ({filteredOrderGroups.length})
            </Typography>
            
            {filteredOrderGroups.length > 0 ? (
              <TableContainer component={Paper} sx={{ boxShadow: 1 }}>
                <Table>
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'grey.50' }}>
                      <TableCell sx={{ fontWeight: 700 }}>Order #</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Customer</TableCell>
                      <TableCell sx={{ fontWeight: 700 }} align="center">Orders Count</TableCell>
                      <TableCell sx={{ fontWeight: 700 }} align="center">Items</TableCell>
                      <TableCell sx={{ fontWeight: 700 }} align="center">Status</TableCell>
                      <TableCell sx={{ fontWeight: 700 }} align="right">Total Amount</TableCell>
                      <TableCell sx={{ fontWeight: 700 }} align="center">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredOrderGroups.map((orderGroup) => (
                      <TableRow 
                        key={orderGroup.orderNumber} 
                        sx={{ 
                          '&:hover': { bgcolor: 'grey.50' },
                          cursor: 'pointer'
                        }}
                        onClick={() => handleViewOrderGroup(orderGroup)}
                      >
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            #{orderGroup.orderNumber}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {new Date(orderGroup.createdAt).toLocaleDateString()}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {new Date(orderGroup.createdAt).toLocaleTimeString()}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {orderGroup.customerName || 'Walk-in Customer'}
                          </Typography>
                          {orderGroup.customerPhone && (
                            <Typography variant="caption" color="text.secondary">
                              {orderGroup.customerPhone}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell align="center">
                          <Chip 
                            label={orderGroup.orders.length} 
                            size="small" 
                            color="primary" 
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                            {orderGroup.itemCount}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            icon={statusConfig[orderGroup.status as keyof typeof statusConfig] ? React.createElement(statusConfig[orderGroup.status as keyof typeof statusConfig].icon, { fontSize: 'small' }) : undefined}
                            label={statusConfig[orderGroup.status as keyof typeof statusConfig]?.label || orderGroup.status}
                            color={statusConfig[orderGroup.status as keyof typeof statusConfig]?.color || 'default'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body1" sx={{ fontWeight: 700, color: 'text.primary' }}>
                            ${orderGroup.totalAmount.toFixed(2)}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <IconButton 
                            size="small" 
                            onClick={(e) => {
                              e.stopPropagation()
                              handleViewOrderGroup(orderGroup)
                            }}
                            sx={{ color: 'primary.main' }}
                          >
                            <Visibility fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <ShoppingCart sx={{ fontSize: '4rem', color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
                  No order groups found
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Try adjusting your date range or status filter
                </Typography>
              </Box>
            )}
          </Box>
        </Card>

        {/* Status Breakdown */}
        <Card sx={{ mb: 4, borderRadius: 3, boxShadow: 2 }}>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
              Status Breakdown
            </Typography>
            <Grid container spacing={2}>
              {summaryData.statusBreakdown.map((status) => (
                <Grid size={{ xs: 6, sm: 4, md: 3 }} key={status.status}>
                  <Paper sx={{ p: 2, textAlign: 'center', bgcolor: `${statusConfig[status.status as keyof typeof statusConfig]?.color || 'default'}.50` }}>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary' }}>
                      {status.count}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      {status.label}
                    </Typography>
                    <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.primary' }}>
                      ${status.amount.toFixed(2)}
                    </Typography>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>

        {/* Order Group Details Dialog */}
        <Dialog 
          open={orderDialog} 
          onClose={() => setOrderDialog(false)} 
          maxWidth="lg" 
          fullWidth
        >
          {selectedOrderGroup && (
            <>
              <DialogTitle sx={{ pb: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                      Order Group #{selectedOrderGroup.orderNumber}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {selectedOrderGroup.orders.length} orders grouped together
                    </Typography>
                  </Box>
                  <Chip
                    icon={statusConfig[selectedOrderGroup.status as keyof typeof statusConfig] ? React.createElement(statusConfig[selectedOrderGroup.status as keyof typeof statusConfig].icon, { fontSize: 'small' }) : undefined}
                    label={statusConfig[selectedOrderGroup.status as keyof typeof statusConfig]?.label || selectedOrderGroup.status}
                    color={statusConfig[selectedOrderGroup.status as keyof typeof statusConfig]?.color || 'default'}
                  />
                </Box>
              </DialogTitle>
              <DialogContent>
                <Grid container spacing={3}>
                  {/* Customer Information */}
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Card sx={{ p: 3, bgcolor: 'grey.50' }}>
                      <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Person /> Customer Information
                      </Typography>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Person fontSize="small" color="primary" />
                          <Typography variant="body2">
                            {selectedOrderGroup.customerName || 'Walk-in Customer'}
                          </Typography>
                        </Box>
                        {selectedOrderGroup.customerPhone && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Phone fontSize="small" color="primary" />
                            <Typography variant="body2">{selectedOrderGroup.customerPhone}</Typography>
                          </Box>
                        )}
                        {selectedOrderGroup.customerEmail && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Email fontSize="small" color="primary" />
                            <Typography variant="body2">{selectedOrderGroup.customerEmail}</Typography>
                          </Box>
                        )}
                      </Box>
                    </Card>
                  </Grid>

                  {/* Order Summary */}
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Card sx={{ p: 3, bgcolor: 'grey.50' }}>
                      <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <AttachMoney /> Group Summary
                      </Typography>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2">First Order Date:</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {new Date(selectedOrderGroup.createdAt).toLocaleDateString()}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2">Orders Count:</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {selectedOrderGroup.orders.length}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2">Total Items:</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {selectedOrderGroup.itemCount}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', pt: 1, borderTop: 1, borderColor: 'divider' }}>
                          <Typography variant="h6" sx={{ fontWeight: 700 }}>Total Amount:</Typography>
                          <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary' }}>
                            ${selectedOrderGroup.totalAmount.toFixed(2)}
                          </Typography>
                        </Box>
                      </Box>
                    </Card>
                  </Grid>

                  {/* All Orders in Group */}
                  <Grid size={{ xs: 12 }}>
                    <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                      All Orders in Group
                    </Typography>
                    {selectedOrderGroup.orders.map((order, orderIndex) => (
                      <Card key={order.id} sx={{ mb: 2 }}>
                        <Box sx={{ p: 2, backgroundColor: 'primary.50' }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="h6" sx={{ fontWeight: 600 }}>
                              Order #{order.orderNumber} - Submission {orderIndex + 1}
                            </Typography>
                            <Chip
                              label={order.status}
                              color={statusConfig[order.status as keyof typeof statusConfig]?.color || 'default'}
                              size="small"
                            />
                          </Box>
                          <Typography variant="body2" color="text.secondary">
                            {new Date(order.createdAt).toLocaleDateString()} at {new Date(order.createdAt).toLocaleTimeString()}
                          </Typography>
                        </Box>
                        <TableContainer>
                          <Table size="small">
                            <TableHead>
                              <TableRow>
                                <TableCell sx={{ fontWeight: 700 }}>Item</TableCell>
                                <TableCell sx={{ fontWeight: 700 }} align="center">Qty</TableCell>
                                <TableCell sx={{ fontWeight: 700 }} align="right">Price</TableCell>
                                <TableCell sx={{ fontWeight: 700 }} align="right">Total</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {order.items.map((item) => (
                                <TableRow key={item.id}>
                                  <TableCell>{item.menuItem.name}</TableCell>
                                  <TableCell align="center">{item.quantity}</TableCell>
                                  <TableCell align="right" sx={{ color: 'text.primary' }}>${Number(item.price).toFixed(2)}</TableCell>
                                  <TableCell align="right" sx={{ fontWeight: 600, color: 'text.primary' }}>
                                    ${(item.quantity * Number(item.price)).toFixed(2)}
                                  </TableCell>
                                </TableRow>
                              ))}
                              <TableRow>
                                <TableCell colSpan={3} sx={{ fontWeight: 700, borderTop: 2, borderColor: 'divider' }}>Order Subtotal:</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 700, borderTop: 2, borderColor: 'divider', color: 'text.primary' }}>
                                  ${Number(order.totalAmount).toFixed(2)}
                                </TableCell>
                              </TableRow>
                            </TableBody>
                          </Table>
                        </TableContainer>
                        {order.notes && (
                          <Box sx={{ p: 2, backgroundColor: 'info.50' }}>
                            <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>Special Notes:</Typography>
                            <Typography variant="body2">{order.notes}</Typography>
                          </Box>
                        )}
                      </Card>
                    ))}
                  </Grid>

                  {/* Batch Status Update */}
                  <Grid size={{ xs: 12 }}>
                    <Card sx={{ p: 3, bgcolor: 'warning.50' }}>
                      <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                        Update Group Status
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        This will update all orders in this group to the selected status.
                      </Typography>
                      <FormControl fullWidth>
                        <InputLabel>Order Status</InputLabel>
                        <Select
                          value={selectedOrderGroup.status}
                          label="Order Status"
                          onChange={async (e) => {
                            const newStatus = e.target.value;
                            // Update all orders in the group
                            const updatePromises = selectedOrderGroup.orders.map(order => 
                              handleUpdateOrderStatus(order.id, newStatus)
                            );
                            await Promise.all(updatePromises);
                          }}
                        >
                          {Object.entries(statusConfig).map(([status, config]) => (
                            <MenuItem key={status} value={status}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                {React.createElement(config.icon, { fontSize: 'small' })}
                                {config.label}
                              </Box>
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Card>
                  </Grid>
                </Grid>
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setOrderDialog(false)}>Close</Button>
              </DialogActions>
            </>
          )}
        </Dialog>
      </Container>
    </>
  )
}