'use client'

import { useState, useEffect } from 'react'
import GridLayout, { Layout } from 'react-grid-layout'
import { Box, Paper, Typography, Chip, Button } from '@mui/material'
import { People, Edit, Save, Cancel, Restaurant, Receipt, ExitToApp } from '@mui/icons-material'
import { useTranslation } from 'react-i18next'
import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'

interface Table {
  id: string
  number: string
  name: string | null
  capacity: number
  isActive: boolean
  gridX: number
  gridY: number
  gridWidth: number
  gridHeight: number
  session?: CustomerSession | null
  isOccupied?: boolean
  isAvailableForSeating?: boolean
}

interface CustomerSession {
  id: string
  customerName: string | null
  partySize: number
  status: string
  checkInTime: string
  seatedTime: string | null
}

interface FloorPlanProps {
  tables: Table[]
  onLayoutChange?: (tables: Table[]) => void
  editable?: boolean
  onSave?: (layout: Layout[]) => Promise<void>
  onEditTable?: (table: Table) => void
  onDeleteTable?: (table: Table) => void
  onTableClick?: (tableId: string) => void
  selectedTableId?: string | null
  showAvailabilityOnly?: boolean
  showOccupancyStatus?: boolean
  showSeatingMode?: boolean
  occupiedSessions?: CustomerSession[]
  selectedCustomer?: CustomerSession | null
  onOrderClick?: (tableId: string) => void
  onBillClick?: (tableId: string) => void
  onCheckoutClick?: (tableId: string, sessionId: string) => void
}

