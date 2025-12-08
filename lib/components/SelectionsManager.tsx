'use client'

import { useState } from 'react'
import {
  Box,
  Typography,
  Button,
  Paper,
  FormControlLabel,
  Switch,
  IconButton,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Grid,
  Chip,
  Stack,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material'
import { DarkTextField } from '@/lib/components/DarkTextField'
import {
  Add,
  Delete,
  Edit,
  ExpandMore,
  DragIndicator,
  Settings as SettingsIcon
} from '@mui/icons-material'

interface SelectionOption {
  id?: string
  name: string
  priceAdd: number
  isAvailable: boolean
  sortOrder: number
}

interface Selection {
  id?: string
  name: string
  isRequired: boolean
  allowMultiple: boolean
  sortOrder: number
  options: SelectionOption[]
}

interface SelectionsManagerProps {
  menuItemId?: string
  restaurantId: string
  selections: Selection[]
  onSelectionsChange: (selections: Selection[]) => void
  disabled?: boolean
}

export function SelectionsManager({
  menuItemId: _menuItemId,
  restaurantId: _restaurantId,
  selections,
  onSelectionsChange,
  disabled = false
}: SelectionsManagerProps) {
  const [editingSelection, setEditingSelection] = useState<Selection | null>(null)
  const [selectionDialog, setSelectionDialog] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleAddSelection = () => {
    const newSelection: Selection = {
      name: '',
      isRequired: false,
      allowMultiple: false,
      sortOrder: selections.length,
      options: []
    }
    setEditingSelection(newSelection)
    setSelectionDialog(true)
  }

  const handleEditSelection = (selection: Selection) => {
    setEditingSelection({ ...selection })
    setSelectionDialog(true)
  }

  const handleSaveSelection = () => {
    if (!editingSelection) return

    if (!editingSelection.name.trim()) {
      setError('Selection name is required')
      return
    }

    if (editingSelection.options.length === 0) {
      setError('At least one option is required')
      return
    }

    const updatedSelections = editingSelection.id 
      ? selections.map(s => s.id === editingSelection.id ? editingSelection : s)
      : [...selections, { ...editingSelection, id: `temp-${Date.now()}` }]

    onSelectionsChange(updatedSelections)
    setSelectionDialog(false)
    setEditingSelection(null)
    setError(null)
  }

  const handleDeleteSelection = (selectionId: string) => {
    const updatedSelections = selections.filter(s => s.id !== selectionId)
    onSelectionsChange(updatedSelections)
  }

  const handleAddOption = () => {
    if (!editingSelection) return

    const newOption: SelectionOption = {
      name: '',
      priceAdd: 0,
      isAvailable: true,
      sortOrder: editingSelection.options.length
    }

    setEditingSelection({
      ...editingSelection,
      options: [...editingSelection.options, newOption]
    })
  }

  const handleUpdateOption = (index: number, updatedOption: SelectionOption) => {
    if (!editingSelection) return

    const updatedOptions = editingSelection.options.map((option, i) => 
      i === index ? updatedOption : option
    )

    setEditingSelection({
      ...editingSelection,
      options: updatedOptions
    })
  }

  const handleDeleteOption = (index: number) => {
    if (!editingSelection) return

    const updatedOptions = editingSelection.options.filter((_, i) => i !== index)
    setEditingSelection({
      ...editingSelection,
      options: updatedOptions
    })
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, color: 'primary.dark' }}>
          <SettingsIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          Selections & Options
        </Typography>
        <Button
          variant="outlined"
          startIcon={<Add />}
          onClick={handleAddSelection}
          disabled={disabled}
          size="small"
          sx={{ 
            borderRadius: 2,
            textTransform: 'none',
            fontWeight: 600
          }}
        >
          Add Selection
        </Button>
      </Box>

      {selections.length === 0 ? (
        <Paper 
          elevation={1} 
          sx={{ 
            p: 4, 
            textAlign: 'center',
            backgroundColor: 'grey.50',
            border: '2px dashed',
            borderColor: 'divider'
          }}
        >
          <SettingsIcon sx={{ fontSize: 40, color: 'text.secondary', mb: 2 }} />
          <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
            No selections configured
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Add selections like size, toppings, or add-ons to customize this menu item
          </Typography>
        </Paper>
      ) : (
        <Stack spacing={2}>
          {selections.map((selection) => (
            <Paper key={selection.id} elevation={2} sx={{ overflow: 'hidden' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', backgroundColor: 'primary.50', p: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
                  <DragIndicator sx={{ color: 'text.secondary' }} />
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      {selection.name}
                    </Typography>
                  </Box>
                  <Stack direction="row" spacing={1}>
                    <Chip 
                      label={selection.isRequired ? 'Required' : 'Optional'} 
                      color={selection.isRequired ? 'error' : 'default'}
                      size="small"
                      variant="outlined"
                    />
                    <Chip 
                      label={selection.allowMultiple ? 'Multiple' : 'Single'} 
                      color="primary"
                      size="small"
                      variant="outlined"
                    />
                    <Chip 
                      label={`${selection.options.length} options`} 
                      color="secondary"
                      size="small"
                    />
                  </Stack>
                </Box>
                <Box sx={{ display: 'flex', gap: 1, ml: 2 }}>
                  <IconButton 
                    size="small" 
                    onClick={() => handleEditSelection(selection)}
                    disabled={disabled}
                  >
                    <Edit fontSize="small" />
                  </IconButton>
                  <IconButton 
                    size="small" 
                    onClick={() => {
                      if (selection.id) handleDeleteSelection(selection.id)
                    }}
                    disabled={disabled}
                    sx={{ color: 'error.main' }}
                  >
                    <Delete fontSize="small" />
                  </IconButton>
                </Box>
              </Box>
              
              <Accordion elevation={0} sx={{ boxShadow: 'none' }}>
                <AccordionSummary 
                  expandIcon={<ExpandMore />}
                  sx={{ 
                    minHeight: 40,
                    backgroundColor: 'grey.50',
                    '&:hover': { backgroundColor: 'grey.100' },
                    '& .MuiAccordionSummary-content': { my: 1 }
                  }}
                >
                  <Typography variant="body2" color="text.secondary">
                    View Options ({selection.options.length})
                  </Typography>
                </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  {selection.options.map((option, index) => (
                    <Grid key={index} size={{ xs: 12, sm: 6, md: 4 }}>
                      <Paper 
                        elevation={1} 
                        sx={{ 
                          p: 2,
                          border: option.isAvailable ? '1px solid' : '1px dashed',
                          borderColor: option.isAvailable ? 'divider' : 'error.main',
                          opacity: option.isAvailable ? 1 : 0.7
                        }}
                      >
                        <Typography variant="body1" sx={{ fontWeight: 600, mb: 1 }}>
                          {option.name}
                          {Number(option.priceAdd) > 0 && (
                            <Chip 
                              label={`+฿${Number(option.priceAdd).toFixed(2)}`}
                              size="small"
                              color="success"
                              sx={{ ml: 1 }}
                            />
                          )}
                        </Typography>
                        <Chip 
                          label={option.isAvailable ? 'Available' : 'Unavailable'}
                          color={option.isAvailable ? 'success' : 'error'}
                          size="small"
                          variant="outlined"
                          sx={{
                            color: option.isAvailable ? 'success.dark' : 'error.dark'
                          }}
                        />
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              </AccordionDetails>
              </Accordion>
            </Paper>
          ))}
        </Stack>
      )}

      {/* Selection Edit Dialog */}
      <Dialog 
        open={selectionDialog} 
        onClose={() => setSelectionDialog(false)} 
        maxWidth="md" 
        fullWidth
      >
        <DialogTitle sx={{ pb: 1, fontWeight: 700 }}>
          {editingSelection?.id ? 'Edit Selection' : 'Create New Selection'}
        </DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          <Grid container spacing={3}>
            <Grid size={{ xs: 12 }}>
              <DarkTextField
                label="Selection Name"
                value={editingSelection?.name || ''}
                onChange={(e) => setEditingSelection(prev => prev ? {...prev, name: e.target.value} : null)}
                fullWidth
                required
                placeholder="e.g., Size, Toppings, Add-ons"
                sx={{ mb: 3 }}
              />

              <Box sx={{ display: 'flex', gap: 3, mb: 3 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={editingSelection?.isRequired || false}
                      onChange={(e) => setEditingSelection(prev => prev ? {...prev, isRequired: e.target.checked} : null)}
                    />
                  }
                  label="Required Selection"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={editingSelection?.allowMultiple || false}
                      onChange={(e) => setEditingSelection(prev => prev ? {...prev, allowMultiple: e.target.checked} : null)}
                    />
                  }
                  label="Allow Multiple Options"
                />
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Options
                </Typography>
                <Button
                  variant="outlined"
                  startIcon={<Add />}
                  onClick={handleAddOption}
                  size="small"
                  sx={{ borderRadius: 2, textTransform: 'none' }}
                >
                  Add Option
                </Button>
              </Box>

              <Stack spacing={2}>
                {editingSelection?.options.map((option, index) => (
                  <Paper key={index} elevation={1} sx={{ p: 3 }}>
                    <Grid container spacing={2} alignItems="center">
                      <Grid size={{ xs: 12, sm: 4 }}>
                        <DarkTextField
                          label="Option Name"
                          value={option.name}
                          onChange={(e) => handleUpdateOption(index, {...option, name: e.target.value})}
                          fullWidth
                          required
                          size="small"
                          placeholder="e.g., Small, Large, Extra Cheese"
                        />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 3 }}>
                        <DarkTextField
                          label="Additional Price"
                          type="number"
                          value={option.priceAdd}
                          onChange={(e) => handleUpdateOption(index, {...option, priceAdd: parseFloat(e.target.value) || 0})}
                          fullWidth
                          size="small"
                          inputProps={{ min: 0, step: 0.01 }}
                          InputProps={{
                            startAdornment: <Typography sx={{ mr: 1 }}>฿</Typography>
                          }}
                        />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 3 }}>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={option.isAvailable}
                              onChange={(e) => handleUpdateOption(index, {...option, isAvailable: e.target.checked})}
                              size="small"
                            />
                          }
                          label="Available"
                        />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 2 }}>
                        <IconButton 
                          onClick={() => handleDeleteOption(index)}
                          color="error"
                          size="small"
                        >
                          <Delete />
                        </IconButton>
                      </Grid>
                    </Grid>
                  </Paper>
                ))}
              </Stack>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 3, gap: 1 }}>
          <Button 
            onClick={() => setSelectionDialog(false)}
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
            onClick={handleSaveSelection} 
            variant="contained"
            sx={{
              borderRadius: 2,
              fontWeight: 600,
              textTransform: 'none',
              boxShadow: 2,
              '&:hover': { boxShadow: 4 }
            }}
          >
            {editingSelection?.id ? 'Update Selection' : 'Create Selection'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}