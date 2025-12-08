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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  IconButton,
  Alert,
  Snackbar,
  CircularProgress,
  MenuItem,
  ToggleButton,
  ToggleButtonGroup
} from '@mui/material'
import {
  DoorFront,
  Add,
  Person,
  Schedule,
  TableBar,
  Edit,
  CheckCircle,
  ViewModule,
  Map,
  Restaurant,
  Receipt,
  ExitToApp,
  Delete
} from '@mui/icons-material'
import { RestaurantNavbar } from '@/lib/components/RestaurantNavbar'
import { PageTitle } from '@/lib/components/PageTitle'
import { DarkTextField } from '@/lib/components/DarkTextField'
import { DarkSelect } from '@/lib/components/DarkSelect'
import { FloorPlan } from '@/lib/components/FloorPlan'
import { Footer } from '@/lib/components/Footer'
import { RestaurantHeader } from '@/lib/components/RestaurantHeader'
import { useTranslation } from 'react-i18next'

interface CustomerSession {
  id: string
  customerName: string | null
  customerPhone: string | null
  customerEmail: string | null
  partySize: number
  status: string
  tableId: string | null
  table: {
    id: string
    number: string
    name: string | null
  } | null
  checkInTime: string
  seatedTime: string | null
  notes: string | null
}

interface Table {
  id: string
  number: string
  name: string | null
  capacity: number
  isActive: boolean
  sortOrder: number
  gridX: number
  gridY: number
  gridWidth: number
  gridHeight: number
}

