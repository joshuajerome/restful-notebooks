import { useEffect, useState } from 'react'
import {
  Alert, Box, Button, Card, CardContent, Chip, IconButton,
  Stack, Tab, Tabs, TextField, Tooltip, Typography,
} from '@mui/material'
import { Add, Delete, Extension, FolderOpen, Refresh } from '@mui/icons-material'
import api from '../api/client'
import { useNotificationStore } from '../store/notificationStore'
import { useThemeStore } from '../store/themeStore'

interface PluginInfo {
  name: string
  version: string
  description: string
  adapter: string
  path: string
}

function PluginsTab() {
  const [plugins, setPlugins] = useState<PluginInfo[]>([])
  const [importPath, setImportPath] = useState('')
  const [loading, setLoading] = useState(false)
  const { add: notify } = useNotificationStore()

  const fetchPlugins = () => {
    api.get('/plugins').then((r) => setPlugins(r.data)).catch(() => {})
  }

  useEffect(fetchPlugins, [])

  const handleImport = async () => {
    if (!importPath.trim()) return
    setLoading(true)
    try {
      const form = new FormData()
      form.append('plugin_path', importPath.trim())
      const r = await api.post('/plugins/import', form)
      notify(`Plugin "${r.data.plugin.name}" imported`, 'success')
      setImportPath('')
      fetchPlugins()
    } catch (err: any) {
      notify(err.response?.data?.detail || 'Import failed', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleRemove = async (name: string) => {
    try {
      await api.delete(`/plugins/${name}`)
      notify(`Plugin "${name}" removed`, 'info')
      fetchPlugins()
    } catch (err: any) {
      notify(err.response?.data?.detail || 'Remove failed', 'error')
    }
  }

  return (
    <Box>
      <Alert severity="info" sx={{ mb: 2 }}>
        Plugins provide endpoint adapters that parse API definition files (e.g. JSON, OpenAPI) into typed endpoint constants.
        A valid plugin directory must contain a <code>plugin.yaml</code> manifest or an <code>__init__.py</code>.
      </Alert>

      {/* Import */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>Import Plugin</Typography>
          <Stack direction="row" spacing={1} alignItems="center">
            <FolderOpen sx={{ color: 'text.secondary', fontSize: 20 }} />
            <TextField
              size="small"
              fullWidth
              placeholder="/path/to/plugin/directory"
              value={importPath}
              onChange={(e) => setImportPath(e.target.value)}
              helperText="Path to the plugin directory on the host filesystem"
            />
            <Button variant="contained" onClick={handleImport} disabled={loading || !importPath.trim()}
              startIcon={<Add />} sx={{ minWidth: 100 }}>
              Import
            </Button>
          </Stack>
        </CardContent>
      </Card>

      {/* Installed plugins */}
      <Card>
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
            <Typography variant="h6">Installed Plugins</Typography>
            <Tooltip title="Refresh">
              <IconButton size="small" onClick={fetchPlugins}><Refresh sx={{ fontSize: 18 }} /></IconButton>
            </Tooltip>
          </Stack>

          {plugins.length === 0 ? (
            <Typography color="text.secondary" fontSize={13}>
              No plugins installed. Import a plugin directory to get started.
            </Typography>
          ) : (
            <Stack spacing={1.5}>
              {plugins.map((p) => (
                <Box key={p.name} sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: 1, display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                  <Extension sx={{ color: 'primary.main', fontSize: 24, mt: 0.5 }} />
                  <Box sx={{ flex: 1 }}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Typography fontWeight={600} fontSize={14}>{p.name}</Typography>
                      <Chip label={`v${p.version}`} size="small" variant="outlined" sx={{ fontSize: 10, height: 18 }} />
                    </Stack>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: 12 }}>
                      {p.description || 'No description'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: 11, fontFamily: 'monospace', mt: 0.5 }}>
                      adapter: {p.adapter} — {p.path}
                    </Typography>
                  </Box>
                  <Tooltip title="Remove plugin">
                    <IconButton size="small" color="error" onClick={() => handleRemove(p.name)}>
                      <Delete sx={{ fontSize: 18 }} />
                    </IconButton>
                  </Tooltip>
                </Box>
              ))}
            </Stack>
          )}
        </CardContent>
      </Card>
    </Box>
  )
}

function GeneralTab() {
  const { tempWorkspaceColor, setTempWorkspaceColor } = useThemeStore()

  const TEMP_COLOR_OPTIONS = ['#E57C23', '#D35400', '#E74C3C', '#9B59B6', '#3498DB', '#1ABC9C', '#2ECC71', '#F39C12']

  return (
    <Box>
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>About</Typography>
          <Stack spacing={1}>
            <Typography variant="body2">restful v0.1.0</Typography>
            <Typography variant="body2">Restful Notebooks v0.1.0</Typography>
            <Typography variant="body2" color="text.secondary" fontSize={12}>
              REST API client with typed endpoints, workflow chaining, and plugin-based endpoint ingestion.
            </Typography>
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 1 }}>Temporary Workspace Color</Typography>
          <Typography variant="body2" color="text.secondary" fontSize={12} sx={{ mb: 2 }}>
            Color used for quick-request temporary workspaces. User-created workspaces cannot use this color.
          </Typography>
          <Stack direction="row" spacing={1}>
            {TEMP_COLOR_OPTIONS.map((c) => (
              <Box
                key={c}
                onClick={() => setTempWorkspaceColor(c)}
                sx={{
                  width: 28, height: 28, borderRadius: '50%', bgcolor: c, cursor: 'pointer',
                  border: tempWorkspaceColor === c ? '3px solid #fff' : '3px solid transparent',
                  transition: 'border 0.15s',
                }}
              />
            ))}
          </Stack>
        </CardContent>
      </Card>
    </Box>
  )
}

export default function SettingsPage() {
  const [tab, setTab] = useState(0)

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 2 }}>Settings</Typography>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ minHeight: 36 }}>
          <Tab label="General" sx={{ minHeight: 36, fontSize: 12, textTransform: 'none' }} />
          <Tab label="Plugins" icon={<Extension sx={{ fontSize: 16 }} />} iconPosition="start"
            sx={{ minHeight: 36, fontSize: 12, textTransform: 'none' }} />
        </Tabs>
      </Box>

      {tab === 0 && <GeneralTab />}
      {tab === 1 && <PluginsTab />}
    </Box>
  )
}
