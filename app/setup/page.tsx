'use client';

import { useState, useEffect } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Stack,
  Alert,
  IconButton,
  InputAdornment,
  Stepper,
  Step,
  StepLabel,
  CircularProgress,
  Card,
  CardContent,
  Chip
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Restaurant as RestaurantIcon,
  Storage as DatabaseIcon,
  CheckCircle,
  Error as ErrorIcon,
  Refresh,
  Person
} from '@mui/icons-material';
import { Navbar } from '@/lib/components/Navbar';
import { LanguageSwitcher } from '@/lib/components/LanguageSwitcher';
import { useTranslation } from 'react-i18next';

type SetupStatus = {
  databaseConnected: boolean
  tablesExist: boolean
  hasAdminUser: boolean
  hasRestaurant: boolean
  needsSetup: boolean
  error?: string
}

// Simplified steps for serverless (no "Create Tables" UI - must run locally)
const steps = ['Database', 'Admin Account', 'Complete'];

export default function Setup() {
  const { t } = useTranslation();
  const router = useRouter();

  // Stepper state
  const [activeStep, setActiveStep] = useState(0);

  // Setup status
  const [status, setStatus] = useState<SetupStatus | null>(null);
  const [checkingStatus, setCheckingStatus] = useState(true);

  // Form states
  const [adminName, setAdminName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [restaurantName, setRestaurantName] = useState('');
  const [restaurantAddress, setRestaurantAddress] = useState('');
  const [restaurantPhone, setRestaurantPhone] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Loading and error states
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Check setup status on mount
  useEffect(() => {
    checkSetupStatus();
  }, []);

  const checkSetupStatus = async () => {
    setCheckingStatus(true);
    try {
      const response = await fetch('/api/setup/status');
      const data: SetupStatus = await response.json();
      setStatus(data);

      // Determine which step to show (simplified: Database → Admin → Complete)
      if (!data.databaseConnected || !data.tablesExist) {
        // Database not connected or tables not created
        setActiveStep(0);
      } else if (!data.hasAdminUser) {
        // Tables exist, need admin account
        setActiveStep(1);
      } else {
        // Setup complete, redirect
        router.push('/auth/signin');
      }
    } catch {
      setStatus({
        databaseConnected: false,
        tablesExist: false,
        hasAdminUser: false,
        hasRestaurant: false,
        needsSetup: true,
        error: 'Failed to check setup status'
      });
      setActiveStep(0);
    } finally {
      setCheckingStatus(false);
    }
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError(t('auth.signup.passwordsNotMatch'));
      return;
    }

    if (password.length < 6) {
      setError(t('auth.signup.passwordTooShort'));
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/setup/create-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminName: adminName.trim(),
          adminEmail: email.trim(),
          adminPassword: password,
          restaurantName: restaurantName.trim(),
          restaurantAddress: restaurantAddress.trim(),
          restaurantPhone: restaurantPhone.trim()
        })
      });

      const data = await response.json();

      if (data.success) {
        setActiveStep(2); // Move to complete step

        // Auto sign in
        const result = await signIn('credentials', {
          email: email.trim(),
          password,
          redirect: false
        });

        if (result?.ok) {
          // Wait a moment then redirect
          setTimeout(() => {
            router.push('/restaurant');
          }, 2000);
        }
      } else {
        setError(data.error || 'Failed to create admin account');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create admin');
    } finally {
      setLoading(false);
    }
  };

  // Loading state
  if (checkingStatus) {
    return (
      <>
        <Navbar rightAction={<LanguageSwitcher />} />
        <Container component="main" maxWidth="md">
          <Box sx={{ mt: 8, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <CircularProgress size={60} />
            <Typography variant="h6" sx={{ mt: 2 }}>
              Checking system status...
            </Typography>
          </Box>
        </Container>
      </>
    );
  }

  return (
    <>
      <Navbar rightAction={<LanguageSwitcher />} />
      <Container component="main" maxWidth="md">
        <Box sx={{ mt: 4, mb: 4 }}>
          {/* Header */}
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <RestaurantIcon sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
            <Typography variant="h3" component="h1" gutterBottom fontWeight={700}>
              MeFood Setup
            </Typography>
            <Typography variant="h6" color="text.secondary">
              Welcome! Let&apos;s set up your restaurant management system.
            </Typography>
          </Box>

          {/* Stepper */}
          <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          {/* Step Content */}
          <Paper elevation={3} sx={{ p: 4 }}>
            {/* Step 0: Database Connection & Tables */}
            {activeStep === 0 && (
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                  <DatabaseIcon sx={{ fontSize: 40, mr: 2, color: 'primary.main' }} />
                  <Box>
                    <Typography variant="h5" fontWeight={600}>
                      Database Setup
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Connect database and create tables
                    </Typography>
                  </Box>
                </Box>

                {/* Connection Status */}
                <Card variant="outlined" sx={{ mb: 2 }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        {status?.databaseConnected ? (
                          <CheckCircle sx={{ color: 'success.main', mr: 2 }} />
                        ) : (
                          <ErrorIcon sx={{ color: 'error.main', mr: 2 }} />
                        )}
                        <Box>
                          <Typography variant="subtitle1" fontWeight={600}>
                            Database Connection
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {status?.databaseConnected ? 'Connected' : 'Not connected'}
                          </Typography>
                        </Box>
                      </Box>
                      <Chip
                        label={status?.databaseConnected ? 'OK' : 'Error'}
                        color={status?.databaseConnected ? 'success' : 'error'}
                        size="small"
                      />
                    </Box>
                  </CardContent>
                </Card>

                {/* Tables Status */}
                <Card variant="outlined" sx={{ mb: 3 }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        {status?.tablesExist ? (
                          <CheckCircle sx={{ color: 'success.main', mr: 2 }} />
                        ) : (
                          <ErrorIcon sx={{ color: 'error.main', mr: 2 }} />
                        )}
                        <Box>
                          <Typography variant="subtitle1" fontWeight={600}>
                            Database Tables
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {status?.tablesExist ? 'Tables exist' : 'Tables not created'}
                          </Typography>
                        </Box>
                      </Box>
                      <Chip
                        label={status?.tablesExist ? 'OK' : 'Missing'}
                        color={status?.tablesExist ? 'success' : 'error'}
                        size="small"
                      />
                    </Box>
                  </CardContent>
                </Card>

                {/* Instructions based on what's missing */}
                {!status?.databaseConnected && (
                  <Alert severity="warning" sx={{ mb: 3 }}>
                    <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                      Configure DATABASE_URL
                    </Typography>
                    <Typography variant="body2" component="ol" sx={{ pl: 2, mb: 2 }}>
                      <li>Add <code>DATABASE_URL</code> environment variable</li>
                      <li>Use a hosted MySQL database (PlanetScale, Railway, Aiven)</li>
                      <li>Redeploy or restart the application</li>
                    </Typography>
                    <Paper variant="outlined" sx={{ p: 2, bgcolor: 'grey.900', color: 'grey.100', fontFamily: 'monospace', fontSize: '0.85rem' }}>
                      DATABASE_URL=&quot;mysql://USER:PASSWORD@HOST:PORT/DATABASE&quot;
                    </Paper>
                  </Alert>
                )}

                {status?.databaseConnected && !status?.tablesExist && (
                  <Alert severity="warning" sx={{ mb: 3 }}>
                    <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                      Create Database Tables
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 2 }}>
                      Run this command locally (with your production DATABASE_URL):
                    </Typography>
                    <Paper variant="outlined" sx={{ p: 2, bgcolor: 'grey.900', color: 'grey.100', fontFamily: 'monospace', fontSize: '0.85rem', mb: 2 }}>
                      npx prisma db push
                    </Paper>
                    <Typography variant="body2">
                      After running the migration, click &quot;Refresh&quot; to check.
                    </Typography>
                  </Alert>
                )}

                {status?.error && (
                  <Alert severity="error" sx={{ mb: 3 }}>
                    {status.error}
                  </Alert>
                )}

                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Button
                    variant="outlined"
                    startIcon={<Refresh />}
                    onClick={checkSetupStatus}
                  >
                    Refresh
                  </Button>
                  {status?.databaseConnected && status?.tablesExist && (
                    <Button
                      variant="contained"
                      onClick={() => setActiveStep(1)}
                    >
                      Continue
                    </Button>
                  )}
                </Box>
              </Box>
            )}

            {/* Step 1: Create Admin Account */}
            {activeStep === 1 && (
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                  <Person sx={{ fontSize: 40, mr: 2, color: 'primary.main' }} />
                  <Box>
                    <Typography variant="h5" fontWeight={600}>
                      Create Admin Account
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Set up your administrator account and restaurant
                    </Typography>
                  </Box>
                </Box>

                {error && (
                  <Alert severity="error" sx={{ mb: 3 }}>
                    {error}
                  </Alert>
                )}

                <Box component="form" onSubmit={handleCreateAdmin}>
                  <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
                    Restaurant Information
                  </Typography>
                  <Stack spacing={2} sx={{ mb: 4 }}>
                    <TextField
                      fullWidth
                      label="Restaurant Name"
                      value={restaurantName}
                      onChange={(e) => setRestaurantName(e.target.value)}
                      required
                      disabled={loading}
                    />
                    <TextField
                      fullWidth
                      label="Address (optional)"
                      value={restaurantAddress}
                      onChange={(e) => setRestaurantAddress(e.target.value)}
                      disabled={loading}
                    />
                    <TextField
                      fullWidth
                      label="Phone (optional)"
                      value={restaurantPhone}
                      onChange={(e) => setRestaurantPhone(e.target.value)}
                      disabled={loading}
                    />
                  </Stack>

                  <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
                    Admin Account
                  </Typography>
                  <Stack spacing={2}>
                    <TextField
                      fullWidth
                      label={t('auth.signup.fullName')}
                      value={adminName}
                      onChange={(e) => setAdminName(e.target.value)}
                      required
                      disabled={loading}
                    />
                    <TextField
                      fullWidth
                      label={t('auth.signup.email')}
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={loading}
                    />
                    <TextField
                      fullWidth
                      label={t('auth.signup.password')}
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={loading}
                      helperText="Minimum 6 characters"
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              onClick={() => setShowPassword(!showPassword)}
                              edge="end"
                            >
                              {showPassword ? <VisibilityOff /> : <Visibility />}
                            </IconButton>
                          </InputAdornment>
                        )
                      }}
                    />
                    <TextField
                      fullWidth
                      label={t('auth.signup.confirmPassword')}
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      disabled={loading}
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              edge="end"
                            >
                              {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                            </IconButton>
                          </InputAdornment>
                        )
                      }}
                    />
                  </Stack>

                  <Stack direction="row" spacing={2} sx={{ mt: 4 }}>
                    <Button
                      variant="outlined"
                      onClick={() => setActiveStep(0)}
                      disabled={loading}
                    >
                      Back
                    </Button>
                    <Button
                      type="submit"
                      variant="contained"
                      disabled={loading || !adminName || !email || !password || !confirmPassword || !restaurantName}
                      startIcon={loading && <CircularProgress size={20} />}
                    >
                      {loading ? 'Creating...' : 'Create Account'}
                    </Button>
                  </Stack>
                </Box>
              </Box>
            )}

            {/* Step 2: Complete */}
            {activeStep === 2 && (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <CheckCircle sx={{ fontSize: 80, color: 'success.main', mb: 2 }} />
                <Typography variant="h4" fontWeight={700} gutterBottom>
                  Setup Complete!
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
                  Your MeFood system is ready to use. Redirecting to your dashboard...
                </Typography>
                <CircularProgress />
              </Box>
            )}
          </Paper>
        </Box>
      </Container>
    </>
  );
}
