import { useEffect, useState } from 'react'
import {
  Box, Button, Card, CardContent, Chip, FormControl, IconButton, InputAdornment,
  InputLabel, List, ListItemButton, ListItemText, MenuItem, Select, Stack,
  TextField, Tooltip, Typography,
} from '@mui/material'
import { Add, Delete, Visibility, VisibilityOff } from '@mui/icons-material'
import { useWorkspaceStore, Workspace, WORKSPACE_COLORS } from '../store/workspaceStore'
import { useNotificationStore } from '../store/notificationStore'
import { useAuditStore } from '../store/auditStore'

function ModifiedDot({ visible }: { visible: boolean }) {
  if (!visible) return null
  return <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#FF9800', flexShrink: 0, mr: 1, mt: 1 }} />
}

function PasswordField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const [show, setShow] = useState(false)
  return (
    <TextField size="small" label={label} type={show ? 'text' : 'password'} value={value}
      onChange={(e) => onChange(e.target.value)} sx={{ flex: 1 }}
      InputProps={{
        endAdornment: (
          <InputAdornment position="end">
            <IconButton size="small" onClick={() => setShow(!show)} edge="end">
              {show ? <VisibilityOff sx={{ fontSize: 18 }} /> : <Visibility sx={{ fontSize: 18 }} />}
            </IconButton>
          </InputAdornment>
        ),
      }}
    />
  )
}

