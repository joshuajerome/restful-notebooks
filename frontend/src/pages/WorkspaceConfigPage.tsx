import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Alert, Autocomplete, Box, Breadcrumbs, Button, Card, Chip, Divider, FormControl, IconButton,
  InputLabel, Link, List, ListItemButton, ListItemText, MenuItem, Select, Stack, TextField,
  ToggleButton, ToggleButtonGroup, Tooltip, Typography,
} from '@mui/material'
import { Add, CheckCircle, Delete, Download, DriveFileMove, FolderOpen, NetworkPing, PlayArrow, Send, UploadFile, Visibility, VisibilityOff } from '@mui/icons-material'
import { useWorkspaceStore, WORKSPACE_COLORS, deriveAlias } from '../store/workspaceStore'
import { useNotificationStore } from '../store/notificationStore'
import { useVariableStore } from '../store/variableStore'
import { useThemeStore } from '../store/themeStore'
import api from '../api/client'
import type { ApiConfig } from '../store/workspaceStore'

const INPUT_FONT = 14
const HELPER_FONT = 11
const SECTION_FONT = 11
const LABEL_FONT = 13

interface ApiStatus { apiId: string; message: string; severity: 'success' | 'error' | 'info' }

const SECTIONS = [
  { id: 'info', label: 'Workspace Info' },
  { id: 'env', label: 'Environment File' },
  { id: 'apis', label: 'APIs' },
  { id: 'variables', label: 'Variables' },
]

function parseEnvFile(content: string): Record<string, string> {
  const result: Record<string, string> = {}
  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq < 1) continue
    const key = trimmed.slice(0, eq).trim()
    let val = trimmed.slice(eq + 1).trim()
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'")))
      val = val.slice(1, -1)
    result[key] = val
  }
  return result
}

