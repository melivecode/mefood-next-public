'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Box,
  Container,
  Typography,
  Button,
  Grid,
  Paper,
  Chip,
  Alert,
  Snackbar,
  CircularProgress,
  Divider,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  FormLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
  List,
  ListItem,
  ListItemText,
  Autocomplete,
  Collapse,
  IconButton
} from '@mui/material'
import {
  Receipt,
  Payment,
  CreditCard,
  Money,
  QrCode2,
  CheckCircle,
  Print,
  Email,
  ArrowBack,
  Person,
  TableBar,
  AccessTime,
  Refresh,
  Add,
  Delete,
  ExpandMore,
  ExpandLess,
  LocationOn,
  Phone
} from '@mui/icons-material'
import { Navbar } from '@/lib/components/Navbar'
import { Footer } from '@/lib/components/Footer'
import { DarkTextField } from '@/lib/components/DarkTextField'
import { useTranslation } from 'react-i18next'
import { LanguageSwitcher } from '@/lib/components/LanguageSwitcher'

interface ExtraCharge {
  id: string
  description: string
  amount: number
  isPercentage: boolean
}

interface BillData {
  table: {
    id: string
    number: string
    name: string | null
    restaurant: {
      id: string
      name: string
      address: string | null
      phone: string | null
    }
  }
  session: {
    id: string
    customerName: string | null
    customerPhone: string | null
    customerEmail: string | null
    partySize: number
    checkInTime: string
  }
  orders: any[]
  totalAmount: number
  totalItems: number
}

