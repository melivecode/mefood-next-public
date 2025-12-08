'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import {
  Box,
  Container,
  Typography,
  Paper,
  Button,
  Divider,
  CircularProgress
} from '@mui/material'
import {
  CheckCircle,
  Print,
  ArrowBack,
  LocationOn,
  Phone,
  TableBar,
  ViewList
} from '@mui/icons-material'
import { Navbar } from '@/lib/components/Navbar'
import { Footer } from '@/lib/components/Footer'
import { useTranslation } from 'react-i18next'
import { LanguageSwitcher } from '@/lib/components/LanguageSwitcher'

interface PaymentItem {
  id: string
  menuItemName: string
  menuItemDescription: string | null
  categoryName: string
  quantity: number
  unitPrice: number
  totalPrice: number
  notes: string | null
  selections: any
}

interface Receipt {
  id: string
  paymentNumber: string
  customerName: string | null
  customerPhone: string | null
  tableNumber: string
  tableName: string | null
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
  restaurantName: string
  restaurantAddress: string | null
  restaurantPhone: string | null
  createdAt: string
  items: PaymentItem[]
  session?: {
    id: string
    status: string
    tableId: string | null
  }
}

function ReceiptPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session, status } = useSession()
  const paymentId = searchParams.get('paymentId')
  const fromBilling = searchParams.get('from') === 'billing'
  const { t } = useTranslation()
  
  const [receipt, setReceipt] = useState<Receipt | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'loading') return
    
    if (!session?.user?.id) {
      router.push('/auth/signin')
      return
    }

    if (!paymentId) {
      setError(t('receipt.invalidReceiptParams'))
      setLoading(false)
      return
    }

    fetchReceipt()
  }, [paymentId, session, status])

  const fetchReceipt = async () => {
    try {
      const response = await fetch(`/api/restaurant/payments/${paymentId}`)
      if (!response.ok) throw new Error('Failed to fetch receipt')
      
      const receiptData = await response.json()
      setReceipt(receiptData)
    } catch (err) {
      setError(t('receipt.failedToLoadReceipt'))
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number | string | null | undefined) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount
    return `B ${(numAmount || 0).toFixed(2)}`
  }

  const handlePrint = () => {
    window.print()
  }

  const handleBack = () => {
    if (fromBilling) {
      router.push('/restaurant/billing-history')
    } else {
      router.push('/restaurant/table')
    }
  }

  if (loading) {
    return (
      <>
        <Navbar />
        <Container maxWidth="sm" sx={{ py: 4, display: 'flex', justifyContent: 'center' }}>
          <CircularProgress />
        </Container>
        <Footer />
      </>
    )
  }

  if (error || !receipt) {
    return (
      <>
        <Navbar />
        <Container maxWidth="sm" sx={{ py: 4, textAlign: 'center' }}>
          <Typography variant="h6" color="error" sx={{ mb: 2 }}>
            {error || t('receipt.receiptNotFound')}
          </Typography>
          <Button variant="outlined" onClick={handleBack}>
            {t('receipt.backToAllTables')}
          </Button>
        </Container>
        <Footer />
      </>
    )
  }

  return (
    <>
      <style jsx global>{`
        @media print {
          @page {
            size: A4;
            margin: 15mm;
          }
          body * {
            visibility: hidden;
          }
          .print-area, .print-area * {
            visibility: visible;
          }
          .print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>
      
      <div className="no-print">
        <Navbar 
          leftAction={
            fromBilling ? (
              <Button
                color="inherit"
                startIcon={<ViewList />}
                onClick={() => router.push('/restaurant/billing-history')}
                sx={{ 
                  textTransform: 'none',
                  fontWeight: 500,
                  fontSize: { xs: '0.875rem', md: '1rem' }
                }}
              >
                {t('billingHistory.billingHistory')}
              </Button>
            ) : receipt.session?.tableId ? (
              <Button
                color="inherit"
                startIcon={<TableBar />}
onClick={() => router.push(`/restaurant/table/${receipt.session?.tableId}`)}
                sx={{ 
                  textTransform: 'none',
                  fontWeight: 500,
                  fontSize: { xs: '0.875rem', md: '1rem' }
                }}
              >
                {t('receipt.backToTable', { number: receipt.tableNumber, name: receipt.tableName ? ` (${receipt.tableName})` : '' })}
              </Button>
            ) : null
          }
          rightAction={<LanguageSwitcher />}
        />
      </div>
      
      <Container maxWidth="sm" sx={{ py: 4 }}>
        {/* Success Header - Hidden in Print */}
        <Box className="no-print" sx={{ textAlign: 'center', mb: 3 }}>
          <CheckCircle sx={{ fontSize: '3rem', color: 'success.main', mb: 1 }} />
          <Typography variant="h4" sx={{ fontWeight: 700, color: 'success.main' }}>
            {t('receipt.paymentSuccessful')}
          </Typography>
        </Box>

        {/* Action Buttons - Hidden in Print */}
        <Box className="no-print" sx={{ display: 'flex', gap: 2, mb: 3, justifyContent: 'center' }}>
          {fromBilling ? (
            <Button
              variant="outlined"
              startIcon={<ViewList />}
              onClick={() => router.push('/restaurant/billing-history')}
            >
              {t('billingHistory.billingHistory')}
            </Button>
          ) : receipt.session?.tableId ? (
            <Button
              variant="outlined"
              startIcon={<TableBar />}
onClick={() => router.push(`/restaurant/table/${receipt.session?.tableId}`)}
            >
              {t('receipt.backToTable', { number: receipt.tableNumber, name: receipt.tableName ? ` (${receipt.tableName})` : '' })}
            </Button>
          ) : (
            <Button
              variant="outlined"
              startIcon={<ArrowBack />}
              onClick={handleBack}
            >
              {t('receipt.backToAllTables')}
            </Button>
          )}
          <Button
            variant="contained"
            startIcon={<Print />}
            onClick={handlePrint}
          >
            {t('receipt.printReceipt')}
          </Button>
        </Box>

        {/* Receipt - This will be printed */}
        <Paper className="print-area" elevation={2} sx={{ p: 3, backgroundColor: 'white' }}>
          {/* Restaurant Info */}
          <Typography variant="h5" sx={{ fontWeight: 700, textAlign: 'center', mb: 1 }}>
            {receipt.restaurantName}
          </Typography>
          
          {/* Address and Phone on same line with icons */}
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mb: 2, flexWrap: 'wrap' }}>
            {receipt.restaurantAddress && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <LocationOn sx={{ fontSize: 16, color: 'text.secondary' }} />
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  {receipt.restaurantAddress}
                </Typography>
              </Box>
            )}
            {receipt.restaurantPhone && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Phone sx={{ fontSize: 16, color: 'text.secondary' }} />
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  {receipt.restaurantPhone}
                </Typography>
              </Box>
            )}
          </Box>
          
          {/* Receipt and Receipt ID on same line */}
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'baseline', gap: 1, mb: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              {t('receipt.receipt')}
            </Typography>
            <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
              #{receipt.paymentNumber}
            </Typography>
          </Box>
          
          <Divider sx={{ mb: 2 }} />
          
          {/* Customer and Table Info */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2">
              <strong>{t('receipt.table')}:</strong> {receipt.tableNumber}
            </Typography>
            <Typography variant="body2">
              <strong>{t('receipt.customer')}:</strong> {receipt.customerName || t('receipt.walkIn')}
            </Typography>
            <Typography variant="body2">
              <strong>{t('receipt.partySize')}:</strong> {receipt.partySize}
            </Typography>
            <Typography variant="body2">
              <strong>{t('receipt.date')}:</strong> {new Date(receipt.createdAt).toLocaleDateString('en-GB', {
                day: '2-digit',
                month: '2-digit', 
                year: 'numeric'
              })} {new Date(receipt.createdAt).toLocaleTimeString('en-GB', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false
              })}
            </Typography>
          </Box>
          
          <Divider sx={{ mb: 2 }} />
          
          {/* Menu Items */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
              {t('receipt.itemsOrdered')}:
            </Typography>
            {receipt.items.map((item, index) => {
              const selections = item.selections ? JSON.parse(item.selections) : null
              return (
                <Box key={index} sx={{ mb: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {item.quantity}x {item.menuItemName}
                      </Typography>
                      {selections && Object.keys(selections).length > 0 && (
                        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                          {Object.entries(selections).map(([key, value]: [string, any]) => 
                            `${key}: ${Array.isArray(value) ? value.join(', ') : value}`
                          ).join(' | ')}
                        </Typography>
                      )}
                      {item.notes && (
                        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', fontStyle: 'italic' }}>
                          {t('receipt.note')}: {item.notes}
                        </Typography>
                      )}
                    </Box>
                    <Typography variant="body2" sx={{ fontWeight: 500, ml: 1 }}>
                      {formatCurrency(item.totalPrice)}
                    </Typography>
                  </Box>
                </Box>
              )
            })}
          </Box>
          
          <Divider sx={{ mb: 2 }} />
          
          {/* Payment Summary */}
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography variant="body2">{t('receipt.subtotal')}:</Typography>
              <Typography variant="body2">{formatCurrency(receipt.subtotalAmount)}</Typography>
            </Box>
            
            {receipt.extraChargesAmount > 0 && (
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="body2">{t('receipt.extraCharges')}:</Typography>
                <Typography variant="body2">{formatCurrency(receipt.extraChargesAmount)}</Typography>
              </Box>
            )}
            
            {receipt.discountAmount > 0 && (
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="body2">{t('receipt.discount')}:</Typography>
                <Typography variant="body2" color="success.main">
                  -{formatCurrency(receipt.discountAmount)}
                </Typography>
              </Box>
            )}
            
            <Divider sx={{ my: 1 }} />
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
              <Typography variant="body1">{t('receipt.total')}:</Typography>
              <Typography variant="body1">{formatCurrency(receipt.finalAmount)}</Typography>
            </Box>
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
              <Typography variant="body2">{t('receipt.paymentMethod')}:</Typography>
              <Typography variant="body2">{receipt.paymentMethod}</Typography>
            </Box>
            
            {receipt.paymentMethod === 'CASH' && receipt.receivedAmount && (
              <>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2">{t('receipt.received')}:</Typography>
                  <Typography variant="body2">{formatCurrency(receipt.receivedAmount)}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2">{t('receipt.change')}:</Typography>
                  <Typography variant="body2">{formatCurrency(receipt.changeAmount || 0)}</Typography>
                </Box>
              </>
            )}
            
            <Box sx={{ textAlign: 'center', mt: 3, pt: 2, borderTop: 1, borderColor: 'divider' }}>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {t('receipt.thankYou')}
              </Typography>
            </Box>
          </Box>
        </Paper>
      </Container>
      
      <div className="no-print">
        <Footer />
      </div>
    </>
  )
}

function LoadingFallback() {
  const { t } = useTranslation()
  return <div>{t('receipt.loading')}</div>
}

export default function ReceiptPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <ReceiptPageContent />
    </Suspense>
  )
}