export default function WorkspacesConfigPage() {
  const { workspaces, activeId, update, addApi, removeApi } = useWorkspaceStore()
  const { add: notify } = useNotificationStore()
  const { log: audit } = useAuditStore()
  const [selectedId, setSelectedId] = useState<string>(activeId || (workspaces[0]?.id ?? ''))
  const [draft, setDraft] = useState<Workspace | null>(null)
  const [modified, setModified] = useState<Set<string>>(new Set())
  const [newVarKey, setNewVarKey] = useState('')
  const [newVarValue, setNewVarValue] = useState('')

  const selected = workspaces.find((w) => w.id === selectedId)

  useEffect(() => {
    if (selected) setDraft(JSON.parse(JSON.stringify(selected)))
    setModified(new Set())
  }, [selectedId])

  // Sync draft when workspaces change (e.g. after addApi) but preserve edits
  useEffect(() => {
    if (!draft || !selected) return
    // Only sync if APIs were added/removed (length changed)
    if (selected.apis.length !== draft.apis.length) {
      const newDraft = JSON.parse(JSON.stringify(selected)) as Workspace
      // Preserve edits on existing APIs
      draft.apis.forEach((draftApi) => {
        const idx = newDraft.apis.findIndex((a) => a.id === draftApi.id)
        if (idx >= 0) newDraft.apis[idx] = draftApi
      })
      setDraft(newDraft)
    }
  }, [workspaces])

  const markModified = (field: string) => setModified((s) => new Set(s).add(field))

  const updateDraftApi = (apiIdx: number, patch: Record<string, any>) => {
    if (!draft) return
    const apis = [...draft.apis]
    apis[apiIdx] = { ...apis[apiIdx], ...patch }
    setDraft({ ...draft, apis })
    markModified(`api-${apis[apiIdx].id}`)
  }

  const handleSave = () => {
    if (!draft) return
    update(draft.id, { name: draft.name, color: draft.color, variables: draft.variables, apis: draft.apis })
    notify(`Workspace "${draft.name}" saved`, 'success')
    audit('workspace_updated', `Workspace "${draft.name}" saved`, `${modified.size} fields`)
    setModified(new Set())
  }

  const handleCancel = () => {
    if (selected) setDraft(JSON.parse(JSON.stringify(selected)))
    setModified(new Set())
  }

  const handleAddVariable = () => {
    if (!draft || !newVarKey.trim()) return
    const variables = { ...draft.variables, [newVarKey.trim()]: newVarValue }
    setDraft({ ...draft, variables })
    markModified('variables')
    audit('variable_added', `Variable "${newVarKey.trim()}" added to "${draft.name}"`)
    setNewVarKey('')
    setNewVarValue('')
  }

  const handleRemoveVariable = (key: string) => {
    if (!draft) return
    const { [key]: _, ...rest } = draft.variables
    setDraft({ ...draft, variables: rest })
    markModified('variables')
    audit('variable_removed', `Variable "${key}" removed from "${draft.name}"`)
  }

  if (!draft) return null

  return (
    <Box sx={{ display: 'flex', height: '100%', gap: 2 }}>
      {/* Left — workspace list */}
      <Box sx={{ width: 220, minWidth: 220, borderRight: 1, borderColor: 'divider', pr: 2 }}>
        <Typography variant="h6" sx={{ mb: 1.5 }}>Workspaces</Typography>
        <List dense disablePadding>
          {workspaces.map((ws) => (
            <ListItemButton key={ws.id} selected={ws.id === selectedId} onClick={() => setSelectedId(ws.id)}>
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: ws.color, mr: 1.5, flexShrink: 0 }} />
              <ListItemText primary={ws.name} primaryTypographyProps={{ fontSize: 13, fontWeight: ws.id === activeId ? 600 : 400 }} />
              {ws.id === activeId && <Chip label="active" size="small" sx={{ fontSize: 9, height: 16, ml: 0.5 }} />}
            </ListItemButton>
          ))}
        </List>
      </Box>

      {/* Right — config */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        <Typography variant="h5" sx={{ mb: 2 }}>{draft.name}</Typography>

        {/* General */}
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>General</Typography>
            <Stack spacing={2}>
              <Stack direction="row" alignItems="flex-start">
                <ModifiedDot visible={modified.has('name')} />
                <TextField size="small" label="Name" fullWidth value={draft.name}
                  onChange={(e) => { setDraft({ ...draft, name: e.target.value }); markModified('name') }} />
              </Stack>
              <Stack direction="row" alignItems="flex-start">
                <ModifiedDot visible={modified.has('color')} />
                <Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5, fontSize: 12 }}>Color</Typography>
                  <Stack direction="row" spacing={0.5}>
                    {WORKSPACE_COLORS.map((c) => (
                      <Box key={c} onClick={() => { setDraft({ ...draft, color: c }); markModified('color') }}
                        sx={{ width: 24, height: 24, borderRadius: '50%', bgcolor: c, cursor: 'pointer', border: draft.color === c ? '3px solid #fff' : '3px solid transparent' }} />
                    ))}
                  </Stack>
                </Box>
              </Stack>
            </Stack>
          </CardContent>
        </Card>

        {/* APIs */}
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
              <Typography variant="h6">APIs</Typography>
              <Button size="small" startIcon={<Add />} onClick={() => addApi(draft.id)}>Add API</Button>
            </Stack>
            {draft.apis.map((api, i) => (
              <Stack key={api.id} direction="row" alignItems="flex-start" sx={{ mb: 2 }}>
                <ModifiedDot visible={modified.has(`api-${api.id}`)} />
                <Box sx={{ flex: 1, p: 2, border: 1, borderColor: 'divider', borderRadius: 1 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                    <Typography fontWeight={600} fontSize={14}>API #{i + 1}</Typography>
                    <Tooltip title="Remove API">
                      <IconButton size="small" color="error" onClick={() => { removeApi(draft.id, api.id); markModified('apis') }}>
                        <Delete sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                  <Stack spacing={1.5}>
                    <TextField size="small" label="Name" value={api.name}
                      onChange={(e) => updateDraftApi(i, { name: e.target.value })} />
                    <TextField size="small" label="Plugin" value={api.plugin}
                      onChange={(e) => updateDraftApi(i, { plugin: e.target.value })} />
                    <TextField size="small" label="Base URL" value={api.base_url}
                      onChange={(e) => updateDraftApi(i, { base_url: e.target.value })} />
                    <FormControl size="small">
                      <InputLabel>Auth Type</InputLabel>
                      <Select value={api.auth_type} label="Auth Type"
                        onChange={(e) => updateDraftApi(i, { auth_type: e.target.value })}>
                        <MenuItem value="bearer">Bearer Token</MenuItem>
                        <MenuItem value="apikey">API Key</MenuItem>
                        <MenuItem value="none">None</MenuItem>
                      </Select>
                    </FormControl>
                    {api.auth_type === 'bearer' && (
                      <>
                        <TextField size="small" label="Login Path" value={api.login_path}
                          onChange={(e) => updateDraftApi(i, { login_path: e.target.value })} />
                        <Stack direction="row" spacing={1}>
                          <TextField size="small" label="Username" value={api.username} sx={{ flex: 1 }}
                            onChange={(e) => updateDraftApi(i, { username: e.target.value })} />
                          <PasswordField label="Password" value={api.password}
                            onChange={(v) => updateDraftApi(i, { password: v })} />
                        </Stack>
                      </>
                    )}
                    {api.auth_type === 'apikey' && (
                      <Stack direction="row" spacing={1}>
                        <TextField size="small" label="Header" value={api.api_key_header} sx={{ flex: 1 }}
                          onChange={(e) => updateDraftApi(i, { api_key_header: e.target.value })} />
                        <PasswordField label="Key" value={api.api_key}
                          onChange={(v) => updateDraftApi(i, { api_key: v })} />
                      </Stack>
                    )}
                  </Stack>
                </Box>
              </Stack>
            ))}
          </CardContent>
        </Card>

        {/* Variables */}
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
              <Typography variant="h6">Workspace Variables</Typography>
            </Stack>
            {Object.keys(draft.variables).length > 0 && (
              <Stack spacing={1} sx={{ mb: 2 }}>
                {Object.entries(draft.variables).map(([key, val]) => (
                  <Stack key={key} direction="row" alignItems="center" spacing={1}
                    sx={{ p: 1, bgcolor: 'background.default', borderRadius: 1 }}>
                    <Chip label={key} size="small" color="primary" sx={{ fontWeight: 600 }} />
                    <Typography fontSize={12} fontFamily="monospace" sx={{ flex: 1 }} noWrap>
                      {String(val).length > 60 ? String(val).slice(0, 60) + '...' : String(val)}
                    </Typography>
                    <IconButton size="small" color="error" onClick={() => handleRemoveVariable(key)}>
                      <Delete sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Stack>
                ))}
              </Stack>
            )}
            <Stack direction="row" spacing={1} alignItems="center">
              <TextField size="small" placeholder="Variable name" value={newVarKey}
                onChange={(e) => setNewVarKey(e.target.value)} sx={{ flex: 1 }} />
              <TextField size="small" placeholder="Value" value={newVarValue}
                onChange={(e) => setNewVarValue(e.target.value)} sx={{ flex: 1 }} />
              <Button size="small" variant="outlined" onClick={handleAddVariable} disabled={!newVarKey.trim()}>Add</Button>
            </Stack>
          </CardContent>
        </Card>

        {/* Save/Cancel */}
        <Stack direction="row" spacing={2} sx={{ pb: 2 }}>
          <Button onClick={handleCancel} disabled={modified.size === 0}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={modified.size === 0}>Save</Button>
          {modified.size > 0 && (
            <Typography variant="body2" color="warning.main" sx={{ alignSelf: 'center', fontSize: 12 }}>
              {modified.size} field{modified.size !== 1 ? 's' : ''} modified
            </Typography>
          )}
        </Stack>
      </Box>
    </Box>
  )
}