export default function CustomerCheckInPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  // Simplified for one-user-one-restaurant system
  const { t } = useTranslation()

  const [sessions, setSessions] = useState<CustomerSession[]>([])
  const [tables, setTables] = useState<Table[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Dialog states
  const [checkInDialog, setCheckInDialog] = useState(false)
  const [seatDialog, setSeatDialog] = useState(false)
  const [checkoutDialog, setCheckoutDialog] = useState(false)
  const [removeCustomerDialog, setRemoveCustomerDialog] = useState(false)
  const [selectedSession, setSelectedSession] = useState<CustomerSession | null>(null)
  const [sessionToCheckout, setSessionToCheckout] = useState<{ tableId: string; sessionId: string; customerName?: string; tableName?: string } | null>(null)
  const [customerToRemove, setCustomerToRemove] = useState<{ sessionId: string; customerName: string } | null>(null)

  // Form states
  const [checkInForm, setCheckInForm] = useState({
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    partySize: 2,
    notes: ''
  })

  const [seatForm, setSeatForm] = useState({
    tableId: ''
  })
  const [viewMode, setViewMode] = useState<'grid' | 'floor'>('grid')
  const [selectedTableFromFloor, setSelectedTableFromFloor] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'loading') return
    if (!session) router.push('/auth/signin')
    // All authenticated users can access this page
  }, [session, status, router])

  useEffect(() => {
    if (session?.user?.id) {
      fetchData()
    }
  }, [session?.user?.id])

  const fetchData = async () => {
    try {
      const [sessionsRes, tablesRes] = await Promise.all([
        fetch(`/api/restaurant/sessions`),
        fetch(`/api/restaurant/tables`)
      ])

      if (sessionsRes.ok && tablesRes.ok) {
        const [sessionsData, tablesData] = await Promise.all([
          sessionsRes.json(),
          tablesRes.json()
        ])
        setSessions(sessionsData)
        setTables(tablesData.filter((t: Table) => t.isActive))
      }
    } catch (err) {
      setError(t('table.errors.failedToLoadData'))
    } finally {
      setLoading(false)
    }
  }

  const handleCheckIn = async () => {
    try {
      const response = await fetch(`/api/restaurant/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(checkInForm)
      })

      if (response.ok) {
        const newSession = await response.json()
        setSessions([newSession, ...sessions])
        setSuccess(t('table.success.customerCheckedIn'))
        setCheckInDialog(false)
        setCheckInForm({
          customerName: '',
          customerPhone: '',
          customerEmail: '',
          partySize: 2,
          notes: ''
        })
      }
    } catch (err) {
      setError(t('table.errors.failedToCheckIn'))
    }
  }

  const handleTableSelectFromFloor = (tableId: string) => {
    setSelectedTableFromFloor(tableId)
    setSeatForm({ tableId })
  }

  const handleTableClick = async (tableId: string) => {
    const table = tables.find(t => t.id === tableId)
    if (!table) return

    // Check if table is occupied
    const isOccupied = seatedSessions.some(s => s.tableId === tableId)
    
    if (isOccupied) {
      // Navigate to ordering page for occupied table
      router.push(`/restaurant/table/${tableId}`)
      return
    }

    // Handle seating for unoccupied table
    if (!selectedSession) {
      setError(t('table.errors.selectCustomerFirst'))
      return
    }

    try {
      const response = await fetch(`/api/restaurant/sessions/${selectedSession.id}/seat`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tableId })
      })

      if (response.ok) {
        const updatedSession = await response.json()
        setSessions(sessions.map(s => s.id === selectedSession.id ? updatedSession : s))
        
        // Show appropriate success message with capacity warning if needed
        const capacityMessage = table.capacity < selectedSession.partySize 
          ? ` (${t('table.capacityExceeded', { partySize: selectedSession.partySize, capacity: table.capacity })})`
          : ''
        setSuccess(`${selectedSession.customerName || t('table.customer')} ${t('table.success.seatedAtTable', { tableNumber: table.number })}${capacityMessage}`)
        
        setSelectedSession(null)
        setSelectedTableFromFloor(null)
        setSeatForm({ tableId: '' })
        fetchData() // Refresh data
      }
    } catch (err) {
      setError(t('table.errors.failedToSeat'))
    }
  }

  const handleSeatCustomer = async () => {
    if (!selectedSession) return

    const tableId = seatForm.tableId || selectedTableFromFloor
    if (!tableId) {
      setError(t('table.errors.selectTable'))
      return
    }

    const table = tables.find(t => t.id === tableId)
    if (!table) return

    try {
      const response = await fetch(`/api/restaurant/sessions/${selectedSession.id}/seat`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tableId })
      })

      if (response.ok) {
        const updatedSession = await response.json()
        setSessions(sessions.map(s => s.id === selectedSession.id ? updatedSession : s))
        
        // Show appropriate success message with capacity warning if needed
        const capacityMessage = table.capacity < selectedSession.partySize 
          ? ` (${t('table.capacityExceeded', { partySize: selectedSession.partySize, capacity: table.capacity })})`
          : ''
        setSuccess(`${t('table.success.customerSeated')}${capacityMessage}`)
        
        setSeatDialog(false)
        setSelectedSession(null)
        setSeatForm({ tableId: '' })
        setSelectedTableFromFloor(null)
      }
    } catch (err) {
      setError(t('table.errors.failedToSeat'))
    }
  }

  const handleCheckout = (tableId: string, sessionId: string) => {
    const session = sessions.find(s => s.id === sessionId)
    const table = tables.find(t => t.id === tableId)
    setSessionToCheckout({ 
      tableId, 
      sessionId, 
      customerName: session?.customerName || t('table.guestFallback'),
      tableName: table?.name || t('table.tableNameFallback', { number: table?.number })
    })
    setCheckoutDialog(true)
  }

  const confirmCheckout = async () => {
    if (!sessionToCheckout) return

    try {
      const response = await fetch(`/api/restaurant/sessions/${sessionToCheckout.sessionId}/checkout`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' }
      })

      if (response.ok) {
        // Remove the session from the list since it's completed
        setSessions(sessions.filter(s => s.id !== sessionToCheckout.sessionId))
        setSuccess(t('table.success.customerCheckedOut', { customerName: sessionToCheckout.customerName }))
        setCheckoutDialog(false)
        setSessionToCheckout(null)
        fetchData() // Refresh data
      } else {
        setError(t('table.failedToCheckoutError'))
      }
    } catch (err) {
      setError(t('table.failedToCheckoutError'))
    }
  }

  const handleRemoveWaitingCustomer = (sessionId: string, customerName: string) => {
    setCustomerToRemove({ sessionId, customerName })
    setRemoveCustomerDialog(true)
  }

  const confirmRemoveCustomer = async () => {
    if (!customerToRemove) return

    try {
      const response = await fetch(`/api/restaurant/sessions/${customerToRemove.sessionId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        // Remove the session from the list
        setSessions(sessions.filter(s => s.id !== customerToRemove.sessionId))
        setSuccess(t('table.success.customerRemoved', { customerName: customerToRemove.customerName }))
        setRemoveCustomerDialog(false)
        setCustomerToRemove(null)
        
        // Clear selection if removed customer was selected
        if (selectedSession?.id === customerToRemove.sessionId) {
          setSelectedSession(null)
        }
        
        fetchData() // Refresh data
      } else {
        setError(t('table.failedToRemoveError'))
      }
    } catch (err) {
      setError(t('table.failedToRemoveError'))
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'WAITING': return 'warning'
      case 'SEATED': return 'success'
      case 'ORDERING': return 'info'
      case 'ORDERED': return 'primary'
      case 'DINING': return 'secondary'
      case 'BILLING': return 'error'
      case 'COMPLETED': return 'default'
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

  const waitingSessions = sessions
    .filter(s => s.status === 'WAITING')
    .sort((a, b) => new Date(a.checkInTime).getTime() - new Date(b.checkInTime).getTime()) // Sort by oldest to latest
  const seatedSessions = sessions.filter(s => ['SEATED', 'ORDERING', 'ORDERED', 'DINING', 'BILLING'].includes(s.status))
  const availableTables = tables.filter(t => !seatedSessions.some(s => s.tableId === t.id))

  return (
    <>
      <RestaurantNavbar 
        backButton={{
          href: '/restaurant',
          label: t('tables.backToRestaurant')
        }}
      />
      <Container maxWidth="xl" sx={{ py: { xs: 2, md: 4 } }}>

        {/* Combined Waiting List and Floor Plan */}
        <Paper elevation={3} sx={{ borderRadius: 3, overflow: 'hidden' }}>
          <Box sx={{ p: { xs: 2, md: 3 }, backgroundColor: 'primary.50', borderBottom: 1, borderColor: 'divider' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: { xs: 'wrap', md: 'nowrap' }, gap: 2 }}>
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                  <TableBar sx={{ fontSize: { xs: '1.25rem', sm: '1.375rem', md: '1.5rem' }, color: 'primary.dark' }} />
                  <RestaurantHeader 
                    showRestaurantName={true}
                    title={t('table.tableManagement')}
                    restaurantNameVariant="h5"
                    titleVariant="h5"
                    sameLine={false}
                    mb={0}
                  />
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ ml: { xs: 0, sm: 4 }, mt: 0.5, fontSize: { xs: '0.875rem', sm: '0.9rem', md: '1rem' } }}>
                  {t('table.waitingList')} ({waitingSessions.length}) • {t('table.occupied')} ({seatedSessions.length})
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: { xs: 'wrap', md: 'nowrap' } }}>
                <ToggleButtonGroup
                  value={viewMode}
                  exclusive
                  onChange={(_, newView) => newView && setViewMode(newView)}
                  size="small"
                  sx={{ height: 32 }}
                >
                  <ToggleButton value="grid" sx={{ px: 2, fontWeight: 600, fontSize: { xs: '0.9rem', sm: '1rem' } }}>
                    <ViewModule sx={{ mr: 1, fontSize: { xs: 20, sm: 22 } }} />
                    {t('table.gridView')}
                  </ToggleButton>
                  <ToggleButton value="floor" sx={{ px: 2, fontWeight: 600, fontSize: { xs: '0.9rem', sm: '1rem' } }}>
                    <Map sx={{ mr: 1, fontSize: { xs: 20, sm: 22 } }} />
                    {t('table.floorPlan')}
                  </ToggleButton>
                </ToggleButtonGroup>
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={() => setCheckInDialog(true)}
                  sx={{ 
                    borderRadius: 2, 
                    fontWeight: 600, 
                    textTransform: 'none',
                    minWidth: { xs: '140px', md: 'auto' },
                    fontSize: { xs: '1rem', sm: '1.1rem', md: '1.1rem' },
                    py: { xs: 1, sm: 1.2 }
                  }}
                >
                  {t('table.checkInCustomer')}
                </Button>
              </Box>
            </Box>

            {/* Waiting Customers List */}
            {waitingSessions.length > 0 && (
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'warning.dark', fontSize: { xs: '1rem', md: '1.1rem' }, mb: 2 }}>
                  <Schedule sx={{ mr: 1, verticalAlign: 'middle', fontSize: 20 }} />
                  {t('table.waitingCustomersInstruction')}
                </Typography>
                <Grid container spacing={2}>
                  {waitingSessions.map((session) => (
                    <Grid size={{ xs: 12, sm: 6, md: 4, lg: 4, xl: 3 }} key={session.id}>
                      <Card 
                        elevation={2} 
                        sx={{ 
                          '&:hover': { boxShadow: 4 },
                          border: selectedSession?.id === session.id ? '2px solid' : '1px solid',
                          borderColor: selectedSession?.id === session.id ? 'warning.main' : '#e0e0e0',
                          backgroundColor: selectedSession?.id === session.id ? 'warning.50' : 'white',
                          borderRadius: 2
                        }}
                      >
                        <CardContent sx={{ p: { xs: 2, md: 2.5 }, m: 0.5 }}>
                          <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <Typography variant="body1" sx={{ fontWeight: 600, fontSize: { xs: '1rem', sm: '1.1rem', md: '1rem' }, flex: 1 }}>
                                {session.customerName || t('table.walkInCustomer')}
                              </Typography>
                              <IconButton
                                size="small"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleRemoveWaitingCustomer(session.id, session.customerName || t('table.walkInFallback'))
                                }}
                                sx={{ 
                                  color: 'error.main',
                                  '&:hover': { backgroundColor: 'error.50' },
                                  ml: 1
                                }}
                              >
                                <Delete fontSize="small" />
                              </IconButton>
                            </Box>
                            <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.9rem', sm: '0.95rem', md: '0.875rem' }, mb: 0.5 }}>
                              {t('table.partyOf', { size: session.partySize })} • {new Date(session.checkInTime).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </Typography>
                            {session.customerPhone && (
                              <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.85rem', sm: '0.9rem', md: '0.8rem' } }}>
                                📞 {session.customerPhone}
                              </Typography>
                            )}
                            {session.notes && (
                              <Typography variant="caption" color="text.secondary" sx={{ 
                                fontSize: { xs: '0.85rem', sm: '0.9rem', md: '0.8rem' },
                                fontStyle: 'italic',
                                backgroundColor: 'grey.100',
                                p: 0.5,
                                borderRadius: 1,
                                mt: 0.5
                              }}>
                                💬 {session.notes}
                              </Typography>
                            )}
                            <Button
                              variant={selectedSession?.id === session.id ? "contained" : "outlined"}
                              size="small"
                              startIcon={<Person />}
                              onClick={() => {
                                setSelectedSession(session)
                                setSelectedTableFromFloor(null)
                                setSeatForm({ tableId: '' })
                              }}
                              sx={{ 
                                width: '100%',
                                borderRadius: 2, 
                                textTransform: 'none',
                                fontWeight: 600,
                                fontSize: { xs: '0.9rem', sm: '0.95rem', md: '0.875rem' },
                                py: { xs: 0.5, md: 1 }
                              }}
                            >
                              {selectedSession?.id === session.id ? t('table.selected') : t('table.selectToSeat')}
                            </Button>
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            )}

            {/* Instructions */}
            <Box>
              <Typography variant="body1" color="text.secondary" sx={{ fontStyle: 'italic', fontSize: { xs: '1rem', sm: '1.1rem', md: '1rem' }, lineHeight: 1.4 }}>
                {selectedSession 
                  ? t('table.selectedCustomerInstruction', { customerName: selectedSession.customerName || t('table.walkInCustomer'), partySize: selectedSession.partySize })
                  : waitingSessions.length > 0 
                    ? ''
                    : seatedSessions.length > 0
                      ? t('table.addNewCustomersInstruction')
                      : t('table.noCustomersWaiting')
                }
              </Typography>
            </Box>
          </Box>

          <Box sx={{ p: { xs: 2, md: 3 } }}>
            {tables.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: { xs: 3, md: 4 } }}>
                <TableBar sx={{ fontSize: { xs: '2.5rem', md: '3rem' }, color: 'text.secondary' }} />
                <Typography variant="body2" color="text.secondary">
                  {t('table.noTablesConfigured')}
                </Typography>
              </Box>
            ) : viewMode === 'grid' ? (
              // Grid View
              <Grid container spacing={{ xs: 1, sm: 2, md: 2 }}>
                {tables.map(table => {
                  const session = seatedSessions.find(s => s.tableId === table.id)
                  const isOccupied = !!session
                  const isAvailableForSelected = selectedSession 
                    ? table.isActive && !session
                    : false
                  const isCapacityExceeded = selectedSession && table.capacity < selectedSession.partySize
                  const canBeClicked = isOccupied || isAvailableForSelected || (!selectedSession && table.isActive)
                  
                  return (
                    <Grid size={{ xs: 12, sm: 4, md: 4, lg: 4, xl: 3 }} key={table.id}>
                      <Card 
                        sx={{ 
                          height: { xs: 200, sm: 260, md: 260, lg: 200 },
                          border: 2,
                          borderColor: isAvailableForSelected && isCapacityExceeded ? 'warning.main' :
                                     isAvailableForSelected ? 'success.main' : 
                                     isOccupied ? 'error.main' : 
                                     table.isActive ? 'primary.main' : 'grey.300',
                          backgroundColor: isAvailableForSelected && isCapacityExceeded ? 'warning.50' :
                                          isAvailableForSelected ? 'success.50' : 
                                          isOccupied ? 'error.50' : 
                                          table.isActive ? 'primary.50' : 'grey.100',
                          transition: 'all 0.2s ease-in-out',
                          opacity: !table.isActive ? 0.6 : 1,
                          display: 'flex',
                          flexDirection: 'column'
                        }}
                      >
                        <CardContent 
                          sx={{ 
                            flex: 1,
                            display: 'flex', 
                            flexDirection: 'column', 
                            justifyContent: 'center', 
                            alignItems: 'center',
                            textAlign: 'center',
                            p: 2,
                            cursor: (canBeClicked && !isOccupied) ? 'pointer' : 'default',
                            '&:hover': (canBeClicked && !isOccupied) ? {
                              backgroundColor: 'rgba(0,0,0,0.05)'
                            } : {}
                          }}
                          onClick={() => (canBeClicked && !isOccupied) && handleTableClick(table.id)}
                        >
                          {/* Table Icon and Name Row */}
                          <Box sx={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: 1.5
                          }}>
                            <TableBar sx={{ 
                              fontSize: { xs: 36, sm: 40, md: 32 }, 
                              color: isAvailableForSelected && isCapacityExceeded ? 'warning.main' :
                                     isAvailableForSelected ? 'success.main' : 
                                     isOccupied ? 'error.main' : 
                                     table.isActive ? 'primary.main' : 'grey.500'
                            }} />
                            <Typography variant="h6" sx={{ 
                              fontWeight: 600, 
                              fontSize: { xs: '1.3rem', sm: '1.4rem', md: '1.25rem' },
                              lineHeight: 1
                            }}>
                              {table.number}{table.name ? ` - ${table.name}` : ''}
                            </Typography>
                          </Box>
                          <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '1.05rem', sm: '1.1rem', md: '0.95rem' } }}>
                            {t('table.capacity')}: {table.capacity}
                          </Typography>
                          {isOccupied && session ? (
                            <>
                              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5, width: '100%' }}>
                                <Typography variant="body2" sx={{ 
                                  fontWeight: 600,
                                  fontSize: { xs: '0.8rem', sm: '0.85rem', md: '0.8rem' },
                                  color: 'error.dark',
                                  textAlign: 'center',
                                  lineHeight: 1.3
                                }}>
                                  {session.customerName || t('table.guest')} ({session.partySize})
                                  {session.customerPhone && ` • 📞 ${session.customerPhone}`}
                                </Typography>
                                <Chip 
                                  label={session.status} 
                                  size="small"
                                  color={getStatusColor(session.status) as any}
                                  sx={{ 
                                    fontSize: { xs: '0.7rem', sm: '0.75rem', md: '0.7rem' }, 
                                    height: { xs: 20, sm: 22, md: 20 },
                                    fontWeight: 600
                                  }}
                                />
                                {session.notes && (
                                  <Typography variant="caption" color="text.secondary" sx={{ 
                                    fontSize: { xs: '0.7rem', sm: '0.75rem', md: '0.7rem' },
                                    fontStyle: 'italic',
                                    backgroundColor: 'grey.100',
                                    p: { xs: 0.3, sm: 0.4, md: 0.3 },
                                    borderRadius: 0.5,
                                    maxWidth: '95%',
                                    textAlign: 'center',
                                    lineHeight: 1.2
                                  }}>
                                    💬 {session.notes}
                                  </Typography>
                                )}
                              </Box>
                            </>
                          ) : isAvailableForSelected && isCapacityExceeded ? (
                            <Chip 
                              label={t('table.capacityExceededLabel', { partySize: selectedSession.partySize, capacity: table.capacity })}
                              size="small"
                              color="warning"
                              sx={{ fontSize: { xs: '0.85rem', sm: '0.9rem', md: '0.75rem' }, height: { xs: 28, sm: 30, md: 24 } }}
                            />
                          ) : isAvailableForSelected ? (
                            <Chip 
                              label={t('table.available')}
                              size="small"
                              color="success"
                              sx={{ fontSize: { xs: '0.9rem', sm: '0.95rem', md: '0.8rem' }, height: { xs: 28, sm: 30, md: 24 } }}
                            />
                          ) : !table.isActive ? (
                            <Chip 
                              label={t('table.inactive')}
                              size="small"
                              sx={{ fontSize: { xs: '0.9rem', sm: '0.95rem', md: '0.8rem' }, height: { xs: 28, sm: 30, md: 24 } }}
                            />
                          ) : (
                            <Chip 
                              label={t('table.empty')}
                              size="small"
                              color="primary"
                              variant="outlined"
                              sx={{ fontSize: { xs: '0.9rem', sm: '0.95rem', md: '0.8rem' }, height: { xs: 28, sm: 30, md: 24 } }}
                            />
                          )}
                        </CardContent>
                        
                        {/* Action Buttons for Occupied Tables */}
                        {isOccupied && session ? (
                          <Box sx={{ 
                            p: 1, 
                            pt: 0, 
                            display: 'flex', 
                            flexDirection: { xs: 'row', sm: 'column', md: 'column', lg: 'row' },
                            gap: { xs: 0.5, sm: 0.3, md: 0.3, lg: 0.5 },
                            justifyContent: 'center',
                            alignItems: 'center'
                          }}>
                            <Button
                              size="small"
                              variant="contained"
                              startIcon={<Restaurant sx={{ fontSize: { xs: 18, sm: 16, md: 16, lg: 16 } }} />}
                              onClick={(e) => {
                                e.stopPropagation()
                                router.push(`/restaurant/table/${table.id}`)
                              }}
                              sx={{ 
                                minWidth: { xs: 'auto', sm: '90%', md: '90%', lg: 'auto' },
                                px: { xs: 1.5, sm: 1, md: 1, lg: 1.5 },
                                fontSize: { xs: '0.9rem', sm: '0.8rem', md: '0.8rem', lg: '0.85rem' },
                                height: { xs: 36, sm: 28, md: 28, lg: 32 },
                                color: 'black',
                                backgroundColor: 'primary.main',
                                '&:hover': {
                                  backgroundColor: 'primary.dark',
                                  color: 'white'
                                }
                              }}
                            >
                              {t('table.order')}
                            </Button>
                            <Button
                              size="small"
                              variant="contained"
                              startIcon={<Receipt sx={{ fontSize: { xs: 18, sm: 16, md: 16, lg: 16 } }} />}
                              onClick={(e) => {
                                e.stopPropagation()
                                router.push(`/restaurant/billing?tableId=${table.id}`)
                              }}
                              sx={{ 
                                minWidth: { xs: 'auto', sm: '90%', md: '90%', lg: 'auto' },
                                px: { xs: 1.5, sm: 1, md: 1, lg: 1.5 },
                                fontSize: { xs: '0.9rem', sm: '0.8rem', md: '0.8rem', lg: '0.85rem' },
                                height: { xs: 36, sm: 28, md: 28, lg: 32 },
                                color: 'black',
                                backgroundColor: 'warning.light',
                                '&:hover': {
                                  backgroundColor: 'warning.main',
                                  color: 'black'
                                }
                              }}
                            >
                              {t('table.bill')}
                            </Button>
                            <Button
                              size="small"
                              variant="contained"
                              startIcon={<ExitToApp sx={{ fontSize: { xs: 18, sm: 16, md: 16, lg: 16 } }} />}
                              onClick={(e) => {
                                e.stopPropagation()
                                handleCheckout(table.id, session.id)
                              }}
                              sx={{ 
                                minWidth: { xs: 'auto', sm: '90%', md: '90%', lg: 'auto' },
                                px: { xs: 1.5, sm: 1, md: 1, lg: 1.5 },
                                fontSize: { xs: '0.9rem', sm: '0.8rem', md: '0.8rem', lg: '0.85rem' },
                                height: { xs: 36, sm: 28, md: 28, lg: 32 },
                                color: 'white',
                                backgroundColor: 'success.dark',
                                '&:hover': {
                                  backgroundColor: '#1B5E20'
                                }
                              }}
                            >
                              {t('table.checkOut')}
                            </Button>
                          </Box>
                        ) : (
                          /* Placeholder for empty tables */
                          <Box sx={{ 
                            p: 1, 
                            pt: 0, 
                            display: 'flex', 
                            gap: 0.5,
                            justifyContent: 'center',
                            minHeight: 40,
                            alignItems: 'center'
                          }}>
                            {isAvailableForSelected && isCapacityExceeded ? (
                              <Typography variant="caption" sx={{ 
                                color: 'warning.main', 
                                fontWeight: 600,
                                fontSize: { xs: '0.85rem', sm: '0.9rem', md: '0.8rem' }
                              }}>
                                {t('table.clickToSeatExceeds')}
                              </Typography>
                            ) : isAvailableForSelected ? (
                              <Typography variant="caption" sx={{ 
                                color: 'success.main', 
                                fontWeight: 600,
                                fontSize: { xs: '0.85rem', sm: '0.9rem', md: '0.8rem' }
                              }}>
                                {t('table.clickToSeatCustomer')}
                              </Typography>
                            ) : table.isActive ? (
                              <Typography variant="caption" sx={{ 
                                color: 'text.secondary', 
                                fontStyle: 'italic',
                                fontSize: { xs: '0.85rem', sm: '0.9rem', md: '0.8rem' }
                              }}>
                                {t('table.readyForCustomers')}
                              </Typography>
                            ) : (
                              <Typography variant="caption" sx={{ 
                                color: 'text.disabled', 
                                fontStyle: 'italic',
                                fontSize: { xs: '0.85rem', sm: '0.9rem', md: '0.8rem' }
                              }}>
                                {t('table.tableInactive')}
                              </Typography>
                            )}
                          </Box>
                        )}
                      </Card>
                    </Grid>
                  )
                })}
              </Grid>
            ) : (
              <FloorPlan 
                tables={tables.map(table => {
                  const session = seatedSessions.find(s => s.tableId === table.id)
                  const isAvailableForSelected = selectedSession 
                    ? table.isActive && !session
                    : false
                  const isCapacityExceeded = selectedSession && table.capacity < selectedSession.partySize
                  
                  return {
                    ...table,
                    session: session || null,
                    isOccupied: !!session,
                    isAvailableForSeating: isAvailableForSelected,
                    isCapacityExceeded: isCapacityExceeded
                  }
                })}
                editable={false}
                showOccupancyStatus={true}
                showSeatingMode={!!selectedSession}
                occupiedSessions={seatedSessions}
                selectedCustomer={selectedSession}
                onTableClick={handleTableClick}
                selectedTableId={selectedTableFromFloor}
                onOrderClick={(tableId) => router.push(`/restaurant/table/${tableId}`)}
                onBillClick={(tableId) => router.push(`/restaurant/billing?tableId=${tableId}`)}
                onCheckoutClick={handleCheckout}
              />
            )}
          </Box>
        </Paper>

        {/* Check-In Dialog */}
        <Dialog 
          open={checkInDialog} 
          onClose={() => setCheckInDialog(false)} 
          maxWidth="sm" 
          fullWidth
          PaperProps={{
            sx: { 
              mx: { xs: 2, sm: 3 },
              my: { xs: 2, sm: 4 },
              maxHeight: { xs: '90vh', md: '80vh' }
            }
          }}
        >
          <DialogTitle sx={{ fontWeight: 700, fontSize: { xs: '1.1rem', md: '1.25rem' }, pb: { xs: 1, md: 2 } }}>
            <DoorFront sx={{ mr: 1, verticalAlign: 'middle' }} />
            {t('table.checkInCustomer')}
          </DialogTitle>
          <DialogContent sx={{ px: { xs: 2, md: 3 } }}>
            <Grid container spacing={{ xs: 2, md: 3 }} sx={{ mt: 1 }}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <DarkTextField
                  label={t('table.customerName')}
                  value={checkInForm.customerName}
                  onChange={(e) => setCheckInForm({ ...checkInForm, customerName: e.target.value })}
                  fullWidth
                  placeholder={t('table.optional')}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <DarkTextField
                  label={t('table.partySize')}
                  type="number"
                  value={checkInForm.partySize}
                  onChange={(e) => setCheckInForm({ ...checkInForm, partySize: parseInt(e.target.value) || 1 })}
                  fullWidth
                  required
                  inputProps={{ min: 1, max: 20 }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <DarkTextField
                  label={t('table.phoneNumber')}
                  value={checkInForm.customerPhone}
                  onChange={(e) => setCheckInForm({ ...checkInForm, customerPhone: e.target.value })}
                  fullWidth
                  placeholder={t('table.optional')}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <DarkTextField
                  label={t('table.email')}
                  type="email"
                  value={checkInForm.customerEmail}
                  onChange={(e) => setCheckInForm({ ...checkInForm, customerEmail: e.target.value })}
                  fullWidth
                  placeholder={t('table.optional')}
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <DarkTextField
                  label={t('table.notes')}
                  value={checkInForm.notes}
                  onChange={(e) => setCheckInForm({ ...checkInForm, notes: e.target.value })}
                  fullWidth
                  multiline
                  rows={2}
                  placeholder={t('table.notesPlaceholder')}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ p: { xs: 2, md: 3 }, gap: 1, flexWrap: { xs: 'wrap', sm: 'nowrap' } }}>
            <Button 
              onClick={() => setCheckInDialog(false)}
              sx={{ 
                borderRadius: 2, 
                fontWeight: 600, 
                textTransform: 'none', 
                color: 'text.primary',
                minWidth: { xs: '100px', md: 'auto' },
                fontSize: { xs: '0.875rem', md: '1rem' }
              }}
            >
              {t('table.cancel')}
            </Button>
            <Button 
              onClick={handleCheckIn}
              variant="contained"
              sx={{ 
                borderRadius: 2, 
                fontWeight: 600, 
                textTransform: 'none',
                minWidth: { xs: '100px', md: 'auto' },
                fontSize: { xs: '0.875rem', md: '1rem' }
              }}
            >
              {t('table.checkIn')}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Seat Customer Dialog */}
        <Dialog 
          open={seatDialog} 
          onClose={() => {
            setSeatDialog(false)
            setSelectedTableFromFloor(null)
            setSeatForm({ tableId: '' })
          }} 
          maxWidth="lg" 
          fullWidth
          PaperProps={{
            sx: { 
              maxHeight: { xs: '95vh', md: '90vh' },
              mx: { xs: 1, sm: 2 },
              my: { xs: 1, sm: 2 }
            }
          }}
        >
          <DialogTitle sx={{ fontWeight: 700, pb: 1, fontSize: { xs: '1.1rem', md: '1.25rem' }, px: { xs: 2, md: 3 } }}>
            <TableBar sx={{ mr: 1, verticalAlign: 'middle' }} />
            {t('table.seatCustomer')}
            {selectedSession && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1, fontSize: { xs: '0.85rem', md: '0.875rem' } }}>
                {selectedSession.customerName || t('table.walkInCustomer')} • {t('table.partyOf', { size: selectedSession.partySize })}
              </Typography>
            )}
          </DialogTitle>
          <DialogContent sx={{ p: 0, overflowX: 'hidden' }}>
            <Box sx={{ p: { xs: 2, md: 3 } }}>
              {availableTables.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: { xs: 3, md: 4 } }}>
                  <TableBar sx={{ fontSize: { xs: '2.5rem', md: '3rem' }, color: 'text.secondary' }} />
                  <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.secondary', fontSize: { xs: '1.1rem', md: '1.25rem' } }}>
                    {t('table.noAvailableTables')}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.85rem', md: '0.875rem' } }}>
                    {t('table.allTablesOccupied')}
                  </Typography>
                </Box>
              ) : (
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 600, fontSize: { xs: '1.1rem', md: '1.25rem' } }}>
                    {t('table.selectTableFromFloorPlan')}
                  </Typography>
                  
                  {selectedTableFromFloor && (
                    <Box sx={{ 
                      p: 2, 
                      backgroundColor: (() => {
                        const table = availableTables.find(t => t.id === selectedTableFromFloor)
                        const isExceeded = selectedSession && table && table.capacity < selectedSession.partySize
                        return isExceeded ? 'warning.50' : 'primary.50'
                      })(), 
                      borderRadius: 2 
                    }}>
                      <Typography variant="body2" sx={{ 
                        fontWeight: 600, 
                        color: (() => {
                          const table = availableTables.find(t => t.id === selectedTableFromFloor)
                          const isExceeded = selectedSession && table && table.capacity < selectedSession.partySize
                          return isExceeded ? 'warning.dark' : 'primary.dark'
                        })(), 
                        fontSize: { xs: '0.85rem', md: '0.875rem' } 
                      }}>
                        {t('table.selectedTable', { number: availableTables.find(t => t.id === selectedTableFromFloor)?.number })} 
                        {availableTables.find(t => t.id === selectedTableFromFloor)?.name && 
                          ` (${availableTables.find(t => t.id === selectedTableFromFloor)?.name})`
                        } - {t('table.capacity')}: {availableTables.find(t => t.id === selectedTableFromFloor)?.capacity}
                        {(() => {
                          const table = availableTables.find(t => t.id === selectedTableFromFloor)
                          const isExceeded = selectedSession && table && table.capacity < selectedSession.partySize
                          return isExceeded ? ` ⚠️ ${t('table.exceedsCapacityGuests', { partySize: selectedSession.partySize })}` : ''
                        })()}
                      </Typography>
                    </Box>
                  )}
                  
                  <Box sx={{ 
                    border: 1, 
                    borderColor: 'divider', 
                    borderRadius: 2, 
                    overflow: 'hidden',
                    minHeight: { xs: '300px', md: '400px' }
                  }}>
                    <FloorPlan 
                      tables={availableTables.map(table => ({
                        ...table,
                        isCapacityExceeded: selectedSession && table.capacity < selectedSession.partySize
                      }))}
                      editable={false}
                      onTableClick={handleTableSelectFromFloor}
                      selectedTableId={selectedTableFromFloor}
                      showAvailabilityOnly={true}
                    />
                  </Box>
                  
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 2, textAlign: 'center', fontSize: { xs: '0.85rem', md: '0.875rem' } }}>
                    {t('table.clickTableToSelect')}
                  </Typography>
                </Box>
              )}
            </Box>
          </DialogContent>
          <DialogActions sx={{ p: { xs: 2, md: 3 }, gap: 1, flexWrap: { xs: 'wrap', sm: 'nowrap' } }}>
            <Button 
              onClick={() => {
                setSeatDialog(false)
                setSelectedTableFromFloor(null)
                setSeatForm({ tableId: '' })
              }}
              sx={{ 
                borderRadius: 2, 
                fontWeight: 600, 
                textTransform: 'none', 
                color: 'text.primary',
                minWidth: { xs: '100px', md: 'auto' },
                fontSize: { xs: '0.875rem', md: '1rem' }
              }}
            >
              {t('table.cancel')}
            </Button>
            <Button 
              onClick={handleSeatCustomer}
              variant="contained"
              disabled={!selectedTableFromFloor && !seatForm.tableId}
              sx={{ 
                borderRadius: 2, 
                fontWeight: 600, 
                textTransform: 'none',
                minWidth: { xs: '120px', md: 'auto' },
                fontSize: { xs: '0.875rem', md: '1rem' }
              }}
            >
              {t('table.seatCustomer')}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Checkout Confirmation Dialog */}
        <Dialog 
          open={checkoutDialog} 
          onClose={() => {
            setCheckoutDialog(false)
            setSessionToCheckout(null)
          }} 
          maxWidth="sm" 
          fullWidth
          PaperProps={{
            sx: { 
              mx: { xs: 2, sm: 3 },
              my: { xs: 2, sm: 4 }
            }
          }}
        >
          <DialogTitle sx={{ fontWeight: 700, fontSize: { xs: '1.1rem', md: '1.25rem' }, pb: { xs: 1, md: 2 } }}>
            <ExitToApp sx={{ mr: 1, verticalAlign: 'middle', color: 'warning.main' }} />
            {t('table.confirmCheckout')}
          </DialogTitle>
          <DialogContent sx={{ px: { xs: 2, md: 3 } }}>
            {sessionToCheckout && (
              <Typography variant="body1" sx={{ fontSize: { xs: '1rem', md: '1rem' }, lineHeight: 1.5 }}>
                Are you sure you want to check out{' '}
                <Typography component="span" sx={{ fontWeight: 'bold' }}>
                  {sessionToCheckout.customerName}
                </Typography>
                {' '}from{' '}
                <Typography component="span" sx={{ fontWeight: 'bold' }}>
                  {sessionToCheckout.tableName}
                </Typography>
                ?
              </Typography>
            )}
          </DialogContent>
          <DialogActions sx={{ p: { xs: 2, md: 3 }, gap: 1, flexWrap: { xs: 'wrap', sm: 'nowrap' } }}>
            <Button 
              onClick={() => {
                setCheckoutDialog(false)
                setSessionToCheckout(null)
              }}
              sx={{ 
                borderRadius: 2, 
                fontWeight: 600, 
                textTransform: 'none', 
                color: 'text.primary',
                minWidth: { xs: '100px', md: 'auto' },
                fontSize: { xs: '0.875rem', md: '1rem' }
              }}
            >
              {t('table.cancel')}
            </Button>
            <Button 
              onClick={confirmCheckout}
              variant="contained"
              color="warning"
              sx={{ 
                borderRadius: 2, 
                fontWeight: 600, 
                textTransform: 'none',
                minWidth: { xs: '120px', md: 'auto' },
                fontSize: { xs: '0.875rem', md: '1rem' }
              }}
            >
              {t('table.yesCheckOut')}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Remove Customer Confirmation Dialog */}
        <Dialog 
          open={removeCustomerDialog} 
          onClose={() => {
            setRemoveCustomerDialog(false)
            setCustomerToRemove(null)
          }} 
          maxWidth="sm" 
          fullWidth
          PaperProps={{
            sx: { 
              mx: { xs: 2, sm: 3 },
              my: { xs: 2, sm: 4 }
            }
          }}
        >
          <DialogTitle sx={{ fontWeight: 700, fontSize: { xs: '1.1rem', md: '1.25rem' }, pb: { xs: 1, md: 2 } }}>
            <Delete sx={{ mr: 1, verticalAlign: 'middle', color: 'error.main' }} />
            {t('table.removeCustomer')}
          </DialogTitle>
          <DialogContent sx={{ px: { xs: 2, md: 3 } }}>
            {customerToRemove && (
              <Typography variant="body1" sx={{ fontSize: { xs: '1rem', md: '1rem' }, lineHeight: 1.5 }}>
                Are you sure you want to remove{' '}
                <Typography component="span" sx={{ fontWeight: 'bold' }}>
                  {customerToRemove.customerName}
                </Typography>
                {' '}from the waiting list?
              </Typography>
            )}
          </DialogContent>
          <DialogActions sx={{ p: { xs: 2, md: 3 }, gap: 1, flexWrap: { xs: 'wrap', sm: 'nowrap' } }}>
            <Button 
              onClick={() => {
                setRemoveCustomerDialog(false)
                setCustomerToRemove(null)
              }}
              sx={{ 
                borderRadius: 2, 
                fontWeight: 600, 
                textTransform: 'none', 
                color: 'text.primary',
                minWidth: { xs: '100px', md: 'auto' },
                fontSize: { xs: '0.875rem', md: '1rem' }
              }}
            >
              {t('table.cancel')}
            </Button>
            <Button 
              onClick={confirmRemoveCustomer}
              variant="contained"
              color="error"
              sx={{ 
                borderRadius: 2, 
                fontWeight: 600, 
                textTransform: 'none',
                minWidth: { xs: '120px', md: 'auto' },
                fontSize: { xs: '0.875rem', md: '1rem' }
              }}
            >
              {t('table.yesRemove')}
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