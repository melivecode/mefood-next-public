'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import {
  Box,
  Container,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  Button,
  TextField,
  Grid,
  Card,
  CardContent,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Snackbar,
  CircularProgress
} from '@mui/material'
import {
  Receipt,
  Search,
  FilterList,
  Visibility,
  OpenInNew,
  Download,
  TrendingUp,
  AttachMoney,
  LocalOffer,
  Assessment
} from '@mui/icons-material'
import { RestaurantNavbar } from '@/lib/components/RestaurantNavbar'
import { Footer } from '@/lib/components/Footer'
import { RestaurantHeader } from '@/lib/components/RestaurantHeader'
import { useTranslation } from 'react-i18next'

interface PaymentItem {
  id: string
  menuItemName: string
  quantity: number
  unitPrice: number
  totalPrice: number
}

interface Payment {
  id: string
  paymentNumber: string
  customerName: string | null
  customerPhone: string | null
  tableNumber: string
  partySize: number
  paymentMethod: string
  subtotalAmount: number
  discountAmount: number
  extraChargesAmount: number
  finalAmount: number
  receivedAmount: number | null
  changeAmount: number | null
  notes: string | null
  extraCharges: any
  checkInTime: string
  checkOutTime: string
  createdAt: string
  restaurantName?: string
  restaurantAddress?: string | null
  restaurantPhone?: string | null
  items: PaymentItem[]
}

interface PaymentSummary {
  totalPayments: number
  totalRevenue: number
  totalSubtotal: number
  totalDiscounts: number
  totalExtraCharges: number
}

interface PaginationData {
  currentPage: number
  totalPages: number
  totalCount: number
  hasNextPage: boolean
  hasPreviousPage: boolean
}

