'use client'

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Button,
  Menu,
  MenuItem,
  ListItemText,
  Box
} from '@mui/material'
import { ExpandMore } from '@mui/icons-material'

export function LanguageSwitcher() {
  const { i18n } = useTranslation()
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const open = Boolean(anchorEl)

  // Load saved language preference on mount and sync with i18n
  useEffect(() => {
    const savedLanguage = localStorage.getItem('i18nextLng')
    if (savedLanguage && (savedLanguage === 'th' || savedLanguage === 'en')) {
      // Only change if different from current language
      if (i18n.language !== savedLanguage) {
        i18n.changeLanguage(savedLanguage)
      }
    } else {
      // If no saved language, save the current language to localStorage
      localStorage.setItem('i18nextLng', i18n.language)
    }
  }, [i18n])

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleClose = () => {
    setAnchorEl(null)
  }

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng)
    // Store language preference in localStorage
    localStorage.setItem('i18nextLng', lng)
    handleClose()
  }

  const getCurrentLanguageLabel = () => {
    return i18n.language === 'th' ? 'TH' : 'EN'
  }

  return (
    <Box>
      <Button
        onClick={handleClick}
        endIcon={<ExpandMore />}
        variant="outlined"
        size="small"
        sx={{
          color: 'inherit',
          borderColor: 'rgba(255, 255, 255, 0.5)',
          '&:hover': {
            borderColor: 'white',
            backgroundColor: 'rgba(255, 255, 255, 0.1)'
          }
        }}
      >
        {getCurrentLanguageLabel()}
      </Button>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        PaperProps={{
          sx: {
            mt: 1,
            minWidth: 120
          }
        }}
      >
        <MenuItem 
          onClick={() => changeLanguage('th')}
          selected={i18n.language === 'th'}
        >
          <ListItemText primary="TH" />
        </MenuItem>
        <MenuItem 
          onClick={() => changeLanguage('en')}
          selected={i18n.language === 'en'}
        >
          <ListItemText primary="EN" />
        </MenuItem>
      </Menu>
    </Box>
  )
}