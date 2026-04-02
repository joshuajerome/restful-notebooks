import { useMemo } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider, CssBaseline, useMediaQuery } from '@mui/material'
import { darkTheme, lightTheme } from './theme'
import { useThemeStore } from './store/themeStore'
import WorkspaceLayout from './components/WorkspaceLayout'
import WorkspacesPage from './pages/WorkspacesPage'
import WorkspaceConfigPage from './pages/WorkspaceConfigPage'
import EndpointBrowserPage from './pages/EndpointBrowserPage'
import RequestBuilderPage from './pages/RequestBuilderPage'
import HistoryPage from './pages/HistoryPage'
import NotebooksPage from './pages/WorkflowsPage'
import AuditLogPage from './pages/AuditLogPage'
import SettingsPage from './pages/SettingsPage'

export default function App() {
  const { themeId } = useThemeStore()
  const prefersDark = useMediaQuery('(prefers-color-scheme: dark)')

  const theme = useMemo(() => {
    if (themeId === 'system') return prefersDark ? darkTheme : lightTheme
    return themeId === 'light' ? lightTheme : darkTheme
  }, [themeId, prefersDark])

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Routes>
        {/* Landing — straight to request builder */}
        <Route path="/" element={<Navigate to="/app" replace />} />

        {/* Main app shell */}
        <Route path="/app" element={<WorkspaceLayout />}>
          <Route index element={<WorkspacesPage />} />
          <Route path="workspaces" element={<WorkspacesPage />} />
          <Route path="workspaces/:workspaceId" element={<WorkspaceConfigPage />} />
          <Route path="endpoints" element={<EndpointBrowserPage />} />
          <Route path="request" element={<RequestBuilderPage />} />
          <Route path="request/:endpointName" element={<RequestBuilderPage />} />
          <Route path="history" element={<HistoryPage />} />
          <Route path="notebooks" element={<NotebooksPage />} />
          <Route path="audit" element={<AuditLogPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </ThemeProvider>
  )
}