function BillingHistoryContent() {
  const { data: session, status } = useSession()
  const router = useRouter()
  // Simplified for one-user-one-restaurant system
  const { t } = useTranslation()

  // State
  const [payments, setPayments] = useState<Payment[]>([])
  const [summary, setSummary] = useState<PaymentSummary | null>(null)
  const [pagination, setPagination] = useState<PaginationData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Filters
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(20)
  const [searchTerm, setSearchTerm] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  
  // Dialog
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null)
  const [detailDialog, setDetailDialog] = useState(false)

  useEffect(() => {
    if (status === 'loading') return
    if (!session) router.push('/auth/signin')
    // All authenticated users can access this page
  }, [session, status, router])

  useEffect(() => {
    if (session?.user?.id) {
      fetchPayments()
    }
  }, [session?.user?.id, page, rowsPerPage, searchTerm, paymentMethod, startDate, endDate])

  const fetchPayments = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const params = new URLSearchParams({
        page: (page + 1).toString(),
        limit: rowsPerPage.toString()
      })
      
      if (searchTerm) params.append('search', searchTerm)
      if (paymentMethod !== 'all') params.append('paymentMethod', paymentMethod)
      if (startDate) params.append('startDate', startDate)
      if (endDate) params.append('endDate', endDate)

      const response = await fetch(`/api/restaurant/payments?${params}`)
      if (!response.ok) throw new Error('Failed to fetch payments')
      
      const data = await response.json()
      setPayments(data.payments)
      setSummary(data.summary)
      setPagination(data.pagination)
    } catch (err) {
      setError(t('billingHistory.failedToLoadHistory'))
    } finally {
      setLoading(false)
    }
  }

  const fetchPaymentDetails = async (paymentId: string) => {
    try {
      const response = await fetch(`/api/restaurant/payments/${paymentId}`)
      if (!response.ok) throw new Error('Failed to fetch payment details')
      
      const payment = await response.json()
      setSelectedPayment(payment)
      setDetailDialog(true)
    } catch (err) {
      setError(t('billingHistory.failedToLoadDetails'))
    }
  }

  const handlePageChange = (event: unknown, newPage: number) => {
    setPage(newPage)
  }

  const handleRowsPerPageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10))
    setPage(0)
  }

  const resetFilters = () => {
    setSearchTerm('')
    setPaymentMethod('all')
    setStartDate('')
    setEndDate('')
    setPage(0)
  }

  const formatCurrency = (amount: number | string | null | undefined) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount
    return `B ${(numAmount || 0).toFixed(2)}`
  }

  const getPaymentMethodColor = (method: string) => {
    switch (method) {
      case 'CASH': return 'success'
      case 'QR': return 'info'
      case 'CREDIT_CARD': return 'warning'
      case 'DEBIT_CARD': return 'secondary'
      default: return 'default'
    }
  }

  if (status === 'loading' || loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress size={40} />
      </Box>
    )
  }

  return (
    <>
      <RestaurantNavbar 
        backButton={{
          href: '/restaurant',
          label: t('billingHistory.backToRestaurant')
        }}
      />
      <Container maxWidth="xl" sx={{ py: { xs: 2, md: 4 } }}>
        {/* Header */}
        <RestaurantHeader 
          title={t('billingHistory.title')}
          sameLine={false}
          icon={<Receipt sx={{ fontSize: { xs: '1.4rem', sm: '1.5rem', md: '1.6rem' } }} />}
          mb={4}
        />

        {/* Summary Cards */}
        {summary && (
          <Grid container spacing={3} sx={{ mb: 4 }}>
<Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Assessment color="primary" />
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 700 }}>
                        {summary.totalPayments}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {t('billingHistory.totalPayments')}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
<Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <TrendingUp color="success" />
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 700 }}>
                        {formatCurrency(summary.totalRevenue)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {t('billingHistory.totalRevenue')}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
<Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <LocalOffer color="warning" />
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 700 }}>
                        {formatCurrency(summary.totalDiscounts)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {t('billingHistory.totalDiscounts')}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
<Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <AttachMoney color="info" />
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 700 }}>
                        {formatCurrency(summary.totalExtraCharges)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {t('billingHistory.extraCharges')}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

        {/* Filters */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <FilterList />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              {t('billingHistory.filters')}
            </Typography>
          </Box>
          
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 3 }}>
              <TextField
                fullWidth
                label={t('billingHistory.search')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={t('billingHistory.searchPlaceholder')}
                InputProps={{
                  startAdornment: <Search sx={{ color: 'text.secondary', mr: 1 }} />
                }}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 2 }}>
              <FormControl fullWidth>
                <InputLabel>{t('billingHistory.paymentMethod')}</InputLabel>
                <Select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  label={t('billingHistory.paymentMethod')}
                >
                  <MenuItem value="all">{t('billingHistory.allMethods')}</MenuItem>
                  <MenuItem value="cash">{t('billingHistory.cash')}</MenuItem>
                  <MenuItem value="qr">{t('billingHistory.qrPayment')}</MenuItem>
                  <MenuItem value="credit_card">{t('billingHistory.creditCard')}</MenuItem>
                  <MenuItem value="debit_card">{t('billingHistory.debitCard')}</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, md: 2 }}>
              <TextField
                fullWidth
                type="date"
                label={t('billingHistory.startDate')}
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 2 }}>
              <TextField
                fullWidth
                type="date"
                label={t('billingHistory.endDate')}
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button variant="outlined" onClick={resetFilters}>
                  {t('billingHistory.clearFilters')}
                </Button>
                <Button variant="contained" onClick={fetchPayments}>
                  {t('billingHistory.applyFilters')}
                </Button>
              </Box>
            </Grid>
          </Grid>
        </Paper>

        {/* Payments Table */}
        <Paper>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>{t('billingHistory.receiptNumber')}</TableCell>
                  <TableCell>{t('billingHistory.dateTime')}</TableCell>
                  <TableCell>{t('billingHistory.customer')}</TableCell>
                  <TableCell>{t('billingHistory.table')}</TableCell>
                  <TableCell>{t('billingHistory.paymentMethod')}</TableCell>
                  <TableCell align="right">{t('billingHistory.amount')}</TableCell>
                  <TableCell align="center">{t('billingHistory.actions')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {payments.map((payment) => (
                  <TableRow key={payment.id} hover>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600, fontFamily: 'monospace' }}>
                        {payment.paymentNumber}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {new Date(payment.createdAt).toLocaleString()}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {payment.customerName || t('billingHistory.walkIn')}
                      </Typography>
                      {payment.customerPhone && (
                        <Typography variant="caption" color="text.secondary">
                          {payment.customerPhone}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {payment.tableNumber} • {t('billingHistory.guests', { count: payment.partySize })}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={payment.paymentMethod}
                        color={getPaymentMethodColor(payment.paymentMethod) as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {formatCurrency(payment.finalAmount)}
                      </Typography>
                      {payment.discountAmount > 0 && (
                        <Typography variant="caption" color="text.secondary">
                          -{formatCurrency(payment.discountAmount)}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="center">
                      <IconButton
                        onClick={() => fetchPaymentDetails(payment.id)}
                        size="small"
                      >
                        <Visibility />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          
          {pagination && (
            <TablePagination
              component="div"
              count={pagination.totalCount}
              page={page}
              onPageChange={handlePageChange}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={handleRowsPerPageChange}
              rowsPerPageOptions={[10, 20, 50, 100]}
            />
          )}
        </Paper>

        {/* Payment Details Dialog */}
        <Dialog 
          open={detailDialog} 
          onClose={() => setDetailDialog(false)} 
          maxWidth="md" 
          fullWidth
        >
          <DialogTitle sx={{ fontWeight: 700 }}>
            {t('billingHistory.paymentDetails')}
          </DialogTitle>
          <DialogContent>
            {selectedPayment && (
              <Box>
                {/* Receipt Header */}
                <Box sx={{ textAlign: 'center', mb: 3 }}>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    {selectedPayment.restaurantName || t('billingHistory.restaurant')}
                  </Typography>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
                    {t('billingHistory.receipt')}: {selectedPayment.paymentNumber}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {new Date(selectedPayment.createdAt).toLocaleString()}
                  </Typography>
                </Box>

                <Divider sx={{ mb: 2 }} />

                {/* Customer & Table Info */}
                <Grid container spacing={2} sx={{ mb: 2 }}>
                  <Grid size={{ xs: 6 }}>
                    <Typography variant="body2">
                      <strong>{t('billingHistory.customer')}:</strong> {selectedPayment.customerName || t('billingHistory.walkIn')}
                    </Typography>
                    {selectedPayment.customerPhone && (
                      <Typography variant="body2">
                        <strong>{t('billingHistory.phone')}:</strong> {selectedPayment.customerPhone}
                      </Typography>
                    )}
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <Typography variant="body2">
                      <strong>{t('billingHistory.table')}:</strong> {selectedPayment.tableNumber}
                    </Typography>
                    <Typography variant="body2">
                      <strong>{t('billingHistory.partySize')}:</strong> {selectedPayment.partySize}
                    </Typography>
                  </Grid>
                </Grid>

                <Divider sx={{ mb: 2 }} />

                {/* Items */}
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                  {t('billingHistory.itemsOrdered')}:
                </Typography>
                {selectedPayment.items.map((item, index) => (
                  <Box key={index} sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="body2">
                      {item.quantity}x {item.menuItemName}
                    </Typography>
                    <Typography variant="body2">
                      {formatCurrency(item.totalPrice)}
                    </Typography>
                  </Box>
                ))}

                <Divider sx={{ my: 2 }} />

                {/* Payment Summary */}
                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="body2">{t('billingHistory.subtotal')}:</Typography>
                    <Typography variant="body2">{formatCurrency(selectedPayment.subtotalAmount)}</Typography>
                  </Box>
                  
                  {selectedPayment.extraChargesAmount > 0 && (
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="body2">{t('billingHistory.extraCharges')}:</Typography>
                      <Typography variant="body2">{formatCurrency(selectedPayment.extraChargesAmount)}</Typography>
                    </Box>
                  )}
                  
                  {selectedPayment.discountAmount > 0 && (
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="body2">{t('billingHistory.discount')}:</Typography>
                      <Typography variant="body2" color="success.main">
                        -{formatCurrency(selectedPayment.discountAmount)}
                      </Typography>
                    </Box>
                  )}
                  
                  <Divider sx={{ my: 1 }} />
                  
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                    <Typography variant="body1">{t('billingHistory.total')}:</Typography>
                    <Typography variant="body1">{formatCurrency(selectedPayment.finalAmount)}</Typography>
                  </Box>
                  
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                    <Typography variant="body2">{t('billingHistory.paymentMethod')}:</Typography>
                    <Typography variant="body2">{selectedPayment.paymentMethod}</Typography>
                  </Box>
                  
                  {selectedPayment.paymentMethod === 'CASH' && selectedPayment.receivedAmount && (
                    <>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2">{t('billingHistory.received')}:</Typography>
                        <Typography variant="body2">{formatCurrency(selectedPayment.receivedAmount)}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2">{t('billingHistory.change')}:</Typography>
                        <Typography variant="body2">{formatCurrency(selectedPayment.changeAmount || 0)}</Typography>
                      </Box>
                    </>
                  )}
                </Box>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDetailDialog(false)}>
              {t('billingHistory.close')}
            </Button>
            <Button 
              variant="outlined" 
              startIcon={<OpenInNew />}
              onClick={() => {
                if (selectedPayment) {
                  router.push(`/restaurant/receipt?paymentId=${selectedPayment.id}&restaurantId=${session?.user?.id}&from=billing`)
                }
              }}
            >
              {t('billingHistory.viewReceipt')}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Error Snackbar */}
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
  return <div>{t('billingHistory.loading')}</div>
}

export default function BillingHistoryPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <BillingHistoryContent />
    </Suspense>
  )
}