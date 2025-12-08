'use client';

import { useState, useEffect, Suspense } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
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

function SignInContent() {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [restaurantName, setRestaurantName] = useState<string | null>(null);
  const [checkingUser, setCheckingUser] = useState(true);

  // Get URL parameters
  const callbackUrl = searchParams.get('callbackUrl') || '/';
  const urlError = searchParams.get('error');

  // Check if user exists and get restaurant name
  useEffect(() => {
    const checkUserExists = async () => {
      try {
        const response = await fetch('/api/check-user-exists');
        const data = await response.json();
        setRestaurantName(data.restaurantName);
      } catch (error) {
        setRestaurantName(null);
      } finally {
        setCheckingUser(false);
      }
    };

    checkUserExists();
  }, []);

  // Handle URL errors on component mount
  useEffect(() => {
    if (urlError) {
      switch (urlError) {
        case 'OAuthAccountNotLinked':
          setError(t('auth.signin.oauthAccountNotLinked'));
          break;
        default:
          setError(t('auth.signin.errorOccurred'));
          break;
      }
    }
  }, [urlError, t]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError(t('auth.signin.invalidCredentials'));
      } else {
        // Redirect to callback URL or restaurant dashboard
        const decodedCallbackUrl = decodeURIComponent(callbackUrl);
        if (decodedCallbackUrl && decodedCallbackUrl !== '/') {
          router.push(decodedCallbackUrl);
        } else {
          router.push('/restaurant');
        }
      }
    } catch (error) {
      setError(t('auth.signin.errorOccurred'));
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
              Loading...
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
              {restaurantName ? `Sign in to ${restaurantName}` : t('auth.signin.title')}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {restaurantName ? 'Access your restaurant management system' : t('auth.signin.subtitle')}
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
                id="email"
                label={t('auth.signin.email')}
                name="email"
                autoComplete="email"
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
              
              <TextField
                fullWidth
                name="password"
                label={t('auth.signin.password')}
                type={showPassword ? 'text' : 'password'}
                id="password"
                autoComplete="current-password"
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

              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                disabled={loading || !email || !password}
                sx={{ mt: 3, mb: 2 }}
              >
                {loading ? t('auth.signin.signingIn') : t('auth.signin.signInButton')}
              </Button>

              {!restaurantName && (
                <Box sx={{ textAlign: 'center', mt: 3 }}>
                  <Typography variant="body2" color="text.secondary">
                    {t('auth.signin.noAccount')}{' '}
                    <Link href="/auth/signup" style={{ textDecoration: 'none' }}>
                      <Typography component="span" color="primary" sx={{ cursor: 'pointer' }}>
                        {t('auth.signin.signUpHere')}
                      </Typography>
                    </Link>
                  </Typography>
                </Box>
              )}
            </Stack>
          </Box>
        </Paper>
      </Box>
    </Container>
    </>
  );
}

export default function SignIn() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SignInContent />
    </Suspense>
  );
}