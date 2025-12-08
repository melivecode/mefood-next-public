'use client'

import { 
  Box, 
  Container, 
  Typography, 
  Link, 
  Divider,
  Stack,
  useTheme,
  useMediaQuery 
} from '@mui/material'
import { 
  YouTube, 
  Facebook,
  Language
} from '@mui/icons-material'

export function Footer() {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

  return (
    <Box
      component="footer"
      sx={{
        mt: 'auto',
        py: { xs: 3, sm: 4 },
        px: { xs: 2, sm: 3 },
        backgroundColor: theme.palette.grey[50],
        borderTop: `1px solid ${theme.palette.divider}`,
        flexShrink: 0
      }}
    >
      <Container maxWidth="lg">
        {isMobile ? (
          // Mobile Layout - Stacked
          <Stack spacing={3} alignItems="center" textAlign="center">
            {/* Developer Section */}
            <Box>
              <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                Developer
              </Typography>
              <Typography variant="body2" color="text.primary">
                Karn Yongsiriwit
              </Typography>
              <Typography variant="body2" color="text.secondary">
                กานต์ ยงศิริวิทย์
              </Typography>
            </Box>

            <Divider sx={{ width: '100%' }} />

            {/* Follow Me Section */}
            <Box>
              <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                Follow Me
              </Typography>
              <Stack direction="column" spacing={1} alignItems="center">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Language fontSize="small" sx={{ color: '#2E5E45' }} />
                  <Link 
                    href="https://melivecode.com" 
                    target="_blank" 
                    color="inherit" 
                    underline="hover"
                    variant="body2"
                  >
                    melivecode.com
                  </Link>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <YouTube fontSize="small" sx={{ color: '#FF0000' }} />
                  <Link 
                    href="https://youtube.com/@melivecode" 
                    target="_blank" 
                    color="inherit" 
                    underline="hover"
                    variant="body2"
                  >
                    @melivecode
                  </Link>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Facebook fontSize="small" sx={{ color: '#1877F2' }} />
                  <Link 
                    href="https://facebook.com/melivecode" 
                    target="_blank" 
                    color="inherit" 
                    underline="hover"
                    variant="body2"
                  >
                    melivecode
                  </Link>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Language fontSize="small" sx={{ color: '#1976d2' }} />
                  <Link 
                    href="https://mefood.melivecode.com/" 
                    target="_blank" 
                    color="inherit" 
                    underline="hover"
                    variant="body2"
                  >
                    MeFood
                  </Link>
                </Box>
              </Stack>
            </Box>

            <Divider sx={{ width: '100%' }} />

            {/* Legal Section */}
            <Box>
              <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                Legal
              </Typography>
              <Stack spacing={1} alignItems="center">
                <Link href="/privacy" color="inherit" underline="hover" variant="body2">
                  Privacy Policy
                </Link>
                <Link href="/terms" color="inherit" underline="hover" variant="body2">
                  User Agreement
                </Link>
                <Link href="/privacy-notice" color="inherit" underline="hover" variant="body2">
                  Privacy Notice
                </Link>
              </Stack>
            </Box>

            <Divider sx={{ width: '100%' }} />

            {/* Copyright */}
            <Typography variant="caption" color="text.secondary" textAlign="center">
              © 2025 MeFood. Built by Karn Yongsiriwit.
            </Typography>
          </Stack>
        ) : (
          // Desktop Layout - Grid
          <Box>
            <Box 
              sx={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: { sm: 3, md: 4 },
                mb: 3
              }}
            >
              {/* Developer Section */}
              <Box>
                <Typography variant="subtitle2" fontWeight={600} gutterBottom sx={{ color: 'primary.dark' }}>
                  Developer
                </Typography>
                <Typography variant="body2" color="text.primary" gutterBottom>
                  Karn Yongsiriwit
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  กานต์ ยงศิริวิทย์
                </Typography>
              </Box>

              {/* Follow Me Section */}
              <Box>
                <Typography variant="subtitle2" fontWeight={600} gutterBottom sx={{ color: 'primary.dark' }}>
                  Follow Me
                </Typography>
                <Stack spacing={1}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Language fontSize="small" sx={{ color: '#2E5E45' }} />
                    <Link 
                      href="https://melivecode.com" 
                      target="_blank" 
                      color="inherit" 
                      underline="hover"
                      variant="body2"
                    >
                      melivecode.com
                    </Link>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <YouTube fontSize="small" sx={{ color: '#FF0000' }} />
                    <Link 
                      href="https://youtube.com/@melivecode" 
                      target="_blank" 
                      color="inherit" 
                      underline="hover"
                      variant="body2"
                    >
                      YouTube - @melivecode
                    </Link>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Facebook fontSize="small" sx={{ color: '#1877F2' }} />
                    <Link 
                      href="https://facebook.com/melivecode" 
                      target="_blank" 
                      color="inherit" 
                      underline="hover"
                      variant="body2"
                    >
                      Facebook - melivecode
                    </Link>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Language fontSize="small" sx={{ color: '#1976d2' }} />
                    <Link 
                      href="https://mefood.melivecode.com/" 
                      target="_blank" 
                      color="inherit" 
                      underline="hover"
                      variant="body2"
                    >
                      MeFood
                    </Link>
                  </Box>
                </Stack>
              </Box>

              {/* Legal Section */}
              <Box>
                <Typography variant="subtitle2" fontWeight={600} gutterBottom sx={{ color: 'primary.dark' }}>
                  Legal
                </Typography>
                <Stack spacing={0.5}>
                  <Link href="/privacy" color="inherit" underline="hover" variant="body2">
                    Privacy Policy
                  </Link>
                  <Link href="/terms" color="inherit" underline="hover" variant="body2">
                    User Agreement
                  </Link>
                  <Link href="/privacy-notice" color="inherit" underline="hover" variant="body2">
                    Privacy Notice
                  </Link>
                </Stack>
              </Box>
            </Box>

            <Divider sx={{ mb: 2 }} />

            {/* Copyright */}
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                © 2025 MeFood. Built by Karn Yongsiriwit.
              </Typography>
            </Box>
          </Box>
        )}
      </Container>
    </Box>
  )
}