function BillingPageContent() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const tableId = searchParams.get('tableId')
  // Simplified for one-user-one-restaurant system
  const { t } = useTranslation()

  // Check if this is table-specific billing or general billing view
  const isTableBilling = !!tableId

  // Table billing states
  const [billData, setBillData] = useState<BillData | null>(null)
  
  // General billing states  
  const [orders, setOrders] = useState<any[]>([])
  
  // Common states
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
  
  // Payment states
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'qr'>('cash')
  const [discountPercent, setDiscountPercent] = useState(0)
  const [discountAmount, setDiscountAmount] = useState(0)
  const [extraCharges, setExtraCharges] = useState<ExtraCharge[]>([])
  const [newChargeDescription, setNewChargeDescription] = useState('')
  const [newChargeAmount, setNewChargeAmount] = useState(0)
  const [newChargeIsPercentage, setNewChargeIsPercentage] = useState(false)
  const [extraChargesExpanded, setExtraChargesExpanded] = useState(false)
  const [discountExpanded, setDiscountExpanded] = useState(false)
  
  // Predefined charge options
  const chargeOptions = [
    t('billing.serviceCharge'),
    t('billing.vat'),
    t('billing.deliveryFee'),
    t('billing.processingFee'),
    t('billing.packagingFee'),
    t('billing.tip'),
    t('billing.extraService')
  ]
  const [receivedAmount, setReceivedAmount] = useState('')
  const [notes, setNotes] = useState('')
  const [confirmDialog, setConfirmDialog] = useState(false)

  useEffect(() => {
    if (status === 'loading') return
    if (!session) router.push('/auth/signin')
    // All authenticated users can access this page
  }, [session, status, router])

  useEffect(() => {
    if (session?.user?.id) {
      if (isTableBilling && tableId) {
        fetchBillData()
      } else {
        fetchOrders()
      }
    }
  }, [session?.user?.id, tableId, isTableBilling])

  const fetchBillData = async () => {
    try {
      // Fetch table and session info
      const tableRes = await fetch(`/api/restaurant/tables/${tableId}`)
      if (!tableRes.ok) throw new Error('Failed to fetch table data')
      
      const tableData = await tableRes.json()
      if (!tableData.session) {
        setError(t('billing.noActiveSession'))
        setLoading(false)
        return
      }

      // Fetch orders for this session
      const ordersRes = await fetch(`/api/restaurant/orders`)
      if (!ordersRes.ok) throw new Error('Failed to fetch orders')
      
      const allOrders = await ordersRes.json()
      // Get orders that are not completed and not cancelled for billing
      const sessionOrders = allOrders.filter((order: any) => 
        order.sessionId === tableData.session.id && 
        order.status !== 'COMPLETED' && 
        order.status !== 'CANCELLED'
      )

      // Group orders: only show main orders (those without mainOrderId) and include sub-orders within them
      const mainOrders = sessionOrders.filter((order: any) => !order.mainOrderId)
      
      // For each main order, collect all its items including from sub-orders
      const consolidatedOrders = mainOrders.map((mainOrder: any) => {
        const subOrders = sessionOrders.filter((order: any) => order.mainOrderId === mainOrder.id)
        
        // Combine all items from main order and sub-orders
        let allItems = [...mainOrder.items]
        let totalAmount = parseFloat(mainOrder.totalAmount)
        
        subOrders.forEach((subOrder: any) => {
          allItems = [...allItems, ...subOrder.items]
          totalAmount += parseFloat(subOrder.totalAmount)
        })
        
        return {
          ...mainOrder,
          items: allItems,
          totalAmount: totalAmount,
          subOrders: subOrders,
          subOrderCount: subOrders.length
        }
      })

      // Calculate totals
      const totalAmount = consolidatedOrders.reduce((sum: number, order: any) => 
        sum + order.totalAmount, 0
      )
      const totalItems = consolidatedOrders.reduce((sum: number, order: any) => 
        sum + order.items.reduce((itemSum: number, item: any) => itemSum + item.quantity, 0), 0
      )

      setBillData({
        table: {
          id: tableData.id,
          number: tableData.number,
          name: tableData.name,
          restaurant: tableData.restaurant // Include restaurant data
        },
        session: tableData.session,
        orders: consolidatedOrders,
        totalAmount,
        totalItems
      })

      // Set initial received amount to total
      setReceivedAmount(totalAmount.toFixed(2))
    } catch (err) {
      setError(t('billing.failedToLoadBilling'))
    } finally {
      setLoading(false)
    }
  }

  const fetchOrders = async () => {
    try {
      const response = await fetch(`/api/restaurant/orders`)
      if (response.ok) {
        const ordersData = await response.json()
        
        // Filter orders that are delivered and need billing
        const billingOrders = ordersData.filter((order: any) => 
          order.status === 'DELIVERED'
        )
        setOrders(billingOrders)
      }
    } catch (err) {
      setError(t('billing.failedToLoadOrders'))
    } finally {
      setLoading(false)
    }
  }

  const addExtraCharge = () => {
    if (!newChargeDescription.trim() || newChargeAmount <= 0) return
    
    const newCharge: ExtraCharge = {
      id: Date.now().toString(),
      description: newChargeDescription.trim(),
      amount: newChargeAmount,
      isPercentage: newChargeIsPercentage
    }
    
    setExtraCharges([...extraCharges, newCharge])
    setNewChargeDescription('')
    setNewChargeAmount(0)
    setNewChargeIsPercentage(false)
  }

  const removeExtraCharge = (chargeId: string) => {
    setExtraCharges(extraCharges.filter(charge => charge.id !== chargeId))
  }

  const calculateFinalAmount = () => {
    if (!billData) return 0
    const extraChargesTotal = extraCharges.reduce((total, charge) => {
      if (charge.isPercentage) {
        return total + (billData.totalAmount * charge.amount / 100)
      }
      return total + charge.amount
    }, 0)
    const discount = discountPercent > 0 
      ? (billData.totalAmount * discountPercent / 100)
      : discountAmount
    return Math.max(0, billData.totalAmount + extraChargesTotal - discount)
  }

  const calculateChange = () => {
    const received = parseFloat(receivedAmount) || 0
    const final = calculateFinalAmount()
    return Math.max(0, received - final)
  }

  const handleProcessPayment = async () => {
    if (!billData) return
    
    // Check if total amount is valid
    const finalAmount = calculateFinalAmount()
    if (finalAmount <= 0) {
      setError(t('billing.cannotProcessZero'))
      return
    }
    
    setProcessing(true)
    setError(null)

    try {
      // Update all PENDING main orders and their sub-orders to COMPLETED status
      const updatePromises: Promise<Response>[] = []
      
      billData.orders.forEach(order => {
        // Only update orders that are not already completed or cancelled
        if (order.status !== 'COMPLETED' && order.status !== 'CANCELLED') {
          // Update main order
          updatePromises.push(
            fetch(`/api/restaurant/orders/${order.id}/status`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ status: 'COMPLETED' })
            })
          )
          
          // Update all active sub-orders (not completed or cancelled)
          if (order.subOrders && order.subOrders.length > 0) {
            order.subOrders.forEach((subOrder: any) => {
              if (subOrder.status !== 'COMPLETED' && subOrder.status !== 'CANCELLED') {
                updatePromises.push(
                  fetch(`/api/restaurant/orders/${subOrder.id}/status`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: 'COMPLETED' })
                  })
                )
              }
            })
          }
        }
      })

      await Promise.all(updatePromises)

      // Process the payment (doesn't checkout the customer yet)
      const sessionRes = await fetch(`/api/restaurant/sessions/${billData.session.id}/payment`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentMethod,
          totalAmount: billData.totalAmount,
          extraCharges: extraCharges,
          discountAmount: discountPercent > 0 
            ? (billData.totalAmount * discountPercent / 100)
            : discountAmount,
          finalAmount: calculateFinalAmount(),
          receivedAmount: parseFloat(receivedAmount) || 0,
          changeAmount: calculateChange(),
          notes
        })
      })

      if (!sessionRes.ok) throw new Error('Failed to complete session')
      
      // Get the response with payment data
      const responseData = await sessionRes.json()
      
      // Payment processed successfully
      
      setSuccess(t('billing.paymentProcessedSuccess', { number: responseData.paymentNumber }))
      setConfirmDialog(false)
      
      // Redirect to receipt page instead of showing dialog
      const paymentId = responseData.paymentId || responseData.id || responseData.data?.id
      router.push(`/restaurant/receipt?paymentId=${paymentId}`)
    } catch (err) {
      setError(t('billing.failedToProcessPayment'))
    } finally {
      setProcessing(false)
    }
  }

  const handleComplete = () => {
    router.push('/restaurant/table')
  }

  if (status === 'loading' || loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress size={40} />
      </Box>
    )
  }

  // Table-specific billing view
  if (isTableBilling) {
    if (!billData) {
      return (
        <>
          <Navbar 
            leftAction={
              <Button
                color="inherit"
                startIcon={<TableBar />}
                onClick={() => router.push(`/restaurant/table/${tableId}`)}
                sx={{ 
                  textTransform: 'none',
                  fontWeight: 500,
                  fontSize: { xs: '0.875rem', md: '1rem' }
                }}
              >
                {t('billing.backToTable')}
              </Button>
            }
            rightAction={<LanguageSwitcher />}
          />
          <Container maxWidth="xl" sx={{ py: 4 }}>
            <Alert severity="error">
              {error || t('billing.noBillingData')}
            </Alert>
            <Button 
              startIcon={<ArrowBack />} 
              onClick={() => router.push('/restaurant/table')}
              sx={{ mt: 2 }}
            >
              {t('billing.backToAllTables')}
            </Button>
          </Container>
          <Footer />
        </>
      )
    }

    return (
      <>
        <Navbar 
          leftAction={
            <Button
              color="inherit"
              startIcon={<TableBar />}
              onClick={() => router.push(`/restaurant/table/${tableId}`)}
              sx={{ 
                textTransform: 'none',
                fontWeight: 500,
                fontSize: { xs: '0.875rem', md: '1rem' }
              }}
            >
              {t('billing.backToTableNumber', { number: billData.table.number, name: billData.table.name ? ` (${billData.table.name})` : '' })}
            </Button>
          }
          rightAction={<LanguageSwitcher />}
        />
        <Container maxWidth="xl" sx={{ py: { xs: 2, md: 4 } }}>
          <Grid container spacing={3}>
            {/* Bill Details */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Paper elevation={3} sx={{ borderRadius: 3, overflow: 'hidden' }}>
                {/* Header */}
                <Box sx={{ p: { xs: 2, md: 3 }, backgroundColor: 'primary.dark', color: 'white' }}>
                  <Typography variant="h5" sx={{ fontWeight: 700, mb: 2, color: 'white' }}>
                    {t('billing.billSummary')}
                  </Typography>
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: { xs: 2, md: 3 },
                    flexWrap: 'wrap'
                  }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <TableBar sx={{ color: 'white' }} />
                      <Typography variant="body2" sx={{ color: 'white' }}>{t('billing.table', { number: billData.table.number })}</Typography>
                    </Box>
                    <Typography variant="body2" sx={{ color: 'white', opacity: 0.7 }}>•</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Person sx={{ color: 'white' }} />
                      <Typography variant="body2" sx={{ color: 'white' }}>
                        {billData.session.customerName || t('billing.walkIn')} ({billData.session.partySize})
                      </Typography>
                    </Box>
                    <Typography variant="body2" sx={{ color: 'white', opacity: 0.7 }}>•</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <AccessTime sx={{ color: 'white' }} />
                      <Typography variant="body2" sx={{ color: 'white' }}>
                        {new Date(billData.session.checkInTime).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: '2-digit', 
                          year: 'numeric'
                        })} {new Date(billData.session.checkInTime).toLocaleTimeString('en-GB', {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                          hour12: false
                        })}
                      </Typography>
                    </Box>
                  </Box>
                </Box>

                {/* Orders List */}
                <Box sx={{ p: { xs: 2, md: 3 } }}>
                  
                  {billData.orders.length === 0 ? (
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                      <Receipt sx={{ fontSize: '4rem', color: 'text.secondary' }} />
                      <Typography variant="h6" color="text.secondary" sx={{ mt: 2 }}>
                        {t('billing.noPendingOrders')}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {t('billing.allOrdersProcessed')}
                      </Typography>
                    </Box>
                  ) : (
                    billData.orders.map((order, orderIndex) => (
                    <Box key={order.id} sx={{ mb: 3 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Box>
                          <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.dark' }}>
                            {t('billing.orderNumber', { number: order.orderNumber })}
                          </Typography>
                          {order.subOrderCount > 0 && (
                            <Typography variant="body2" color="text.secondary">
                              {t('billing.submissionsCombined', { count: order.subOrderCount + 1 })}
                            </Typography>
                          )}
                        </Box>
                        <Chip 
                          label={order.status} 
                          size="small"
                          color={order.status === 'DELIVERED' ? 'success' : 'default'}
                        />
                      </Box>
                      
                      <TableContainer>
                        <Table size="small">
                          <TableBody>
                            {order.items.map((item: any, itemIndex: number) => {
                              const selections = item.selections ? JSON.parse(item.selections) : null
                              return (
                                <TableRow key={itemIndex}>
                                  <TableCell sx={{ width: '60px' }}>
                                    {item.quantity}x
                                  </TableCell>
                                  <TableCell>
                                    <Typography variant="body1" sx={{ fontWeight: 600, fontSize: { xs: '1rem', md: '1.1rem' } }}>
                                      {item.menuItem.name}
                                    </Typography>
                                    {selections && Object.keys(selections).length > 0 && (
                                      <Typography variant="body2" color="text.secondary">
                                        {Object.entries(selections).map(([selectionId, optionIds]: [string, any]) => {
                                          const selection = item.menuItem.selections?.find((s: any) => s.id === selectionId)
                                          if (!selection) return null
                                          const selectedOptionNames = (optionIds as string[]).map((optionId: string) => {
                                            const option = selection.options.find((o: any) => o.id === optionId)
                                            return option?.name || ''
                                          }).filter(Boolean).join(', ')
                                          return selectedOptionNames ? `${selection.name}: ${selectedOptionNames}` : null
                                        }).filter(Boolean).join(' • ')}
                                      </Typography>
                                    )}
                                    {item.notes && (
                                      <Typography variant="body2" color="text.secondary" sx={{ display: 'block', fontStyle: 'italic' }}>
                                        {item.notes}
                                      </Typography>
                                    )}
                                  </TableCell>
                                  <TableCell align="right">
                                    B {(parseFloat(item.price) * item.quantity).toFixed(2)}
                                  </TableCell>
                                </TableRow>
                              )
                            })}
                          </TableBody>
                        </Table>
                      </TableContainer>
                      
                      {orderIndex < billData.orders.length - 1 && <Divider sx={{ mt: 2 }} />}
                    </Box>
                  )))}

                  <Divider sx={{ my: 3 }} />

                  {/* Totals */}
                  <Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography>{t('billing.subtotal', { count: billData.totalItems })}</Typography>
                      <Typography sx={{ fontWeight: 600 }}>
                        B {billData.totalAmount.toFixed(2)}
                      </Typography>
                    </Box>
                    
                    {extraCharges.length > 0 && extraCharges.map(charge => (
                      <Box key={charge.id} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1, color: 'warning.main' }}>
                        <Typography>
                          {charge.description} {charge.isPercentage && `(${charge.amount}%)`}
                        </Typography>
                        <Typography sx={{ fontWeight: 600 }}>
                          +B {(charge.isPercentage 
                            ? (billData.totalAmount * charge.amount / 100)
                            : charge.amount
                          ).toFixed(2)}
                        </Typography>
                      </Box>
                    ))}
                    
                    {(discountPercent > 0 || discountAmount > 0) && (
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1, color: 'success.main' }}>
                        <Typography>
                          {t('billing.discount')} {discountPercent > 0 && `(${discountPercent}%)`}
                        </Typography>
                        <Typography sx={{ fontWeight: 600 }}>
                          -B {(discountPercent > 0 
                            ? (billData.totalAmount * discountPercent / 100)
                            : discountAmount
                          ).toFixed(2)}
                        </Typography>
                      </Box>
                    )}
                    
                    <Divider sx={{ my: 2 }} />
                    
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.dark' }}>
                        {t('billing.totalAmount')}
                      </Typography>
                      <Typography variant="h5" sx={{ fontWeight: 700, color: 'primary.dark' }}>
                        B {calculateFinalAmount().toFixed(2)}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              </Paper>
            </Grid>

            {/* Payment Section */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Paper elevation={3} sx={{ borderRadius: 3, position: { md: 'sticky' }, top: 20 }}>
                <Box sx={{ p: { xs: 2, md: 3 }, backgroundColor: 'primary.dark', color: 'white', borderRadius: '12px 12px 0 0' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                    <Typography variant="h6" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', color: 'white' }}>
                      <Payment sx={{ mr: 1, color: 'white' }} />
                      {t('billing.paymentDetails')}
                    </Typography>
                    <Button
                      variant="contained"
                      size="small"
                      startIcon={<CheckCircle />}
                      onClick={() => setConfirmDialog(true)}
                      disabled={
                        calculateFinalAmount() <= 0 ||
                        (paymentMethod === 'cash' && 
                        parseFloat(receivedAmount) < calculateFinalAmount())
                      }
                      sx={{ 
                        backgroundColor: 'white',
                        color: 'primary.dark',
                        borderRadius: 2, 
                        fontWeight: 600, 
                        textTransform: 'none',
                        boxShadow: 2,
                        '&:hover': { 
                          backgroundColor: 'grey.100',
                          boxShadow: 4 
                        },
                        '&:disabled': {
                          backgroundColor: 'grey.300',
                          color: 'grey.600'
                        }
                      }}
                    >
                      {t('billing.payAmount', { amount: calculateFinalAmount().toFixed(2) })}
                    </Button>
                  </Box>
                  
                  <Typography variant="body2" sx={{ color: 'white', opacity: 0.9 }}>
                    {t('billing.totalAmount')}: B {calculateFinalAmount().toFixed(2)}
                  </Typography>
                </Box>
                
                <Box sx={{ p: { xs: 2, md: 3 } }}>
                  {/* Payment Method */}
                  <FormControl component="fieldset" sx={{ mb: 2, width: '100%' }}>
                    <FormLabel component="legend" sx={{ fontWeight: 600, mb: 1 }}>
                      {t('billing.paymentMethod')}
                    </FormLabel>
                    <RadioGroup
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value as 'cash' | 'qr')}
                    >
                      <FormControlLabel 
                        value="cash" 
                        control={<Radio />} 
                        label={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Money /> {t('billing.cash')}
                          </Box>
                        }
                      />
                      <FormControlLabel 
                        value="qr" 
                        control={<Radio />} 
                        disabled
                        label={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.disabled' }}>
                            <QrCode2 /> {t('billing.qrPayment')}
                          </Box>
                        }
                      />
                    </RadioGroup>
                  </FormControl>

                  {/* Extra Charges */}
                  <Box>
                    <Box 
                      sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        p: 1,
                        borderRadius: 1,
                        '&:hover': { backgroundColor: 'grey.50' }
                      }}
                      onClick={() => setExtraChargesExpanded(!extraChargesExpanded)}
                    >
                      <Typography variant="body2" sx={{ fontWeight: 600, color: 'primary.dark' }}>
                        {t('billing.extraCharges')} {extraCharges.length > 0 && `(${extraCharges.length})`}
                      </Typography>
                      <IconButton size="small">
                        {extraChargesExpanded ? <ExpandLess /> : <ExpandMore />}
                      </IconButton>
                    </Box>
                    
                    <Collapse in={extraChargesExpanded}>
                      {/* Add New Charge */}
                      <Box sx={{ mb: 2, mt: 1 }}>
                        <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                          <Autocomplete
                            options={chargeOptions}
                            value={newChargeDescription}
                            onChange={(event, newValue) => {
                              setNewChargeDescription(newValue || '')
                            }}
                            onInputChange={(event, newInputValue) => {
                              setNewChargeDescription(newInputValue)
                            }}
                            freeSolo
                            fullWidth
                            size="small"
                            renderInput={(params) => (
                              <DarkTextField
                                {...params}
                                label={t('billing.description')}
                                placeholder={t('billing.selectOrType')}
                                sx={{ backgroundColor: 'white' }}
                              />
                            )}
                            sx={{
                              '& .MuiAutocomplete-popupIndicator': { color: 'primary.main' },
                              '& .MuiAutocomplete-clearIndicator': { color: 'primary.main' }
                            }}
                          />
                          <Button
                            variant="outlined"
                            size="small"
                            startIcon={<Add />}
                            onClick={addExtraCharge}
                            disabled={!newChargeDescription.trim() || newChargeAmount <= 0}
                            sx={{ 
                              whiteSpace: 'nowrap',
                              borderRadius: 1,
                              textTransform: 'none',
                              fontWeight: 500,
                              minWidth: 60
                            }}
                          >
                            {t('billing.add')}
                          </Button>
                        </Box>
                        
                        <Grid container spacing={{ xs: 1.5, md: 2 }}>
                          <Grid size={6}>
                            <DarkTextField
                              label={t('billing.percent')}
                              type="number"
                              value={newChargeIsPercentage ? newChargeAmount : ''}
                              onChange={(e) => {
                                const value = parseFloat(e.target.value) || 0
                                setNewChargeAmount(value)
                                setNewChargeIsPercentage(true)
                              }}
                              fullWidth
                              size="small"
                              inputProps={{ min: 0, max: 100, step: 0.1 }}
                              sx={{ backgroundColor: 'white' }}
                              onClick={() => setNewChargeIsPercentage(true)}
                            />
                          </Grid>
                          <Grid size={6}>
                            <DarkTextField
                              label={t('billing.amount')}
                              type="number"
                              value={!newChargeIsPercentage ? newChargeAmount : ''}
                              onChange={(e) => {
                                const value = parseFloat(e.target.value) || 0
                                setNewChargeAmount(value)
                                setNewChargeIsPercentage(false)
                              }}
                              fullWidth
                              size="small"
                              inputProps={{ min: 0, step: 0.01 }}
                              sx={{ backgroundColor: 'white' }}
                              onClick={() => setNewChargeIsPercentage(false)}
                            />
                          </Grid>
                        </Grid>
                      </Box>

                      {/* List of Extra Charges */}
                      {extraCharges.length > 0 && (
                        <Box sx={{ mb: 2 }}>
                          {extraCharges.map((charge) => (
                            <Box key={charge.id} sx={{ 
                              display: 'flex', 
                              justifyContent: 'space-between', 
                              alignItems: 'center',
                              p: 1.5,
                              backgroundColor: 'warning.50',
                              borderRadius: 1,
                              mb: 1,
                              border: '1px solid',
                              borderColor: 'warning.200'
                            }}>
                              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                {charge.description} {charge.isPercentage && `(${charge.amount}%)`}
                              </Typography>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography variant="body2" sx={{ fontWeight: 600, color: 'warning.dark' }}>
                                  +B {(charge.isPercentage 
                                    ? (billData.totalAmount * charge.amount / 100)
                                    : charge.amount
                                  ).toFixed(2)}
                                </Typography>
                                <Button
                                  size="small"
                                  onClick={() => removeExtraCharge(charge.id)}
                                  sx={{ 
                                    minWidth: 'auto',
                                    p: 0.5,
                                    color: 'error.main',
                                    '&:hover': { backgroundColor: 'error.50' }
                                  }}
                                >
                                  <Delete fontSize="small" />
                                </Button>
                              </Box>
                            </Box>
                          ))}
                          <Typography variant="body2" sx={{ 
                            textAlign: 'right', 
                            fontWeight: 600, 
                            color: 'warning.dark',
                            mt: 1,
                            backgroundColor: 'warning.100',
                            p: 1,
                            borderRadius: 1
                          }}>
                            {t('billing.totalExtraCharges')}: +B {extraCharges.reduce((total, charge) => {
                              if (charge.isPercentage) {
                                return total + (billData.totalAmount * charge.amount / 100)
                              }
                              return total + charge.amount
                            }, 0).toFixed(2)}
                          </Typography>
                        </Box>
                      )}
                    </Collapse>
                  </Box>

                  {/* Discount */}
                  <Box sx={{ mb: 2 }}>
                    <Box 
                      sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        p: 1,
                        borderRadius: 1,
                        '&:hover': { backgroundColor: 'grey.50' }
                      }}
                      onClick={() => setDiscountExpanded(!discountExpanded)}
                    >
                      <Typography variant="body2" sx={{ fontWeight: 600, color: 'primary.dark' }}>
                        {(discountPercent > 0 || discountAmount > 0) ? t('billing.discountApplied') : t('billing.discount')}
                      </Typography>
                      <IconButton size="small">
                        {discountExpanded ? <ExpandLess /> : <ExpandMore />}
                      </IconButton>
                    </Box>
                    
                    <Collapse in={discountExpanded}>
                      <Box sx={{ mt: 1 }}>
                        <Grid container spacing={{ xs: 1.5, md: 2 }}>
                          <Grid size={6}>
                            <DarkTextField
                              label={t('billing.percent')}
                              type="number"
                              value={discountPercent}
                              onChange={(e) => {
                                setDiscountPercent(parseFloat(e.target.value) || 0)
                                setDiscountAmount(0)
                              }}
                              fullWidth
                              size="small"
                              inputProps={{ min: 0, max: 100 }}
                              sx={{ backgroundColor: 'white' }}
                            />
                          </Grid>
                          <Grid size={6}>
                            <DarkTextField
                              label={t('billing.amount')}
                              type="number"
                              value={discountAmount}
                              onChange={(e) => {
                                setDiscountAmount(parseFloat(e.target.value) || 0)
                                setDiscountPercent(0)
                              }}
                              fullWidth
                              size="small"
                              inputProps={{ min: 0, max: billData.totalAmount + extraCharges.reduce((total, charge) => {
                                if (charge.isPercentage) {
                                  return total + (billData.totalAmount * charge.amount / 100)
                                }
                                return total + charge.amount
                              }, 0) }}
                              sx={{ backgroundColor: 'white' }}
                            />
                          </Grid>
                        </Grid>
                      </Box>
                    </Collapse>
                  </Box>

                  {/* Received Amount (for cash) */}
                  {paymentMethod === 'cash' && (
                    <Box sx={{ mb: 2 }}>
                      <Grid container spacing={2} alignItems="flex-start">
                        <Grid size={{ xs: 12, sm: 6 }}>
                          <DarkTextField
                            label={t('billing.receivedAmount')}
                            type="number"
                            value={receivedAmount}
                            onChange={(e) => setReceivedAmount(e.target.value)}
                            fullWidth
                            inputProps={{ min: 0, step: 0.01 }}
                            InputProps={{
                              startAdornment: <Typography sx={{ mr: 1, color: 'primary.dark', fontWeight: 600 }}>B</Typography>
                            }}
                            sx={{ backgroundColor: 'white' }}
                          />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                          {parseFloat(receivedAmount) > 0 && (
                            <Box sx={{ 
                              p: 2, 
                              backgroundColor: 'success.50', 
                              borderRadius: 2,
                              height: '56px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}>
                              <Typography variant="body1" sx={{ fontWeight: 600, color: 'success.dark' }}>
                                {t('billing.change')}: B {calculateChange().toFixed(2)}
                              </Typography>
                            </Box>
                          )}
                        </Grid>
                      </Grid>
                    </Box>
                  )}

                  {/* Notes */}
                  <DarkTextField
                    label={t('billing.notesOptional')}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    fullWidth
                    multiline
                    rows={2}
                    sx={{ mb: 2, backgroundColor: 'white' }}
                  />

                  {/* Action Buttons */}
                  <Button
                    variant="contained"
                    size="large"
                    startIcon={<CheckCircle />}
                    onClick={() => setConfirmDialog(true)}
                    disabled={
                      calculateFinalAmount() <= 0 ||
                      (paymentMethod === 'cash' && 
                      parseFloat(receivedAmount) < calculateFinalAmount())
                    }
                    sx={{ 
                      width: '100%',
                      borderRadius: 2, 
                      fontWeight: 600, 
                      textTransform: 'none',
                      py: 1.5,
                      boxShadow: 2,
                      '&:hover': { boxShadow: 4 }
                    }}
                  >
                    {t('billing.processPayment', { amount: calculateFinalAmount().toFixed(2) })}
                  </Button>
                </Box>
              </Paper>
            </Grid>
          </Grid>

          {/* Confirmation Dialog */}
          <Dialog 
            open={confirmDialog} 
            onClose={() => setConfirmDialog(false)} 
            maxWidth="sm" 
            fullWidth
            PaperProps={{
              sx: {
                mx: { xs: 2, sm: 3 },
                my: { xs: 2, sm: 4 }
              }
            }}
          >
            <DialogTitle sx={{ fontWeight: 700, px: { xs: 2, md: 3 } }}>
              {t('billing.confirmPayment')}
            </DialogTitle>
            <DialogContent sx={{ px: { xs: 2, md: 3 } }}>
              <List>
                <ListItem>
                  <ListItemText 
                    primary={t('billing.paymentMethod')}
                    secondary={paymentMethod.toUpperCase()}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText 
                    primary={t('billing.totalAmount')}
                    secondary={`B${calculateFinalAmount().toFixed(2)}`}
                  />
                </ListItem>
                {paymentMethod === 'cash' && (
                  <>
                    <ListItem>
                      <ListItemText 
                        primary={t('billing.received')}
                        secondary={`B${parseFloat(receivedAmount).toFixed(2)}`}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText 
                        primary={t('billing.change')}
                        secondary={`B${calculateChange().toFixed(2)}`}
                      />
                    </ListItem>
                  </>
                )}
              </List>
              
              <Alert severity="warning" sx={{ mt: 2 }}>
                {t('billing.paymentWarning')}
              </Alert>
            </DialogContent>
            <DialogActions sx={{ p: { xs: 2, md: 3 }, gap: 1, flexWrap: { xs: 'wrap', sm: 'nowrap' } }}>
              <Button 
                onClick={() => setConfirmDialog(false)}
                disabled={processing}
                sx={{
                  borderRadius: 2,
                  fontWeight: 600,
                  textTransform: 'none',
                  color: 'text.primary',
                  minWidth: { xs: '100px', md: 'auto' }
                }}
              >
                {t('billing.cancel')}
              </Button>
              <Button 
                onClick={handleProcessPayment}
                variant="contained"
                disabled={processing}
                sx={{
                  borderRadius: 2,
                  fontWeight: 600,
                  textTransform: 'none',
                  boxShadow: 2,
                  '&:hover': { boxShadow: 4 },
                  minWidth: { xs: '120px', md: 'auto' }
                }}
              >
                {processing ? <CircularProgress size={20} /> : t('billing.confirmPaymentAction')}
              </Button>
            </DialogActions>
          </Dialog>

        </Container>
        <Footer />
      </>
    )
  }

  // General billing view (existing functionality)
  const totalRevenue = orders.reduce((sum, order) => sum + parseFloat(order.totalAmount.toString()), 0)

  return (
    <>
      <Navbar 
        rightAction={<LanguageSwitcher />}
      />
      <Container maxWidth="xl" sx={{ py: { xs: 2, md: 4 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Box sx={{ display: 'flex', gap: 3 }}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h5" sx={{ fontWeight: 700, color: 'primary.main' }}>
                {orders.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t('billing.pendingBills')}
              </Typography>
            </Box>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h5" sx={{ fontWeight: 700, color: 'success.main' }}>
                B {totalRevenue.toFixed(2)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t('billing.totalRevenue')}
              </Typography>
            </Box>
          </Box>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={fetchOrders}
            sx={{
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 600,
              '&:hover': {
                backgroundColor: 'primary.50'
              }
            }}
          >
            {t('billing.refresh')}
          </Button>
        </Box>

        {/* General billing content would go here - simplified for now */}
        <Paper elevation={3} sx={{ borderRadius: 3, p: { xs: 2, md: 4 } }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, color: 'primary.dark' }}>
            <Receipt sx={{ mr: 1, verticalAlign: 'middle' }} />
            {t('billing.readyForPayment')} ({orders.length})
          </Typography>
          {orders.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: { xs: 3, md: 4 } }}>
              <Receipt sx={{ fontSize: '3rem', color: 'text.secondary', mb: 2 }} />
              <Typography variant="body2" color="text.secondary">
                {t('billing.noBillsPending')}
              </Typography>
            </Box>
          ) : (
            <Typography variant="body2" color="text.secondary">
              {t('billing.orderBillingFeatures')}
            </Typography>
          )}
        </Paper>

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
function LoadingFallback() {
  const { t } = useTranslation()
  return <div>{t('billing.loading')}</div>
}

export default function BillingPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <BillingPageContent />
    </Suspense>
  )
}