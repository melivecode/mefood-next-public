'use client'

import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  Box,
  Typography,
  Divider,
  Stack,
  Alert,
  Button,
  Modal,
  IconButton
} from '@mui/material'
import { Close as CloseIcon } from '@mui/icons-material'
import { useTranslation } from 'react-i18next'
import QRCode from 'qrcode'
import Image from 'next/image'

interface SelectionOption {
  id: string
  name: string
  priceAdd: number
}

interface Selection {
  id: string
  name: string
  options: SelectionOption[]
}

interface MenuItem {
  id: string
  name: string
  description: string | null
  price: number
  categoryId: string
  available: boolean
  imageUrl: string | null
  selections?: Selection[]
}

interface Category {
  id: string
  name: string
  description: string | null
  displayOrder: number
  items?: MenuItem[]
}

interface Restaurant {
  id: string
  name: string
  description: string | null
  address: string | null
  phone: string | null
}

interface MenuData {
  restaurant: Restaurant
  menuItems: MenuItem[]
}

export default function PublicMenuPage() {
  const params = useParams()
  const { t } = useTranslation()
  const [menuData, setMenuData] = useState<MenuData | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('')
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null)
  const [selectedQR, setSelectedQR] = useState<string | null>(null)

  const restaurantId = params.id as string

  useEffect(() => {
    const fetchMenu = async () => {
      if (!restaurantId) {
        setError('Restaurant ID not found')
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        const response = await fetch(`/api/menu/${restaurantId}`)
        if (!response.ok) {
          throw new Error('Failed to fetch menu')
        }
        const data: MenuData = await response.json()
        setMenuData(data)
        
        // Group items by category
        const categoryMap = new Map<string, Category>()
        
        data.menuItems.forEach((item: MenuItem) => {
          if (!categoryMap.has(item.categoryId)) {
            categoryMap.set(item.categoryId, {
              id: item.categoryId,
              name: 'Category',
              description: null,
              displayOrder: 0,
              items: []
            })
          }
          categoryMap.get(item.categoryId)?.items?.push(item)
        })

        // Fetch categories to get proper names
        const categoriesResponse = await fetch(`/api/menu/${restaurantId}/categories`)
        if (categoriesResponse.ok) {
          const categoriesData = await categoriesResponse.json()
          categoriesData.forEach((cat: Category) => {
            if (categoryMap.has(cat.id)) {
              const category = categoryMap.get(cat.id)!
              category.name = cat.name
              category.description = cat.description
              category.displayOrder = cat.displayOrder
            }
          })
        }

        const sortedCategories = Array.from(categoryMap.values()).sort((a, b) => a.displayOrder - b.displayOrder)
        setCategories(sortedCategories)

        // Generate QR code for current page URL
        const currentUrl = window.location.href
        const qrDataUrl = await QRCode.toDataURL(currentUrl, {
          width: 200,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          },
          errorCorrectionLevel: 'M'
        })
        setQrCodeUrl(qrDataUrl)

        setError(null)
      } catch (err) {
        // Error fetching menu
        setError('Failed to load menu')
      } finally {
        setLoading(false)
      }
    }

    fetchMenu()
  }, [restaurantId])

  const formatPrice = (price: number) => {
    return `B ${price}`
  }

  const handlePrint = () => {
    window.print()
  }

  const handleImageClick = (item: MenuItem) => {
    setSelectedItem(item)
  }

  const handleCloseModal = () => {
    setSelectedItem(null)
  }

  const handleQRClick = () => {
    setSelectedQR(qrCodeUrl)
  }

  const handleCloseQRModal = () => {
    setSelectedQR(null)
  }

  if (loading) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="h6">Loading menu...</Typography>
      </Box>
    )
  }

  if (error || !menuData) {
    return (
      <Box sx={{ p: 4 }}>
        <Alert severity="error">
          {error || 'Menu not found'}
        </Alert>
      </Box>
    )
  }

  return (
    <Box 
      sx={{ 
        minHeight: '100vh',
        backgroundColor: 'white',
        fontFamily: 'serif',
        position: 'relative',
        '@media print': {
          backgroundColor: 'white !important',
          '& *': {
            visibility: 'visible !important'
          },
          boxShadow: 'none !important'
        }
      }}
    >
      {/* Print Button - Hidden when printing */}
      <Box sx={{ 
        position: 'fixed', 
        top: 16, 
        right: 16, 
        zIndex: 1000,
        '@media print': {
          display: 'none'
        }
      }}>
        <Button 
          variant="contained" 
          onClick={handlePrint}
          sx={{ backgroundColor: 'primary.main' }}
        >
          Print Menu
        </Button>
      </Box>

      {/* Menu Content */}
      <Box sx={{ 
        maxWidth: '800px',
        margin: '0 auto',
        padding: { xs: 1.5, sm: 2, md: 2.5 },
        paddingTop: { xs: 2, sm: 3 }
      }}>
        {/* QR Code and Restaurant Header */}
        <Box sx={{ textAlign: 'center', mb: 2.5, position: 'relative' }}>
          {/* QR Code - Centered on mobile, top-left on desktop */}
          {qrCodeUrl && (
            <Box sx={{ 
              position: { xs: 'static', sm: 'absolute' },
              top: { sm: 0 },
              left: { sm: 0 },
              display: { xs: 'flex', sm: 'block' },
              justifyContent: { xs: 'center' },
              mb: { xs: 2, sm: 0 },
              zIndex: 100,
              cursor: 'pointer',
              transition: 'transform 0.2s ease',
              '&:hover': {
                transform: 'scale(1.1)'
              },
              '@media print': {
                position: 'absolute',
                top: 0,
                left: 0,
                cursor: 'default',
                '&:hover': {
                  transform: 'none'
                }
              }
            }}>
              <Image
                src={qrCodeUrl}
                alt="Menu QR Code"
                width={80}
                height={80}
                style={{ 
                  border: '2px solid #ddd', 
                  borderRadius: '8px',
                  backgroundColor: 'white'
                }}
                onClick={handleQRClick}
              />
              <style jsx>{`
                @media print {
                  img {
                    width: 120px !important;
                    height: 120px !important;
                    border: 3px solid #333 !important;
                  }
                }
              `}</style>
            </Box>
          )}
          <Typography 
            variant="h2" 
            sx={{ 
              fontWeight: 'bold',
              fontFamily: 'serif',
              color: '#2c3e50',
              fontSize: { xs: '2rem', sm: '2.5rem', md: '3rem' },
              mb: 1,
              letterSpacing: '2px',
              textShadow: '1px 1px 2px rgba(0,0,0,0.1)'
            }}
          >
            {menuData.restaurant.name}
          </Typography>
          
          {menuData.restaurant.description && (
            <Typography 
              variant="h6" 
              sx={{ 
                fontStyle: 'italic',
                color: '#7f8c8d',
                mb: 1.5,
                fontSize: { xs: '1rem', sm: '1.2rem' }
              }}
            >
              {menuData.restaurant.description}
            </Typography>
          )}

          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'center', 
            gap: 3, 
            flexWrap: 'wrap',
            mb: 1
          }}>
            {menuData.restaurant.address && (
              <Typography variant="body1" sx={{ color: '#34495e', fontSize: '1rem' }}>
                📍 {menuData.restaurant.address}
              </Typography>
            )}
            {menuData.restaurant.phone && (
              <Typography variant="body1" sx={{ color: '#34495e', fontSize: '1rem' }}>
                📞 {menuData.restaurant.phone}
              </Typography>
            )}
          </Box>

          <Divider sx={{ 
            mt: 2, 
            mb: 1,
            height: 3,
            backgroundColor: '#34495e',
            border: 'none',
            '&::before, &::after': {
              content: '""',
              flex: 1,
              height: '3px',
              backgroundColor: '#34495e'
            }
          }} />
        </Box>

        {/* Menu Categories */}
        {categories.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Typography variant="h6" color="text.secondary">
              No menu items available
            </Typography>
          </Box>
        ) : (
          <Stack spacing={3}>
            {categories.map((category) => (
              <Box key={category.id} sx={{ mb: 2, pageBreakInside: 'avoid' }}>
                {/* Category Header */}
                <Box sx={{ 
                  mb: 3,
                  textAlign: 'center',
                  '@media print': {
                    mb: 2
                  }
                }}>
                  <Box sx={{
                    display: 'inline-block',
                    position: 'relative',
                    px: 4,
                    py: 1
                  }}>
                    <Typography 
                      variant="h3" 
                      sx={{ 
                        fontWeight: 'bold',
                        fontFamily: 'serif',
                        color: '#2c3e50',
                        fontSize: { xs: '1.8rem', sm: '2.2rem' },
                        mb: 0,
                        textTransform: 'uppercase',
                        letterSpacing: '2px',
                        position: 'relative',
                        '@media print': {
                          fontSize: '1.6rem'
                        },
                        '&::before': {
                          content: '""',
                          position: 'absolute',
                          bottom: '-8px',
                          left: '50%',
                          transform: 'translateX(-50%)',
                          width: '60px',
                          height: '3px',
                          backgroundColor: '#27ae60',
                          borderRadius: '2px'
                        }
                      }}
                    >
                      {category.name}
                    </Typography>
                  </Box>
                  {category.description && (
                    <Typography 
                      variant="body1" 
                      sx={{ 
                        fontStyle: 'italic',
                        color: '#7f8c8d',
                        mt: 1.5,
                        fontSize: '1.1rem',
                        '@media print': {
                          fontSize: '1rem',
                          mt: 0.5
                        }
                      }}
                    >
                      {category.description}
                    </Typography>
                  )}
                </Box>

                {/* Menu Items */}
                <Stack spacing={1.5}>
                  {category.items?.map((item, index) => (
                    <Box 
                      key={item.id}
                      sx={{ 
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: { xs: 1.5, sm: 2, md: 3 },
                        pb: 2,
                        borderBottom: index === (category.items?.length || 0) - 1 ? 'none' : '1px solid #e0e0e0',
                        opacity: item.available ? 1 : 0.6,
                        pageBreakInside: 'avoid',
                        '@media print': {
                          gap: 2,
                          pb: 1.5,
                          borderBottom: index === (category.items?.length || 0) - 1 ? 'none' : '1px dotted #ccc'
                        }
                      }}
                    >
                      {/* Menu Item Image */}
                      {item.imageUrl && (
                        <Box sx={{ 
                          flexShrink: 0,
                          cursor: 'pointer',
                          transition: 'transform 0.2s ease',
                          '&:hover': {
                            transform: 'scale(1.02)'
                          },
                          '@media print': {
                            '&:hover': {
                              transform: 'none'
                            }
                          },
                          width: { xs: 100, sm: 150, md: 200 },
                          height: { xs: 75, sm: 112, md: 150 }
                        }}>
                          <Image
                            src={item.imageUrl}
                            alt={item.name}
                            width={200}
                            height={150}
                            style={{
                              borderRadius: '8px',
                              objectFit: 'cover',
                              border: '1px solid #ddd',
                              width: '100%',
                              height: '100%'
                            }}
                            onClick={() => handleImageClick(item)}
                          />
                        </Box>
                      )}

                      {/* Content Area */}
                      <Box sx={{ 
                        flex: 1,
                        minWidth: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 1
                      }}>
                        {/* Name and Price Row */}
                        <Box sx={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'flex-start',
                          gap: 2
                        }}>
                          <Box sx={{ flex: 1 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.25 }}>
                              <Typography 
                                variant="h6" 
                                sx={{ 
                                  fontWeight: 'bold',
                                  color: '#2c3e50',
                                  fontSize: { xs: '1.25rem', sm: '1.4rem' },
                                  lineHeight: 1.2,
                                  fontFamily: 'serif',
                                  '@media print': {
                                    fontSize: '1.1rem'
                                  }
                                }}
                              >
                                {item.name}
                              </Typography>
                              {!item.available && (
                                <Typography 
                                  variant="caption" 
                                  sx={{ 
                                    color: '#e74c3c',
                                    fontWeight: 'bold',
                                    textTransform: 'uppercase',
                                    fontSize: '0.7rem',
                                    backgroundColor: '#ffebee',
                                    px: 1,
                                    py: 0.25,
                                    borderRadius: 1
                                  }}
                                >
                                  Unavailable
                                </Typography>
                              )}
                            </Box>
                          </Box>

                          <Typography 
                            variant="h6" 
                            sx={{ 
                              fontWeight: 'bold',
                              color: '#27ae60',
                              fontSize: { xs: '1.2rem', sm: '1.4rem' },
                              minWidth: 'fit-content',
                              textAlign: 'right',
                              whiteSpace: 'nowrap',
                              fontFamily: 'serif',
                              '@media print': {
                                fontSize: '1.1rem'
                              }
                            }}
                          >
                            {formatPrice(item.price)}
                          </Typography>
                        </Box>

                        {/* Description */}
                        {item.description && (
                          <Typography 
                            variant="body2" 
                            sx={{ 
                              color: '#6c757d',
                              lineHeight: 1.5,
                              fontSize: { xs: '0.95rem', sm: '1rem' },
                              mb: 0.5,
                              '@media print': {
                                fontSize: '0.9rem',
                                mb: 0.25
                              }
                            }}
                          >
                            {item.description}
                          </Typography>
                        )}

                        {/* Selection Options */}
                        {item.selections && item.selections.length > 0 && (
                          <Box sx={{ mt: 0.5 }}>
                            {item.selections.map((selection) => (
                              <Box key={selection.id} sx={{ mb: 1, '@media print': { mb: 0.5 } }}>
                                <Typography 
                                  variant="caption" 
                                  sx={{ 
                                    color: '#495057',
                                    fontWeight: 'bold',
                                    fontSize: '0.85rem',
                                    display: 'block',
                                    mb: 0.25,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px',
                                    '@media print': {
                                      fontSize: '0.75rem'
                                    }
                                  }}
                                >
                                  {selection.name}:
                                </Typography>
                                <Typography 
                                  variant="caption"
                                  sx={{
                                    color: '#6c757d',
                                    fontSize: '0.8rem',
                                    lineHeight: 1.4,
                                    '@media print': {
                                      fontSize: '0.7rem'
                                    }
                                  }}
                                >
                                  {selection.options?.map((option, optionIndex) => (
                                    <span key={option.id}>
                                      {option.name}
                                      {option.priceAdd > 0 && (
                                        <span style={{ 
                                          color: '#27ae60', 
                                          fontWeight: 'bold'
                                        }}>
                                          {' '}(+{formatPrice(option.priceAdd)})
                                        </span>
                                      )}
                                      {optionIndex < (selection.options?.length || 0) - 1 && ', '}
                                    </span>
                                  ))}
                                </Typography>
                              </Box>
                            ))}
                          </Box>
                        )}
                      </Box>
                    </Box>
                  ))}
                </Stack>
              </Box>
            ))}
          </Stack>
        )}

        {/* Footer */}
        <Box sx={{ 
          textAlign: 'center', 
          mt: 3, 
          pt: 2, 
          borderTop: '2px solid #bdc3c7',
          pageBreakInside: 'avoid'
        }}>
          <Typography 
            variant="h6" 
            sx={{ 
              color: '#2c3e50', 
              fontStyle: 'italic',
              fontFamily: 'serif',
              mb: 1
            }}
          >
            Thank you for dining with us!
          </Typography>
          <Typography 
            variant="body2" 
            sx={{ 
              color: '#95a5a6', 
              fontSize: '0.9rem',
              mb: 1
            }}
          >
            Prices are subject to change without notice
          </Typography>
          <Typography 
            variant="caption" 
            sx={{ 
              color: '#bdc3c7', 
              fontSize: '0.75rem',
              fontStyle: 'italic'
            }}
          >
            © 2025 MeFood. Built by Karn Yongsiriwit.
          </Typography>
        </Box>
      </Box>

      {/* Item Details Modal */}
      <Modal
        open={!!selectedItem}
        onClose={handleCloseModal}
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          '@media print': {
            display: 'none'
          }
        }}
      >
        <Box
          sx={{
            position: 'relative',
            backgroundColor: 'white',
            borderRadius: 2,
            overflow: 'auto',
            outline: 'none',
            maxWidth: '90vw',
            maxHeight: '90vh'
          }}
        >
          <IconButton
            onClick={handleCloseModal}
            sx={{
              position: 'absolute',
              top: 8,
              right: 8,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              color: 'white',
              zIndex: 1,
              '&:hover': {
                backgroundColor: 'rgba(0, 0, 0, 0.7)'
              }
            }}
          >
            <CloseIcon />
          </IconButton>
          
          {selectedItem && (
            <Box sx={{ 
              display: 'flex', 
              flexDirection: 'column',
              maxWidth: { xs: '90vw', sm: '600px' },
              width: 'auto'
            }}>
              {selectedItem.imageUrl && (
                <Image
                  src={selectedItem.imageUrl}
                  alt={selectedItem.name}
                  width={512}
                  height={512}
                  style={{
                    width: '100%',
                    height: 'auto',
                    maxWidth: '512px',
                    maxHeight: '50vh',
                    objectFit: 'contain'
                  }}
                />
              )}
              <Box sx={{ p: 3 }}>
                {/* Name and Price */}
                <Box sx={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'flex-start',
                  mb: 2
                }}>
                  <Typography 
                    variant="h5" 
                    sx={{ 
                      color: '#2c3e50',
                      fontWeight: 'bold',
                      fontFamily: 'serif',
                      flex: 1,
                      pr: 2
                    }}
                  >
                    {selectedItem.name}
                  </Typography>
                  <Typography 
                    variant="h5" 
                    sx={{ 
                      color: '#27ae60',
                      fontWeight: 'bold',
                      fontFamily: 'serif'
                    }}
                  >
                    {formatPrice(selectedItem.price)}
                  </Typography>
                </Box>

                {/* Description */}
                {selectedItem.description && (
                  <Typography 
                    variant="body1" 
                    sx={{ 
                      color: '#6c757d',
                      mb: 2,
                      lineHeight: 1.6
                    }}
                  >
                    {selectedItem.description}
                  </Typography>
                )}

                {/* Options/Selections */}
                {selectedItem.selections && selectedItem.selections.length > 0 && (
                  <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid #e0e0e0' }}>
                    <Typography 
                      variant="subtitle1" 
                      sx={{ 
                        fontWeight: 'bold',
                        color: '#2c3e50',
                        mb: 1
                      }}
                    >
                      Options:
                    </Typography>
                    {selectedItem.selections.map((selection) => (
                      <Box key={selection.id} sx={{ mb: 1.5 }}>
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            fontWeight: 600,
                            color: '#495057',
                            mb: 0.5
                          }}
                        >
                          {selection.name}:
                        </Typography>
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            color: '#6c757d',
                            pl: 2
                          }}
                        >
                          {selection.options.map((option, index) => (
                            <span key={option.id}>
                              {option.name}
                              {option.priceAdd > 0 && (
                                <span style={{ 
                                  color: '#27ae60', 
                                  fontWeight: 'bold'
                                }}>
                                  {' '}(+{formatPrice(option.priceAdd)})
                                </span>
                              )}
                              {index < selection.options.length - 1 && ', '}
                            </span>
                          ))}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                )}

                {/* Availability Status */}
                {!selectedItem.available && (
                  <Box sx={{ mt: 2, p: 1, backgroundColor: '#ffebee', borderRadius: 1 }}>
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        color: '#e74c3c',
                        fontWeight: 'bold',
                        textAlign: 'center'
                      }}
                    >
                      Currently Unavailable
                    </Typography>
                  </Box>
                )}
              </Box>
            </Box>
          )}
        </Box>
      </Modal>

      {/* QR Code Zoom Modal */}
      <Modal
        open={!!selectedQR}
        onClose={handleCloseQRModal}
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: 2,
          '@media print': {
            display: 'none'
          }
        }}
      >
        <Box
          sx={{
            position: 'relative',
            maxWidth: '90vw',
            maxHeight: '90vh',
            backgroundColor: 'white',
            borderRadius: 2,
            boxShadow: 24,
            p: 3,
            outline: 'none',
            textAlign: 'center'
          }}
        >
          <IconButton
            onClick={handleCloseQRModal}
            sx={{
              position: 'absolute',
              top: 8,
              right: 8,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              color: 'white',
              '&:hover': {
                backgroundColor: 'rgba(0, 0, 0, 0.7)'
              }
            }}
          >
            <CloseIcon />
          </IconButton>
          
          {selectedQR && (
            <Box>
              <Image
                src={selectedQR}
                alt="Menu QR Code"
                width={300}
                height={300}
                style={{
                  border: '3px solid #ddd',
                  borderRadius: '12px',
                  backgroundColor: 'white'
                }}
              />
              <Typography 
                variant="h6" 
                sx={{ 
                  mt: 2, 
                  color: '#2c3e50',
                  fontWeight: 'bold'
                }}
              >
                Scan to view menu
              </Typography>
            </Box>
          )}
        </Box>
      </Modal>
    </Box>
  )
}