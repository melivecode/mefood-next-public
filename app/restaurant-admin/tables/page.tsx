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
  Grid,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Chip,
  MenuItem,
  Tabs,
  Tab,
  useMediaQuery
} from '@mui/material'
import {
  TableBar,
  Add,
  Edit,
  Delete,
  Map,
  List as ListIcon,
  People,
  ChevronLeft,
  ChevronRight,
} from '@mui/icons-material'
import { RestaurantNavbar } from '@/lib/components/RestaurantNavbar'
import { DarkTextField } from '@/lib/components/DarkTextField'
import { DarkSelect } from '@/lib/components/DarkSelect'
import { FloorPlan } from '@/lib/components/FloorPlan'
import { Footer } from '@/lib/components/Footer'
import { useTranslation } from 'react-i18next'
import { signOut } from 'next-auth/react'

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
  createdAt: string
  updatedAt: string
}

export default function TableManagementPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  // Removed useRoles hook - using session.user.id instead
  const theme = useTheme()
  const { t } = useTranslation()
  const _isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false)

  const [_restaurant, setRestaurant] = useState<{ id: string; name: string } | null>(null)
  const [tables, setTables] = useState<Table[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [currentTab, setCurrentTab] = useState(0)
  const hasFetched = useRef(false)

  // Mobile drawer handlers
  const _handleMobileMenuToggle = () => {
    setMobileDrawerOpen(!mobileDrawerOpen)
  }

  const _handleMobileMenuClose = () => {
    setMobileDrawerOpen(false)
  }

  const _handleMobileNavigation = (path: string) => {
    router.push(path)
    setMobileDrawerOpen(false)
  }

  const _handleSignOut = () => {
    signOut({ callbackUrl: '/auth/signin' })
  }

  // Dialog states
  const [tableDialog, setTableDialog] = useState(false)
  const [editingTable, setEditingTable] = useState<Table | null>(null)

  // Form state
  const [tableForm, setTableForm] = useState({
    number: '',
    name: '',
    capacity: 2,
    isActive: true
  })

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
        
        // Fetch restaurant info and tables
        const [restaurantRes, tablesRes] = await Promise.all([
          fetch(`/api/user/profile`),
          fetch(`/api/restaurant/tables`)
        ])

        if (!restaurantRes.ok || !tablesRes.ok) {
          throw new Error('Failed to fetch table data')
        }

        const [userData, tablesData] = await Promise.all([
          restaurantRes.json(),
          tablesRes.json()
        ])

        // Transform user data to restaurant format
        const restaurantData = {
          id: userData.id,
          name: userData.restaurantName
        }
        setRestaurant(restaurantData)
        setTables(tablesData)
      } catch {
        setError('Failed to load table data')
      } finally {
        setLoading(false)
      }
    }

    if (session) {
      fetchData()
    }
  }, [session])

  const findAvailablePosition = () => {
    // Find an empty spot on the grid for new tables
    const occupiedPositions = new Set(
      tables.map(t => `${t.gridX},${t.gridY}`)
    )
    
    // Try to find an empty position in a 12x10 grid
    for (let y = 0; y < 10; y++) {
      for (let x = 0; x <= 10; x += 2) { // Tables are 2 units wide by default
        const posKey = `${x},${y}`
        if (!occupiedPositions.has(posKey)) {
          // Check if there's room for a 2x2 table
          const hasRoom = !occupiedPositions.has(`${x+1},${y}`) && 
                         !occupiedPositions.has(`${x},${y+1}`) && 
                         !occupiedPositions.has(`${x+1},${y+1}`)
          if (hasRoom && x + 2 <= 12) {
            return { gridX: x, gridY: y }
          }
        }
      }
    }
    
    // If no space found, place at the end
    return { 
      gridX: 0, 
      gridY: Math.max(0, ...tables.map(t => t.gridY + t.gridHeight)) 
    }
  }

  const handleSaveTable = async () => {
    try {
      setSaving(true)
      setError(null)
      setSuccess(null)

      // For new tables, find an available position on the grid
      let tableData: any = { ...tableForm }
      if (!editingTable) {
        const position = findAvailablePosition()
        tableData = {
          ...tableForm,
          gridX: position.gridX,
          gridY: position.gridY,
          gridWidth: 2,
          gridHeight: 2
        }
      }

      const url = editingTable 
        ? `/api/restaurant/tables/${editingTable.id}` 
        : `/api/restaurant/tables`

      const response = await fetch(url, {
        method: editingTable ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(tableData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save table')
      }

      const savedTable = await response.json()

      // Update tables state
      if (editingTable) {
        setTables(tables.map(table => 
          table.id === editingTable.id ? savedTable : table
        ))
      } else {
        setTables([...tables, savedTable])
      }

      setSuccess(editingTable 
        ? `Table "${tableForm.number}" updated successfully`
        : `Table "${tableForm.number}" created successfully`
      )

      setTableDialog(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save table')
    } finally {
      setSaving(false)
    }
  }

  const handleCreateTable = () => {
    setEditingTable(null)
    setTableForm({
      number: '',
      name: '',
      capacity: 2,
      isActive: true
    })
    setTableDialog(true)
  }

  const handleEditTable = (table: Table) => {
    setEditingTable(table)
    setTableForm({
      number: table.number,
      name: table.name || '',
      capacity: table.capacity,
      isActive: table.isActive
    })
    setTableDialog(true)
  }

  const handleSaveLayout = async (layout: any[]) => {
    try {
      setError(null)
      
      // Update all table positions
      const updates = layout.map(item => {
        const table = tables.find(t => t.id === item.i)
        if (table) {
          return fetch(`/api/restaurant/tables/${table.id}/position`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              gridX: item.x,
              gridY: item.y,
              gridWidth: item.w,
              gridHeight: item.h
            })
          })
        }
        return null
      }).filter(Boolean)

      await Promise.all(updates)
      
      // Update local state
      const updatedTables = tables.map(table => {
        const layoutItem = layout.find(item => item.i === table.id)
        if (layoutItem) {
          return {
            ...table,
            gridX: layoutItem.x,
            gridY: layoutItem.y,
            gridWidth: layoutItem.w,
            gridHeight: layoutItem.h
          }
        }
        return table
      })
      
      setTables(updatedTables)
      setSuccess('Floor plan layout saved successfully')
    } catch (err) {
      setError('Failed to save floor plan layout')
      throw err
    }
  }

  const handleDeleteTable = async (table: Table) => {
    if (!confirm(`Are you sure you want to delete table "${table.number}"?`)) return

    try {
      setError(null)
      const response = await fetch(`/api/restaurant/tables/${table.id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete table')
      }

      setTables(tables.filter(t => t.id !== table.id))
      setSuccess(`Table "${table.number}" deleted successfully`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete table')
    }
  }

  const handleMoveTable = async (tableId: string, direction: 'left' | 'right') => {
    try {
      setError(null)
      const currentIndex = tables.findIndex(t => t.id === tableId)
      
      if (currentIndex === -1) return
      
      let targetIndex: number
      if (direction === 'left' && currentIndex > 0) {
        targetIndex = currentIndex - 1
      } else if (direction === 'right' && currentIndex < tables.length - 1) {
        targetIndex = currentIndex + 1
      } else {
        return // Can't move in that direction
      }

      const newTables = [...tables]
      const [movedTable] = newTables.splice(currentIndex, 1)
      newTables.splice(targetIndex, 0, movedTable)

      // Update sort orders
      const reorderedTables = newTables.map((table, index) => ({
        ...table,
        sortOrder: index
      }))

      setTables(reorderedTables)
      
      // Save to database
      const tableIds = reorderedTables.map(table => table.id)
      
      const response = await fetch(`/api/restaurant/tables/reorder`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ tableIds })
      })

      if (!response.ok) {
        throw new Error('Failed to reorder tables')
      }

      setSuccess('Tables reordered successfully')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reorder tables')
    }
  }

  if (status === 'loading' || loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
        }}
      >
        <CircularProgress size={40} />
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
          label: t('tables.backToRestaurantAdmin')
        }}
      />

      <Container maxWidth="xl" sx={{ py: 4 }}>

        <Paper elevation={3} sx={{ borderRadius: 3, overflow: 'hidden' }}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs 
              value={currentTab} 
              onChange={(e, newValue) => setCurrentTab(newValue)}
              sx={{ 
                px: 2,
                '& .MuiTab-root': {
                  color: 'text.primary',
                  fontWeight: 600,
                  '&.Mui-selected': {
                    color: 'primary.dark',
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
                label={`${t('tables.tableList')} (${tables.length})`} 
                icon={<ListIcon />}
                iconPosition="start"
                sx={{ 
                  fontSize: { xs: '0.875rem', sm: '1rem' }, 
                  minHeight: 64,
                  textTransform: 'none',
                  px: { xs: 2, sm: 3 }
                }}
              />
              <Tab 
                label={t('tables.floorPlan')} 
                icon={<Map />}
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

          {/* Table List Tab */}
          {currentTab === 0 && (
            <Box sx={{ p: 4 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: 'primary.dark' }}>
                    <TableBar sx={{ mr: 1, verticalAlign: 'middle' }} />
                    {t('tables.tableManagement')}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    Use arrow buttons to reorder tables
                  </Typography>
                </Box>
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={handleCreateTable}
                  sx={{ 
                    borderRadius: 2,
                    fontWeight: 600,
                    textTransform: 'none',
                    boxShadow: 2,
                    '&:hover': { boxShadow: 4 }
                  }}
                >
                  {t('tables.addTable')}
                </Button>
              </Box>

            {tables.length === 0 ? (
              <Paper 
                elevation={1} 
                sx={{ 
                  p: 8, 
                  textAlign: 'center',
                  backgroundColor: 'grey.50',
                  border: '2px dashed',
                  borderColor: 'divider'
                }}
              >
                <TableBar sx={{ fontSize: '4rem', color: 'primary.main', opacity: 0.5, mb: 2 }} />
                <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.dark', mb: 2 }}>
                  No Tables Yet
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Add tables to organize seating in your restaurant
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={handleCreateTable}
                  sx={{ 
                    borderRadius: 2,
                    fontWeight: 600,
                    textTransform: 'none',
                    boxShadow: 2,
                    '&:hover': { boxShadow: 4 }
                  }}
                >
                  Add First Table
                </Button>
              </Paper>
            ) : (
              <Grid container spacing={3}>
                {tables.map((table, index) => (
                  <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={table.id}>
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
                      {/* Visual Section */}
                      <Box 
                        sx={{ 
                          position: 'relative',
                          width: '100%',
                          height: 120,
                          backgroundColor: table.isActive ? 'primary.50' : 'grey.100',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexDirection: 'column'
                        }}
                      >
                        {/* Reorder Controls */}
                        <Box sx={{ 
                          position: 'absolute', 
                          top: 8, 
                          left: 8, 
                          display: 'flex',
                          gap: 0.5
                        }}>
                          <IconButton 
                            size="small"
                            onClick={() => handleMoveTable(table.id, 'left')}
                            disabled={index === 0}
                            sx={{ 
                              backgroundColor: 'rgba(255, 255, 255, 0.9)',
                              '&:hover': { backgroundColor: 'rgba(255, 255, 255, 1)' },
                              '&:disabled': { opacity: 0.3 }
                            }}
                          >
                            <ChevronLeft fontSize="small" />
                          </IconButton>
                          <IconButton 
                            size="small"
                            onClick={() => handleMoveTable(table.id, 'right')}
                            disabled={index === tables.length - 1}
                            sx={{ 
                              backgroundColor: 'rgba(255, 255, 255, 0.9)',
                              '&:hover': { backgroundColor: 'rgba(255, 255, 255, 1)' },
                              '&:disabled': { opacity: 0.3 }
                            }}
                          >
                            <ChevronRight fontSize="small" />
                          </IconButton>
                        </Box>
                        
                        <TableBar sx={{ 
                          color: table.isActive ? 'primary.dark' : 'text.secondary', 
                          fontSize: '2rem',
                          opacity: 0.8,
                          mb: 0.5
                        }} />
                        <Typography variant="h5" sx={{ 
                          fontWeight: 700, 
                          color: table.isActive ? 'primary.dark' : 'text.secondary',
                          opacity: 0.9
                        }}>
                          {table.number}
                        </Typography>
                        
                        {/* Edit Button Overlay */}
                        <Box
                          sx={{
                            position: 'absolute',
                            top: 0,
                            right: 0,
                            display: 'flex',
                            gap: 0.5,
                            p: 1,
                            backgroundColor: 'rgba(255, 255, 255, 0.9)',
                            borderRadius: '0 0 0 8px'
                          }}
                        >
                          <IconButton 
                            size="small" 
                            onClick={() => handleEditTable(table)}
                            sx={{ 
                              backgroundColor: 'white',
                              color: 'primary.main',
                              '&:hover': { 
                                backgroundColor: 'primary.main',
                                color: 'white'
                              }
                            }}
                          >
                            <Edit fontSize="small" />
                          </IconButton>
                          <IconButton 
                            size="small" 
                            onClick={() => handleDeleteTable(table)}
                            sx={{ 
                              backgroundColor: 'white',
                              color: 'error.main',
                              '&:hover': { 
                                backgroundColor: 'error.main',
                                color: 'white'
                              }
                            }}
                          >
                            <Delete fontSize="small" />
                          </IconButton>
                        </Box>
                      </Box>

                      {/* Content Section */}
                      <Box sx={{ p: 2, flex: 1, display: 'flex', flexDirection: 'column' }}>
                        {table.name && (
                          <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5, color: 'text.secondary' }}>
                            {table.name}
                          </Typography>
                        )}
                        
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
                          <People sx={{ fontSize: 18, color: 'text.secondary' }} />
                          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                            {table.capacity} guests
                          </Typography>
                        </Box>

                        <Box sx={{ mt: 'auto', display: 'flex', gap: 1 }}>
                          <Chip 
                            label={table.isActive ? 'Active' : 'Inactive'}
                            color={table.isActive ? 'success' : 'default'}
                            size="small"
                            variant="outlined"
                            sx={{ 
                              fontWeight: 600,
                              fontSize: '0.7rem',
                              height: 20,
                              color: table.isActive ? 'success.dark' : 'text.secondary'
                            }}
                          />
                        </Box>
                      </Box>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            )}
            </Box>
          )}

          {/* Floor Plan Tab */}
          {currentTab === 1 && (
            <Box sx={{ p: 4 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 4 }}>
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: 'primary.dark', mb: 2 }}>
                    <Map sx={{ mr: 1, verticalAlign: 'middle' }} />
                    {t('tables.floorPlanLayout')}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Visualize and arrange your restaurant tables. Click "Edit Layout" to drag and resize tables.
                  </Typography>
                </Box>
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={handleCreateTable}
                  sx={{ 
                    borderRadius: 2,
                    fontWeight: 600,
                    textTransform: 'none',
                    boxShadow: 2,
                    '&:hover': { boxShadow: 4 }
                  }}
                >
                  {t('tables.addTable')}
                </Button>
              </Box>

              {tables.length === 0 ? (
                <Paper 
                  elevation={1} 
                  sx={{ 
                    p: 8, 
                    textAlign: 'center',
                    backgroundColor: 'grey.50',
                    border: '2px dashed',
                    borderColor: 'divider'
                  }}
                >
                  <Map sx={{ fontSize: '4rem', color: 'primary.main', opacity: 0.5, mb: 2 }} />
                  <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.dark', mb: 2 }}>
                    No Tables to Display
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    Add tables in the Table List tab to see them on the floor plan
                  </Typography>
                  <Button
                    variant="outlined"
                    startIcon={<ListIcon />}
                    onClick={() => setCurrentTab(0)}
                    sx={{ 
                      borderRadius: 2,
                      fontWeight: 600,
                      textTransform: 'none',
                      borderColor: 'primary.main',
                      color: 'primary.dark',
                      '&:hover': { 
                        borderColor: 'primary.dark',
                        backgroundColor: 'primary.50'
                      }
                    }}
                  >
                    Go to Table List
                  </Button>
                </Paper>
              ) : (
                <FloorPlan 
                  tables={tables}
                  editable={true}
                  onSave={handleSaveLayout}
                  onEditTable={handleEditTable as any}
                  onDeleteTable={handleDeleteTable as any}
                />
              )}
            </Box>
          )}
        </Paper>

        {/* Table Dialog */}
        <Dialog 
          open={tableDialog} 
          onClose={() => setTableDialog(false)} 
          maxWidth="sm" 
          fullWidth
        >
          <DialogTitle sx={{ pb: 1, fontWeight: 700 }}>
            {editingTable ? 'Edit Table' : 'Create New Table'}
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={3} sx={{ mt: 1 }}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <DarkTextField
                  label="Table Number"
                  value={tableForm.number}
                  onChange={(e) => setTableForm({ ...tableForm, number: e.target.value })}
                  fullWidth
                  required
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <DarkTextField
                  label="Capacity"
                  type="number"
                  value={tableForm.capacity}
                  onChange={(e) => setTableForm({ ...tableForm, capacity: parseInt(e.target.value) || 1 })}
                  fullWidth
                  required
                  inputProps={{ min: 1, max: 20 }}
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <DarkTextField
                  label="Table Name (Optional)"
                  value={tableForm.name}
                  onChange={(e) => setTableForm({ ...tableForm, name: e.target.value })}
                  fullWidth
                  placeholder="e.g., Window seat, VIP table"
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <DarkSelect
                  label="Status"
                  value={tableForm.isActive ? 'active' : 'inactive'}
                  onChange={(e) => setTableForm({ ...tableForm, isActive: e.target.value === 'active' })}
                  fullWidth
                >
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="inactive">Inactive</MenuItem>
                </DarkSelect>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ p: 3, gap: 1 }}>
            <Button 
              onClick={() => setTableDialog(false)}
              disabled={saving}
              sx={{
                borderRadius: 2,
                fontWeight: 600,
                textTransform: 'none',
                color: 'text.primary'
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSaveTable} 
              variant="contained"
              disabled={saving}
              sx={{
                borderRadius: 2,
                fontWeight: 600,
                textTransform: 'none',
                boxShadow: 2,
                '&:hover': { boxShadow: 4 }
              }}
            >
              {saving ? <CircularProgress size={20} /> : (editingTable ? 'Update Table' : 'Create Table')}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Success/Error Snackbar */}
        <Snackbar 
          open={!!success} 
          autoHideDuration={6000} 
          onClose={() => setSuccess(null)}
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        >
          <Alert onClose={() => setSuccess(null)} severity="success" sx={{ width: '100%' }}>
            {success}
          </Alert>
        </Snackbar>

        <Snackbar 
          open={!!error} 
          autoHideDuration={6000} 
          onClose={() => setError(null)}
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        >
          <Alert onClose={() => setError(null)} severity="error" sx={{ width: '100%' }}>
            {error}
          </Alert>
        </Snackbar>
      </Container>
      
      <Footer />
    </>
  )
}