import { createTheme } from '@mui/material/styles';

// 🌿 Restaurant App Theme — Green Pastel
const theme = createTheme({
  palette: {
    mode: 'light',
    
    // Main Brand Color
    primary: {
      main: '#A3DC9A', // Primary Green - Navbar, main buttons
      dark: '#2E5E45',  // Dark Green - Headings, icons
      light: '#C8E6C0', // Lighter version for hover states
      contrastText: '#2E5E45', // Dark green text for better contrast
    },
    
    // Supporting Colors
    secondary: {
      main: '#FFD55A', // Golden Yellow - CTA buttons, highlights
      dark: '#E5C147',
      light: '#FFF2B8',
      contrastText: '#2E5E45', // Dark green text on yellow background
    },
    
    // Additional custom colors
    success: {
      main: '#A3DC9A', // Use primary green for success states
      dark: '#2E5E45',
      light: '#E9F8E6',
    },
    
    warning: {
      main: '#FFD55A', // Golden yellow for warnings
      dark: '#E5C147',
      light: '#FFF2B8',
    },
    
    error: {
      main: '#E57373', // Soft red that complements the green palette
      dark: '#C62828',
      light: '#FFCDD2',
    },
    
    info: {
      main: '#A3DC9A', // Use primary green for info states
      dark: '#2E5E45',
      light: '#E9F8E6',
    },
    
    // Background colors
    background: {
      default: '#FAFBF9', // Very light off-white with subtle green tint
      paper: '#FFFFFF',   // White for papers (dialogs, menus, etc.)
    },
    
    // Custom background variants (accessible through theme.palette.custom)
    grey: {
      50: '#E9F8E6',   // Light Mint - Section background
      100: '#FAE9D7',  // Warm Cream - Card background
      200: '#E0E0E0',
      300: '#BDBDBD',
      400: '#9E9E9E',
      500: '#757575',
      600: '#616161',
      700: '#424242',
      800: '#2F2F2F',  // Primary text color
      900: '#212121',
    },
    
    // Text colors
    text: {
      primary: '#2F2F2F',   // Almost black for good contrast
      secondary: '#4F4F4F', // For less important info like timestamps or hints
    },
    
    // Action colors
    action: {
      hover: 'rgba(163, 220, 154, 0.08)', // Primary green with low opacity
      selected: 'rgba(163, 220, 154, 0.16)',
      disabled: 'rgba(0, 0, 0, 0.26)',
      disabledBackground: 'rgba(0, 0, 0, 0.12)',
    },
    
    // Divider
    divider: 'rgba(46, 94, 69, 0.12)', // Dark green with low opacity
  },
  
  // Typography
  typography: {
    fontFamily: '"Sarabun", "Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    
    h1: {
      fontWeight: 700,
      color: '#2E5E45', // Dark green for main headlines
    },
    h2: {
      fontWeight: 700,
      color: '#2E5E45',
    },
    h3: {
      fontWeight: 600,
      color: '#2E5E45',
    },
    h4: {
      fontWeight: 600,
      color: '#2E5E45',
    },
    h5: {
      fontWeight: 600,
      color: '#2E5E45',
    },
    h6: {
      fontWeight: 600,
      color: '#2E5E45',
    },
    
    subtitle1: {
      color: '#2F2F2F',
    },
    subtitle2: {
      color: '#4F4F4F',
    },
    
    body1: {
      color: '#2F2F2F',
    },
    body2: {
      color: '#4F4F4F',
    },
    
    button: {
      fontWeight: 600,
      textTransform: 'none', // Keep normal case for buttons
    },
    
    caption: {
      color: '#4F4F4F',
    },
    
    overline: {
      color: '#4F4F4F',
      fontWeight: 600,
      textTransform: 'uppercase',
    },
  },
  
  // Shape
  shape: {
    borderRadius: 12, // Softer, more friendly border radius
  },
  
  // Spacing
  spacing: 8, // Default MUI spacing
  
  // Shadows - softer, more natural shadows
  shadows: [
    'none',
    '0px 2px 4px rgba(46, 94, 69, 0.08)',
    '0px 4px 8px rgba(46, 94, 69, 0.12)',
    '0px 6px 12px rgba(46, 94, 69, 0.16)',
    '0px 8px 16px rgba(46, 94, 69, 0.20)',
    '0px 10px 20px rgba(46, 94, 69, 0.24)',
    '0px 12px 24px rgba(46, 94, 69, 0.28)',
    '0px 14px 28px rgba(46, 94, 69, 0.32)',
    '0px 16px 32px rgba(46, 94, 69, 0.36)',
    '0px 18px 36px rgba(46, 94, 69, 0.40)',
    '0px 20px 40px rgba(46, 94, 69, 0.44)',
    '0px 22px 44px rgba(46, 94, 69, 0.48)',
    '0px 24px 48px rgba(46, 94, 69, 0.52)',
    '0px 26px 52px rgba(46, 94, 69, 0.56)',
    '0px 28px 56px rgba(46, 94, 69, 0.60)',
    '0px 30px 60px rgba(46, 94, 69, 0.64)',
    '0px 32px 64px rgba(46, 94, 69, 0.68)',
    '0px 34px 68px rgba(46, 94, 69, 0.72)',
    '0px 36px 72px rgba(46, 94, 69, 0.76)',
    '0px 38px 76px rgba(46, 94, 69, 0.80)',
    '0px 40px 80px rgba(46, 94, 69, 0.84)',
    '0px 42px 84px rgba(46, 94, 69, 0.88)',
    '0px 44px 88px rgba(46, 94, 69, 0.92)',
    '0px 46px 92px rgba(46, 94, 69, 0.96)',
    '0px 48px 96px rgba(46, 94, 69, 1.00)',
  ],
  
  // Component customizations
  components: {
    // CssBaseline - Global styles
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: '#FAFBF9', // Ensure body uses off-white background
          scrollbarColor: '#A3DC9A #FAFBF9',
          '&::-webkit-scrollbar, & *::-webkit-scrollbar': {
            backgroundColor: '#FAFBF9',
            width: 12,
          },
          '&::-webkit-scrollbar-thumb, & *::-webkit-scrollbar-thumb': {
            borderRadius: 8,
            backgroundColor: '#A3DC9A',
            minHeight: 24,
            border: '3px solid #FAFBF9',
          },
          '&::-webkit-scrollbar-thumb:hover, & *::-webkit-scrollbar-thumb:hover': {
            backgroundColor: '#2E5E45',
          },
        },
      },
    },
    
    // AppBar
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#A3DC9A', // Primary green for navbar
          color: '#2E5E45', // Dark green text
          boxShadow: '0px 2px 8px rgba(46, 94, 69, 0.16)',
          borderRadius: 0, // Remove rounded corners
        },
      },
    },
    
    // Buttons
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          fontWeight: 600,
          textTransform: 'none',
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0px 4px 12px rgba(46, 94, 69, 0.24)',
          },
        },
        containedPrimary: {
          backgroundColor: '#A3DC9A',
          color: '#2E5E45',
          '&:hover': {
            backgroundColor: '#2E5E45',
            color: '#FFFFFF',
          },
        },
        containedSecondary: {
          backgroundColor: '#FFD55A', // Golden yellow for CTA buttons
          color: '#2E5E45',
          '&:hover': {
            backgroundColor: '#E5C147',
          },
        },
        outlinedPrimary: {
          borderColor: '#A3DC9A',
          color: '#2E5E45',
          '&:hover': {
            backgroundColor: 'rgba(163, 220, 154, 0.08)',
            borderColor: '#2E5E45',
          },
        },
      },
    },
    
    // Cards
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          backgroundColor: '#FFFFFF', // Pure white for cards to contrast with off-white background
          boxShadow: '0px 4px 16px rgba(46, 94, 69, 0.08)',
          '&:hover': {
            boxShadow: '0px 8px 24px rgba(46, 94, 69, 0.16)',
          },
        },
      },
    },
    
    // Paper
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 12,
        },
        elevation1: {
          boxShadow: '0px 2px 8px rgba(46, 94, 69, 0.08)',
        },
        elevation3: {
          boxShadow: '0px 6px 16px rgba(46, 94, 69, 0.12)',
        },
      },
    },
    
    // Chip
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontWeight: 500,
        },
        colorPrimary: {
          backgroundColor: '#E9F8E6', // Light mint background
          color: '#2E5E45', // Dark green text
        },
        colorSecondary: {
          backgroundColor: '#FFF2B8', // Light yellow background
          color: '#2E5E45',
        },
      },
    },
    
    // TextField
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 12,
            '&:hover fieldset': {
              borderColor: '#A3DC9A',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#2E5E45',
            },
          },
        },
      },
    },
    
    // Menu
    MuiMenu: {
      styleOverrides: {
        paper: {
          borderRadius: 12,
          boxShadow: '0px 8px 24px rgba(46, 94, 69, 0.16)',
        },
      },
    },
    
    // Dialog
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 16,
        },
      },
    },
    
    // Fab
    MuiFab: {
      styleOverrides: {
        root: {
          boxShadow: '0px 6px 16px rgba(46, 94, 69, 0.24)',
        },
        primary: {
          backgroundColor: '#A3DC9A',
          color: '#2E5E45',
          '&:hover': {
            backgroundColor: '#2E5E45',
            color: '#FFFFFF',
          },
        },
        secondary: {
          backgroundColor: '#FFD55A',
          color: '#2E5E45',
          '&:hover': {
            backgroundColor: '#E5C147',
          },
        },
      },
    },
  },
});

// Custom theme extensions
declare module '@mui/material/styles' {
  interface Palette {
    custom: {
      lightMint: string;
      warmCream: string;
      darkGreen: string;
      goldenYellow: string;
    };
  }
  
  interface PaletteOptions {
    custom?: {
      lightMint?: string;
      warmCream?: string;
      darkGreen?: string;
      goldenYellow?: string;
    };
  }
}

// Add custom colors to the theme
const enhancedTheme = createTheme(theme, {
  palette: {
    ...theme.palette,
    custom: {
      lightMint: '#E9F8E6',   // Light Mint - Section background
      warmCream: '#FAE9D7',   // Warm Cream - Card background
      darkGreen: '#2E5E45',   // Dark Green - Headings, icons
      goldenYellow: '#FFD55A', // Golden Yellow - CTA buttons, highlights
    },
  },
});

export default enhancedTheme;