'use client';

import { 
  Box, 
  Container, 
  Typography, 
  Button, 
  Stack, 
  Card, 
  CardContent,
  Grid,
  Fab,
  Paper
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import FavoriteIcon from '@mui/icons-material/Favorite';
import NavigationIcon from '@mui/icons-material/Navigation';
import { useSession } from 'next-auth/react';
import { useTheme } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Navbar } from '@/lib/components/Navbar';
import { LanguageSwitcher } from '@/lib/components/LanguageSwitcher';
import { PageTitle } from '@/lib/components/PageTitle';

export default function Home() {
  const { data: session } = useSession();
  const theme = useTheme();
  const { t } = useTranslation();
  const [userExists, setUserExists] = useState<boolean>(false);
  const [restaurantName, setRestaurantName] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const checkUserExists = async () => {
      try {
        const response = await fetch('/api/check-user-exists');
        const data = await response.json();
        setUserExists(data.userExists);
        setRestaurantName(data.restaurantName);
      } catch (error) {
        setUserExists(false);
      } finally {
        setLoading(false);
      }
    };

    checkUserExists();
  }, []);

  return (
    <>
      <Navbar 
        rightAction={<LanguageSwitcher />}
      />

      <Container maxWidth="lg" sx={{ mt: { xs: 2, md: 4 }, mb: { xs: 2, md: 4 }, px: { xs: 2, sm: 3, md: 4 } }}>
        <Box sx={{ textAlign: 'center', mb: { xs: 3, md: 4 } }}>
          {/* Logo Display */}
          <Box sx={{ mb: { xs: 2, md: 3 }, display: 'flex', justifyContent: 'center' }}>
            <Image
              src="/logo.png"
              alt="MeFood Logo"
              width={120}
              height={120}
              style={{ objectFit: 'contain' }}
              priority
            />
          </Box>
          
          <Typography 
            variant="h2" 
            component="h1" 
            gutterBottom
            sx={{ 
              fontSize: { xs: '2rem', sm: '2.5rem', md: '3rem' },
              fontWeight: 700,
              color: theme.palette.primary.dark
            }}
          >
            {userExists && restaurantName ? restaurantName : t('home.title')}
          </Typography>
          <Typography 
            variant="h6" 
            color="text.secondary"
            sx={{ 
              fontSize: { xs: '1rem', md: '1.25rem' },
              mb: { xs: 2, md: 3 }
            }}
          >
            {userExists && restaurantName ? 'Restaurant Management System' : t('home.subtitle')}
          </Typography>
        </Box>

        <Paper 
          elevation={3} 
          sx={{ 
            p: { xs: 2, sm: 3 }, 
            mt: { xs: 3, md: 4 },
            mb: { xs: 3, md: 4 },
            background: `linear-gradient(135deg, rgba(163, 220, 154, 0.08) 0%, rgba(163, 220, 154, 0.02) 100%)`
          }}
        >
          <Typography 
            variant="h6" 
            gutterBottom
            sx={{ 
              fontSize: { xs: '1.125rem', sm: '1.25rem' },
              fontWeight: 600,
              color: theme.palette.primary.dark
            }}
          >
            {userExists && restaurantName ? `Welcome to ${restaurantName}` : t('home.footer.ready')}
          </Typography>
          <Typography 
            variant="body1" 
            color="text.secondary" 
            sx={{ mb: 3, fontSize: { xs: '0.875rem', sm: '1rem' } }}
          >
            {userExists && restaurantName ? 'Access your restaurant management dashboard' : t('home.footer.description')}
          </Typography>
          {!session && !loading && (
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 2 }}>
              {!userExists && (
                <Button 
                  variant="contained" 
                  component={Link}
                  href="/auth/signup"
                  sx={{ px: 4 }}
                >
                  {t('home.getStarted')}
                </Button>
              )}
              <Button 
                variant="outlined" 
                component={Link}
                href="/auth/signin"
                sx={{ px: 4 }}
              >
                {t('home.signIn')}
              </Button>
            </Stack>
          )}
        </Paper>

        <Grid container spacing={{ xs: 2, sm: 2, md: 3 }}>
          <Grid size={{ xs: 12, sm: 4, md: 4 }}>
            <Card 
              sx={{ 
                height: '100%',
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 6
                }
              }}
            >
              <CardContent sx={{ 
                p: { xs: 2, sm: 2.5, md: 3 },
                display: 'flex',
                flexDirection: 'column',
                height: '100%'
              }}>
                <Typography 
                  variant="h5" 
                  component="h2" 
                  gutterBottom
                  sx={{ 
                    fontSize: { xs: '1.125rem', sm: '1.25rem', md: '1.5rem' },
                    fontWeight: 600,
                    color: theme.palette.primary.dark
                  }}
                >
                  {t('home.features.tableManagement.title')}
                </Typography>
                <Typography 
                  color="text.secondary"
                  sx={{ 
                    fontSize: { xs: '0.875rem', md: '1rem' },
                    flexGrow: 1,
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  {t('home.features.tableManagement.description')}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 4, md: 4 }}>
            <Card 
              sx={{ 
                height: '100%',
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 6
                }
              }}
            >
              <CardContent sx={{ 
                p: { xs: 2, sm: 2.5, md: 3 },
                display: 'flex',
                flexDirection: 'column',
                height: '100%'
              }}>
                <Typography 
                  variant="h5" 
                  component="h2" 
                  gutterBottom
                  sx={{ 
                    fontSize: { xs: '1.125rem', sm: '1.25rem', md: '1.5rem' },
                    fontWeight: 600,
                    color: theme.palette.primary.dark
                  }}
                >
                  {t('home.features.orderPayment.title')}
                </Typography>
                <Typography 
                  color="text.secondary"
                  sx={{ 
                    fontSize: { xs: '0.875rem', md: '1rem' },
                    flexGrow: 1,
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  {t('home.features.orderPayment.description')}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 4, md: 4 }}>
            <Card 
              sx={{ 
                height: '100%',
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 6
                }
              }}
            >
              <CardContent sx={{ 
                p: { xs: 2, sm: 2.5, md: 3 },
                display: 'flex',
                flexDirection: 'column',
                height: '100%'
              }}>
                <Typography 
                  variant="h5" 
                  component="h2" 
                  gutterBottom
                  sx={{ 
                    fontSize: { xs: '1.125rem', sm: '1.25rem', md: '1.5rem' },
                    fontWeight: 600,
                    color: theme.palette.primary.dark
                  }}
                >
                  {t('home.features.restaurantManagement.title')}
                </Typography>
                <Typography 
                  color="text.secondary"
                  sx={{ 
                    fontSize: { xs: '0.875rem', md: '1rem' },
                    flexGrow: 1,
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  {t('home.features.restaurantManagement.description')}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>
    </>
  );
}