export default function WorkspaceConfigPage() {
  const navigate = useNavigate()
  const { workspaceId } = useParams<{ workspaceId: string }>()
  const { workspaces, active, activeId, update, setActive } = useWorkspaceStore()
  const { add: notify } = useNotificationStore()
  const { variables, fetchVariables, saveVariable, deleteVariable } = useVariableStore()
  const { tempWorkspaceColor } = useThemeStore()

  // The workspace we're editing (from route param), NOT necessarily the active one
  const workspace = workspaces.find((w) => w.id === workspaceId) || null

  const [draftName, setDraftName] = useState('')
  const [draftColor, setDraftColor] = useState('')
  const [draftApis, setDraftApis] = useState<ApiConfig[]>([])
  const [statuses, setStatuses] = useState<ApiStatus[]>([])
  const [newVarKey, setNewVarKey] = useState('')
  const [newVarValue, setNewVarValue] = useState('')
  const [envKeys, setEnvKeys] = useState<string[]>([])
  const [envFilePath, setEnvFilePath] = useState('')
  const [activeSection, setActiveSection] = useState('info')

  useEffect(() => {
    if (workspace) {
      setDraftName(workspace.name)
      setDraftColor(workspace.color)
      setDraftApis(JSON.parse(JSON.stringify(workspace.apis)))
      setStatuses([])
    }
  }, [workspaceId])

  useEffect(() => {
    if (workspace?.id === activeId) fetchVariables()
  }, [workspaceId])

  // Scroll spy — update active section as user scrolls
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current
    if (!container) return
    const scrollTop = container.scrollTop + 80 // offset for header
    for (let i = SECTIONS.length - 1; i >= 0; i--) {
      const el = document.getElementById(`section-${SECTIONS[i].id}`)
      if (el && el.offsetTop <= scrollTop) {
        setActiveSection(SECTIONS[i].id)
        return
      }
    }
    setActiveSection(SECTIONS[0].id)
  }, [])

  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return
    container.addEventListener('scroll', handleScroll)
    return () => container.removeEventListener('scroll', handleScroll)
  }, [handleScroll])

  const isDirty = workspace ? (
    draftName !== workspace.name ||
    draftColor !== workspace.color ||
    JSON.stringify(draftApis) !== JSON.stringify(workspace.apis)
  ) : false

  if (!workspace) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Alert severity="info" sx={{ maxWidth: 400, mx: 'auto' }}>
          Workspace not found. <Link component="button" onClick={() => navigate('/app/workspaces')}>Go to Workspaces</Link>
        </Alert>
      </Box>
    )
  }

  const isActiveWs = workspace.id === activeId

  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({})
  const [pingResults, setPingResults] = useState<Record<string, { ok: boolean; msg: string }>>({})

  const updateDraftApi = (idx: number, patch: Partial<ApiConfig>) => {
    setDraftApis((prev) => prev.map((a, i) => {
      if (i !== idx) return a
      const updated = { ...a, ...patch }
      // Auto-derive alias from name
      if ('name' in patch) updated.alias = deriveAlias(patch.name || '')
      return updated
    }))
  }

  const addApi = () => {
    setDraftApis((prev) => [...prev, {
      id: crypto.randomUUID().slice(0, 8),
      name: 'API', alias: 'api', plugin: '', source_file: '', base_url: '', plugin_path: '',
      auth_type: 'none', login_path: '', username: '', password: '', password_env: '',
      api_key: '', api_key_header: 'X-API-Key', api_key_env: '', credential_mode: 'manual',
    }])
  }

  const removeApi = (idx: number) => setDraftApis((prev) => prev.filter((_, i) => i !== idx))

  const setApiStatus = (apiId: string, message: string, severity: ApiStatus['severity']) => {
    setStatuses((prev) => [...prev.filter((s) => s.apiId !== apiId), { apiId, message, severity }])
  }

  const toBackendApis = (apis: ApiConfig[]) => apis.filter((a) => a.name).map((a) => ({
    name: a.name, alias: a.alias, plugin: a.plugin, source: a.source_file,
    base_url: a.base_url, plugin_path: a.plugin_path,
    auth: {
      type: a.auth_type, login_path: a.login_path || '', username: a.username || '',
      password: a.credential_mode === 'manual' ? a.password : '',
      password_env: a.credential_mode === 'env' ? a.password_env : '',
      header: a.api_key_header || 'X-API-Key',
      key_env: a.credential_mode === 'env' ? a.api_key_env : '',
    },
  }))

  const ensureWorkspaceOnDisk = async (): Promise<string> => {
    let wsPath = workspace.path
    if (!wsPath) {
      const home = await api.get('/workspace/default-parent').then((r) => r.data?.path).catch(() => '')
      if (!home) throw new Error('Cannot determine workspace directory.')
      const resp = await api.post('/workspace/create', { name: draftName || workspace.name, path: home })
      wsPath = resp.data?.root || ''
      if (wsPath) update(workspace.id, { path: wsPath })
    } else {
      await api.post('/workspace/load', { path: wsPath })
    }
    return wsPath
  }

  const ensureSaved = async () => {
    update(workspace.id, { name: draftName, color: draftColor, apis: draftApis })
    await ensureWorkspaceOnDisk()
    await api.post('/workspace/save-config', { apis: toBackendApis(draftApis) })
  }


  const handleLoadEndpoints = async (cfg: ApiConfig) => {
    try {
      setApiStatus(cfg.id, 'Saving & loading endpoints...', 'info')
      await ensureSaved()
      const r = await api.post(`/plugins/load?api_alias=${encodeURIComponent(cfg.alias)}`)
      setApiStatus(cfg.id, `Loaded ${r.data?.endpoint_count || 0} endpoints`, 'success')
    } catch (err: any) {
      setApiStatus(cfg.id, err?.response?.data?.detail || 'Failed to load endpoints', 'error')
    }
  }

  const handleBrowseFile = async (idx: number) => {
    try { const f = await (window as any).electronAPI?.selectFile(); if (f) updateDraftApi(idx, { source_file: f }) } catch { }
  }
  const handleBrowsePluginPath = async (idx: number) => {
    try {
      const d = await (window as any).electronAPI?.selectDirectory()
      if (!d) return
      updateDraftApi(idx, { plugin_path: d })
      // Auto-read plugin.yaml to populate plugin name
      try {
        const r = await api.get(`/workspace/read-file?path=${encodeURIComponent(d + '/plugin.yaml')}`)
        const content = r.data?.content || ''
        const nameMatch = content.match(/^name:\s*(.+)/m)
        if (nameMatch) updateDraftApi(idx, { plugin: nameMatch[1].trim() })
      } catch { /* no plugin.yaml or backend can't read it */ }
    } catch { }
  }

  const handlePing = async (cfg: ApiConfig) => {
    if (!cfg.base_url) return
    setPingResults((prev) => ({ ...prev, [cfg.id]: { ok: false, msg: 'Pinging...' } }))
    try {
      // Use backend as proxy to avoid CORS/TLS issues
      const r = await api.post('/workspace/ping', { url: cfg.base_url })
      setPingResults((prev) => ({ ...prev, [cfg.id]: { ok: r.data?.ok, msg: r.data?.msg || 'Done' } }))
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.response?.data?.msg || 'Unreachable'
      setPingResults((prev) => ({ ...prev, [cfg.id]: { ok: false, msg } }))
    }
  }

  const handleAuthenticate = async (cfg: ApiConfig) => {
    try {
      setApiStatus(cfg.id, 'Authenticating...', 'info')
      await ensureSaved()
      const r = await api.post('/workspace/test-auth', { api_alias: cfg.alias })
      setApiStatus(cfg.id, r.data?.msg || 'Authenticated', 'success')
    } catch (err: any) {
      setApiStatus(cfg.id, err?.response?.data?.detail || 'Authentication failed', 'error')
    }
  }

  const handleLoadEnvFile = async () => {
    try {
      const file = await (window as any).electronAPI?.selectFile([{ name: 'Env Files', extensions: ['env'] }])
      if (!file) return
      setEnvFilePath(file)
      try {
        const r = await api.get(`/workspace/read-file?path=${encodeURIComponent(file)}`)
        const parsed = parseEnvFile(r.data?.content || '')
        setEnvKeys(Object.keys(parsed))
        notify(`Loaded ${Object.keys(parsed).length} env keys`, 'success')
      } catch { notify('Could not read env file via backend', 'error') }
    } catch { notify('Failed to load env file', 'error') }
  }

  const handleExport = async () => {
    try {
      if (!workspace.path) { notify('Save workspace first', 'error'); return }
      await api.post('/workspace/load', { path: workspace.path })
      const resp = await api.post('/workspace/export', {}, { responseType: 'blob' })
      const blob = new Blob([resp.data], { type: 'application/zip' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${workspace.name}.zip`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      notify('Workspace exported', 'success')
    } catch (err: any) {
      notify(err?.response?.data?.detail || 'Export failed', 'error')
    }
  }

  const handleMove = async () => {
    try {
      if (!workspace.path) { notify('Workspace has no path yet', 'error'); return }
      const dir = await (window as any).electronAPI?.selectDirectory()
      if (!dir) return
      if (!window.confirm(`Move workspace "${workspace.name}" to ${dir}?`)) return
      const resp = await api.post('/workspace/move', { current_path: workspace.path, new_path: dir })
      update(workspace.id, { path: resp.data?.path })
      notify('Workspace moved successfully', 'success')
    } catch (err: any) {
      notify(err?.response?.data?.detail || 'Move failed', 'error')
    }
  }

  const handleSetActive = async () => {
    setActive(workspace.id)
    try {
      if (workspace.path) await api.post('/workspace/load', { path: workspace.path })
      notify(`"${workspace.name}" is now active`, 'success')
    } catch { }
  }

  const handleSave = async () => {
    update(workspace.id, { name: draftName, color: draftColor, apis: draftApis })
    try {
      await ensureWorkspaceOnDisk()
      await api.post('/workspace/save-config', { apis: toBackendApis(draftApis) })
      notify('Config saved', 'success')
    } catch (err: any) {
      notify(err?.response?.data?.detail || err?.message || 'Save failed', 'error')
    }
  }

  const handleCancel = () => {
    setDraftName(workspace.name)
    setDraftColor(workspace.color)
    setDraftApis(JSON.parse(JSON.stringify(workspace.apis)))
    setStatuses([])
  }

  const handleAddVariable = async () => {
    const key = newVarKey.trim()
    if (!key) return
    await saveVariable(key, newVarValue)
    setNewVarKey('')
    setNewVarValue('')
  }

  const getStatus = (apiId: string) => statuses.find((s) => s.apiId === apiId)

  const scrollToSection = (id: string) => {
    setActiveSection(id)
    document.getElementById(`section-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Box ref={scrollContainerRef} sx={{ flexGrow: 1, overflow: 'auto', pb: 2 }}>
        {/* Breadcrumb */}
        <Box sx={{ maxWidth: 800, mb: 1 }}>
          <Breadcrumbs sx={{ '& .MuiBreadcrumbs-separator': { fontSize: 13, color: 'text.disabled' } }}>
            <Link underline="hover" color="text.secondary" sx={{ fontSize: 13, cursor: 'pointer' }}
              onClick={() => navigate('/app/workspaces')}>Workspaces</Link>
            <Typography color="text.primary" sx={{ fontSize: 13 }}>{draftName || workspace.name}</Typography>
          </Breadcrumbs>
        </Box>

        {/* Header */}
        <Stack direction="row" alignItems="center" sx={{ maxWidth: 800, mb: 3 }}>
          <Typography variant="h5">Configuration</Typography>
          <Chip label={draftName || workspace.name} size="small" sx={{
            ml: 1.5, bgcolor: `${draftColor}22`, color: draftColor, fontWeight: 600, fontSize: 13,
            height: 26, border: '1px solid', borderColor: draftColor,
          }} />
          <Box sx={{ flex: 1 }} />
          <Button size="small" variant="outlined" startIcon={<Download sx={{ fontSize: 16 }} />}
            onClick={handleExport} sx={{ mr: 1 }}>Export</Button>
          {!isActiveWs && (
            <Button size="small" variant="outlined" color="success" startIcon={<CheckCircle sx={{ fontSize: 16 }} />}
              onClick={handleSetActive}>Set as Active</Button>
          )}
          {isActiveWs && (
            <Chip label="Active" size="small" sx={{ bgcolor: 'rgba(56,161,105,0.15)', color: '#38A169', fontSize: 11, height: 22 }} />
          )}
        </Stack>

        <Box sx={{ display: 'flex', gap: 3 }}>
          {/* Section nav — left sidebar */}
          <Box sx={{ width: 160, flexShrink: 0, position: 'sticky', top: 0, alignSelf: 'flex-start' }}>
            <List dense disablePadding>
              {SECTIONS.map((s) => (
                <ListItemButton key={s.id} selected={activeSection === s.id}
                  onClick={() => scrollToSection(s.id)}
                  sx={{ borderRadius: 1, py: 0.5, mb: 0.25,
                    '&.Mui-selected': { bgcolor: 'primary.main', color: '#fff', '&:hover': { bgcolor: 'primary.dark' } },
                  }}>
                  <ListItemText primary={s.label} primaryTypographyProps={{ fontSize: 12, fontWeight: activeSection === s.id ? 600 : 400 }} />
                </ListItemButton>
              ))}
            </List>
          </Box>

          {/* Main content */}
          <Box sx={{ flex: 1, maxWidth: 640 }}>

      {/* Workspace Info */}
      <Card id="section-info" sx={{ mb: 3 }}>
        <Box sx={{ p: 2.5 }}>
          <Typography variant="h6" sx={{ mb: 2, fontSize: 16 }}>Workspace Info</Typography>
          <Stack spacing={2}>
            <Stack direction="row" spacing={1} alignItems="flex-start">
              {draftName !== workspace.name
                ? <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#E57C23', flexShrink: 0, mt: 1 }} />
                : <Box sx={{ width: 6, flexShrink: 0 }} />}
              <TextField size="small" label="Name" value={draftName}
                onChange={(e) => setDraftName(e.target.value)} fullWidth
                inputProps={{ style: { fontSize: INPUT_FONT } }} InputLabelProps={{ sx: { fontSize: LABEL_FONT } }} />
            </Stack>
            <Stack direction="row" spacing={1} alignItems="flex-start">
              {draftColor !== workspace.color
                ? <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#E57C23', flexShrink: 0, mt: 0.5 }} />
                : <Box sx={{ width: 6, flexShrink: 0 }} />}
              <Box>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: HELPER_FONT, mb: 0.75 }}>Color</Typography>
              <Stack direction="row" spacing={0.75}>
                {WORKSPACE_COLORS.filter((c) => c !== tempWorkspaceColor).map((c) => (
                  <Box key={c} onClick={() => setDraftColor(c)} sx={{
                    width: 24, height: 24, borderRadius: '50%', bgcolor: c, cursor: 'pointer',
                    border: draftColor === c ? '3px solid #fff' : '3px solid transparent', transition: 'border 0.15s',
                  }} />
                ))}
              </Stack>
            </Box>
            </Stack>
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: HELPER_FONT, mb: 0.25 }}>Path</Typography>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Typography sx={{ fontSize: INPUT_FONT, fontFamily: 'monospace', color: 'text.secondary' }}>
                  {workspace.path || '(auto-created on first save)'}
                </Typography>
                {workspace.path && (
                  <>
                    <IconButton size="small" onClick={() => (window as any).electronAPI?.showItemInFolder(workspace.path)}
                      sx={{ color: 'text.secondary' }}>
                      <FolderOpen sx={{ fontSize: 18 }} />
                    </IconButton>
                    <Tooltip title="Move workspace to another directory">
                      <IconButton size="small" onClick={handleMove} sx={{ color: 'text.secondary' }}>
                        <DriveFileMove sx={{ fontSize: 18 }} />
                      </IconButton>
                    </Tooltip>
                  </>
                )}
              </Stack>
            </Box>
          </Stack>
        </Box>
      </Card>

      {/* Environment File */}
      <Card id="section-env" sx={{ mb: 3 }}>
        <Box sx={{ p: 2.5 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
            <Typography variant="h6" sx={{ fontSize: 16 }}>Environment File</Typography>
            <Button size="small" startIcon={<UploadFile sx={{ fontSize: 16 }} />} onClick={handleLoadEnvFile}>Load .env</Button>
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: HELPER_FONT, mb: 1 }}>
            Load a .env file to populate credential dropdowns. Keys become available for password and API key fields.
          </Typography>
          {envFilePath && (
            <Typography sx={{ fontSize: 13, fontFamily: 'monospace', color: 'text.secondary' }}>
              {envFilePath} — {envKeys.length} key{envKeys.length !== 1 ? 's' : ''}
            </Typography>
          )}
        </Box>
      </Card>

      {/* APIs */}
      <Card id="section-apis" sx={{ mb: 3 }}>
        <Box sx={{ p: 2.5 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
            <Typography variant="h6" sx={{ fontSize: 16 }}>APIs</Typography>
            <Button size="small" startIcon={<Add />} onClick={addApi}>Add API</Button>
          </Stack>

          {draftApis.length === 0 && (
            <Typography color="text.secondary" sx={{ fontSize: INPUT_FONT, py: 2, textAlign: 'center' }}>
              No APIs configured. Add one to get started.
            </Typography>
          )}

          <Stack spacing={2}>
            {draftApis.map((cfg, idx) => {
              const status = getStatus(cfg.id)
              const credMode = cfg.credential_mode || 'manual'
              const orig = workspace.apis[idx]
              const mod = (field: keyof ApiConfig) => orig && cfg[field] !== orig[field]
              const dot = (field: keyof ApiConfig) => mod(field) ? (
                <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#E57C23', flexShrink: 0, mt: 1 }} />
              ) : <Box sx={{ width: 6, flexShrink: 0 }} />
              const ping = pingResults[cfg.id]
              const pwVisible = showPasswords[cfg.id]

              return (
                <Card key={cfg.id} variant="outlined" sx={{ p: 2.5, borderColor: 'divider' }}>
                  <Typography fontWeight={600} sx={{ fontSize: INPUT_FONT, mb: 2 }}>API #{idx + 1}</Typography>

                  <Typography variant="overline" sx={{ fontSize: SECTION_FONT, color: 'text.secondary', letterSpacing: 1 }}>General</Typography>
                  <Stack spacing={1.5} sx={{ mb: 2, mt: 0.5 }}>
                    <Stack direction="row" spacing={1} alignItems="flex-start">
                      {dot('name')}
                      <TextField size="small" label="Name" value={cfg.name} onChange={(e) => updateDraftApi(idx, { name: e.target.value })}
                        sx={{ flex: 1 }} inputProps={{ style: { fontSize: INPUT_FONT } }} InputLabelProps={{ sx: { fontSize: LABEL_FONT } }} />
                      <TextField size="small" label="Alias" value={cfg.alias} disabled
                        sx={{ flex: 1, '& .Mui-disabled': { WebkitTextFillColor: 'text.secondary' } }}
                        inputProps={{ style: { fontSize: INPUT_FONT } }} InputLabelProps={{ sx: { fontSize: LABEL_FONT } }}
                        helperText="Auto-derived from name" FormHelperTextProps={{ sx: { fontSize: HELPER_FONT } }} />
                    </Stack>
                  </Stack>
                  <Divider sx={{ my: 1.5 }} />

                  <Typography variant="overline" sx={{ fontSize: SECTION_FONT, color: 'text.secondary', letterSpacing: 1 }}>Plugin</Typography>
                  <Stack spacing={1.5} sx={{ mb: 2, mt: 0.5 }}>
                    <Stack direction="row" spacing={1} alignItems="flex-start">
                      {dot('plugin')}
                      <TextField size="small" label="Plugin Name" value={cfg.plugin} disabled
                        fullWidth inputProps={{ style: { fontSize: INPUT_FONT } }} InputLabelProps={{ sx: { fontSize: LABEL_FONT } }}
                        helperText="Auto-populated from plugin.yaml" FormHelperTextProps={{ sx: { fontSize: HELPER_FONT } }} />
                    </Stack>
                    <Stack direction="row" spacing={1} alignItems="flex-start">
                      {dot('source_file')}
                      <TextField size="small" label="Source File" value={cfg.source_file} onChange={(e) => updateDraftApi(idx, { source_file: e.target.value })}
                        fullWidth inputProps={{ style: { fontSize: INPUT_FONT } }} InputLabelProps={{ sx: { fontSize: LABEL_FONT } }}
                        sx={cfg.source_file ? { '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'rgba(56,161,105,0.45)' } } } : {}}
                        helperText="File the plugin parses to generate endpoints" FormHelperTextProps={{ sx: { fontSize: HELPER_FONT } }} />
                      <IconButton size="small" onClick={() => handleBrowseFile(idx)} sx={{ mt: 0.5 }}><FolderOpen sx={{ fontSize: 20 }} /></IconButton>
                    </Stack>
                    <Stack direction="row" spacing={1} alignItems="flex-start">
                      {dot('plugin_path')}
                      <TextField size="small" label="Plugin Path" value={cfg.plugin_path} onChange={(e) => updateDraftApi(idx, { plugin_path: e.target.value })}
                        fullWidth inputProps={{ style: { fontSize: INPUT_FONT } }} InputLabelProps={{ sx: { fontSize: LABEL_FONT } }}
                        sx={cfg.plugin_path ? { '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'rgba(56,161,105,0.45)' } } } : {}}
                        helperText="Directory containing plugin.yaml + adapter.py" FormHelperTextProps={{ sx: { fontSize: HELPER_FONT } }} />
                      <IconButton size="small" onClick={() => handleBrowsePluginPath(idx)} sx={{ mt: 0.5 }}><FolderOpen sx={{ fontSize: 20 }} /></IconButton>
                    </Stack>
                  </Stack>
                  <Divider sx={{ my: 1.5 }} />

                  <Typography variant="overline" sx={{ fontSize: SECTION_FONT, color: 'text.secondary', letterSpacing: 1 }}>API Connection</Typography>
                  <Stack spacing={1.5} sx={{ mb: 2, mt: 0.5 }}>
                    <Stack direction="row" spacing={1} alignItems="flex-start">
                      {dot('base_url')}
                      <TextField size="small" label="Base URL" value={cfg.base_url} onChange={(e) => updateDraftApi(idx, { base_url: e.target.value })}
                        fullWidth inputProps={{ style: { fontSize: INPUT_FONT } }} InputLabelProps={{ sx: { fontSize: LABEL_FONT } }}
                        placeholder="https://api.example.com" />
                      <Tooltip title={ping ? ping.msg : 'Ping base URL'}>
                        <IconButton size="small" onClick={() => handlePing(cfg)} sx={{ mt: 0.5, color: ping?.ok ? 'success.main' : ping ? 'error.main' : 'text.secondary' }}>
                          <NetworkPing sx={{ fontSize: 18 }} />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </Stack>
                  <Divider sx={{ my: 1.5 }} />

                  <Typography variant="overline" sx={{ fontSize: SECTION_FONT, color: 'text.secondary', letterSpacing: 1 }}>Authentication</Typography>
                  <Stack spacing={1.5} sx={{ mb: 2, mt: 0.5 }}>
                    <Stack direction="row" spacing={1} alignItems="flex-start">
                      {dot('auth_type')}
                      <FormControl size="small" fullWidth>
                        <InputLabel sx={{ fontSize: LABEL_FONT }}>Auth Type</InputLabel>
                        <Select value={cfg.auth_type} label="Auth Type"
                          onChange={(e) => updateDraftApi(idx, { auth_type: e.target.value as ApiConfig['auth_type'] })}
                          sx={{ fontSize: INPUT_FONT }}>
                          <MenuItem value="bearer">Bearer Token</MenuItem>
                          <MenuItem value="apikey">API Key</MenuItem>
                          <MenuItem value="none">None</MenuItem>
                        </Select>
                      </FormControl>
                    </Stack>

                    {cfg.auth_type === 'bearer' && (<>
                      <Stack direction="row" spacing={1} alignItems="flex-start">
                        {dot('login_path')}
                        <TextField size="small" label="Login Path" value={cfg.login_path} onChange={(e) => updateDraftApi(idx, { login_path: e.target.value })}
                          fullWidth inputProps={{ style: { fontSize: INPUT_FONT } }} InputLabelProps={{ sx: { fontSize: LABEL_FONT } }} />
                      </Stack>
                      <Stack direction="row" spacing={1} alignItems="flex-start">
                        {dot('username')}
                        <TextField size="small" label="Username" value={cfg.username} onChange={(e) => updateDraftApi(idx, { username: e.target.value })}
                          fullWidth inputProps={{ style: { fontSize: INPUT_FONT } }} InputLabelProps={{ sx: { fontSize: LABEL_FONT } }} />
                      </Stack>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <Box sx={{ width: 6, flexShrink: 0 }} />
                        <Typography sx={{ fontSize: HELPER_FONT, color: 'text.secondary' }}>Password:</Typography>
                        <ToggleButtonGroup size="small" exclusive value={credMode}
                          onChange={(_, v) => v && updateDraftApi(idx, { credential_mode: v })}
                          sx={{ '& .MuiToggleButton-root': { fontSize: 11, py: 0.25, px: 1.5, textTransform: 'none' } }}>
                          <ToggleButton value="manual">Manual</ToggleButton>
                          <ToggleButton value="env">Env Variable</ToggleButton>
                        </ToggleButtonGroup>
                      </Stack>
                      <Stack direction="row" spacing={1} alignItems="flex-start">
                        {dot('password')}
                        {credMode === 'manual' ? (
                          <TextField size="small" label="Password" value={cfg.password} onChange={(e) => updateDraftApi(idx, { password: e.target.value })}
                            fullWidth type={pwVisible ? 'text' : 'password'}
                            inputProps={{ style: { fontSize: INPUT_FONT } }} InputLabelProps={{ sx: { fontSize: LABEL_FONT } }}
                            slotProps={{ input: { endAdornment: (
                              <IconButton size="small" onClick={() => setShowPasswords((p) => ({ ...p, [cfg.id]: !p[cfg.id] }))}>
                                {pwVisible ? <VisibilityOff sx={{ fontSize: 18 }} /> : <Visibility sx={{ fontSize: 18 }} />}
                              </IconButton>
                            ) } }} />
                        ) : (
                          <Autocomplete size="small" freeSolo fullWidth options={envKeys} value={cfg.password_env}
                            onInputChange={(_, v) => updateDraftApi(idx, { password_env: v })}
                            renderInput={(params) => <TextField {...params} label="Password Env Variable"
                              inputProps={{ ...params.inputProps, style: { fontSize: INPUT_FONT } }} InputLabelProps={{ sx: { fontSize: LABEL_FONT } }}
                              helperText={envKeys.length ? 'Select from .env or type manually' : 'Load .env above'}
                              FormHelperTextProps={{ sx: { fontSize: HELPER_FONT } }} />} />
                        )}
                      </Stack>
                      <Stack direction="row" spacing={1} sx={{ pl: '14px' }}>
                        <Button size="small" variant="outlined" startIcon={<Send sx={{ fontSize: 14 }} />}
                          onClick={() => handleAuthenticate(cfg)}>Authenticate</Button>
                      </Stack>
                    </>)}

                    {cfg.auth_type === 'apikey' && (<>
                      <Stack direction="row" spacing={1} alignItems="flex-start">
                        {dot('api_key_header')}
                        <TextField size="small" label="Header" value={cfg.api_key_header} onChange={(e) => updateDraftApi(idx, { api_key_header: e.target.value })}
                          fullWidth inputProps={{ style: { fontSize: INPUT_FONT } }} InputLabelProps={{ sx: { fontSize: LABEL_FONT } }} />
                      </Stack>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <Box sx={{ width: 6, flexShrink: 0 }} />
                        <Typography sx={{ fontSize: HELPER_FONT, color: 'text.secondary' }}>Key:</Typography>
                        <ToggleButtonGroup size="small" exclusive value={credMode}
                          onChange={(_, v) => v && updateDraftApi(idx, { credential_mode: v })}
                          sx={{ '& .MuiToggleButton-root': { fontSize: 11, py: 0.25, px: 1.5, textTransform: 'none' } }}>
                          <ToggleButton value="manual">Manual</ToggleButton>
                          <ToggleButton value="env">Env Variable</ToggleButton>
                        </ToggleButtonGroup>
                      </Stack>
                      <Stack direction="row" spacing={1} alignItems="flex-start">
                        {dot('api_key')}
                        {credMode === 'manual' ? (
                          <TextField size="small" label="API Key" value={cfg.api_key} onChange={(e) => updateDraftApi(idx, { api_key: e.target.value })}
                            fullWidth type={pwVisible ? 'text' : 'password'}
                            inputProps={{ style: { fontSize: INPUT_FONT } }} InputLabelProps={{ sx: { fontSize: LABEL_FONT } }}
                            slotProps={{ input: { endAdornment: (
                              <IconButton size="small" onClick={() => setShowPasswords((p) => ({ ...p, [cfg.id]: !p[cfg.id] }))}>
                                {pwVisible ? <VisibilityOff sx={{ fontSize: 18 }} /> : <Visibility sx={{ fontSize: 18 }} />}
                              </IconButton>
                            ) } }} />
                        ) : (
                          <Autocomplete size="small" freeSolo fullWidth options={envKeys} value={cfg.api_key_env}
                            onInputChange={(_, v) => updateDraftApi(idx, { api_key_env: v })}
                            renderInput={(params) => <TextField {...params} label="API Key Env Variable"
                              inputProps={{ ...params.inputProps, style: { fontSize: INPUT_FONT } }} InputLabelProps={{ sx: { fontSize: LABEL_FONT } }}
                              helperText={envKeys.length ? 'Select from .env or type manually' : 'Load .env above'}
                              FormHelperTextProps={{ sx: { fontSize: HELPER_FONT } }} />} />
                        )}
                      </Stack>
                    </>)}
                  </Stack>
                  <Divider sx={{ my: 1 }} />

                  <Stack direction="row" spacing={1} alignItems="center">
                    <Button size="small" variant="outlined" startIcon={<PlayArrow sx={{ fontSize: 16 }} />}
                      onClick={() => handleLoadEndpoints(cfg)}>Load Endpoints</Button>
                    <Box sx={{ flex: 1 }} />
                    <Button size="small" color="error" startIcon={<Delete sx={{ fontSize: 16 }} />}
                      onClick={() => removeApi(idx)}>Remove</Button>
                  </Stack>
                  {status && (
                    <Typography sx={{ fontSize: 13, mt: 1,
                      color: status.severity === 'success' ? 'success.main' : status.severity === 'error' ? 'error.main' : 'info.main' }}>
                      {status.message}
                    </Typography>
                  )}
                </Card>
              )
            })}
          </Stack>
        </Box>
      </Card>

      {/* Variables */}
      <Card id="section-variables" sx={{ mb: 3 }}>
        <Box sx={{ p: 2.5 }}>
          <Typography variant="h6" sx={{ fontSize: 16, mb: 2 }}>Variables</Typography>
          {!isActiveWs && (
            <Alert severity="info" sx={{ mb: 2, fontSize: 12 }}>
              Set this workspace as active to manage variables.
            </Alert>
          )}
          {isActiveWs && variables.length > 0 && (
            <Stack spacing={1} sx={{ mb: 2 }}>
              {variables.map((v) => (
                <Stack key={v.key} direction="row" alignItems="center" spacing={1}
                  sx={{ p: 1, bgcolor: 'background.default', borderRadius: 1 }}>
                  <Typography sx={{ fontSize: 13, fontWeight: 600, color: 'primary.main', minWidth: 100 }}>{v.key}</Typography>
                  <Typography sx={{ fontSize: 13, fontFamily: 'monospace', flex: 1, color: 'text.secondary' }} noWrap>
                    {v.value.length > 60 ? v.value.slice(0, 60) + '...' : v.value}
                  </Typography>
                  <IconButton size="small" color="error" onClick={() => deleteVariable(v.key)}><Delete sx={{ fontSize: 16 }} /></IconButton>
                </Stack>
              ))}
            </Stack>
          )}
          {isActiveWs && (
            <Stack direction="row" spacing={1} alignItems="center">
              <TextField size="small" placeholder="Variable name" value={newVarKey} onChange={(e) => setNewVarKey(e.target.value)}
                sx={{ flex: 1 }} inputProps={{ style: { fontSize: INPUT_FONT } }} />
              <TextField size="small" placeholder="Value" value={newVarValue} onChange={(e) => setNewVarValue(e.target.value)}
                sx={{ flex: 1 }} inputProps={{ style: { fontSize: INPUT_FONT } }} />
              <Button size="small" variant="outlined" onClick={handleAddVariable} disabled={!newVarKey.trim()}>Add</Button>
            </Stack>
          )}
        </Box>
      </Card>

          </Box>
        </Box>
      </Box>

      {/* Save/Cancel — always visible, save disabled when clean */}
      <Box sx={{ py: 1.5, pl: '184px', pr: 3, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
        <Button size="small" onClick={handleCancel} disabled={!isDirty}>Cancel</Button>
        <Button size="small" variant="contained" onClick={handleSave} disabled={!isDirty}>Save</Button>
      </Box>
    </Box>
  )
}
