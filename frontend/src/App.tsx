import { useMemo } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider, CssBaseline, useMediaQuery } from '@mui/material'
import { darkTheme, lightTheme } from './theme'
import { useThemeStore } from './store/themeStore'
import WorkspacesPage from './pages/WorkspacesPage'
import WorkspaceLayout from './components/WorkspaceLayout'
import DashboardPage from './pages/DashboardPage'
import WorkspacesConfigPage from './pages/WorkspacesConfigPage'
import EndpointBrowserPage from './pages/EndpointBrowserPage'
import RequestBuilderPage from './pages/RequestBuilderPage'
import HistoryPage from './pages/HistoryPage'
import WorkflowsPage from './pages/WorkflowsPage'
import AuditLogPage from './pages/AuditLogPage'

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

        {/* Old workspace page for standalone access */}
        <Route path="/workspaces" element={<WorkspacesPage />} />

        {/* Main app shell */}
        <Route path="/app" element={<WorkspaceLayout />}>
          <Route index element={<RequestBuilderPage />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="workspaces" element={<WorkspacesConfigPage />} />
          <Route path="endpoints" element={<EndpointBrowserPage />} />
          <Route path="request" element={<RequestBuilderPage />} />
          <Route path="request/:endpointName" element={<RequestBuilderPage />} />
          <Route path="history" element={<HistoryPage />} />
          <Route path="workflows" element={<WorkflowsPage />} />
          <Route path="audit" element={<AuditLogPage />} />
        </Route>
      </Routes>
    </ThemeProvider>
  )
}
