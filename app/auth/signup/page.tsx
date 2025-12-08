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
  InputAdornment
} from '@mui/material';
import {
  Visibility,
  VisibilityOff
} from '@mui/icons-material';
import Link from 'next/link';
import { Navbar } from '@/lib/components/Navbar';
import { LanguageSwitcher } from '@/lib/components/LanguageSwitcher';
import { useTranslation } from 'react-i18next';

export default function SignUp() {
  const { t } = useTranslation();
  const router = useRouter();
  const [ownerName, setOwnerName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [restaurantName, setRestaurantName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingUser, setCheckingUser] = useState(true);

  useEffect(() => {
    const checkUserExists = async () => {
      try {
        const response = await fetch('/api/check-user-exists');
        const data = await response.json();
        
        if (data.userExists) {
          // If a user already exists, redirect to signin
          router.push('/auth/signin');
          return;
        }
      } catch (error) {
        // Error checking user existence
      } finally {
        setCheckingUser(false);
      }
    };

    checkUserExists();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
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
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ownerName,
          email,
          password,
          restaurantName,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Something went wrong');
      }

      // Auto sign in after successful registration
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError(t('auth.signup.accountCreatedSignInFailed'));
      } else {
        router.push('/restaurant');
      }
    } catch (error: any) {
      setError(error.message || t('auth.signup.errorOccurred'));
    } finally {
      setLoading(false);
    }
  };


  // Show loading while checking if user exists
  if (checkingUser) {
    return (
      <>
        <Navbar rightAction={<LanguageSwitcher />} />
        <Container component="main" maxWidth="sm">
          <Box
            sx={{
              mt: 2,
              py: 4,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Typography variant="h6" color="text.secondary">
              {t('common.loading')}...
            </Typography>
          </Box>
        </Container>
      </>
    );
  }

  return (
    <>
      <Navbar rightAction={<LanguageSwitcher />} />
      <Container component="main" maxWidth="sm">
      <Box
        sx={{
          mt: 2,
          py: 4,
        }}
      >
        <Paper elevation={3} sx={{ p: 4, width: '100%' }}>
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <Typography component="h1" variant="h4" gutterBottom>
              {t('auth.signup.title')}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t('auth.signup.subtitle')}
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit}>
            <Stack spacing={3}>
              <TextField
                fullWidth
                id="ownerName"
                label={t('auth.signup.fullName')}
                name="ownerName"
                autoComplete="name"
                autoFocus
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                required
                disabled={loading}
              />

              <TextField
                fullWidth
                id="restaurantName"
                label="Restaurant Name"
                name="restaurantName"
                value={restaurantName}
                onChange={(e) => setRestaurantName(e.target.value)}
                required
                disabled={loading}
              />

              <TextField
                fullWidth
                id="email"
                label={t('auth.signup.email')}
                name="email"
                autoComplete="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
              
              <TextField
                fullWidth
                name="password"
                label={t('auth.signup.password')}
                type={showPassword ? 'text' : 'password'}
                id="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="toggle password visibility"
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />

              <TextField
                fullWidth
                name="confirmPassword"
                label={t('auth.signup.confirmPassword')}
                type={showConfirmPassword ? 'text' : 'password'}
                id="confirmPassword"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={loading}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="toggle confirm password visibility"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        edge="end"
                      >
                        {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />

              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                disabled={loading || !ownerName || !email || !password || !confirmPassword || !restaurantName}
                sx={{ mt: 3, mb: 2 }}
              >
                {loading ? t('auth.signup.signingUp') : t('auth.signup.signUpButton')}
              </Button>

              <Box sx={{ textAlign: 'center', mt: 3 }}>
                <Typography variant="body2" color="text.secondary">
                  {t('auth.signup.alreadyHaveAccount')}{' '}
                  <Link href="/auth/signin" style={{ textDecoration: 'none' }}>
                    <Typography component="span" color="primary" sx={{ cursor: 'pointer' }}>
                      {t('auth.signup.signInHere')}
                    </Typography>
                  </Link>
                </Typography>
              </Box>
            </Stack>
          </Box>
        </Paper>
      </Box>
    </Container>
    </>
  );
}