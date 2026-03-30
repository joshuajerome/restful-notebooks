import { createTheme, alpha } from '@mui/material'

// Matches cutip-desktop tokens exactly
const dark = {
  bg: '#0C1117',
  paper: '#141A24',
  sidebar: '#090B0D',
  appbar: '#090B0D',
  border: '#1E2536',
  text: 'rgba(255,255,255,0.87)',
  textSecondary: 'rgba(255,255,255,0.55)',
  accent: '#1D63ED',
  accentLight: '#4B8AF5',
  accentDark: '#1550C0',
  success: '#4CAF50',
  warning: '#FF9800',
  error: '#F70B5B',
  headerGradient: 'linear-gradient(90deg, #0e1c26 0%, #08203e 100%)',
}

const light = {
  bg: '#F5F5F4',
  paper: '#FAFAF9',
  sidebar: '#EBEBEB',
  appbar: '#EBEBEB',
  border: '#D4D4D4',
  text: '#1A1A1A',
  textSecondary: 'rgba(0,0,0,0.50)',
  accent: '#1D63ED',
  accentLight: '#4B8AF5',
  accentDark: '#1550C0',
  success: '#2E7D32',
  warning: '#ED6C02',
  error: '#F70B5B',
  headerGradient: 'linear-gradient(90deg, #0e1c26 0%, #08203e 100%)',
}

function buildTheme(t: typeof dark, mode: 'dark' | 'light') {
  return createTheme({
    palette: {
      mode,
      primary: { main: t.accent, light: t.accentLight, dark: t.accentDark },
      background: { default: t.bg, paper: t.paper },
      text: { primary: t.text, secondary: t.textSecondary },
      divider: t.border,
      success: { main: t.success },
      warning: { main: t.warning },
      error: { main: t.error },
    },
    shape: { borderRadius: 8 },
    typography: {
      fontFamily: '"Inter", "Roboto", "Helvetica", sans-serif',
      fontSize: 13,
      h5: { fontWeight: 600, fontSize: '1.25rem' },
      h6: { fontWeight: 600, fontSize: '0.95rem' },
      body2: { fontSize: '0.85rem' },
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: { padding: '4px 14px', borderRadius: 6, minHeight: 32, textTransform: 'none', fontSize: 13 },
        },
      },
      MuiListItemButton: {
        styleOverrides: {
          root: {
            padding: '4px 12px',
            borderRadius: 6,
            margin: '2px 8px',
            minHeight: 34,
            outline: '1.5px solid transparent',
            transition: 'background-color 0.15s, outline-color 0.15s',
            '&:hover': {
              backgroundColor: alpha(t.textSecondary, 0.08),
              outlineColor: t.accent,
            },
            '&.Mui-selected': {
              backgroundColor: alpha(t.accent, 0.12),
              outlineColor: alpha(t.accent, 0.5),
              '&:hover': {
                backgroundColor: alpha(t.accent, 0.18),
                outlineColor: t.accent,
              },
            },
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            border: `1px solid ${t.border}`,
            transition: 'border-color 0.15s, box-shadow 0.15s',
            '&:hover': {
              borderColor: alpha(t.accent, 0.5),
              boxShadow: `0 0 0 1px ${alpha(t.accent, 0.18)}`,
            },
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            backgroundColor: t.sidebar,
            borderRight: `1px solid ${t.border}`,
          },
        },
      },
      MuiCssBaseline: {
        styleOverrides: {
          '*::-webkit-scrollbar': { width: 6, height: 6 },
          '*::-webkit-scrollbar-thumb': {
            backgroundColor: alpha(t.textSecondary, 0.25),
            borderRadius: 3,
          },
          '*::-webkit-scrollbar-track': { backgroundColor: 'transparent' },
        },
      },
    },
  })
}

export const darkTheme = buildTheme(dark, 'dark')
export const lightTheme = buildTheme(light, 'light')
export const tokens = { dark, light }
