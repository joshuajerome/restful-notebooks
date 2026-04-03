import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  alpha, Box, Button, Card, CardContent, Chip, Dialog, DialogActions,
  DialogContent, DialogTitle, IconButton, Stack, TextField, Tooltip, Typography,
} from '@mui/material'
import { Add, Edit, FolderOpen, Upload } from '@mui/icons-material'
import { useWorkspaceStore, Workspace, WORKSPACE_COLORS } from '../store/workspaceStore'
import { useNotificationStore } from '../store/notificationStore'
import { useThemeStore } from '../store/themeStore'
import api from '../api/client'

const POLKADOT_BG = `radial-gradient(circle, rgba(255,255,255,0.03) 1px, transparent 1px)`
const POLKADOT_SIZE = '24px 24px'

export default function WorkspacesPage() {
  const navigate = useNavigate()
  const { workspaces, activeId, setActive, create, update, remove, duplicate } = useWorkspaceStore()
  const { add: notify } = useNotificationStore()
  const { tempWorkspaceColor } = useThemeStore()

  const [editMode, setEditMode] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [newPath, setNewPath] = useState('')

  const pickableColors = WORKSPACE_COLORS.filter((c) => c !== tempWorkspaceColor)

  const handleCardClick = (ws: Workspace) => {
    if (editMode) return
    navigate(`/app/workspaces/${ws.id}`)
  }

  const handleColorChange = (ws: Workspace, color: string) => {
    update(ws.id, { color })
  }

  const importInputRef = useRef<HTMLInputElement>(null)

  const handleImport = () => {
    importInputRef.current?.click()
  }

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    // Reset input so the same file can be re-selected
    e.target.value = ''
    try {
      const formData = new FormData()
      formData.append('file', file)
      await api.post('/workspace/import', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
      notify('Workspace imported successfully', 'success')
    } catch (err: any) {
      notify(err?.response?.data?.detail || 'Import failed', 'error')
    }
  }

  const handleBrowse = async () => {
    try {
      const dir = await (window as any).electronAPI?.selectDirectory()
      if (dir) setNewPath(dir)
    } catch { /* not in Electron */ }
  }

  const handleCreate = async () => {
    const name = newName.trim() || 'untitled'
    let rootPath = newPath.trim()
    try {
      const resp = await api.post('/workspace/create', { name, path: rootPath })
      rootPath = resp.data?.root || rootPath
    } catch { /* backend may not be available */ }
    const ws = create(name, undefined, rootPath)
    setNewName('')
    setNewPath('')
    setCreateOpen(false)
    notify(`Workspace "${ws.name}" created`, 'success')
  }

  const isTemp = (ws: Workspace) => ws.color === tempWorkspaceColor

  return (
    <Box sx={{ minHeight: '100%', backgroundImage: POLKADOT_BG, backgroundSize: POLKADOT_SIZE }}>
      {/* Top bar */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Typography variant="h5">Workspaces</Typography>
        <Stack direction="row" spacing={1}>
          <Button variant={editMode ? 'contained' : 'outlined'} size="small" startIcon={<Edit />}
            onClick={() => setEditMode(!editMode)}>
            {editMode ? 'Done' : 'Edit'}
          </Button>
          <Button variant="outlined" size="small" startIcon={<Upload />}
            onClick={handleImport}>
            Import
          </Button>
          <Button variant="contained" size="small" startIcon={<Add />}
            onClick={() => { setNewName(''); setNewPath(''); setCreateOpen(true) }}>
            New Workspace
          </Button>
        </Stack>
      </Stack>

      {/* Workspace grid */}
      {workspaces.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography color="text.secondary" sx={{ mb: 2 }}>No workspaces</Typography>
          <Button variant="contained" startIcon={<Add />} onClick={() => setCreateOpen(true)}>Create</Button>
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
          {workspaces.map((ws) => (
            <Card key={ws.id}
              sx={{
                width: 240, cursor: editMode ? 'grab' : 'pointer',
                borderLeft: `4px solid ${ws.color}`,
                outline: ws.id === activeId ? `2px solid ${ws.color}` : 'none',
                outlineOffset: 2,
                transition: 'box-shadow 0.15s',
                '&:hover': editMode ? {} : { boxShadow: 6 },
              }}
              onClick={() => handleCardClick(ws)}
            >
              <CardContent sx={{ pb: '12px !important' }}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                  <Box>
                    <Stack direction="row" alignItems="center" spacing={0.5}>
                      <Typography variant="h6" sx={{ fontSize: 14 }}>{ws.name}</Typography>
                      {isTemp(ws) && (
                        <Typography component="span" sx={{ fontSize: 10, color: 'text.disabled', fontStyle: 'italic' }}>(tmp)</Typography>
                      )}
                    </Stack>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: 11 }}>
                      {ws.apis.length} API{ws.apis.length !== 1 ? 's' : ''}
                      {ws.apis.some((a) => a.plugin) && ` — ${ws.apis.filter((a) => a.plugin).map((a) => a.plugin).join(', ')}`}
                    </Typography>
                  </Box>
                  {ws.id === activeId && (
                    <Chip label="active" size="small"
                      sx={{ bgcolor: alpha('#38A169', 0.15), color: '#38A169', fontSize: 10, height: 18 }} />
                  )}
                </Stack>

                {editMode && (
                  <Stack direction="row" spacing={0.5} sx={{ mt: 1.5 }}>
                    {pickableColors.map((c) => (
                      <Box key={c} onClick={(e) => { e.stopPropagation(); handleColorChange(ws, c) }}
                        sx={{ width: 16, height: 16, borderRadius: '50%', bgcolor: c, cursor: 'pointer',
                          border: ws.color === c ? '2px solid #fff' : '2px solid transparent' }} />
                    ))}
                  </Stack>
                )}

                {editMode && (
                  <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                    <Button size="small" onClick={(e) => { e.stopPropagation(); duplicate(ws.id); notify(`Duplicated "${ws.name}"`, 'info') }}>
                      Duplicate
                    </Button>
                    <Button size="small" color="error" onClick={(e) => { e.stopPropagation(); remove(ws.id); notify(`Deleted "${ws.name}"`, 'info') }}>
                      Delete
                    </Button>
                  </Stack>
                )}
              </CardContent>
            </Card>
          ))}
        </Box>
      )}

      {/* Hidden file input for import */}
      <input ref={importInputRef} type="file" accept=".zip" hidden onChange={handleImportFile} />

      {/* New workspace dialog */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>New Workspace</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField size="small" label="Name" placeholder="my-project" value={newName}
              onChange={(e) => setNewName(e.target.value)} fullWidth autoFocus inputProps={{ style: { fontSize: 14 } }} />
            <Stack direction="row" spacing={1} alignItems="flex-start">
              <TextField size="small" label="Path" placeholder="/path/to/workspace" value={newPath}
                onChange={(e) => setNewPath(e.target.value)} fullWidth inputProps={{ style: { fontSize: 14 } }}
                helperText="Parent directory where workspace folder will be created" FormHelperTextProps={{ sx: { fontSize: 11 } }} />
              <Tooltip title="Browse for directory">
                <IconButton size="small" onClick={handleBrowse} sx={{ mt: 0.5 }}><FolderOpen /></IconButton>
              </Tooltip>
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button size="small" onClick={() => setCreateOpen(false)}>Cancel</Button>
          <Button size="small" variant="contained" onClick={handleCreate}>Create</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
