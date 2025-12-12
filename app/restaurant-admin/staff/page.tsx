'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  InputAdornment
} from '@mui/material'
import {
  People,
  Add,
  Edit,
  Delete,
  Email,
  Visibility,
  VisibilityOff
} from '@mui/icons-material'
import { RestaurantNavbar } from '@/lib/components/RestaurantNavbar'
import { DarkTextField } from '@/lib/components/DarkTextField'
import { Footer } from '@/lib/components/Footer'
import { useTranslation } from 'react-i18next'

interface StaffMember {
  id: string
  email: string
  ownerName: string | null
  role: 'STAFF'
  createdAt: string
  updatedAt: string
}

export default function StaffManagementPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { t } = useTranslation()
  const hasFetched = useRef(false)

  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Dialog states
  const [staffDialog, setStaffDialog] = useState(false)
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null)
  const [deleteDialog, setDeleteDialog] = useState(false)
  const [deletingStaff, setDeletingStaff] = useState<StaffMember | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  // Form state
  const [staffForm, setStaffForm] = useState({
    email: '',
    password: '',
    ownerName: ''
  })

  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/auth/signin')
      return
    }
    if (session.user.role !== 'ADMIN') {
      router.push('/restaurant')
    }
  }, [session, status, router])

  useEffect(() => {
    const fetchStaff = async () => {
      if (hasFetched.current) return

      try {
        hasFetched.current = true
        const response = await fetch('/api/restaurant/staff')

        if (!response.ok) {
          throw new Error('Failed to fetch staff members')
        }

        const data = await response.json()
        setStaffMembers(data)
      } catch {
        setError(t('staff.failedToLoadStaff', 'Failed to load staff members'))
      } finally {
        setLoading(false)
      }
    }

    if (session?.user?.role === 'ADMIN') {
      fetchStaff()
    }
  }, [session, t])

  const handleCreateStaff = () => {
    setEditingStaff(null)
    setStaffForm({
      email: '',
      password: '',
      ownerName: ''
    })
    setShowPassword(false)
    setStaffDialog(true)
  }

  const handleEditStaff = (staff: StaffMember) => {
    setEditingStaff(staff)
    setStaffForm({
      email: staff.email,
      password: '',
      ownerName: staff.ownerName || ''
    })
    setShowPassword(false)
    setStaffDialog(true)
  }

  const handleSaveStaff = async () => {
    try {
      setSaving(true)
      setError(null)

      const url = editingStaff
        ? `/api/restaurant/staff/${editingStaff.id}`
        : '/api/restaurant/staff'

      const response = await fetch(url, {
        method: editingStaff ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(staffForm)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save staff member')
      }

      const savedStaff = await response.json()

      if (editingStaff) {
        setStaffMembers(staffMembers.map(s =>
          s.id === editingStaff.id ? savedStaff : s
        ))
        setSuccess(t('staff.staffUpdatedSuccess', 'Staff member updated successfully'))
      } else {
        setStaffMembers([savedStaff, ...staffMembers])
        setSuccess(t('staff.staffCreatedSuccess', 'Staff member created successfully'))
      }

      setStaffDialog(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save staff member')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteClick = (staff: StaffMember) => {
    setDeletingStaff(staff)
    setDeleteDialog(true)
  }

  const handleConfirmDelete = async () => {
    if (!deletingStaff) return

    try {
      setSaving(true)
      setError(null)

      const response = await fetch(`/api/restaurant/staff/${deletingStaff.id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete staff member')
      }

      setStaffMembers(staffMembers.filter(s => s.id !== deletingStaff.id))
      setSuccess(t('staff.staffDeletedSuccess', 'Staff member deleted successfully'))
      setDeleteDialog(false)
      setDeletingStaff(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete staff member')
    } finally {
      setSaving(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
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

  if (!session || session.user.role !== 'ADMIN') {
    return null
  }

  return (
    <>
      <RestaurantNavbar
        backButton={{
          href: '/restaurant-admin',
          label: t('staff.backToRestaurantAdmin', 'Back to Restaurant Admin')
        }}
      />

      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Paper elevation={3} sx={{ borderRadius: 3, overflow: 'hidden' }}>
          <Box sx={{ p: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 700, color: 'primary.dark' }}>
                  <People sx={{ mr: 1, verticalAlign: 'middle' }} />
                  {t('staff.staffManagement', 'Staff Management')}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  {t('staff.staffManagementDesc', 'Manage staff accounts for your restaurant')}
                </Typography>
              </Box>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={handleCreateStaff}
                sx={{
                  borderRadius: 2,
                  fontWeight: 600,
                  textTransform: 'none',
                  boxShadow: 2,
                  '&:hover': { boxShadow: 4 }
                }}
              >
                {t('staff.addStaff', 'Add Staff')}
              </Button>
            </Box>

            {staffMembers.length === 0 ? (
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
                <People sx={{ fontSize: '4rem', color: 'primary.main', opacity: 0.5, mb: 2 }} />
                <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.dark', mb: 2 }}>
                  {t('staff.noStaffYet', 'No Staff Members Yet')}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  {t('staff.noStaffDesc', 'Add staff members to help manage your restaurant')}
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={handleCreateStaff}
                  sx={{
                    borderRadius: 2,
                    fontWeight: 600,
                    textTransform: 'none',
                    boxShadow: 2,
                    '&:hover': { boxShadow: 4 }
                  }}
                >
                  {t('staff.addFirstStaff', 'Add First Staff Member')}
                </Button>
              </Paper>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>{t('staff.name', 'Name')}</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>{t('staff.email', 'Email')}</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>{t('staff.role', 'Role')}</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>{t('staff.createdAt', 'Created')}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>{t('staff.actions', 'Actions')}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {staffMembers.map((staff) => (
                      <TableRow key={staff.id} hover>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {staff.ownerName || t('staff.noName', 'No name')}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Email sx={{ fontSize: 16, color: 'text.secondary' }} />
                            <Typography variant="body2">{staff.email}</Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={t('staff.staffRole', 'Staff')}
                            color="primary"
                            size="small"
                            variant="outlined"
                            sx={{ fontWeight: 600, fontSize: '0.75rem' }}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {formatDate(staff.createdAt)}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <IconButton
                            size="small"
                            onClick={() => handleEditStaff(staff)}
                            sx={{
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
                            onClick={() => handleDeleteClick(staff)}
                            sx={{
                              ml: 1,
                              color: 'error.main',
                              '&:hover': {
                                backgroundColor: 'error.main',
                                color: 'white'
                              }
                            }}
                          >
                            <Delete fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>
        </Paper>

        {/* Staff Dialog */}
        <Dialog
          open={staffDialog}
          onClose={() => setStaffDialog(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle sx={{ pb: 1, fontWeight: 700 }}>
            {editingStaff
              ? t('staff.editStaff', 'Edit Staff Member')
              : t('staff.createStaff', 'Create New Staff Member')}
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={3} sx={{ mt: 1 }}>
              <Grid size={{ xs: 12 }}>
                <DarkTextField
                  label={t('staff.staffName', 'Staff Name')}
                  value={staffForm.ownerName}
                  onChange={(e) => setStaffForm({ ...staffForm, ownerName: e.target.value })}
                  fullWidth
                  placeholder={t('staff.staffNamePlaceholder', 'Enter staff name')}
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <DarkTextField
                  label={t('staff.email', 'Email')}
                  type="email"
                  value={staffForm.email}
                  onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })}
                  fullWidth
                  required
                  placeholder={t('staff.emailPlaceholder', 'staff@example.com')}
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <DarkTextField
                  label={editingStaff
                    ? t('staff.passwordOptional', 'Password (leave empty to keep current)')
                    : t('staff.password', 'Password')}
                  type={showPassword ? 'text' : 'password'}
                  value={staffForm.password}
                  onChange={(e) => setStaffForm({ ...staffForm, password: e.target.value })}
                  fullWidth
                  required={!editingStaff}
                  placeholder={t('staff.passwordPlaceholder', 'Minimum 6 characters')}
                  slotProps={{
                    input: {
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            onClick={() => setShowPassword(!showPassword)}
                            edge="end"
                            size="small"
                          >
                            {showPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      )
                    }
                  }}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ p: 3, gap: 1 }}>
            <Button
              onClick={() => setStaffDialog(false)}
              disabled={saving}
              sx={{
                borderRadius: 2,
                fontWeight: 600,
                textTransform: 'none',
                color: 'text.primary'
              }}
            >
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button
              onClick={handleSaveStaff}
              variant="contained"
              disabled={saving || !staffForm.email || (!editingStaff && !staffForm.password)}
              sx={{
                borderRadius: 2,
                fontWeight: 600,
                textTransform: 'none',
                boxShadow: 2,
                '&:hover': { boxShadow: 4 }
              }}
            >
              {saving ? <CircularProgress size={20} /> : (editingStaff ? t('common.update', 'Update') : t('common.create', 'Create'))}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog
          open={deleteDialog}
          onClose={() => setDeleteDialog(false)}
          maxWidth="xs"
          fullWidth
        >
          <DialogTitle sx={{ fontWeight: 700 }}>
            {t('staff.deleteStaff', 'Delete Staff Member')}
          </DialogTitle>
          <DialogContent>
            <Typography variant="body1">
              {t('staff.deleteConfirm', 'Are you sure you want to delete this staff member?')}
            </Typography>
            {deletingStaff && (
              <Box sx={{ mt: 2, p: 2, backgroundColor: 'grey.100', borderRadius: 2 }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {deletingStaff.ownerName || t('staff.noName', 'No name')}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {deletingStaff.email}
                </Typography>
              </Box>
            )}
            <Typography variant="body2" color="error" sx={{ mt: 2 }}>
              {t('staff.deleteWarning', 'This action cannot be undone.')}
            </Typography>
          </DialogContent>
          <DialogActions sx={{ p: 3, gap: 1 }}>
            <Button
              onClick={() => setDeleteDialog(false)}
              disabled={saving}
              sx={{
                borderRadius: 2,
                fontWeight: 600,
                textTransform: 'none',
                color: 'text.primary'
              }}
            >
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button
              onClick={handleConfirmDelete}
              variant="contained"
              color="error"
              disabled={saving}
              sx={{
                borderRadius: 2,
                fontWeight: 600,
                textTransform: 'none',
                boxShadow: 2,
                '&:hover': { boxShadow: 4 }
              }}
            >
              {saving ? <CircularProgress size={20} /> : t('common.delete', 'Delete')}
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