export function FloorPlan({ 
  tables, 
  onLayoutChange, 
  editable = false, 
  onSave, 
  onEditTable: _onEditTable, 
  onDeleteTable: _onDeleteTable,
  onTableClick,
  selectedTableId,
  showAvailabilityOnly = false,
  showOccupancyStatus = false,
  showSeatingMode = false,
  occupiedSessions: _occupiedSessions = [],
  selectedCustomer = null,
  onOrderClick,
  onBillClick,
  onCheckoutClick
}: FloorPlanProps) {
  const { t } = useTranslation()
  const [layout, setLayout] = useState<Layout[]>([])
  const [isEditing, setIsEditing] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [activeTableActions, setActiveTableActions] = useState<string | null>(null)

  useEffect(() => {
    const newLayout = tables.map(table => ({
      i: table.id,
      x: table.gridX || 0,
      y: table.gridY || 0,
      w: table.gridWidth || 2,
      h: table.gridHeight || 2,
      minW: 1,
      minH: 1,
      maxW: 4,
      maxH: 4
    }))
    setLayout(newLayout)
  }, [tables])

  const handleLayoutChange = (newLayout: Layout[]) => {
    setLayout(newLayout)
    setIsDirty(true)
    
    if (onLayoutChange) {
      const updatedTables = tables.map(table => {
        const layoutItem = newLayout.find(item => item.i === table.id)
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
      onLayoutChange(updatedTables)
    }
  }

  const handleSave = async () => {
    if (onSave) {
      setSaving(true)
      try {
        await onSave(layout)
        setIsDirty(false)
        setIsEditing(false)
      } catch (error) {
        // Error saving layout - could show user notification here
      } finally {
        setSaving(false)
      }
    }
  }

  const handleCancel = () => {
    // Reset to original positions
    const originalLayout = tables.map(table => ({
      i: table.id,
      x: table.gridX || 0,
      y: table.gridY || 0,
      w: table.gridWidth || 2,
      h: table.gridHeight || 2,
      minW: 1,
      minH: 1,
      maxW: 4,
      maxH: 4
    }))
    setLayout(originalLayout)
    setIsDirty(false)
    setIsEditing(false)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SEATED': return 'info'
      case 'ORDERING': return 'warning'
      case 'ORDERED': return 'primary'
      case 'SERVING': return 'secondary'
      case 'DINING': return 'success'
      case 'BILLING': return 'error'
      default: return 'default'
    }
  }

  return (
    <Box 
      sx={{ position: 'relative' }}
      onClick={() => setActiveTableActions(null)}
    >
      {/* Legend */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>
            {t('table.legend')}
          </Typography>
          {showAvailabilityOnly ? (
            <>
              <Chip 
                size="small" 
                label={t('table.available')} 
                sx={{ 
                  backgroundColor: 'success.main', 
                  color: 'white',
                  fontWeight: 600,
                  height: 24
                }} 
              />
              <Chip 
                size="small" 
                label={t('table.selected')} 
                sx={{ 
                  backgroundColor: 'primary.main', 
                  color: 'white',
                  fontWeight: 600,
                  height: 24
                }} 
              />
            </>
          ) : showOccupancyStatus ? (
            <>
              <Chip 
                size="small" 
                label={t('table.available')} 
                sx={{ 
                  backgroundColor: 'grey.300', 
                  color: 'text.primary',
                  fontWeight: 600,
                  height: 24
                }} 
              />
              <Chip 
                size="small" 
                label={t('table.occupied')} 
                sx={{ 
                  backgroundColor: 'primary.main', 
                  color: 'white',
                  fontWeight: 600,
                  height: 24
                }} 
              />
              {showSeatingMode && (
                <Chip 
                  size="small" 
                  label={t('table.canSeatSelected')} 
                  sx={{ 
                    backgroundColor: 'success.main', 
                    color: 'white',
                    fontWeight: 600,
                    height: 24
                  }} 
                />
              )}
              <Chip 
                size="small" 
                label={t('table.readyForBill')} 
                sx={{ 
                  backgroundColor: 'error.main', 
                  color: 'white',
                  fontWeight: 600,
                  height: 24
                }} 
              />
            </>
          ) : (
            <>
              <Chip 
                size="small" 
                label="Active" 
                sx={{ 
                  backgroundColor: 'primary.main', 
                  color: 'white',
                  fontWeight: 600,
                  height: 24
                }} 
              />
              <Chip 
                size="small" 
                label="Inactive" 
                sx={{ 
                  backgroundColor: 'grey.400', 
                  color: 'white',
                  fontWeight: 600,
                  height: 24
                }} 
              />
            </>
          )}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <People sx={{ fontSize: 16, color: 'text.secondary' }} />
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              Capacity
            </Typography>
          </Box>
        </Box>
        
        {editable && (
          <Box sx={{ display: 'flex', gap: 1 }}>
            {!isEditing ? (
              <Button
                variant="outlined"
                startIcon={<Edit />}
                onClick={() => setIsEditing(true)}
                sx={{
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 600
                }}
              >
                Edit Layout
              </Button>
            ) : (
              <>
                <Button
                  variant="outlined"
                  startIcon={<Cancel />}
                  onClick={handleCancel}
                  disabled={saving}
                  sx={{
                    borderRadius: 2,
                    textTransform: 'none',
                    fontWeight: 600,
                    color: 'text.primary'
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="contained"
                  startIcon={<Save />}
                  onClick={handleSave}
                  disabled={!isDirty || saving}
                  sx={{
                    borderRadius: 2,
                    textTransform: 'none',
                    fontWeight: 600,
                    boxShadow: 2,
                    '&:hover': { boxShadow: 4 }
                  }}
                >
                  {saving ? 'Saving...' : 'Save Layout'}
                </Button>
              </>
            )}
          </Box>
        )}
      </Box>

      <Paper 
        elevation={2} 
        sx={{ 
          p: 2, 
          backgroundColor: 'grey.50',
          minHeight: 600,
          position: 'relative',
          overflow: 'auto',
          backgroundImage: `
            linear-gradient(0deg, transparent 24%, rgba(0, 0, 0, .03) 25%, rgba(0, 0, 0, .03) 26%, transparent 27%, transparent 74%, rgba(0, 0, 0, .03) 75%, rgba(0, 0, 0, .03) 76%, transparent 77%, transparent),
            linear-gradient(90deg, transparent 24%, rgba(0, 0, 0, .03) 25%, rgba(0, 0, 0, .03) 26%, transparent 27%, transparent 74%, rgba(0, 0, 0, .03) 75%, rgba(0, 0, 0, .03) 76%, transparent 77%, transparent)
          `,
          backgroundSize: '50px 50px'
        }}
      >
        {isEditing && (
          <Chip 
            label="Drag tables to rearrange • Resize by dragging corners"
            color="primary"
            size="small"
            sx={{ 
              position: 'absolute', 
              top: 8, 
              left: 8, 
              zIndex: 10,
              fontWeight: 600
            }}
          />
        )}

        <GridLayout
          className="layout"
          layout={layout}
          cols={12}
          rowHeight={50}
          width={1100}
          onLayoutChange={handleLayoutChange}
          isDraggable={isEditing}
          isResizable={isEditing}
          compactType={null}
          preventCollision={true}
          margin={[10, 10]}
        >
          {tables.map(table => {
            const isSelected = selectedTableId === table.id
            const isAvailable = showAvailabilityOnly
            const isOccupied = showOccupancyStatus && table.isOccupied
            const session = table.session
            const isBillingReady = session?.status === 'BILLING'
            const canSeatSelected = showSeatingMode && table.isAvailableForSeating
            
            let backgroundColor, borderColor, backgroundGradient
            
            if (isSelected) {
              backgroundColor = 'primary.50'
              borderColor = 'primary.main'
              backgroundGradient = 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)'
            } else if (isAvailable) {
              backgroundColor = 'success.50'
              borderColor = 'success.main'
              backgroundGradient = 'linear-gradient(135deg, #e8f5e8 0%, #c8e6c9 100%)'
            } else if (canSeatSelected) {
              backgroundColor = 'success.50'
              borderColor = 'success.main'
              backgroundGradient = 'linear-gradient(135deg, #e8f5e8 0%, #c8e6c9 100%)'
            } else if (showOccupancyStatus) {
              if (isOccupied) {
                if (isBillingReady) {
                  backgroundColor = 'error.50'
                  borderColor = 'error.main'
                  backgroundGradient = 'linear-gradient(135deg, #ffebee 0%, #ffcdd2 100%)'
                } else {
                  backgroundColor = 'primary.50'
                  borderColor = 'primary.main'
                  backgroundGradient = 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)'
                }
              } else {
                backgroundColor = 'grey.100'
                borderColor = 'grey.300'
                backgroundGradient = 'linear-gradient(135deg, #f5f5f5 0%, #eeeeee 100%)'
              }
            } else {
              backgroundColor = table.isActive ? 'white' : 'grey.100'
              borderColor = table.isActive ? 'primary.main' : 'grey.400'
              backgroundGradient = table.isActive 
                ? 'linear-gradient(135deg, #ffffff 0%, #f5f5f5 100%)' 
                : 'linear-gradient(135deg, #e0e0e0 0%, #bdbdbd 100%)'
            }
            
            return (
              <Paper
                key={table.id}
                elevation={isSelected ? 6 : 3}
                onClick={(e) => {
                  e.stopPropagation()
                  if (isEditing) return
                  
                  // If table is occupied and we have action handlers, toggle action buttons
                  if (showOccupancyStatus && isOccupied && session && onOrderClick && onBillClick && onCheckoutClick) {
                    setActiveTableActions(activeTableActions === table.id ? null : table.id)
                  } 
                  // Otherwise use the normal table click handler
                  else if (onTableClick) {
                    onTableClick(table.id)
                  }
                }}
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor,
                  border: '3px solid',
                  borderColor,
                  borderRadius: 2,
                  cursor: isEditing 
                    ? 'move' 
                    : (onTableClick && (canSeatSelected || !showSeatingMode || isOccupied)) 
                      ? 'pointer' 
                      : canSeatSelected 
                        ? 'pointer' 
                        : 'default',
                  transition: 'all 0.2s ease',
                  background: backgroundGradient,
                  '&:hover': {
                    borderColor: isSelected 
                      ? 'primary.dark' 
                      : isAvailable 
                        ? 'success.dark'
                        : canSeatSelected
                          ? 'success.dark'
                        : isBillingReady
                          ? 'error.dark'
                          : isOccupied
                            ? 'primary.dark'
                            : table.isActive ? 'primary.dark' : 'grey.500',
                    boxShadow: isSelected ? 8 : canSeatSelected ? 8 : 6,
                    transform: !isEditing ? 'scale(1.05)' : 'none',
                    opacity: showSeatingMode && !canSeatSelected && !isOccupied ? 0.6 : 1
                  },
                  opacity: table.isActive ? 1 : 0.6,
                  position: 'relative',
                  height: '100%',
                  p: 1,
                  boxShadow: isSelected ? `0 0 0 2px ${isAvailable ? '#4caf50' : '#2196f3'}` : undefined
                }}
              >
                <Typography 
                  variant="h6" 
                  sx={{ 
                    fontWeight: 700,
                    color: isSelected 
                      ? 'primary.dark' 
                      : isAvailable 
                        ? 'success.dark'
                        : canSeatSelected
                          ? 'success.dark' 
                        : isBillingReady
                          ? 'error.dark'
                          : isOccupied
                            ? 'primary.dark'
                            : table.isActive ? 'primary.dark' : 'text.secondary',
                    fontSize: { xs: '0.875rem', sm: '1rem', md: '1.25rem' }
                  }}
                >
                  Table {table.number}
                </Typography>
                
                {/* Show customer info if occupied, otherwise show table info */}
                {showOccupancyStatus && session ? (
                  <Box sx={{ textAlign: 'center', mt: 0.5 }}>
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        fontWeight: 600,
                        fontSize: { xs: '0.75rem', sm: '0.875rem' },
                        color: isBillingReady ? 'error.dark' : 'primary.dark'
                      }}
                    >
                      {session.customerName || t('table.walkInCustomer')}
                    </Typography>
                    <Typography 
                      variant="caption" 
                      sx={{ 
                        fontSize: { xs: '0.625rem', sm: '0.75rem' },
                        color: 'text.secondary'
                      }}
                    >
                      {session.partySize} guests • {session.status}
                    </Typography>
                    {onOrderClick && onBillClick && onCheckoutClick && (
                      <Typography 
                        variant="caption" 
                        sx={{ 
                          fontSize: { xs: '0.625rem', sm: '0.7rem' },
                          color: 'primary.main',
                          fontWeight: 600,
                          display: 'block',
                          mt: 0.5
                        }}
                      >
                        Tap for actions
                      </Typography>
                    )}
                  </Box>
                ) : (
                  <>
                    {table.name && (
                      <Typography 
                        variant="caption" 
                        sx={{ 
                          color: 'text.secondary',
                          fontSize: { xs: '0.625rem', sm: '0.75rem' }
                        }}
                      >
                        {table.name}
                      </Typography>
                    )}
                    
                    <Box sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 0.5, 
                      mt: 'auto',
                      color: table.isActive ? 'text.secondary' : 'text.disabled'
                    }}>
                      <People sx={{ fontSize: { xs: 12, sm: 14, md: 16 } }} />
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          fontSize: { xs: '0.625rem', sm: '0.75rem' },
                          fontWeight: isSelected ? 600 : 400
                        }}
                      >
                        {table.capacity} guests
                      </Typography>
                    </Box>
                  </>
                )}

                {/* Status chips */}
                {showOccupancyStatus && session && (
                  <Chip 
                    label={session.status}
                    size="small"
                    color={getStatusColor(session.status) as any}
                    sx={{ 
                      position: 'absolute',
                      top: 4,
                      right: 4,
                      fontSize: '0.625rem',
                      height: 18,
                      fontWeight: 600
                    }}
                  />
                )}

                {canSeatSelected && selectedCustomer && (
                  <Chip 
                    label={`Can Seat ${selectedCustomer.partySize}`}
                    size="small"
                    color="success"
                    sx={{ 
                      position: 'absolute',
                      top: 4,
                      right: 4,
                      fontSize: '0.625rem',
                      height: 18,
                      fontWeight: 600
                    }}
                  />
                )}
                
                {isSelected && showAvailabilityOnly && (
                  <Chip 
                    label={t('table.selected')}
                    size="small"
                    color="primary"
                    sx={{ 
                      position: 'absolute',
                      top: 4,
                      right: 4,
                      fontSize: '0.625rem',
                      height: 18,
                      fontWeight: 600
                    }}
                  />
                )}
                
                {!table.isActive && !showAvailabilityOnly && !showOccupancyStatus && (
                  <Chip 
                    label="Inactive"
                    size="small"
                    sx={{ 
                      position: 'absolute',
                      top: 4,
                      right: 4,
                      fontSize: '0.625rem',
                      height: 18
                    }}
                  />
                )}

                {/* Action Buttons Overlay for Occupied Tables */}
                {showOccupancyStatus && isOccupied && session && onOrderClick && onBillClick && onCheckoutClick && activeTableActions === table.id && (
                  <Box 
                    sx={{ 
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      backgroundColor: 'rgba(0, 0, 0, 0.85)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 0.5,
                      justifyContent: 'center',
                      alignItems: 'center',
                      borderRadius: 2,
                      zIndex: 10
                    }}
                  >
                    <Button
                      size="small"
                      variant="contained"
                      startIcon={<Restaurant sx={{ fontSize: 16 }} />}
                      onClick={(e) => {
                        e.stopPropagation()
                        setActiveTableActions(null)
                        onOrderClick(table.id)
                      }}
                      sx={{ 
                        minWidth: 80,
                        fontSize: '0.75rem',
                        height: 28,
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
                      startIcon={<Receipt sx={{ fontSize: 16 }} />}
                      onClick={(e) => {
                        e.stopPropagation()
                        setActiveTableActions(null)
                        onBillClick(table.id)
                      }}
                      sx={{ 
                        minWidth: 80,
                        fontSize: '0.75rem',
                        height: 28,
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
                      startIcon={<ExitToApp sx={{ fontSize: 16 }} />}
                      onClick={(e) => {
                        e.stopPropagation()
                        setActiveTableActions(null)
                        onCheckoutClick(table.id, session.id)
                      }}
                      sx={{ 
                        minWidth: 80,
                        fontSize: '0.75rem',
                        height: 28,
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
                )}
              </Paper>
            )
          })}
        </GridLayout>
      </Paper>
    </Box>
  )
}